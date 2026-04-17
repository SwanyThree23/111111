import ffmpeg from 'fluent-ffmpeg';
import { prisma } from '../server';
import { broadcastMetrics, broadcastStreamStatus } from '../websocket';
import { logger } from '../config/logger';

interface ActiveStream {
  command: ffmpeg.FfmpegCommand;
  startedAt: Date;
}

class StreamManager {
  private activeStreams = new Map<string, ActiveStream>();

  async startStream(streamId: string): Promise<void> {
    if (this.activeStreams.has(streamId)) {
      throw new Error('Stream is already active');
    }

    const stream = await prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');

    const destinations = stream.destinations as string[];
    if (!destinations || destinations.length === 0) {
      throw new Error('No destinations configured');
    }

    const inputUrl = `rtmp://localhost:1935/live/${stream.streamKey}`;

    const command = ffmpeg(inputUrl)
      .inputOptions(['-re'])
      .videoCodec('copy')
      .audioCodec('copy')
      .format('flv');

    // Output to each destination
    destinations.forEach((dest) => {
      command.output(dest);
    });

    await prisma.stream.update({
      where: { id: streamId },
      data: { status: 'STARTING', isLive: false },
    });

    broadcastStreamStatus(streamId, 'STARTING');

    command.on('start', async () => {
      logger.info(`Stream ${streamId} started`);
      await prisma.stream.update({
        where: { id: streamId },
        data: { status: 'LIVE', isLive: true, startedAt: new Date() },
      });
      broadcastStreamStatus(streamId, 'LIVE');
    });

    command.on('progress', async (progress) => {
      const metrics = {
        bitrate: progress.currentKbps || 0,
        fps: progress.currentFps || 0,
        duration: progress.timemark || '00:00:00',
        frames: progress.frames || 0,
      };

      broadcastMetrics(streamId, metrics);

      try {
        await prisma.streamStats.create({
          data: {
            streamId,
            viewers: 0,
            bitrate: metrics.bitrate,
            fps: metrics.fps,
            resolution: '1920x1080',
            duration: 0,
          },
        });
      } catch (err) {
        logger.warn('Failed to save stream stats:', err);
      }
    });

    command.on('error', async (err) => {
      logger.error(`Stream ${streamId} error:`, err);
      this.activeStreams.delete(streamId);
      await prisma.stream.update({
        where: { id: streamId },
        data: { status: 'ERROR', isLive: false, endedAt: new Date() },
      });
      broadcastStreamStatus(streamId, 'ERROR');
    });

    command.on('end', async () => {
      logger.info(`Stream ${streamId} ended`);
      this.activeStreams.delete(streamId);
      await prisma.stream.update({
        where: { id: streamId },
        data: { status: 'STOPPED', isLive: false, endedAt: new Date() },
      });
      broadcastStreamStatus(streamId, 'STOPPED');
    });

    command.run();
    this.activeStreams.set(streamId, { command, startedAt: new Date() });
  }

  async stopStream(streamId: string): Promise<void> {
    const active = this.activeStreams.get(streamId);
    if (!active) {
      // Still update DB even if not actively tracked
      await prisma.stream.update({
        where: { id: streamId },
        data: { status: 'STOPPED', isLive: false, endedAt: new Date() },
      });
      broadcastStreamStatus(streamId, 'STOPPED');
      return;
    }

    await prisma.stream.update({
      where: { id: streamId },
      data: { status: 'STOPPING' },
    });
    broadcastStreamStatus(streamId, 'STOPPING');

    active.command.kill('SIGTERM');
    this.activeStreams.delete(streamId);

    await prisma.stream.update({
      where: { id: streamId },
      data: { status: 'STOPPED', isLive: false, endedAt: new Date() },
    });
    broadcastStreamStatus(streamId, 'STOPPED');
  }

  async getStreamStatus(streamId: string): Promise<string> {
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      select: { status: true },
    });
    return stream?.status || 'IDLE';
  }

  getAllActiveStreamIds(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  getActiveStreamsCount(): number {
    return this.activeStreams.size;
  }
}

export const streamManager = new StreamManager();
