import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/db.js';
import { buildVstPushUrl, buildVstReceiveUrl } from '../services/vdo.js';
import { randomBytes } from 'crypto';

const router = Router();

const VstSchema = z.object({
  streamId: z.string().uuid(),
  name: z.string().min(1),
  mode: z.enum(['publish','receive']),
  daw: z.string().optional(),
  faderLevel: z.number().int().min(0).max(100).default(80),
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = VstSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const vdoStreamId = randomBytes(8).toString('hex');
  const track = await prisma.vstTrack.create({
    data: {
      streamId: parsed.data.streamId,
      creatorId: req.user!.id,
      name: parsed.data.name,
      mode: parsed.data.mode,
      vdoStreamId,
      faderLevel: parsed.data.faderLevel,
      daw: parsed.data.daw,
    },
  });

  const room = `vst-${parsed.data.streamId.slice(0, 8)}`;
  const url = parsed.data.mode === 'publish'
    ? buildVstPushUrl(room, vdoStreamId, parsed.data.faderLevel)
    : buildVstReceiveUrl(room, vdoStreamId, parsed.data.faderLevel);

  return res.status(201).json({ track, url });
});

router.get('/:streamId', authenticate, async (req: AuthRequest, res: Response) => {
  const tracks = await prisma.vstTrack.findMany({
    where: { streamId: req.params.streamId, creatorId: req.user!.id },
  });

  const room = `vst-${req.params.streamId.slice(0, 8)}`;
  const enriched = tracks.map((t: { mode: string; vdoStreamId: string | null; faderLevel: number; [key: string]: unknown }) => ({
    ...t,
    url: t.mode === 'publish'
      ? buildVstPushUrl(room, t.vdoStreamId!, t.faderLevel)
      : buildVstReceiveUrl(room, t.vdoStreamId!, t.faderLevel),
  }));

  return res.json(enriched);
});

router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const track = await prisma.vstTrack.findUnique({ where: { id: req.params.id } });
  if (!track || track.creatorId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

  const updated = await prisma.vstTrack.update({
    where: { id: req.params.id },
    data: {
      faderLevel: req.body.faderLevel,
      isMuted: req.body.isMuted,
      isActive: req.body.isActive,
      mode: req.body.mode,
    },
  });
  return res.json(updated);
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const track = await prisma.vstTrack.findUnique({ where: { id: req.params.id } });
  if (!track || track.creatorId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  await prisma.vstTrack.delete({ where: { id: req.params.id } });
  return res.json({ deleted: true });
});

export default router;
