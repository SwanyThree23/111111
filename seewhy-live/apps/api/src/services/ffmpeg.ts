import { spawn, ChildProcess } from 'child_process';
import { decryptStreamKey } from './vaultpro.js';
import { prisma } from './db.js';
import logger from './logger.js';

const activeProcesses = new Map<string, ChildProcess[]>();

export async function startFanout(streamId: string, ingestUrl: string): Promise<void> {
  const destinations = await prisma.fanoutDestination.findMany({
    where: { creatorId: (await prisma.stream.findUniqueOrThrow({ where: { id: streamId } })).creatorId, isActive: true },
  });

  const processes: ChildProcess[] = [];

  for (const dest of destinations) {
    const streamKey = decryptStreamKey(dest.streamKey);
    const outputUrl = `${dest.rtmpUrl}/${streamKey}`;

    const proc = spawn('ffmpeg', [
      '-re', '-i', ingestUrl,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-ar', '44100',
      '-f', 'flv',
      outputUrl,
    ], { stdio: 'pipe' });

    proc.stderr?.on('data', (data: Buffer) => {
      logger.debug(`FFmpeg [${dest.platform}]: ${data.toString()}`);
    });

    proc.on('exit', (code) => {
      logger.info(`FFmpeg [${dest.platform}] exited with code ${code}`);
    });

    processes.push(proc);
  }

  activeProcesses.set(streamId, processes);
}

export function stopFanout(streamId: string): void {
  const procs = activeProcesses.get(streamId);
  if (procs) {
    procs.forEach((p) => p.kill('SIGTERM'));
    activeProcesses.delete(streamId);
  }
}

export async function extractHypeClip(rtmpUrl: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-i', rtmpUrl,
      '-t', '30',
      '-c', 'copy',
      '-f', 'mp4',
      outputPath,
    ]);

    proc.on('exit', (code) => {
      if (code === 0) resolve(outputPath);
      else reject(new Error(`FFmpeg clip extraction failed with code ${code}`));
    });
  });
}
