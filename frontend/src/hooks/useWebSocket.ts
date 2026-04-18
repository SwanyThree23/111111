import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:3001/ws';

export function useWebSocket(streamId?: string, options: { onMessage?: (msg: any) => void; onConnect?: () => void; onDisconnect?: () => void } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const attemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        setIsConnected(true);
        attemptsRef.current = 0;
        if (streamId) ws.send(JSON.stringify({ type: 'subscribe', streamId }));
        options.onConnect?.();
      };
      ws.onmessage = (e) => {
        try { const msg = JSON.parse(e.data); setLastMessage(msg); options.onMessage?.(msg); } catch {}
      };
      ws.onclose = () => {
        setIsConnected(false);
        options.onDisconnect?.();
        if (attemptsRef.current < 5) {
          const delay = Math.min(1000 * 2 ** attemptsRef.current, 30000);
          attemptsRef.current++;
          reconnectRef.current = setTimeout(connect, delay);
        }
      };
      ws.onerror = () => {};
      wsRef.current = ws;
    } catch {}
  }, [streamId]);

  const disconnect = useCallback(() => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg));
  }, []);

  useEffect(() => { connect(); return () => disconnect(); }, [connect, disconnect]);

  return { isConnected, lastMessage, sendMessage };
}
