import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/db.js';

const router = Router();

router.get('/earnings', authenticate, async (req: AuthRequest, res: Response) => {
  const { period = 'month' } = req.query as { period?: string };
  const since = new Date();
  if (period === 'today') since.setHours(0, 0, 0, 0);
  else if (period === 'week') since.setDate(since.getDate() - 7);
  else if (period === 'month') since.setMonth(since.getMonth() - 1);
  else since.setFullYear(2000); // all time

  const [transactions, byType] = await Promise.all([
    prisma.transaction.findMany({
      where: { creatorId: req.user!.id, status: 'succeeded', createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.transaction.groupBy({
      by: ['type'],
      where: { creatorId: req.user!.id, status: 'succeeded', createdAt: { gte: since } },
      _sum: { grossAmount: true, creatorAmount: true, platformAmount: true },
    }),
  ]);

  type TxRow = { grossAmount: unknown; creatorAmount: unknown; platformAmount: unknown };
  const totals = transactions.reduce((acc: { gross: number; creator: number; platform: number }, t: TxRow) => ({
    gross: acc.gross + Number(t.grossAmount),
    creator: acc.creator + Number(t.creatorAmount),
    platform: acc.platform + Number(t.platformAmount),
  }), { gross: 0, creator: 0, platform: 0 });

  return res.json({ transactions, byType, totals });
});

router.get('/streams/:streamId', async (req, res) => {
  const stream = await prisma.stream.findUnique({
    where: { id: req.params.streamId },
    include: {
      _count: { select: { chatMessages: true, guests: true } },
    },
  });
  if (!stream) return res.status(404).json({ error: 'Stream not found' });

  const tips = await prisma.transaction.aggregate({
    where: { streamId: req.params.streamId, status: 'succeeded' },
    _sum: { grossAmount: true, creatorAmount: true },
    _count: true,
  });

  return res.json({ stream, tips });
});

router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response) => {
  const [totalStreams, liveStreams, totalEarnings, totalMessages] = await Promise.all([
    prisma.stream.count({ where: { creatorId: req.user!.id } }),
    prisma.stream.count({ where: { creatorId: req.user!.id, status: 'live' } }),
    prisma.transaction.aggregate({
      where: { creatorId: req.user!.id, status: 'succeeded' },
      _sum: { creatorAmount: true },
    }),
    prisma.chatMessage.count({
      where: { stream: { creatorId: req.user!.id } },
    }),
  ]);

  return res.json({ totalStreams, liveStreams, totalEarnings: totalEarnings._sum.creatorAmount ?? 0, totalMessages });
});

export default router;
