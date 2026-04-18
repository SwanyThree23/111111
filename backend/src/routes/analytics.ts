import { Router, Response } from 'express';
import { prisma } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { streamManager } from '../services/stream-manager';
import { logger } from '../config/logger';

const router = Router();

router.use(authenticateToken);

// GET /api/analytics/streams/:streamId
router.get('/streams/:streamId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stream = await prisma.stream.findFirst({
      where: { id: req.params.streamId, userId: req.user!.id },
    });
    if (!stream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    const stats = await prisma.streamStats.findMany({
      where: { streamId: req.params.streamId },
      orderBy: { timestamp: 'asc' },
      take: 100,
    });

    const chatCount = await prisma.chatMessage.count({ where: { streamId: req.params.streamId } });

    const timeSeries = stats.map((s) => ({
      timestamp: s.timestamp,
      viewers: s.viewers,
      bitrate: s.bitrate,
      fps: s.fps,
    }));

    const avgViewers = stats.length > 0
      ? stats.reduce((sum, s) => sum + s.viewers, 0) / stats.length
      : 0;

    res.json({
      stream: { id: stream.id, title: stream.title, status: stream.status, startedAt: stream.startedAt, endedAt: stream.endedAt },
      timeSeries,
      summary: {
        avgViewers: Math.round(avgViewers),
        peakViewers: stats.reduce((max, s) => Math.max(max, s.viewers), 0),
        totalChatMessages: chatCount,
        duration: stats.length,
      },
    });
  } catch (err) {
    logger.error('Stream analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/dashboard
router.get('/dashboard', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const totalStreams = await prisma.stream.count({ where: { userId } });
    const liveStreams = await prisma.stream.count({ where: { userId, isLive: true } });

    const streams = await prisma.stream.findMany({
      where: { userId },
      select: { id: true },
    });
    const streamIds = streams.map((s) => s.id);

    const totalChatMessages = streamIds.length > 0
      ? await prisma.chatMessage.count({ where: { streamId: { in: streamIds } } })
      : 0;

    const recentStats = streamIds.length > 0
      ? await prisma.streamStats.findMany({
          where: { streamId: { in: streamIds } },
          orderBy: { timestamp: 'desc' },
          take: 50,
        })
      : [];

    const avgViewers = recentStats.length > 0
      ? Math.round(recentStats.reduce((sum, s) => sum + s.viewers, 0) / recentStats.length)
      : 0;

    res.json({ totalStreams, liveStreams, avgViewers, totalChatMessages });
  } catch (err) {
    logger.error('Dashboard analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/platforms
router.get('/platforms', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      select: { platform: true, name: true, lastUsed: true },
    });

    const platforms = keys.reduce((acc: Record<string, number>, k) => {
      acc[k.platform] = (acc[k.platform] || 0) + 1;
      return acc;
    }, {});

    res.json({ platforms, keys });
  } catch (err) {
    logger.error('Platform analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/trends/viewers
router.get('/trends/viewers', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const streams = await prisma.stream.findMany({ where: { userId }, select: { id: true } });
    const streamIds = streams.map((s) => s.id);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stats = streamIds.length > 0
      ? await prisma.streamStats.findMany({
          where: { streamId: { in: streamIds }, timestamp: { gte: since } },
          orderBy: { timestamp: 'asc' },
        })
      : [];

    res.json({ trends: stats.map((s) => ({ timestamp: s.timestamp, viewers: s.viewers })) });
  } catch (err) {
    logger.error('Viewer trends error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics/system
router.get('/system', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const metrics = await prisma.systemMetrics.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    const activeStreams = streamManager.getActiveStreamsCount();

    res.json({ metrics, activeStreams });
  } catch (err) {
    logger.error('System analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
