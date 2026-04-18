import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../services/db.js';
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth.js';
import { startFanout, stopFanout } from '../services/ffmpeg.js';
import { createRouter, closeRouter } from '../services/mediasoup.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { randomBytes } from 'crypto';
import redis from '../services/redis.js';

const router = Router();

const CreateStreamSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(1),
  isPublic: z.boolean().default(true),
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = CreateStreamSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const streamKey = `live_${randomBytes(16).toString('hex')}`;
  const stream = await prisma.stream.create({
    data: {
      creatorId: req.user!.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      isPublic: parsed.data.isPublic,
      streamKey,
      rtmpUrl: 'rtmp://live.seewhy.live/app',
    },
  });

  return res.status(201).json(stream);
});

router.get('/', async (req, res) => {
  const { category, status, limit = '20', offset = '0' } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { isPublic: true };
  if (category) where.category = category;
  if (status) where.status = status;

  const [streams, total] = await Promise.all([
    prisma.stream.findMany({
      where,
      include: { creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      orderBy: [{ status: 'asc' }, { viewerCount: 'desc' }],
      take: parseInt(limit),
      skip: parseInt(offset),
    }),
    prisma.stream.count({ where }),
  ]);

  return res.json({ streams, total });
});

router.get('/:id', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  const stream = await prisma.stream.findUnique({
    where: { id: req.params.id },
    include: { creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  });
  if (!stream) return res.status(404).json({ error: 'Stream not found' });

  const response = { ...stream };
  if (req.user?.id !== stream.creatorId) {
    delete (response as any).streamKey;
  }
  return res.json(response);
});

router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const stream = await prisma.stream.findUnique({ where: { id: req.params.id } });
  if (!stream || stream.creatorId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

  const updated = await prisma.stream.update({
    where: { id: req.params.id },
    data: {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      thumbnailUrl: req.body.thumbnailUrl,
    },
  });
  return res.json(updated);
});

router.post('/:id/go-live', authenticate, rateLimit(5, 60, 'golive'), async (req: AuthRequest, res: Response) => {
  const stream = await prisma.stream.findUnique({ where: { id: req.params.id } });
  if (!stream || stream.creatorId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  if (stream.status === 'live') return res.status(409).json({ error: 'Already live' });

  const rtpCapabilities = await createRouter(stream.id);

  const updated = await prisma.stream.update({
    where: { id: req.params.id },
    data: {
      status: 'live',
      startedAt: new Date(),
      mediasoupRouterId: stream.id,
    },
  });

  const ingestUrl = `rtmp://localhost:1935/app/${stream.streamKey}`;
  await startFanout(stream.id, ingestUrl);

  return res.json({ stream: updated, rtpCapabilities });
});

router.post('/:id/end', authenticate, async (req: AuthRequest, res: Response) => {
  const stream = await prisma.stream.findUnique({ where: { id: req.params.id } });
  if (!stream || stream.creatorId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

  stopFanout(stream.id);
  await closeRouter(stream.id);

  const updated = await prisma.stream.update({
    where: { id: req.params.id },
    data: { status: 'ended', endedAt: new Date() },
  });

  return res.json(updated);
});

// SSE viewer count
router.get('/:id/viewers', async (req, res) => {
  const streamId = req.params.id;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = async () => {
    const stream = await prisma.stream.findUnique({ where: { id: streamId }, select: { viewerCount: true } });
    res.write(`data: ${JSON.stringify({ viewerCount: stream?.viewerCount ?? 0 })}\n\n`);
  };

  await send();
  const interval = setInterval(send, 5000);
  req.on('close', () => clearInterval(interval));
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const stream = await prisma.stream.findUnique({ where: { id: req.params.id } });
  if (!stream || stream.creatorId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

  await prisma.stream.update({ where: { id: req.params.id }, data: { status: 'archived' } });
  return res.json({ success: true });
});

export default router;
