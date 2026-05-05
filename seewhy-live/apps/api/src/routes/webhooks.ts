import { Router, Response } from 'express';
import { createHmac, randomBytes } from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/db.js';

const router = Router();

// List endpoints
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { creatorId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(endpoints);
});

// Create endpoint
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { url, events } = req.body as { url: string; events?: string[] };
  if (!url) return res.status(400).json({ error: 'url required' });

  const secret = `whsec_${randomBytes(24).toString('hex')}`;
  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      creatorId: req.user!.id,
      url,
      secret,
      events: events ?? ['stream.live', 'stream.ended', 'milestone.viewers', 'poll.ended'],
    },
  });
  return res.json(endpoint);
});

// Update endpoint
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { url, events, isActive } = req.body as { url?: string; events?: string[]; isActive?: boolean };
  const ep = await prisma.webhookEndpoint.findUnique({ where: { id: req.params.id } });
  if (!ep || ep.creatorId !== req.user!.id) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.webhookEndpoint.update({
    where: { id: req.params.id },
    data: { ...(url && { url }), ...(events && { events }), ...(isActive !== undefined && { isActive }) },
  });
  return res.json(updated);
});

// Delete endpoint
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const ep = await prisma.webhookEndpoint.findUnique({ where: { id: req.params.id } });
  if (!ep || ep.creatorId !== req.user!.id) return res.status(404).json({ error: 'Not found' });

  await prisma.webhookEndpoint.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
});

// Get deliveries for an endpoint
router.get('/:id/deliveries', authenticate, async (req: AuthRequest, res: Response) => {
  const ep = await prisma.webhookEndpoint.findUnique({ where: { id: req.params.id } });
  if (!ep || ep.creatorId !== req.user!.id) return res.status(404).json({ error: 'Not found' });

  const deliveries = await prisma.webhookDelivery.findMany({
    where: { endpointId: req.params.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return res.json(deliveries);
});

export async function dispatchWebhook(
  creatorId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { creatorId, isActive: true },
  });

  await Promise.allSettled(
    endpoints
      .filter((ep) => (ep.events as string[]).includes(event))
      .map((ep) => deliverWebhook(ep.id, ep.url, ep.secret, event, payload))
  );
}

async function deliverWebhook(
  endpointId: string,
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>,
  attempt = 1
): Promise<void> {
  const body = JSON.stringify({ event, payload, timestamp: Date.now() });
  const sig = createHmac('sha256', secret).update(body).digest('hex');

  let statusCode: number | null = null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SeeWhy-Signature': `sha256=${sig}`,
        'X-SeeWhy-Event': event,
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    statusCode = res.status;
  } catch {}

  await prisma.webhookDelivery.create({
    data: { endpointId, event, payload: payload as Parameters<typeof prisma.webhookDelivery.create>[0]['data']['payload'], statusCode, attempt },
  });

  if (statusCode && statusCode >= 200 && statusCode < 300) return;

  // Retry up to 3 times with exponential backoff
  if (attempt < 3) {
    setTimeout(() => deliverWebhook(endpointId, url, secret, event, payload, attempt + 1), attempt * 5000);
  }
}

export default router;
