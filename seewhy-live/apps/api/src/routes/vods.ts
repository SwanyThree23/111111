import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/db.js';
import { generateVodRepurpose } from '../services/aura.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const vods = await prisma.vod.findMany({
    where: { creatorId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(vods);
});

router.get('/:id', async (req, res) => {
  const vod = await prisma.vod.findUnique({ where: { id: req.params.id } });
  if (!vod || !vod.isPublic) return res.status(404).json({ error: 'VOD not found' });
  await prisma.vod.update({ where: { id: req.params.id }, data: { viewCount: { increment: 1 } } });
  return res.json(vod);
});

router.post('/:id/repurpose', authenticate, async (req: AuthRequest, res: Response) => {
  const vod = await prisma.vod.findUnique({ where: { id: req.params.id } });
  if (!vod || vod.creatorId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

  const job = await prisma.aiRepurposeJob.create({
    data: { vodId: vod.id, creatorId: req.user!.id, status: 'processing' },
  });

  // Run async — don't await
  generateVodRepurpose({
    title: vod.title,
    category: 'stream',
    durationSeconds: vod.durationSeconds ?? 0,
  }).then(async (output) => {
    await prisma.aiRepurposeJob.update({
      where: { id: job.id },
      data: { status: 'completed', output },
    });
  }).catch(async () => {
    await prisma.aiRepurposeJob.update({ where: { id: job.id }, data: { status: 'failed' } });
  });

  return res.status(202).json({ jobId: job.id });
});

router.get('/jobs/:jobId', authenticate, async (req: AuthRequest, res: Response) => {
  const job = await prisma.aiRepurposeJob.findUnique({ where: { id: req.params.jobId } });
  if (!job || job.creatorId !== req.user!.id) return res.status(404).json({ error: 'Job not found' });
  return res.json(job);
});

export default router;
