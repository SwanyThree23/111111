import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
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

    // Persist the Stripe account ID on the user record
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { stripeAccountId: result.accountId },
    });

    res.json({ onboardingUrl: result.onboardingUrl, accountId: result.accountId });
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
      amount:            z.number().min(100).max(100000),
      currency:          z.string().default('usd'),
      toUserId:          z.string(),
      toUsername:        z.string(),
      toStripeAccountId: z.string(),
      streamId:          z.string().optional(),
      roomId:            z.string().optional(),
      message:           z.string().max(200).optional(),
    });

    const data = schema.parse(req.body);
    const fromUsername = req.user!.username || req.user!.email.split('@')[0];

    const result = await stripeService.createTipPaymentIntent({
      amount:            data.amount,
      currency:          data.currency,
      toUserId:          data.toUserId,
      toUsername:        data.toUsername,
      toStripeAccountId: data.toStripeAccountId,
      roomId:            data.roomId || data.streamId || '',
      message:           data.message,
      fromUserId:        req.user!.id,
      fromUsername,
    });

    // Persist the tip record
    await prisma.tip.create({
      data: {
        streamId:   data.streamId || null,
        fromUserId: req.user!.id,
        toUserId:   data.toUserId,
        username:   fromUsername,
        amount:     data.amount,
        message:    data.message,
        platform:   'stripe',
      },
    });

    // Notify the recipient
    await prisma.notification.create({
      data: {
        userId: data.toUserId,
        type:   'tip_received',
        title:  'You received a tip!',
        body:   `${fromUsername} tipped you $${(data.amount / 100).toFixed(2)}${data.message ? ` — "${data.message}"` : ''}`,
        data:   { amount: data.amount, fromUserId: req.user!.id, fromUsername, streamId: data.streamId },
      },
    });

    res.json({
      clientSecret:  result.clientSecret,
      platformFee:   result.platformFee,
      creatorAmount: result.creatorAmount,
      breakdown: {
        total:           data.amount,
        platformPercent: parseInt(process.env.PLATFORM_FEE_PERCENT || '10'),
        platformFee:     result.platformFee,
        creatorReceives: result.creatorAmount,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    logger.error('Tip payment error:', error);
    res.status(500).json({ error: 'Failed to create tip payment' });
  }
});

// ─── DB-backed Leaderboard ────────────────────────────────────────────────────

router.get('/leaderboard/:streamId', optionalAuth, async (req, res) => {
  try {
    const rows = await prisma.tip.groupBy({
      by:      ['username', 'fromUserId'],
      where:   { streamId: req.params.streamId },
      _sum:    { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take:    20,
    });

    const leaderboard = rows.map((r, i) => ({
      rank:      i + 1,
      username:  r.username,
      userId:    r.fromUserId,
      totalTips: r._sum.amount ?? 0,
    }));

    // Fallback to Stripe-service leaderboard when no DB entries yet
    if (leaderboard.length === 0) {
      try {
        const stripeLb = await stripeService.getLeaderboard(req.params.streamId);
        return res.json({ leaderboard: stripeLb });
      } catch { /* ignore */ }
    }

    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// ─── Recent tips for a stream ─────────────────────────────────────────────────

router.get('/tips/:streamId', optionalAuth, async (req, res) => {
  try {
    const tips = await prisma.tip.findMany({
      where:   { streamId: req.params.streamId },
      orderBy: { createdAt: 'desc' },
      take:    100,
      select: {
        id: true, username: true, amount: true, message: true, createdAt: true,
        fromUser: { select: { id: true, username: true, avatar: true } },
      },
    });
    res.json({ tips });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tips' });
  }
});

// ─── Stripe Webhook ───────────────────────────────────────────────────────────

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    if (!sig) return res.status(400).json({ error: 'Missing stripe signature' });

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
