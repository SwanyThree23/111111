import { Router, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { streamManager } from '../services/stream-manager';
import { logger } from '../config/logger';

const router = Router();

// All routes require auth
router.use(authenticateToken);

// GET /api/streams
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const streams = await prisma.stream.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ streams });
  } catch (err) {
    logger.error('List streams error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/streams/api-keys/list
router.get('/api-keys/list', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user!.id },
      select: { id: true, name: true, platform: true, createdAt: true, lastUsed: true },
    });
    res.json({ keys });
  } catch (err) {
    logger.error('List API keys error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/streams/api-keys/:keyId
router.delete('/api-keys/:keyId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const key = await prisma.apiKey.findFirst({
      where: { id: req.params.keyId, userId: req.user!.id },
    });
    if (!key) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }
    await prisma.apiKey.delete({ where: { id: key.id } });
    res.json({ message: 'API key deleted' });
  } catch (err) {
    logger.error('Delete API key error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/streams/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stream = await prisma.stream.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { stats: { orderBy: { timestamp: 'desc' }, take: 1 } },
    });
    if (!stream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }
    res.json({ stream });
  } catch (err) {
    logger.error('Get stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/streams
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, destinations, scheduledAt } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const streamKey = crypto.randomBytes(16).toString('hex');
    const stream = await prisma.stream.create({
      data: {
        userId: req.user!.id,
        title,
        description,
        streamKey,
        destinations: destinations || [],
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      },
    });
    res.status(201).json({ stream });
  } catch (err) {
    logger.error('Create stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/streams/:id
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.stream.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    const { title, description, destinations, scheduledAt } = req.body;
    const stream = await prisma.stream.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(destinations !== undefined && { destinations }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
      },
    });
    res.json({ stream });
  } catch (err) {
    logger.error('Update stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/streams/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.stream.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    if (existing.isLive) {
      await streamManager.stopStream(req.params.id);
    }

    await prisma.stream.delete({ where: { id: req.params.id } });
    res.json({ message: 'Stream deleted' });
  } catch (err) {
    logger.error('Delete stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/streams/:id/start
router.post('/:id/start', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stream = await prisma.stream.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!stream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    await streamManager.startStream(req.params.id);
    res.json({ message: 'Stream started' });
  } catch (err: any) {
    logger.error('Start stream error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/streams/:id/stop
router.post('/:id/stop', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stream = await prisma.stream.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!stream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    await streamManager.stopStream(req.params.id);
    res.json({ message: 'Stream stopped' });
  } catch (err: any) {
    logger.error('Stop stream error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/streams/:id/status
router.get('/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stream = await prisma.stream.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!stream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    const status = await streamManager.getStreamStatus(req.params.id);
    const latestStats = await prisma.streamStats.findFirst({
      where: { streamId: req.params.id },
      orderBy: { timestamp: 'desc' },
    });

    res.json({ status, stats: latestStats });
  } catch (err) {
    logger.error('Get stream status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/streams/:id/api-keys
router.post('/:id/api-keys', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stream = await prisma.stream.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!stream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }

    const { name, platform } = req.body;
    if (!name || !platform) {
      res.status(400).json({ error: 'Name and platform are required' });
      return;
    }

    const key = crypto.randomBytes(32).toString('hex');
    const apiKey = await prisma.apiKey.create({
      data: { userId: req.user!.id, name, key, platform },
    });

    res.status(201).json({ apiKey: { ...apiKey } });
  } catch (err) {
    logger.error('Create API key error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
