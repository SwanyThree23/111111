import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import authRoutes from './routes/auth.js';
import streamRoutes from './routes/streams.js';
import paymentRoutes from './routes/payments.js';
import guestRoutes from './routes/guests.js';
import chatRoutes from './routes/chat.js';
import fanoutRoutes from './routes/fanout.js';
import vodRoutes from './routes/vods.js';
import overlayRoutes from './routes/overlays.js';
import vstRoutes from './routes/vst.js';
import battleRoutes from './routes/battles.js';
import analyticsRoutes from './routes/analytics.js';
import { createWorkerPool, gracefulShutdown } from './services/mediasoup.js';
import { prisma } from './services/db.js';
import redis from './services/redis.js';
import logger from './services/logger.js';
import { rateLimit } from './middleware/rateLimit.js';

const app = express();
const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: { origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'], credentials: true },
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https:'],
    },
  },
}));

const allowedOrigins = process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000', 'https://seewhylive.com'];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());

// Global Rate Limit
app.use('/api', rateLimit(100, 60, 'global'));

// Stripe webhook needs raw body
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/fanout', fanoutRoutes);
app.use('/api/vods', vodRoutes);
app.use('/api/overlays', overlayRoutes);
app.use('/api/vst', vstRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health checks
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/health/deep', async (_, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({ status: 'ok', db: 'ok', redis: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: (err as Error).message });
  }
});

// MediaSoup signaling via Socket.io
io.on('connection', (socket) => {
  socket.on('join-stream', (streamId: string) => socket.join(`stream:${streamId}`));
  socket.on('leave-stream', (streamId: string) => socket.leave(`stream:${streamId}`));

  socket.on('viewer-join', async ({ streamId }) => {
    await prisma.stream.update({
      where: { id: streamId },
      data: { viewerCount: { increment: 1 } },
    });
    io.to(`stream:${streamId}`).emit('viewer-count-update', { streamId });
  });

  socket.on('viewer-leave', async ({ streamId }) => {
    await prisma.stream.update({
      where: { id: streamId },
      data: { viewerCount: { decrement: 1 } },
    }).catch(() => {});
  });
});

const PORT = parseInt(process.env.PORT ?? '4000');

async function start() {
  await createWorkerPool();
  httpServer.listen(PORT, () => {
    logger.info(`SeeWhy LIVE API running on port ${PORT}`);
  });
}

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled Error', { error: err.message, stack: err.stack, path: req.path });
  res.status(err.status ?? 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, graceful shutdown...');
  await gracefulShutdown();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

start().catch((err) => {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
});

export { io };
