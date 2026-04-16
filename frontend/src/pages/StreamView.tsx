import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Square, Users, Activity, Zap, Clock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Stream, StreamStats } from '@/types';

export default function StreamView() {
  const { id } = useParams<{ id: string }>();
  const [stream, setStream] = useState<Stream | null>(null);
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const { isConnected, lastMessage } = useWebSocket(id, {
    onMessage: (msg) => {
      if (msg.type === 'metrics' && msg.streamId === id) {
        setStats((prev) => ({ ...prev, ...msg.data, streamId: id, id: '', timestamp: new Date().toISOString(), duration: 0, viewers: prev?.viewers ?? 0, bitrate: msg.data.bitrate ?? 0, fps: msg.data.fps ?? 0 }));
      }
      if (msg.type === 'stream_status' && msg.streamId === id) {
        setStream((prev) => prev ? { ...prev, status: msg.status, isLive: msg.status === 'LIVE' } : prev);
      }
    },
  });

  useEffect(() => {
    if (id) fetchStream();
  }, [id]);

  const fetchStream = async () => {
    try {
      const res = await api.get(`/streams/${id}`);
      setStream(res.data.stream);
      if (res.data.stream.stats?.[0]) setStats(res.data.stream.stats[0]);
    } catch {
      // handled
    }
  };

  useEffect(() => {
    if (lastMessage?.type === 'metrics') return;
    fetchStream();
  }, [lastMessage]);

  const startStream = async () => {
    setStarting(true);
    try {
      await api.post(`/streams/${id}/start`);
      toast.success('Stream starting...');
    } catch {
      // handled
    } finally {
      setStarting(false);
    }
  };

  const stopStream = async () => {
    setStopping(true);
    try {
      await api.post(`/streams/${id}/stop`);
      toast.success('Stream stopped');
    } catch {
      // handled
    } finally {
      setStopping(false);
    }
  };

  const metricCards = [
    { label: 'Viewers', value: stats?.viewers ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Bitrate', value: stats ? `${Math.round(stats.bitrate)} kbps` : '--', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'FPS', value: stats ? `${stats.fps}` : '--', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Duration', value: stats?.duration ?? 0, icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  if (!stream) {
    return <div className="p-6 text-center text-gray-400">Loading stream...</div>;
  }

  const isLive = stream.isLive || stream.status === 'LIVE' || stream.status === 'STARTING';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/streams" className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{stream.title}</h1>
          {stream.description && <p className="text-gray-500 text-sm">{stream.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-xs text-gray-400">{isConnected ? 'Live updates' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!isLive ? (
          <button onClick={startStream} disabled={starting} className="btn-primary flex items-center gap-2 disabled:opacity-60">
            <Play className="w-4 h-4" />
            {starting ? 'Starting...' : 'Start Stream'}
          </button>
        ) : (
          <button onClick={stopStream} disabled={stopping} className="btn-danger flex items-center gap-2 disabled:opacity-60">
            <Square className="w-4 h-4" />
            {stopping ? 'Stopping...' : 'Stop Stream'}
          </button>
        )}
        <span className={`badge ${stream.status === 'LIVE' ? 'badge-success' : stream.status === 'ERROR' ? 'badge-error' : 'badge-info'}`}>
          {stream.status}
        </span>
        <Link to={`/vdo-guests/${id}`} className="btn-secondary text-sm">VDO Guests</Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <div key={card.label} className="card flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stream Key */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Stream Key</h2>
        <div className="flex items-center gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            readOnly
            value={stream.streamKey}
            className="input font-mono text-sm flex-1"
          />
          <button onClick={() => setShowKey(!showKey)} className="btn-secondary p-2.5">
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { navigator.clipboard.writeText(stream.streamKey); toast.success('Copied!'); }}
            className="btn-secondary text-sm"
          >
            Copy
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          RTMP Ingest: <code className="bg-gray-100 px-1 rounded">rtmp://your-server/live/{stream.streamKey}</code>
        </p>
      </div>

      {/* Destinations */}
      {Array.isArray(stream.destinations) && stream.destinations.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Destinations ({stream.destinations.length})</h2>
          <ul className="space-y-2">
            {(stream.destinations as string[]).map((dest, i) => (
              <li key={i} className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-2 rounded-lg truncate">{dest}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
