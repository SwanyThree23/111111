import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { stripeService } from '../services/stripe-service';
import { prisma } from '../server';
import { logger } from '../config/logger';
import express from 'express';

const router = Router();

// ─── Stripe Connect Onboarding ────────────────────────────────────────────────

router.post('/connect/onboard', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { email: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = await stripeService.createConnectAccount(req.user!.id, user.email);

    res.json({
      onboardingUrl: result.onboardingUrl,
      accountId: result.accountId,
    });
  } catch (error) {
    logger.error('Stripe onboarding error:', error);
    res.status(500).json({ error: 'Failed to start Stripe onboarding' });
  }
});

router.get('/connect/status/:accountId', authenticateToken, async (req, res) => {
  try {
    const status = await stripeService.getConnectAccountStatus(req.params.accountId);
    res.json({ status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get account status' });
  }
});

// ─── Tip Payment ──────────────────────────────────────────────────────────────

router.post('/tip', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      amount: z.number().min(100).max(100000), // cents ($1 to $1000)
      currency: z.string().default('usd'),
      toUserId: z.string(),
      toUsername: z.string(),
      toStripeAccountId: z.string(),
      roomId: z.string(),
      message: z.string().max(200).optional(),
    });

    const data = schema.parse(req.body);

    const result = await stripeService.createTipPaymentIntent({
      ...data,
      fromUserId: req.user!.id,
      fromUsername: req.user!.email.split('@')[0],
    });

    res.json({
      clientSecret: result.clientSecret,
      platformFee: result.platformFee,
      creatorAmount: result.creatorAmount,
      breakdown: {
        total: data.amount,
        platformPercent: parseInt(process.env.PLATFORM_FEE_PERCENT || '10'),
        platformFee: result.platformFee,
        creatorReceives: result.creatorAmount,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    logger.error('Tip payment error:', error);
    res.status(500).json({ error: 'Failed to create tip payment' });
  }
});

// ─── Leaderboard ──────────────────────────────────────────────────────────────

router.get('/leaderboard/:roomId', async (req, res) => {
  try {
    const leaderboard = await stripeService.getLeaderboard(req.params.roomId);
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// ─── Stripe Webhook ───────────────────────────────────────────────────────────
// Raw body required for signature verification

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe signature' });
    }

    try {
      const event = await stripeService.handleWebhook(req.body as Buffer, sig as string);
      res.json({ received: true, type: event.type });
    } catch (error) {
      logger.error('Webhook processing error:', error);
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  }
);

export default router;
