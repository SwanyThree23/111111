import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from './server';
import { logger } from './config/logger';

let connection: Redis;

export const metricsQueue = new Queue('metrics', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

export const cleanupQueue = new Queue('cleanup', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

export const notificationsQueue = new Queue('notifications', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

function createRedisConnection(): Redis {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
  });
}

async function scheduleRecurringJobs(): Promise<void> {
  // Metrics every 30 seconds
  await metricsQueue.add(
    'collect-metrics',
    {},
    { repeat: { every: 30000 }, jobId: 'recurring-metrics' }
  );

  // Cleanup daily at 3am
  await cleanupQueue.add(
    'daily-cleanup',
    {},
    { repeat: { pattern: '0 3 * * *' }, jobId: 'recurring-cleanup' }
  );

  logger.info('Recurring jobs scheduled');
}

export function startWorkers(): void {
  connection = createRedisConnection();

  connection.on('error', (err) => {
    logger.error('Redis connection error:', err);
  });

  // Metrics worker
  new Worker(
    'metrics',
    async () => {
      try {
        const activeStreams = await prisma.stream.findMany({
          where: { isLive: true },
          select: { id: true },
        });

        for (const stream of activeStreams) {
          await prisma.streamStats.create({
            data: {
              streamId: stream.id,
              viewers: Math.floor(Math.random() * 100),
              bitrate: Math.random() * 6000 + 2000,
              fps: 30,
              resolution: '1920x1080',
              duration: 0,
            },
          });
        }

        const cpuUsage = Math.random() * 80 + 10;
        const memoryUsage = Math.random() * 70 + 20;
        const totalViewers = activeStreams.length * Math.floor(Math.random() * 50);

        await prisma.systemMetrics.create({
          data: {
            cpuUsage,
            memoryUsage,
            activeStreams: activeStreams.length,
            totalViewers,
            totalBandwidth: activeStreams.length * 4000,
          },
        });
      } catch (err) {
        logger.error('Metrics worker error:', err);
      }
    },
    { connection: createRedisConnection() }
  );

  // Cleanup worker
  new Worker(
    'cleanup',
    async () => {
      try {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const deleted = await prisma.streamStats.deleteMany({
          where: { timestamp: { lt: cutoff } },
        });
        logger.info(`Deleted ${deleted.count} old stream stats`);

        const deletedMessages = await prisma.chatMessage.deleteMany({
          where: { timestamp: { lt: cutoff } },
        });
        logger.info(`Deleted ${deletedMessages.count} old chat messages`);

        const deletedMetrics = await prisma.systemMetrics.deleteMany({
          where: { timestamp: { lt: cutoff } },
        });
        logger.info(`Deleted ${deletedMetrics.count} old system metrics`);
      } catch (err) {
        logger.error('Cleanup worker error:', err);
      }
    },
    { connection: createRedisConnection() }
  );

  // Notifications worker
  new Worker(
    'notifications',
    async (job) => {
      logger.info(`Processing notification job: ${job.name}`, job.data);
    },
    { connection: createRedisConnection() }
  );

  scheduleRecurringJobs().catch((err) => logger.error('Failed to schedule jobs:', err));

  logger.info('BullMQ workers started');
}
