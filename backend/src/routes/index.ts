import { Express } from 'express';
import authRoutes from './auth';
import streamRoutes from './streams';
import vdoRoutes from './vdo';
import analyticsRoutes from './analytics';
import aiRoutes from './ai';
import livekitRoutes from './livekit';
import paymentsRoutes from './payments';
import watchPartyRoutes from './watchparty';
import { logger } from '../config/logger';

export function setupRoutes(app: Express): void {
  logger.info('Setting up API routes');

  app.use('/api/auth', authRoutes);
  app.use('/api/streams', streamRoutes);
  app.use('/api/vdo', vdoRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/livekit', livekitRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/watch-party', watchPartyRoutes);

  // 404 handler
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  logger.info('API routes configured successfully');
}
