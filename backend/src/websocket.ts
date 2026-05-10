import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './config/logger';

interface Client {
  ws: WebSocket;
  streamId?: string;
  roomId?: string;
  userId?: string;
}

const clients = new Set<Client>();

export function setupWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket) => {
    const client: Client = { ws };
    clients.add(client);
    logger.info(`WebSocket client connected. Total: ${clients.size}`);

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        switch (msg.type) {
          // ── Stream subscriptions ──────────────────────────────
          case 'subscribe':
            client.streamId = msg.streamId;
            client.userId = msg.userId;
            ws.send(JSON.stringify({ type: 'subscribed', streamId: msg.streamId }));
            break;
          case 'unsubscribe':
            client.streamId = undefined;
            ws.send(JSON.stringify({ type: 'unsubscribed' }));
            break;

          // ── Watch Party room subscriptions ────────────────────
          case 'room_subscribe':
            client.roomId = msg.roomId;
            client.userId = msg.userId;
            ws.send(JSON.stringify({ type: 'room_subscribed', roomId: msg.roomId }));
            break;
          case 'room_unsubscribe':
            client.roomId = undefined;
            ws.send(JSON.stringify({ type: 'room_unsubscribed' }));
            break;

          // ── Watch Party host-to-room relay ────────────────────
          // Host sends these; server fans them out to all room members
          case 'room_video_sync':
          case 'room_slot_update':
          case 'room_meta_update':
          case 'room_participant_join':
          case 'room_participant_leave':
            if (msg.roomId) broadcastRoom(msg.roomId, msg, ws);
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;

          default:
            logger.warn(`Unknown WS message type: ${msg.type}`);
        }
      } catch {
        logger.warn('Failed to parse WebSocket message');
      }
    });

    ws.on('close', () => {
      clients.delete(client);
      logger.info(`WebSocket client disconnected. Total: ${clients.size}`);
    });

    ws.on('error', (err) => {
      logger.error('WebSocket error:', err);
      clients.delete(client);
    });

    ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
  });
}

// ── Broadcast to all subscribers of a stream ─────────────────────────────────
function broadcast(streamId: string, payload: object): void {
  const msg = JSON.stringify(payload);
  for (const client of clients) {
    if (client.streamId === streamId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}

// ── Broadcast to all subscribers of a watch party room ───────────────────────
function broadcastRoom(roomId: string, payload: object, exclude?: WebSocket): void {
  const msg = JSON.stringify(payload);
  for (const client of clients) {
    if (client.roomId === roomId && client.ws.readyState === WebSocket.OPEN && client.ws !== exclude) {
      client.ws.send(msg);
    }
  }
}

// ── Public helpers ────────────────────────────────────────────────────────────
export function broadcastMetrics(streamId: string, metrics: object): void {
  broadcast(streamId, { type: 'metrics', streamId, data: metrics, timestamp: Date.now() });
}

export function broadcastStreamStatus(streamId: string, status: string): void {
  broadcast(streamId, { type: 'stream_status', streamId, status, timestamp: Date.now() });
}

export function broadcastChatMessage(streamId: string, message: object): void {
  broadcast(streamId, { type: 'chat_message', streamId, data: message, timestamp: Date.now() });
}

export function broadcastRoomEvent(roomId: string, event: object): void {
  broadcastRoom(roomId, event);
}

export function getConnectedClientsCount(): number {
  return clients.size;
}
