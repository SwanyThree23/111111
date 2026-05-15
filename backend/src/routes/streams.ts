import { Router, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { streamManager } from '../services/stream-manager';
import { logger } from '../config/logger';

const router = Router();

// ── Public discovery — no auth required ───────────────────────────────────────

router.get('/public', async (req, res): Promise<void> => {
  try {
    const { category, q, live } = req.query as Record<string, string>;

    const where: any = { isPublic: true };
    if (live === 'true') where.isLive = true;
    if (category) where.category = category;
    if (q) where.title = { contains: q, mode: 'insensitive' };

    const streams = await prisma.stream.findMany({
      where,
      orderBy: [{ isLive: 'desc' }, { currentViewers: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        thumbnailUrl: true,
        status: true,
        isLive: true,
        currentViewers: true,
        startedAt: true,
        createdAt: true,
        user: { select: { id: true, username: true, avatar: true } },
        stats: { orderBy: { timestamp: 'desc' }, take: 1, select: { viewers: true, bitrate: true } },
      },
    });

    res.json({ streams });
  } catch (err) {
    logger.error('List public streams error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Authenticated owner routes ────────────────────────────────────────────────

// GET /api/streams  (owner's own streams)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const streams = await prisma.stream.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { stats: { orderBy: { timestamp: 'desc' }, take: 1 } },
    });
    res.json({ streams });
  } catch (err) {
    logger.error('List streams error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/streams/api-keys/list
router.get('/api-keys/list', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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
router.delete('/api-keys/:keyId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const key = await prisma.apiKey.findFirst({
      where: { id: req.params.keyId, userId: req.user!.id },
    });
    if (!key) { res.status(404).json({ error: 'API key not found' }); return; }
    await prisma.apiKey.delete({ where: { id: key.id } });
    res.json({ message: 'API key deleted' });
  } catch (err) {
    logger.error('Delete API key error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/streams/:id  — owners always see it; non-owners see public streams only
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const stream = await prisma.stream.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { userId },        // owner always has access
          { isPublic: true }, // anyone can view public streams
        ],
      },
      include: {
        stats: { orderBy: { timestamp: 'desc' }, take: 10 },
        user:  { select: { id: true, username: true, avatar: true, bio: true } },
        vdoRoom: userId ? true : false,
      },
    });

    if (!stream) { res.status(404).json({ error: 'Stream not found' }); return; }

    // Hide stream key from non-owners
    const isOwner = stream.userId === userId;
    const payload: any = { ...stream };
    if (!isOwner) {
      delete payload.streamKey;
      delete payload.destinations;
    }

    res.json({ stream: payload });
  } catch (err) {
    logger.error('Get stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/streams
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      title:                z.string().min(1),
      description:          z.string().optional(),
      destinations:         z.array(z.string()).optional(),
      scheduledAt:          z.string().optional(),
      isPublic:             z.boolean().optional(),
      category:             z.string().optional(),
      paywallEnabled:       z.boolean().optional(),
      paywallPreviewSeconds: z.number().int().min(0).optional(),
    });
    const body = schema.parse(req.body);

    const streamKey = crypto.randomBytes(16).toString('hex');
    const stream = await prisma.stream.create({
      data: {
        userId:                req.user!.id,
        title:                 body.title,
        description:           body.description,
        streamKey,
        destinations:          body.destinations || [],
        scheduledAt:           body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        isPublic:              body.isPublic ?? false,
        category:              body.category,
        paywallEnabled:        body.paywallEnabled ?? false,
        paywallPreviewSeconds: body.paywallPreviewSeconds ?? 300,
      },
    });
    res.status(201).json({ stream });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    logger.error('Create stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/streams/:id
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.stream.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) { res.status(404).json({ error: 'Stream not found' }); return; }

    const schema = z.object({
      title:                 z.string().min(1).optional(),
      description:           z.string().optional(),
      destinations:          z.array(z.string()).optional(),
      scheduledAt:           z.string().nullable().optional(),
      isPublic:              z.boolean().optional(),
      category:              z.string().optional(),
      thumbnailUrl:          z.string().url().optional(),
      paywallEnabled:        z.boolean().optional(),
      paywallPreviewSeconds: z.number().int().min(0).optional(),
    });
    const body = schema.parse(req.body);

    const stream = await prisma.stream.update({
      where: { id: req.params.id },
      data: {
        ...(body.title                 !== undefined && { title: body.title }),
        ...(body.description           !== undefined && { description: body.description }),
        ...(body.destinations          !== undefined && { destinations: body.destinations }),
        ...(body.scheduledAt           !== undefined && { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null }),
        ...(body.isPublic              !== undefined && { isPublic: body.isPublic }),
        ...(body.category              !== undefined && { category: body.category }),
        ...(body.thumbnailUrl          !== undefined && { thumbnailUrl: body.thumbnailUrl }),
        ...(body.paywallEnabled        !== undefined && { paywallEnabled: body.paywallEnabled }),
        ...(body.paywallPreviewSeconds !== undefined && { paywallPreviewSeconds: body.paywallPreviewSeconds }),
      },
    });
    res.json({ stream });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    logger.error('Update stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/streams/:id
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.stream.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) { res.status(404).json({ error: 'Stream not found' }); return; }

    if (existing.isLive) await streamManager.stopStream(req.params.id);
    await prisma.stream.delete({ where: { id: req.params.id } });
    res.json({ message: 'Stream deleted' });
  } catch (err) {
    logger.error('Delete stream error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/streams/:id/start
router.post('/:id/start', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stream = await prisma.stream.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!stream) { res.status(404).json({ error: 'Stream not found' }); return; }

    await streamManager.startStream(req.params.id);
    res.json({ message: 'Stream started' });
  } catch (err: any) {
    logger.error('Start stream error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/streams/:id/stop
router.post('/:id/stop', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stream = await prisma.stream.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!stream) { res.status(404).json({ error: 'Stream not found' }); return; }

    await streamManager.stopStream(req.params.id);
    res.json({ message: 'Stream stopped' });
  } catch (err: any) {
    logger.error('Stop stream error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/streams/:id/status
router.get('/:id/status', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const stream = await prisma.stream.findFirst({
      where: {
        id: req.params.id,
        OR: [{ userId }, { isPublic: true }],
      },
    });
    if (!stream) { res.status(404).json({ error: 'Stream not found' }); return; }

    const status = await streamManager.getStreamStatus(req.params.id);
    const latestStats = await prisma.streamStats.findFirst({
      where: { streamId: req.params.id },
      orderBy: { timestamp: 'desc' },
    });

    res.json({ status, stats: latestStats, currentViewers: stream.currentViewers });
  } catch (err) {
    logger.error('Get stream status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/streams/:id/api-keys
router.post('/:id/api-keys', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stream = await prisma.stream.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!stream) { res.status(404).json({ error: 'Stream not found' }); return; }

    const { name, platform } = req.body;
    if (!name || !platform) { res.status(400).json({ error: 'Name and platform are required' }); return; }

    const key = crypto.randomBytes(32).toString('hex');
    const apiKey = await prisma.apiKey.create({
      data: { userId: req.user!.id, name, key, platform },
    });
    res.status(201).json({ apiKey });
  } catch (err) {
    logger.error('Create API key error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
