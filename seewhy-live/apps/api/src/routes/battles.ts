import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/db.js';
import { createTipCheckout, calcSplit } from '../services/stripe.js';

const router = Router();

const BattleSchema = z.object({
  streamId: z.string().uuid(),
  creatorBId: z.string().uuid(),
  durationSeconds: z.number().int().min(60).max(3600),
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = BattleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const battle = await prisma.spotlightBattle.create({
    data: {
      streamId: parsed.data.streamId,
      creatorAId: req.user!.id,
      creatorBId: parsed.data.creatorBId,
      durationSeconds: parsed.data.durationSeconds,
      status: 'active',
    },
  });

  setTimeout(async () => {
    const b = await prisma.spotlightBattle.findUnique({ where: { id: battle.id } });
    if (b?.status !== 'active') return;
    const winner = Number(b.scoreA) >= Number(b.scoreB) ? b.creatorAId : b.creatorBId;
    await prisma.spotlightBattle.update({
      where: { id: battle.id },
      data: { status: 'ended', endedAt: new Date(), winnerId: winner },
    });
  }, parsed.data.durationSeconds * 1000);

  return res.status(201).json(battle);
});

router.get('/:id', async (req, res) => {
  const battle = await prisma.spotlightBattle.findUnique({
    where: { id: req.params.id },
    include: {
      creatorA: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      creatorB: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });
  if (!battle) return res.status(404).json({ error: 'Battle not found' });
  return res.json(battle);
});

const BoostSchema = z.object({
  targetCreatorId: z.string().uuid(),
  grossAmountCents: z.number().int().min(100),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

router.post('/:id/boost', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = BoostSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const battle = await prisma.spotlightBattle.findUnique({ where: { id: req.params.id } });
  if (!battle || battle.status !== 'active') return res.status(400).json({ error: 'Battle not active' });

  const creator = await prisma.user.findUnique({ where: { id: parsed.data.targetCreatorId } });
  if (!creator?.stripeAccountId) return res.status(400).json({ error: 'Creator not connected to Stripe' });

  const session = await createTipCheckout({
    streamId: battle.streamId,
    creatorStripeAccountId: creator.stripeAccountId,
    grossAmountCents: parsed.data.grossAmountCents,
    payerEmail: req.user!.email,
    successUrl: parsed.data.successUrl,
    cancelUrl: parsed.data.cancelUrl,
  });

  const grossAmount = parsed.data.grossAmountCents / 100;
  const { feeCents } = calcSplit(parsed.data.grossAmountCents);

  const [transaction] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>`
      SELECT create_transaction_with_split(
        ${battle.streamId}::uuid, ${req.user!.id}::uuid,
        ${parsed.data.targetCreatorId}::uuid, 'tip', ${grossAmount}, ${session.payment_intent}
      ) AS id
    `,
    // Update battle score immediately
    parsed.data.targetCreatorId === battle.creatorAId
      ? prisma.spotlightBattle.update({ where: { id: req.params.id }, data: { scoreA: { increment: grossAmount } } })
      : prisma.spotlightBattle.update({ where: { id: req.params.id }, data: { scoreB: { increment: grossAmount } } }),
  ]);

  return res.json({ checkoutUrl: session.url });
});

export default router;
