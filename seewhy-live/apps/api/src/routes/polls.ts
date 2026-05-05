import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/db.js';
import { getIO } from '../services/socket.js';

const router = Router();

// Create a poll (creator only)
router.post('/:streamId', authenticate, async (req: AuthRequest, res: Response) => {
  const { question, options, durationSeconds = 60 } = req.body as {
    question: string;
    options: string[];
    durationSeconds?: number;
  };

  if (!question || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'question and at least 2 options required' });
  }

  const stream = await prisma.stream.findUnique({ where: { id: req.params.streamId } });
  if (!stream || stream.creatorId !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Close any existing active poll for this stream
  await prisma.poll.updateMany({
    where: { streamId: req.params.streamId, status: 'active' },
    data: { status: 'closed' },
  });

  const endsAt = new Date(Date.now() + durationSeconds * 1000);
  const poll = await prisma.poll.create({
    data: {
      streamId: req.params.streamId,
      creatorId: req.user!.id,
      question,
      options: options.map((text, idx) => ({ idx, text, votes: 0 })),
      durationSeconds,
      endsAt,
    },
  });

  getIO().to(`stream:${req.params.streamId}`).emit('poll:started', poll);

  // Auto-close after duration
  setTimeout(() => closePoll(poll.id, req.params.streamId), durationSeconds * 1000);

  return res.json(poll);
});

// Cast a vote
router.post('/:pollId/vote', authenticate, async (req: AuthRequest, res: Response) => {
  const { optionIdx } = req.body as { optionIdx: number };

  const poll = await prisma.poll.findUnique({ where: { id: req.params.pollId } });
  if (!poll || poll.status !== 'active') {
    return res.status(400).json({ error: 'Poll not active' });
  }
  if (new Date() > poll.endsAt) {
    return res.status(400).json({ error: 'Poll has ended' });
  }
  const opts = poll.options as { idx: number; text: string; votes: number }[];
  if (optionIdx < 0 || optionIdx >= opts.length) {
    return res.status(400).json({ error: 'Invalid option' });
  }

  await prisma.pollVote.upsert({
    where: { pollId_userId: { pollId: poll.id, userId: req.user!.id } },
    create: { pollId: poll.id, userId: req.user!.id, optionIdx },
    update: { optionIdx },
  });

  const results = await getPollResults(poll.id);
  getIO().to(`stream:${poll.streamId}`).emit('poll:update', { pollId: poll.id, results });

  return res.json({ ok: true, results });
});

// Get poll results
router.get('/:pollId/results', async (req, res) => {
  const poll = await prisma.poll.findUnique({ where: { id: req.params.pollId } });
  if (!poll) return res.status(404).json({ error: 'Not found' });

  const results = await getPollResults(poll.id);
  return res.json({ poll, results });
});

// Get active poll for a stream
router.get('/stream/:streamId/active', async (req, res) => {
  const poll = await prisma.poll.findFirst({
    where: { streamId: req.params.streamId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  if (!poll) return res.json(null);

  const results = await getPollResults(poll.id);
  return res.json({ poll, results });
});

// Close poll manually (creator)
router.post('/:pollId/close', authenticate, async (req: AuthRequest, res: Response) => {
  const poll = await prisma.poll.findUnique({ where: { id: req.params.pollId } });
  if (!poll) return res.status(404).json({ error: 'Not found' });

  const stream = await prisma.stream.findUnique({ where: { id: poll.streamId } });
  if (!stream || stream.creatorId !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await closePoll(poll.id, poll.streamId);
  return res.json({ ok: true });
});

async function getPollResults(pollId: string) {
  const votes = await prisma.pollVote.groupBy({
    by: ['optionIdx'],
    where: { pollId },
    _count: { optionIdx: true },
  });
  return votes.map((v) => ({ optionIdx: v.optionIdx, count: v._count.optionIdx }));
}

async function closePoll(pollId: string, streamId: string) {
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll || poll.status !== 'active') return;

  await prisma.poll.update({ where: { id: pollId }, data: { status: 'closed' } });

  const results = await getPollResults(pollId);
  const totalVotes = results.reduce((s, r) => s + r.count, 0);
  const opts = poll.options as { idx: number; text: string }[];

  const summary = opts.map((o) => {
    const r = results.find((v) => v.optionIdx === o.idx);
    const count = r?.count ?? 0;
    const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
    return `${o.text}: ${pct}% (${count} votes)`;
  }).join(' | ');

  getIO().to(`stream:${streamId}`).emit('poll:ended', {
    pollId,
    question: poll.question,
    results,
    summary,
  });

  // Dispatch webhook
  try {
    const { dispatchWebhook } = await import('./webhooks.js');
    const stream = await prisma.stream.findUnique({ where: { id: streamId } });
    if (stream) {
      await dispatchWebhook(stream.creatorId, 'poll.ended', {
        streamId,
        pollId,
        question: poll.question,
        results,
        summary,
      });
    }
  } catch {}
}

export default router;
