import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/db.js';
import {
  createWebRtcTransport, connectTransport, createProducer,
  createConsumer, getActiveProducerCount,
} from '../services/mediasoup.js';
import { buildGuestInviteUrl } from '../services/vdo.js';
import { randomBytes } from 'crypto';

const router = Router();
const MAX_GUESTS = 20;

router.post('/:streamId/join', authenticate, async (req: AuthRequest, res: Response) => {
  const stream = await prisma.stream.findUnique({ where: { id: req.params.streamId } });
  if (!stream || stream.status !== 'live') return res.status(404).json({ error: 'Stream not live' });

  const activeCount = await prisma.streamGuest.count({
    where: { streamId: req.params.streamId, leftAt: null },
  });
  if (activeCount >= MAX_GUESTS) return res.status(429).json({ error: `Maximum ${MAX_GUESTS} guests reached` });

  const guest = await prisma.streamGuest.create({
    data: {
      streamId: req.params.streamId,
      userId: req.user!.id,
      displayName: req.body.displayName ?? req.user!.id,
      isHost: stream.creatorId === req.user!.id,
    },
  });

  const transportId = randomBytes(8).toString('hex');
  const transport = await createWebRtcTransport(req.params.streamId, transportId);

  return res.json({ guest, transport: { ...transport, transportId } });
});

router.post('/:streamId/transport/connect', authenticate, async (req: AuthRequest, res: Response) => {
  const { transportId, dtlsParameters } = req.body;
  await connectTransport(transportId, dtlsParameters);
  return res.json({ connected: true });
});

router.post('/:streamId/produce', authenticate, async (req: AuthRequest, res: Response) => {
  const { transportId, kind, rtpParameters, producerId: clientProducerId } = req.body;

  if (getActiveProducerCount(req.params.streamId) >= MAX_GUESTS * 2) {
    return res.status(429).json({ error: 'Max producers reached' });
  }

  const producerId = await createProducer(transportId, clientProducerId, kind, rtpParameters);
  await prisma.streamGuest.updateMany({
    where: { streamId: req.params.streamId, userId: req.user!.id, leftAt: null },
    data: { mediasoupProducerId: producerId },
  });

  return res.json({ producerId });
});

router.post('/:streamId/consume', authenticate, async (req: AuthRequest, res: Response) => {
  const { transportId, producerId, rtpCapabilities, consumerId } = req.body;
  const consumer = await createConsumer(req.params.streamId, transportId, consumerId, producerId, rtpCapabilities);
  return res.json(consumer);
});

router.post('/:streamId/leave', authenticate, async (req: AuthRequest, res: Response) => {
  await prisma.streamGuest.updateMany({
    where: { streamId: req.params.streamId, userId: req.user!.id, leftAt: null },
    data: { leftAt: new Date() },
  });
  return res.json({ left: true });
});

router.get('/:streamId', async (req, res) => {
  const guests = await prisma.streamGuest.findMany({
    where: { streamId: req.params.streamId, leftAt: null },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  });
  return res.json(guests);
});

router.post('/:streamId/invite', authenticate, async (req: AuthRequest, res: Response) => {
  const stream = await prisma.stream.findUnique({ where: { id: req.params.streamId } });
  if (!stream || stream.creatorId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

  const guestStreamId = randomBytes(8).toString('hex');
  const room = stream.vdoRoom ?? `seewhy-${stream.id.slice(0, 8)}`;
  const inviteUrl = buildGuestInviteUrl(room, guestStreamId, req.body.displayName);

  return res.json({ inviteUrl, guestStreamId, room });
});

router.post('/:streamId/kick/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  const stream = await prisma.stream.findUnique({ where: { id: req.params.streamId } });
  if (!stream || stream.creatorId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

  await prisma.streamGuest.updateMany({
    where: { streamId: req.params.streamId, userId: req.params.userId, leftAt: null },
    data: { leftAt: new Date() },
  });
  return res.json({ kicked: true });
});

router.patch('/:streamId/mute/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  const stream = await prisma.stream.findUnique({ where: { id: req.params.streamId } });
  if (!stream || stream.creatorId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

  await prisma.streamGuest.updateMany({
    where: { streamId: req.params.streamId, userId: req.params.userId, leftAt: null },
    data: { isMuted: req.body.muted ?? true },
  });
  return res.json({ muted: req.body.muted ?? true });
});

export default router;
