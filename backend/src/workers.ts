import { Queue, Worker } from 'bullmq';
import { prisma } from './server';
import { logger } from './config/logger';
import { getViewerCount, broadcastRoomEvent } from './websocket';

const REDIS_CONN = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const metricsQueue = new Queue('metrics', { connection: REDIS_CONN });
export const cleanupQueue = new Queue('cleanup', { connection: REDIS_CONN });
export const notificationsQueue = new Queue('notifications', { connection: REDIS_CONN });

function redisConn() {
  return { ...REDIS_CONN, maxRetriesPerRequest: null as null };
}

async function scheduleRecurringJobs(): Promise<void> {
  await metricsQueue.add('collect-metrics', {}, {
    repeat: { every: 30000 },
    jobId: 'recurring-metrics',
  });
  await cleanupQueue.add('daily-cleanup', {}, {
    repeat: { pattern: '0 3 * * *' },
    jobId: 'recurring-cleanup',
  });
  logger.info('Recurring jobs scheduled');
}

export function startWorkers(): void {
  // ── Metrics worker ────────────────────────────────────────────────────────
  new Worker(
    'metrics',
    async () => {
      try {
        const activeStreams = await prisma.stream.findMany({
          where: { isLive: true },
          select: { id: true },
        });

        for (const stream of activeStreams) {
          const viewers = getViewerCount(stream.id);

          await prisma.streamStats.create({
            data: {
              streamId:   stream.id,
              viewers,
              bitrate:    4500 + Math.random() * 1500,
              fps:        30,
              resolution: '1920x1080',
              duration:   0,
            },
          });
        }

        const totalViewers = activeStreams.reduce(
          (sum, s) => sum + getViewerCount(s.id), 0
        );

        await prisma.systemMetrics.create({
          data: {
            cpuUsage:      Math.random() * 40 + 10,
            memoryUsage:   Math.random() * 30 + 30,
            activeStreams:  activeStreams.length,
            totalViewers,
            totalBandwidth: activeStreams.length * 4500,
          },
        });
      } catch (err) {
        logger.error('Metrics worker error:', err);
      }
    },
    { connection: redisConn() }
  );

  // ── Cleanup worker ────────────────────────────────────────────────────────
  new Worker(
    'cleanup',
    async () => {
      try {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [stats, messages, metrics] = await Promise.all([
          prisma.streamStats.deleteMany({ where: { timestamp: { lt: cutoff } } }),
          prisma.chatMessage.deleteMany({ where: { timestamp: { lt: cutoff } } }),
          prisma.systemMetrics.deleteMany({ where: { timestamp: { lt: cutoff } } }),
        ]);

        await prisma.stream.updateMany({
          where: { isLive: false, endedAt: { lt: new Date(Date.now() - 3600 * 1000) } },
          data:  { currentViewers: 0 },
        });

        logger.info(
          `Cleanup: ${stats.count} stats, ${messages.count} messages, ${metrics.count} metrics`
        );
      } catch (err) {
        logger.error('Cleanup worker error:', err);
      }
    },
    { connection: redisConn() }
  );

  // ── Notifications worker ──────────────────────────────────────────────────
  new Worker(
    'notifications',
    async (job) => {
      const { type, userId, payload } = job.data as {
        type: string;
        userId: string;
        payload: Record<string, unknown>;
      };

      try {
        switch (type) {
          case 'stream_live': {
            const followers = await prisma.follow.findMany({
              where: { followingId: userId },
              select: { followerId: true },
            });
            if (followers.length === 0) break;

            const stream = await prisma.stream.findUnique({
              where: { id: payload.streamId as string },
              select: { title: true, user: { select: { username: true } } },
            });
            if (!stream) break;

            await prisma.notification.createMany({
              data: followers.map((f) => ({
                userId: f.followerId,
                type:   'stream_live',
                title:  `${stream.user.username} is live!`,
                body:   stream.title,
                data:   { streamId: String(payload.streamId), creatorId: userId } as any,
              })),
            });

            broadcastRoomEvent('global', {
              type:     'creator_live',
              userId,
              streamId: payload.streamId,
              title:    stream.title,
              username: stream.user.username,
            });
            break;
          }

          default:
            logger.info(`Notification job ${type}:`, payload);
        }
      } catch (err) {
        logger.error(`Notification worker error (${type}):`, err);
      }
    },
    { connection: redisConn() }
  );

  scheduleRecurringJobs().catch((err) => logger.error('Failed to schedule jobs:', err));
  logger.info('BullMQ workers started');
}
