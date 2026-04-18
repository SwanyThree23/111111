import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { splitGuard } from '../middleware/splitGuard.js';
import { prisma } from '../services/db.js';
import {
  calcSplit, createTipCheckout, createSubscriptionCheckout,
  createConnectAccount, createConnectAccountLink, getAccountBalance,
  processWebhook, handleCheckoutCompleted,
} from '../services/stripe.js';

const router = Router();

const TipSchema = z.object({
  streamId: z.string().uuid(),
  grossAmountCents: z.number().int().min(100),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

router.post('/tip', authenticate, splitGuard, async (req: AuthRequest, res: Response) => {
  const parsed = TipSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { streamId, grossAmountCents, successUrl, cancelUrl } = parsed.data;
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    include: { creator: true },
  });
  if (!stream) return res.status(404).json({ error: 'Stream not found' });
  if (!stream.creator.stripeOnboarded || !stream.creator.stripeAccountId) {
    return res.status(400).json({ error: 'Creator not connected to Stripe' });
  }

  const { feeCents } = calcSplit(grossAmountCents);
  const grossAmount = grossAmountCents / 100;
  const creatorAmount = (grossAmountCents - feeCents) / 100;
  const platformAmount = feeCents / 100;

  const transaction = await prisma.$queryRaw<{ id: string }[]>`
    SELECT create_transaction_with_split(
      ${streamId}::uuid,
      ${req.user!.id}::uuid,
      ${stream.creatorId}::uuid,
      'tip',
      ${grossAmount},
      NULL
    ) AS id
  `;

  const session = await createTipCheckout({
    streamId,
    creatorStripeAccountId: stream.creator.stripeAccountId,
    grossAmountCents,
    payerEmail: req.user!.email,
    successUrl,
    cancelUrl,
  });

  await prisma.transaction.update({
    where: { id: transaction[0].id },
    data: { stripePaymentIntentId: session.payment_intent as string },
  });

  return res.json({ checkoutUrl: session.url, sessionId: session.id });
});

const SubscribeSchema = z.object({
  creatorId: z.string().uuid(),
  tier: z.enum(['bronze', 'silver', 'gold']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = SubscribeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { creatorId, tier, successUrl, cancelUrl } = parsed.data;
  const creator = await prisma.user.findUnique({ where: { id: creatorId } });
  if (!creator?.stripeOnboarded || !creator.stripeAccountId) {
    return res.status(400).json({ error: 'Creator not connected to Stripe' });
  }

  const session = await createSubscriptionCheckout({
    creatorStripeAccountId: creator.stripeAccountId,
    tier,
    subscriberEmail: req.user!.email,
    successUrl,
    cancelUrl,
    creatorId,
  });

  return res.json({ checkoutUrl: session.url });
});

router.post('/connect/onboard', authenticate, async (req: AuthRequest, res: Response) => {
  let user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });

  if (!user.stripeAccountId) {
    const account = await createConnectAccount(req.body.email ?? req.user!.email);
    user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { stripeAccountId: account.id },
    });
  }

  const link = await createConnectAccountLink(
    user.stripeAccountId!,
    `${process.env.APP_URL}/dashboard?stripe=refresh`,
    `${process.env.APP_URL}/dashboard?stripe=success`
  );

  return res.json({ url: link });
});

router.get('/connect/status', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!user.stripeAccountId) return res.json({ onboarded: false });
  return res.json({ onboarded: user.stripeOnboarded, accountId: user.stripeAccountId });
});

router.get('/balance', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!user.stripeAccountId) return res.status(400).json({ error: 'Not connected to Stripe' });
  const balance = await getAccountBalance(user.stripeAccountId);
  return res.json(balance);
});

// Stripe webhook — raw body required
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  try {
    const event = await processWebhook(req.body as Buffer, sig);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as any);
        break;
      case 'account.updated':
        const account = event.data.object as any;
        if (account.details_submitted) {
          await prisma.user.updateMany({
            where: { stripeAccountId: account.id },
            data: { stripeOnboarded: true },
          });
        }
        break;
    }

    return res.json({ received: true });
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
