import Stripe from 'stripe';
import { prisma } from './db.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

const CREATOR_SHARE = 0.90;
const PLATFORM_FEE = 0.10;

export function calcSplit(grossCents: number): { creatorCents: number; feeCents: number } {
  const feeCents = Math.floor(grossCents * PLATFORM_FEE);
  const creatorCents = grossCents - feeCents;
  return { creatorCents, feeCents };
}

export async function createTipCheckout(params: {
  streamId: string;
  creatorStripeAccountId: string;
  grossAmountCents: number;
  payerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const { feeCents } = calcSplit(params.grossAmountCents);

  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer_email: params.payerEmail,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'SeeWhy LIVE Tip' },
        unit_amount: params.grossAmountCents,
      },
      quantity: 1,
    }],
    mode: 'payment',
    payment_intent_data: {
      application_fee_amount: feeCents,
      transfer_data: { destination: params.creatorStripeAccountId },
    },
    metadata: { streamId: params.streamId, type: 'tip' },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });
}

export async function createSubscriptionCheckout(params: {
  creatorStripeAccountId: string;
  tier: 'bronze' | 'silver' | 'gold';
  subscriberEmail: string;
  successUrl: string;
  cancelUrl: string;
  creatorId: string;
}): Promise<Stripe.Checkout.Session> {
  const tierAmounts = { bronze: 100, silver: 500, gold: 1500 };
  const grossCents = tierAmounts[params.tier];
  const { feeCents } = calcSplit(grossCents);

  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer_email: params.subscriberEmail,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `SeeWhy LIVE ${params.tier.charAt(0).toUpperCase() + params.tier.slice(1)} Subscription` },
        unit_amount: grossCents,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
    mode: 'subscription',
    subscription_data: {
      application_fee_percent: PLATFORM_FEE * 100,
      transfer_data: { destination: params.creatorStripeAccountId },
    },
    metadata: { tier: params.tier, creatorId: params.creatorId },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });
}

export async function createConnectAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
  return link.url;
}

export async function createConnectAccount(email: string): Promise<Stripe.Account> {
  return stripe.accounts.create({
    type: 'express',
    email,
    capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
  });
}

export async function getAccountBalance(accountId: string): Promise<Stripe.Balance> {
  return stripe.balance.retrieve({ stripeAccount: accountId });
}

export async function processWebhook(payload: Buffer, signature: string): Promise<Stripe.Event> {
  return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (!session.metadata?.streamId && session.metadata?.type !== 'tip') return;

  const grossCents = session.amount_total ?? 0;
  const expectedFeeCents = Math.floor(grossCents * PLATFORM_FEE);
  const actualFee = (session.payment_intent as any)?.application_fee_amount ?? 0;

  if (actualFee !== expectedFeeCents) {
    await prisma.splitAlert.create({
      data: {
        transactionId: session.metadata?.transactionId ?? '',
        expectedCreatorAmount: (grossCents - expectedFeeCents) / 100,
        actualCreatorAmount: (grossCents - actualFee) / 100,
      },
    });
  }

  await prisma.transaction.updateMany({
    where: { stripePaymentIntentId: session.payment_intent as string },
    data: { status: 'succeeded', stripeChargeId: session.id },
  });
}

export { stripe };
