import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/db.js';
import { moderateMessage } from '../services/guardian.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

const SendMessageSchema = z.object({
  content: z.string().min(1).max(500),
  type: z.enum(['message', 'superchat']).default('message'),
  amount: z.number().positive().optional(),
});

router.post('/:streamId/messages', authenticate, rateLimit(30, 60, 'chat'), async (req: AuthRequest, res: Response) => {
  const parsed = SendMessageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { content, type, amount } = parsed.data;

  const message = await prisma.chatMessage.create({
    data: {
      streamId: req.params.streamId,
      userId: req.user!.id,
      content,
      type,
      amount,
    },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true, badge: true } } },
  });

  // Guardian AI moderation (async — don't block response)
  moderateMessage(message.id, req.params.streamId, content, req.user!.id).catch(() => {});

  return res.status(201).json(message);
});

router.get('/:streamId/messages', async (req, res) => {
  const { limit = '50', before } = req.query as { limit?: string; before?: string };
  const messages = await prisma.chatMessage.findMany({
    where: {
      streamId: req.params.streamId,
      isDeleted: false,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true, badge: true } } },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
  });
  return res.json(messages.reverse());
});

router.delete('/:streamId/messages/:messageId', authenticate, async (req: AuthRequest, res: Response) => {
  const message = await prisma.chatMessage.findUnique({ where: { id: req.params.messageId } });
  if (!message) return res.status(404).json({ error: 'Message not found' });

  const stream = await prisma.stream.findUnique({ where: { id: req.params.streamId } });
  const isOwner = message.userId === req.user!.id;
  const isHost = stream?.creatorId === req.user!.id;

  if (!isOwner && !isHost) return res.status(403).json({ error: 'Forbidden' });

  await prisma.chatMessage.update({ where: { id: req.params.messageId }, data: { isDeleted: true } });
  return res.json({ deleted: true });
});

export default router;
