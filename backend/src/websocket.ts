import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './config/logger';

interface Client {
  ws: WebSocket;
  streamId?: string;
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
          case 'subscribe':
            client.streamId = msg.streamId;
            client.userId = msg.userId;
            ws.send(JSON.stringify({ type: 'subscribed', streamId: msg.streamId }));
            break;
          case 'unsubscribe':
            client.streamId = undefined;
            ws.send(JSON.stringify({ type: 'unsubscribed' }));
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

function broadcast(streamId: string, payload: object): void {
  const msg = JSON.stringify(payload);
  for (const client of clients) {
    if (client.streamId === streamId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}

export function broadcastMetrics(streamId: string, metrics: object): void {
  broadcast(streamId, { type: 'metrics', streamId, data: metrics, timestamp: Date.now() });
}

export function broadcastStreamStatus(streamId: string, status: string): void {
  broadcast(streamId, { type: 'stream_status', streamId, status, timestamp: Date.now() });
}

export function broadcastChatMessage(streamId: string, message: object): void {
  broadcast(streamId, { type: 'chat_message', streamId, data: message, timestamp: Date.now() });
}

export function getConnectedClientsCount(): number {
  return clients.size;
}
