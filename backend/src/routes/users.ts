import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

// ── Public profile ─────────────────────────────────────────────────────────────

router.get('/:username', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        isPublic: true,
        createdAt: true,
        _count: { select: { followers: true, following: true, streams: true } },
        streams: {
          where: { isPublic: true },
          orderBy: [{ isLive: 'desc' }, { createdAt: 'desc' }],
          take: 12,
          select: {
            id: true, title: true, description: true, category: true,
            thumbnailUrl: true, isLive: true, currentViewers: true,
            status: true, startedAt: true, createdAt: true,
            stats: { orderBy: { timestamp: 'desc' }, take: 1, select: { viewers: true } },
          },
        },
      },
    });

    if (!user || !user.isPublic) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Is the requesting user following this creator?
    let isFollowing = false;
    if (req.user) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: req.user.id, followingId: user.id } },
      });
      isFollowing = !!follow;
    }

    // Top tips received (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const tipLeaderboard = await prisma.tip.groupBy({
      by: ['username'],
      where: { toUserId: user.id, createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    res.json({ user, isFollowing, tipLeaderboard });
  } catch (err) {
    logger.error('Get user profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Follow / Unfollow ─────────────────────────────────────────────────────────

router.post('/:username/follow', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const target = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!target || !target.isPublic) { res.status(404).json({ error: 'User not found' }); return; }
    if (target.id === req.user!.id) { res.status(400).json({ error: 'Cannot follow yourself' }); return; }

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: req.user!.id, followingId: target.id } },
    });

    if (existing) {
      // Unfollow
      await prisma.follow.delete({ where: { id: existing.id } });
      res.json({ following: false });
    } else {
      // Follow + notify
      await prisma.follow.create({ data: { followerId: req.user!.id, followingId: target.id } });
      await prisma.notification.create({
        data: {
          userId:  target.id,
          type:    'new_follower',
          title:   'New follower',
          body:    `${req.user!.username} started following you`,
          data:    { followerId: req.user!.id, followerUsername: req.user!.username },
        },
      });
      res.json({ following: true });
    }
  } catch (err) {
    logger.error('Follow error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Followers / Following lists ───────────────────────────────────────────────

router.get('/:username/followers', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user || !user.isPublic) { res.status(404).json({ error: 'User not found' }); return; }

    const followers = await prisma.follow.findMany({
      where: { followingId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        createdAt: true,
        follower: { select: { id: true, username: true, avatar: true, bio: true } },
      },
    });

    res.json({ followers: followers.map((f) => ({ ...f.follower, followedAt: f.createdAt })) });
  } catch (err) {
    logger.error('Get followers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:username/following', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { username: req.params.username } });
    if (!user || !user.isPublic) { res.status(404).json({ error: 'User not found' }); return; }

    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        createdAt: true,
        following: { select: { id: true, username: true, avatar: true, bio: true } },
      },
    });

    res.json({ following: following.map((f) => ({ ...f.following, followedAt: f.createdAt })) });
  } catch (err) {
    logger.error('Get following error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Notifications (auth required) ────────────────────────────────────────────

router.get('/me/notifications', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });
    res.json({ notifications, unreadCount });
  } catch (err) {
    logger.error('Get notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/me/notifications/read-all', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data:  { isRead: true },
    });
    res.json({ updated: true });
  } catch (err) {
    logger.error('Mark notifications read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/me/notifications/:id/read', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data:  { isRead: true },
    });
    res.json({ updated: true });
  } catch (err) {
    logger.error('Mark notification read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Tip history (own) ─────────────────────────────────────────────────────────

router.get('/me/tips', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [received, sent] = await Promise.all([
      prisma.tip.findMany({
        where: { toUserId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { stream: { select: { id: true, title: true } } },
      }),
      prisma.tip.findMany({
        where: { fromUserId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { stream: { select: { id: true, title: true } } },
      }),
    ]);
    res.json({ received, sent });
  } catch (err) {
    logger.error('Get tips error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Update own profile ────────────────────────────────────────────────────────

router.patch('/me/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      firstName: z.string().optional(),
      lastName:  z.string().optional(),
      bio:       z.string().max(500).optional(),
      avatar:    z.string().url().optional(),
      isPublic:  z.boolean().optional(),
    });
    const body = schema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: body,
      select: { id: true, username: true, email: true, firstName: true, lastName: true, avatar: true, bio: true, isPublic: true },
    });
    res.json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    logger.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
