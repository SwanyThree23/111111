import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Play, Square, Users, Activity, Zap, Clock, Eye, EyeOff,
  ArrowLeft, Copy, Lock, DollarSign, Radio,
} from 'lucide-react';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Stream, StreamStats } from '@/types';
import TipJar from '@/components/TipJar';
import ChatPanel from '@/components/ChatPanel';

const PAYWALL_PREVIEW_SEC = 120;
const CREATOR_SHARE = 0.90;

const STATUS_BADGE: Record<string, string> = {
  LIVE: 'badge badge-live',
  STARTING: 'badge badge-warning',
  STOPPING: 'badge badge-warning',
  STOPPED: 'badge badge-info',
  ERROR: 'badge badge-error',
  IDLE: 'badge bg-white/10 text-white/50',
};

export default function StreamView() {
  const { id } = useParams<{ id: string }>();
  const [stream, setStream] = useState<Stream | null>(null);
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  // Paywall state
  const [previewElapsed, setPreviewElapsed] = useState(0);
  const [paywallActive, setPaywallActive] = useState(false);
  const [paywallUnlocked, setPaywallUnlocked] = useState(false);
  const [isTipping, setIsTipping] = useState(false);
  const [creatorRevenue] = useState(() => Math.floor((Math.random() * 100 + 10) * CREATOR_SHARE));

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const previewTimerRef = useRef<ReturnType<typeof setInterval>>();

  const { isConnected, lastMessage } = useWebSocket(id, {
    onMessage: (msg) => {
      if (msg.type === 'metrics' && msg.streamId === id) {
        setStats((prev) => ({
          ...prev,
          ...msg.data,
          streamId: id!,
          id: prev?.id || '',
          timestamp: new Date().toISOString(),
          duration: prev?.duration ?? 0,
          viewers: msg.data.viewers ?? prev?.viewers ?? 0,
          bitrate: msg.data.bitrate ?? 0,
          fps: msg.data.fps ?? 0,
        }));
      }
      if (msg.type === 'stream_status' && msg.streamId === id) {
        setStream((prev) => prev ? { ...prev, status: msg.status, isLive: msg.status === 'LIVE' } : prev);
      }
    },
  });

  useEffect(() => {
    if (id) fetchStream();
  }, [id]);

  useEffect(() => {
    if (lastMessage?.type === 'metrics') return;
    if (id) fetchStream();
  }, [lastMessage]);

  const fetchStream = async () => {
    try {
      const res = await api.get(`/streams/${id}`);
      const s: Stream = res.data.stream;
      setStream(s);
      if (res.data.stream.stats?.[0]) setStats(res.data.stream.stats[0]);
      if (s.isLive || s.status === 'LIVE') {
        initHLS(s);
        startPreviewTimer();
      }
    } catch {}
  };

  const initHLS = useCallback((s: Stream) => {
    const hlsUrl = `https://seewhylive.online/hls/${s.streamKey}/index.m3u8`;
    if (!videoRef.current) return;

    const vid = videoRef.current;
    if (!vid) return;
    import('hls.js').then(({ default: Hls }) => {
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(hlsUrl);
        hls.attachMedia(vid);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          vid.play().catch(() => {});
        });
        hlsRef.current = hls;
      } else if (vid.canPlayType('application/vnd.apple.mpegurl')) {
        vid.src = hlsUrl;
        vid.play().catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const startPreviewTimer = useCallback(() => {
    if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    previewTimerRef.current = setInterval(() => {
      setPreviewElapsed((prev) => {
        const next = prev + 1;
        if (next >= PAYWALL_PREVIEW_SEC && !paywallUnlocked) {
          setPaywallActive(true);
          if (videoRef.current) videoRef.current.pause();
        }
        return next;
      });
    }, 1000);
  }, [paywallUnlocked]);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, []);

  const unlockPaywall = () => {
    setPaywallUnlocked(true);
    setPaywallActive(false);
    videoRef.current?.play().catch(() => {});
    setIsTipping(false);
    toast.success('Stream unlocked! Enjoy the show.');
  };

  const startStream = async () => {
    setStarting(true);
    try {
      await api.post(`/streams/${id}/start`);
      toast.success('Stream starting...');
    } catch {} finally { setStarting(false); }
  };

  const stopStream = async () => {
    setStopping(true);
    try {
      await api.post(`/streams/${id}/stop`);
      toast.success('Stream stopped');
    } catch {} finally { setStopping(false); }
  };

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success('Copied!'); };

  const previewRemaining = Math.max(0, PAYWALL_PREVIEW_SEC - previewElapsed);
  const isLive = stream ? (stream.isLive || stream.status === 'LIVE' || stream.status === 'STARTING') : false;

  const metricCards = [
    { label: 'Viewers', value: stats?.viewers ?? 0, icon: Users, accent: 'text-blue-400' },
    { label: 'Bitrate', value: stats ? `${Math.round(stats.bitrate)} kbps` : '—', icon: Activity, accent: 'text-gold' },
    { label: 'FPS', value: stats ? `${stats.fps}` : '—', icon: Zap, accent: 'text-green-400' },
    { label: 'Duration', value: stats?.duration ? `${Math.round(stats.duration / 60)}m` : '—', icon: Clock, accent: 'text-burgundy-light' },
  ];

  if (!stream) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Radio className="w-12 h-12 text-white/10 mx-auto mb-3 animate-pulse" />
          <p className="text-white/40 font-mono">Loading stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/streams" className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl tracking-wider text-white">{stream.title.toUpperCase()}</h1>
          {stream.description && <p className="text-white/40 font-mono text-sm">{stream.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="badge badge-success">● Live updates</span>
          ) : (
            <span className="badge bg-white/5 text-white/30">○ Disconnected</span>
          )}
          <span className={STATUS_BADGE[stream.status] || 'badge bg-white/10'}>{stream.status}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!isLive ? (
          <button onClick={startStream} disabled={starting} className="btn-primary flex items-center gap-2 disabled:opacity-40">
            <Play className="w-4 h-4" />
            {starting ? 'Starting...' : 'Start Stream'}
          </button>
        ) : (
          <button onClick={stopStream} disabled={stopping} className="btn-danger flex items-center gap-2 disabled:opacity-40">
            <Square className="w-4 h-4" />
            {stopping ? 'Stopping...' : 'Stop Stream'}
          </button>
        )}
        <Link to={`/vdo-guests/${id}`} className="btn-ghost text-sm">
          <Users className="w-4 h-4 inline mr-2" /> VDO Guests
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Video + metrics */}
        <div className="col-span-8 space-y-4">
          {/* Video player with paywall overlay */}
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-video border border-white/10">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              controls={!paywallActive}
              playsInline
            />

            {!isLive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-obsidian">
                <Radio className="w-16 h-16 text-white/10 mb-3" />
                <p className="text-white/30 font-mono">Stream offline</p>
              </div>
            )}

            {/* Preview timer */}
            {isLive && !paywallActive && !paywallUnlocked && previewElapsed < PAYWALL_PREVIEW_SEC && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 border border-gold/30 px-3 py-1.5 rounded-full">
                <Lock className="w-3 h-3 text-gold" />
                <span className="text-gold font-mono text-xs font-bold">
                  FREE {Math.floor(previewRemaining / 60)}:{String(previewRemaining % 60).padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Paywall overlay */}
            {paywallActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="paywall-fade absolute inset-0" />
                <div className="relative z-10 text-center px-8">
                  <div className="w-16 h-16 bg-gold/20 border border-gold/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-gold" />
                  </div>
                  <h2 className="font-display text-3xl tracking-wider text-white mb-2">GOLDEN PAYWALL</h2>
                  <p className="text-white/60 font-mono text-sm mb-6">
                    Your free preview ended. Send a tip to unlock the full stream.
                  </p>
                  <button
                    onClick={() => setIsTipping(true)}
                    className="btn-gold flex items-center gap-2 mx-auto"
                  >
                    <DollarSign className="w-5 h-5" /> Tip to Unlock
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-3">
            {metricCards.map((c) => (
              <div key={c.label} className="card py-3 flex items-center gap-3">
                <c.icon className={`w-5 h-5 ${c.accent} flex-shrink-0`} />
                <div>
                  <p className={`text-lg font-bold font-mono ${c.accent}`}>{c.value}</p>
                  <p className="text-white/30 text-xs font-mono">{c.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue card */}
          <div className="card border-gold/10 bg-gold/3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-white/40 uppercase tracking-widest mb-1">Creator Revenue (90%)</p>
                <p className="text-2xl font-bold text-gold font-mono">
                  ${creatorRevenue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-gold/30" />
            </div>
          </div>

          {/* Stream key */}
          <div className="card space-y-3">
            <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest">Stream Key</h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  readOnly
                  value={stream.streamKey}
                  className="input font-mono text-sm"
                />
              </div>
              <button onClick={() => setShowKey(!showKey)} className="btn-ghost p-2.5">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => copy(stream.streamKey)} className="btn-ghost p-2.5">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-mono text-white/20">
              RTMP: <code className="text-white/40">rtmp://live.seewhy.live/stream/{'{key}'}</code>
            </p>
          </div>
        </div>

        {/* Chat + tip sidebar */}
        <div className="col-span-4 space-y-4">
          {/* Tip jar */}
          {(isTipping || paywallUnlocked) && (
            <div className="card border-gold/20 bg-gold/5">
              <h3 className="font-display text-xl tracking-wider text-white mb-3">TIP JAR</h3>
              <TipJar
                roomId={id || ''}
                recipientId={stream.userId}
                recipientName={stream.title}
              />
              {isTipping && !paywallUnlocked && (
                <button onClick={unlockPaywall} className="btn-gold w-full mt-3 text-sm">
                  I tipped — unlock stream
                </button>
              )}
            </div>
          )}

          {/* Chat */}
          <div className="card p-0 overflow-hidden" style={{ height: '480px' }}>
            <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-mono text-white/60">LIVE CHAT</span>
            </div>
            <div className="h-[calc(100%-49px)]">
              <ChatPanel roomId={id || ''} enableTranslation />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
