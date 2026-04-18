import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/db.js';
import { encryptStreamKey } from '../services/vaultpro.js';

const router = Router();

const DestinationSchema = z.object({
  platform: z.enum(['youtube','twitch','facebook','tiktok','instagram','twitter','kick','rumble','custom']),
  rtmpUrl: z.string().url(),
  streamKey: z.string().min(1),
  displayName: z.string().optional(),
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = DestinationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const dest = await prisma.fanoutDestination.create({
    data: {
      creatorId: req.user!.id,
      platform: parsed.data.platform,
      rtmpUrl: parsed.data.rtmpUrl,
      streamKey: encryptStreamKey(parsed.data.streamKey),
      displayName: parsed.data.displayName,
    },
  });

  return res.status(201).json({ ...dest, streamKey: '[encrypted]' });
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const dests = await prisma.fanoutDestination.findMany({
    where: { creatorId: req.user!.id },
    select: { id: true, platform: true, rtmpUrl: true, displayName: true, isActive: true, createdAt: true },
  });
  return res.json(dests);
});

router.patch('/:id/toggle', authenticate, async (req: AuthRequest, res: Response) => {
  const dest = await prisma.fanoutDestination.findUnique({ where: { id: req.params.id } });
  if (!dest || dest.creatorId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

  const updated = await prisma.fanoutDestination.update({
    where: { id: req.params.id },
    data: { isActive: !dest.isActive },
  });
  return res.json({ ...updated, streamKey: '[encrypted]' });
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const dest = await prisma.fanoutDestination.findUnique({ where: { id: req.params.id } });
  if (!dest || dest.creatorId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

  await prisma.fanoutDestination.delete({ where: { id: req.params.id } });
  return res.json({ deleted: true });
});

export default router;
