import { Router, Response } from 'express';
import { prisma } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { aiOrchestrator } from '../services/ai-orchestrator';
import { logger } from '../config/logger';

const router = Router();

router.use(authenticateToken);

// POST /api/ai/moderate
router.post('/moderate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message, username, context } = req.body;
    if (!message || !username) {
      res.status(400).json({ error: 'Message and username are required' });
      return;
    }
    const result = await aiOrchestrator.moderateChat(message, username, context);
    res.json({ result });
  } catch (err: any) {
    logger.error('Moderate chat error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/ai/avatar/generate
router.post('/avatar/generate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { script, avatarId } = req.body;
    if (!script || !avatarId) {
      res.status(400).json({ error: 'Script and avatarId are required' });
      return;
    }
    const result = await aiOrchestrator.generateAvatar(script, avatarId);
    res.json({ result });
  } catch (err: any) {
    logger.error('Generate avatar error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/ai/avatar/status/:videoId
router.get('/avatar/status/:videoId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const job = await prisma.aiJob.findFirst({
      where: { type: 'avatar', input: { path: ['videoId'], equals: req.params.videoId } },
    });
    res.json({ job });
  } catch (err) {
    logger.error('Avatar status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ai/summary
router.post('/summary', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { streamId } = req.body;
    if (!streamId) {
      res.status(400).json({ error: 'streamId is required' });
      return;
    }
    const summary = await aiOrchestrator.generateStreamSummary(streamId);
    res.json({ summary });
  } catch (err: any) {
    logger.error('Generate summary error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/ai/enhance-description
router.post('/enhance-description', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    const enhanced = await aiOrchestrator.enhanceDescription(title, description || '');
    res.json({ enhanced });
  } catch (err: any) {
    logger.error('Enhance description error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/ai/jobs/:jobId
router.get('/jobs/:jobId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const job = await prisma.aiJob.findUnique({ where: { id: req.params.jobId } });
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ job });
  } catch (err) {
    logger.error('Get AI job error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ai/jobs
router.get('/jobs', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobs = await prisma.aiJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ jobs });
  } catch (err) {
    logger.error('List AI jobs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
