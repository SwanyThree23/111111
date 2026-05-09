import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/db.js';
import { generateOverlayHtml } from '../services/aura.js';

const router = Router();

const OverlaySchema = z.object({
  streamId: z.string().uuid(),
  theme: z.enum(['SeeWhy','Minecraft','Domino','NeonCity','RetroTV']),
  eventType: z.enum(['follow','subscribe','raid','bits','tip','superchat','join','shoutout']),
  username: z.string(),
  message: z.string().optional(),
  amount: z.number().optional(),
});

router.post('/generate', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = OverlaySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { streamId, theme, eventType, username, message, amount } = parsed.data;

  const html = await generateOverlayHtml({ theme, eventType, username, message, amount });

  const alert = await prisma.streamAlert.create({
    data: { streamId, type: eventType, message, amount, overlayHtml: html },
  });

  return res.json({ alertId: alert.id, html });
});

router.get('/:streamId/alerts', async (req, res) => {
  const alerts = await prisma.streamAlert.findMany({
    where: { streamId: req.params.streamId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return res.json(alerts);
});

export default router;
