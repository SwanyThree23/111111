import Stripe from 'stripe';
import { logger } from '../config/logger';
import { saveTip, getTipLeaderboard } from './supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10' as any,
});

const PLATFORM_FEE_PERCENT = parseInt(process.env.PLATFORM_FEE_PERCENT || '10');

export class StripeService {
  // ─── Tip Payment (90/10 split) ───────────────────────────────────────

  async createTipPaymentIntent(params: {
    amount: number; // in cents
    currency: string;
    fromUserId: string;
    fromUsername: string;
    toUserId: string;
    toUsername: string;
    toStripeAccountId: string;
    roomId: string;
    message?: string;
  }) {
    const platformFee = Math.round(params.amount * (PLATFORM_FEE_PERCENT / 100));
    const creatorAmount = params.amount - platformFee;

    logger.info(
      `Creating tip: $${params.amount / 100} → ${params.toUsername} ` +
      `(creator gets ${creatorAmount / 100}, platform gets ${platformFee / 100})`
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      application_fee_amount: platformFee,
      transfer_data: {
        destination: params.toStripeAccountId,
      },
      metadata: {
        roomId: params.roomId,
        fromUserId: params.fromUserId,
        fromUsername: params.fromUsername,
        toUserId: params.toUserId,
        toUsername: params.toUsername,
        message: params.message || '',
        platformFeePercent: String(PLATFORM_FEE_PERCENT),
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      platformFee,
      creatorAmount,
    };
  }

  // ─── Stripe Connect Onboarding for Creators ──────────────────────────

  async createConnectAccount(userId: string, email: string) {
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { userId },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/settings?stripe=refresh`,
      return_url: `${process.env.FRONTEND_URL}/settings?stripe=success`,
      type: 'account_onboarding',
    });

    logger.info(`Stripe Connect account created for user ${userId}: ${account.id}`);

    return {
      accountId: account.id,
      onboardingUrl: accountLink.url,
    };
  }

  async getConnectAccountStatus(accountId: string) {
    const account = await stripe.accounts.retrieve(accountId);
    return {
      id: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  }

  // ─── Webhook Processing ───────────────────────────────────────────────

  async handleWebhook(body: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed:', err);
      throw new Error('Invalid webhook signature');
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = pi.metadata;

        await saveTip({
          roomId: meta.roomId,
          fromUserId: meta.fromUserId,
          fromUsername: meta.fromUsername,
          toUserId: meta.toUserId,
          toUsername: meta.toUsername,
          amount: pi.amount,
          currency: pi.currency,
          stripePaymentId: pi.id,
          message: meta.message || undefined,
        });

        logger.info(`Tip recorded: ${meta.fromUsername} → ${meta.toUsername} $${pi.amount / 100}`);
        break;
      }

      default:
        logger.debug(`Unhandled Stripe event: ${event.type}`);
    }

    return event;
  }

  async getLeaderboard(roomId: string) {
    return getTipLeaderboard(roomId);
  }
}

export const stripeService = new StripeService();
