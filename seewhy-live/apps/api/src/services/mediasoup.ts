import * as mediasoup from 'mediasoup';
import os from 'os';
import logger from './logger.js';

const NUM_WORKERS = os.cpus().length;
const workers: mediasoup.types.Worker[] = [];
const routers = new Map<string, mediasoup.types.Router>();
const transports = new Map<string, mediasoup.types.WebRtcTransport>();
const producers = new Map<string, mediasoup.types.Producer>();
const consumers = new Map<string, mediasoup.types.Consumer>();

const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
  { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2, preferredPayloadType: 100 },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    preferredPayloadType: 101,
    parameters: { 'x-google-start-bitrate': 1000 },
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    preferredPayloadType: 102,
    parameters: { 'packetization-mode': 1, 'profile-level-id': '4d0032', 'level-asymmetry-allowed': 1 },
  },
];

export async function createWorkerPool(): Promise<void> {
  for (let i = 0; i < NUM_WORKERS; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: 'warn',
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    });

    worker.on('died', () => {
      logger.error(`MediaSoup worker died, pid: ${worker.pid}`);
      process.exit(1);
    });

    workers.push(worker);
  }

  logger.info(`Created ${NUM_WORKERS} MediaSoup workers`);
}

function getLeastLoadedWorker(): mediasoup.types.Worker {
  return workers.reduce((min, w) => (w.appData.routerCount as number ?? 0) < (min.appData.routerCount as number ?? 0) ? w : min);
}

export async function createRouter(streamId: string): Promise<mediasoup.types.RtpCapabilities> {
  const worker = getLeastLoadedWorker();
  const router = await worker.createRouter({ mediaCodecs });
  routers.set(streamId, router);
  worker.appData.routerCount = ((worker.appData.routerCount as number) ?? 0) + 1;
  return router.rtpCapabilities;
}

export function getRouter(streamId: string): mediasoup.types.Router | undefined {
  return routers.get(streamId);
}

export async function createWebRtcTransport(streamId: string, transportId: string): Promise<{
  id: string;
  iceParameters: mediasoup.types.IceParameters;
  iceCandidates: mediasoup.types.IceCandidate[];
  dtlsParameters: mediasoup.types.DtlsParameters;
}> {
  const router = routers.get(streamId);
  if (!router) throw new Error('Router not found for stream');

  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP ?? '127.0.0.1' }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    enableSctp: false,
  });

  transports.set(transportId, transport);

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };
}

export async function connectTransport(transportId: string, dtlsParameters: mediasoup.types.DtlsParameters): Promise<void> {
  const transport = transports.get(transportId);
  if (!transport) throw new Error('Transport not found');
  await transport.connect({ dtlsParameters });
}

export async function createProducer(
  transportId: string,
  producerId: string,
  kind: mediasoup.types.MediaKind,
  rtpParameters: mediasoup.types.RtpParameters
): Promise<string> {
  const transport = transports.get(transportId);
  if (!transport) throw new Error('Transport not found');

  const producer = await transport.produce({ kind, rtpParameters });
  producers.set(producerId, producer);
  return producer.id;
}

export async function createConsumer(
  streamId: string,
  transportId: string,
  consumerId: string,
  producerIdToConsume: string,
  rtpCapabilities: mediasoup.types.RtpCapabilities
): Promise<{
  id: string;
  producerId: string;
  kind: mediasoup.types.MediaKind;
  rtpParameters: mediasoup.types.RtpParameters;
}> {
  const router = routers.get(streamId);
  const transport = transports.get(transportId);
  const producer = producers.get(producerIdToConsume);
  if (!router || !transport || !producer) throw new Error('Router/transport/producer not found');

  if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
    throw new Error('Cannot consume: incompatible RTP capabilities');
  }

  const consumer = await transport.consume({
    producerId: producer.id,
    rtpCapabilities,
    paused: false,
  });

  consumers.set(consumerId, consumer);

  return {
    id: consumer.id,
    producerId: producer.id,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
  };
}

export async function closeRouter(streamId: string): Promise<void> {
  const router = routers.get(streamId);
  if (router) {
    router.close();
    routers.delete(streamId);
  }
}

export function getActiveProducerCount(streamId: string): number {
  const router = routers.get(streamId);
  if (!router) return 0;
  return [...producers.values()].filter((p) => !p.closed).length;
}

export async function gracefulShutdown(): Promise<void> {
  for (const worker of workers) {
    worker.close();
  }
}
