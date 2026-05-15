import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Play, Square, Users, Activity, Zap, Clock, Eye, EyeOff,
  ArrowLeft, Copy, Lock, DollarSign, Radio, UserPlus, Tv2,
  MessageCircle, ChevronRight,
} from 'lucide-react';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/utils/auth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Stream, StreamStats } from '@/types';
import TipJar from '@/components/TipJar';
import ChatPanel from '@/components/ChatPanel';
import ParticipantTile, { PanelSlot } from '@/components/ParticipantTile';

const PAYWALL_PREVIEW_SEC = 120;
const CREATOR_SHARE = 0.90;

const STATUS_BADGE: Record<string, string> = {
  LIVE:     'badge badge-live',
  STARTING: 'badge badge-warning',
  STOPPING: 'badge badge-warning',
  STOPPED:  'badge badge-info',
  ERROR:    'badge badge-error',
  IDLE:     'badge bg-white/10 text-white/50',
};

export default function StreamView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stream, setStream] = useState<Stream | null>(null);
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [sideOpen, setSideOpen] = useState(true);

  // Paywall
  const [previewElapsed, setPreviewElapsed] = useState(0);
  const [paywallActive, setPaywallActive] = useState(false);
  const [paywallUnlocked, setPaywallUnlocked] = useState(false);
  const [isTipping, setIsTipping] = useState(false);
  const [creatorRevenue] = useState(() => Math.floor((Math.random() * 100 + 10) * CREATOR_SHARE));

  // Panel guests (participant strip)
  const [guestSlots, setGuestSlots] = useState<PanelSlot[]>([]);

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

  useEffect(() => { if (id) fetchStream(); }, [id]);

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
        loadGuestPanel(id!);
      }
    } catch {}
  };

  const loadGuestPanel = async (streamId: string) => {
    try {
      const res = await api.get(`/vdo/rooms/stream/${streamId}`);
      const participants = res.data.room?.participants || [];
      const slots: PanelSlot[] = [
        ...participants.map((p: any, i: number) => ({
          id: `guest-${i}`,
          type: 'camera' as const,
          label: p.name,
          participantId: p.id,
          isHost: p.role === 'director',
        })),
        ...Array.from({ length: Math.max(0, 5 - participants.length) }, (_, i) => ({
          id: `empty-${i}`,
          type: 'empty' as const,
        })),
      ];
      setGuestSlots(slots.slice(0, 8));
    } catch {
      setGuestSlots([]);
    }
  };

  const initHLS = useCallback((s: Stream) => {
    const hlsUrl = `https://seewhylive.online/hls/${s.streamKey}/index.m3u8`;
    const vid = videoRef.current;
    if (!vid) return;
    import('hls.js').then(({ default: Hls }) => {
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(hlsUrl);
        hls.attachMedia(vid);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { vid.play().catch(() => {}); });
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
          videoRef.current?.pause();
        }
        return next;
      });
    }, 1000);
  }, [paywallUnlocked]);

  useEffect(() => () => {
    clearInterval(previewTimerRef.current);
    hlsRef.current?.destroy();
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
    try { await api.post(`/streams/${id}/start`); toast.success('Stream starting...'); }
    catch {} finally { setStarting(false); }
  };

  const stopStream = async () => {
    setStopping(true);
    try { await api.post(`/streams/${id}/stop`); toast.success('Stream stopped'); }
    catch {} finally { setStopping(false); }
  };

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success('Copied!'); };

  const previewRemaining = Math.max(0, PAYWALL_PREVIEW_SEC - previewElapsed);
  const isLive = stream ? (stream.isLive || stream.status === 'LIVE' || stream.status === 'STARTING') : false;
  const isOwner = stream?.userId === user?.id;

  const metricCards = [
    { label: 'Viewers', value: stats?.viewers ?? 0,  icon: Users,    accent: 'text-blue-400'       },
    { label: 'Bitrate', value: stats ? `${Math.round(stats.bitrate)} kbps` : '—', icon: Activity, accent: 'text-gold' },
    { label: 'FPS',     value: stats ? `${stats.fps}` : '—', icon: Zap, accent: 'text-green-400'  },
    { label: 'Duration',value: stats?.duration ? `${Math.round(stats.duration / 60)}m` : '—', icon: Clock, accent: 'text-burgundy-light' },
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
    <div className="min-h-screen bg-obsidian text-white flex flex-col">
      {/* ── STREAM HEALTH BAR ──────────────────────────────────── */}
      {isLive && (
        <div className="flex items-center gap-4 px-6 h-9 flex-shrink-0"
             style={{ background: 'rgba(10,10,20,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-1.5">
            <span className="live-dot" />
            <span className="text-red-300 font-mono text-xs font-bold">LIVE</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          {metricCards.map((c) => (
            <div key={c.label} className="flex items-center gap-1.5">
              <c.icon className="w-3 h-3 text-white/25" />
              <span className={`text-xs font-mono ${c.accent}`}>{c.value}</span>
              <span className="text-[9px] font-mono text-white/20">{c.label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-3">
            {isConnected
              ? <span className="text-[9px] font-mono text-green-400">● Live updates</span>
              : <span className="text-[9px] font-mono text-white/30">○ Offline</span>
            }
            {isOwner && (
              <Link to={`/vdo-guests/${id}`} className="flex items-center gap-1 text-[10px] font-mono text-white/40 hover:text-white/70 transition">
                <UserPlus className="w-3 h-3" /> Manage Guests
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left: video + panel strip */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Page header */}
          <div className="px-6 py-4 flex items-center gap-3"
               style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Link to="/streams" className="btn-ghost p-2 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl xl:text-3xl tracking-wider text-white truncate">{stream.title.toUpperCase()}</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={STATUS_BADGE[stream.status] || 'badge bg-white/10'}>{stream.status}</span>
              {!isLive
                ? <button onClick={startStream} disabled={starting} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40"><Play className="w-4 h-4" />{starting ? 'Starting…' : 'Start'}</button>
                : isOwner && <button onClick={stopStream} disabled={stopping} className="btn-danger flex items-center gap-2 text-sm disabled:opacity-40"><Square className="w-4 h-4" />{stopping ? 'Stopping…' : 'Stop'}</button>
              }
              <button onClick={() => setSideOpen((o) => !o)} className={`p-2 rounded-lg transition ${sideOpen ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40 hover:bg-white/8'}`}>
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Video player */}
          <div className="relative bg-black flex-shrink-0" style={{ aspectRatio: '16/9', maxHeight: '70vh' }}>
            <video ref={videoRef} className="w-full h-full object-contain" controls={!paywallActive} playsInline />

            {/* Offline overlay */}
            {!isLive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-obsidian">
                <Radio className="w-16 h-16 text-white/10 mb-3" />
                <p className="text-white/30 font-mono">Stream offline</p>
                {isOwner && (
                  <button onClick={startStream} disabled={starting} className="btn-primary mt-4 flex items-center gap-2">
                    <Play className="w-4 h-4" /> {starting ? 'Starting…' : 'Start Stream'}
                  </button>
                )}
              </div>
            )}

            {/* Paywall countdown badge */}
            {isLive && !paywallActive && !paywallUnlocked && stream.paywallEnabled && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                   style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(201,175,55,0.35)' }}>
                <Lock className="w-3 h-3 text-gold" />
                <span className="text-gold font-mono text-xs font-bold">
                  FREE {Math.floor(previewRemaining / 60)}:{String(previewRemaining % 60).padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Golden Paywall overlay */}
            {paywallActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {/* Frosted backdrop */}
                <div className="absolute inset-0" style={{ backdropFilter: 'blur(12px)', background: 'rgba(7,7,13,0.75)' }} />
                <div className="relative z-10 text-center px-8 max-w-sm mx-auto">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                       style={{ background: 'rgba(201,175,55,0.15)', border: '1px solid rgba(201,175,55,0.3)' }}>
                    <Lock className="w-8 h-8 text-gold" />
                  </div>
                  <h2 className="font-display text-3xl tracking-wider text-white mb-2">GOLDEN PAYWALL</h2>
                  <p className="text-white/50 font-mono text-sm mb-6">
                    Your free preview ended. Tip the creator to unlock the full stream.
                  </p>
                  <button
                    onClick={() => setIsTipping(true)}
                    className="btn-gold flex items-center gap-2 mx-auto text-base"
                  >
                    <DollarSign className="w-5 h-5" /> Tip to Unlock
                  </button>
                  <p className="text-white/25 text-xs font-mono mt-4">90% goes directly to the creator</p>
                </div>
              </div>
            )}
          </div>

          {/* ── GUEST PANEL STRIP ─────────────────────────────── */}
          {isLive && guestSlots.length > 0 && (
            <div className="px-4 py-3 flex-shrink-0"
                 style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,20,0.8)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Live Panel</span>
                <Link to={`/vdo-guests/${id}`} className="text-[10px] font-mono text-white/30 hover:text-gold transition flex items-center gap-1">
                  Manage <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {guestSlots.map((slot) => (
                  <div key={slot.id} className="flex-shrink-0 w-28">
                    <ParticipantTile
                      slot={slot}
                      isCurrentUserHost={false}
                      onAddContent={() => {}}
                      onMute={() => {}}
                      onKick={() => {}}
                      onPin={() => {}}
                      onClear={() => {}}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LOWER AREA: metrics + stream key (owner only) ──── */}
          <div className="p-6 space-y-4 flex-1">
            {/* Revenue card */}
            {isOwner && (
              <div className="card border-gold/10 bg-gold/3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-white/40 uppercase tracking-widest mb-1">Creator Revenue (90%)</p>
                  <p className="text-2xl font-bold text-gold font-mono">${creatorRevenue.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link to={`/vdo-guests/${id}`} className="btn-ghost text-sm flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> Guests
                  </Link>
                  <button
                    onClick={() => navigate(`/watch-party/stream-${id}`)}
                    className="btn-ghost text-sm flex items-center gap-1.5"
                  >
                    <Tv2 className="w-4 h-4" /> Watch Party
                  </button>
                </div>
              </div>
            )}

            {/* Stream key (owner) */}
            {isOwner && (
              <div className="card space-y-3">
                <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest">Stream Key</h3>
                <div className="flex gap-2">
                  <input type={showKey ? 'text' : 'password'} readOnly value={stream.streamKey} className="input font-mono text-sm flex-1" />
                  <button onClick={() => setShowKey(!showKey)} className="btn-ghost p-2.5">{showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  <button onClick={() => copy(stream.streamKey)} className="btn-ghost p-2.5"><Copy className="w-4 h-4" /></button>
                </div>
                <p className="text-xs font-mono text-white/20">
                  RTMP: <code className="text-white/40">rtmp://live.seewhy.live/stream/{'{key}'}</code>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ──────────────────────────────────── */}
        {sideOpen && (
          <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col"
               style={{ background: '#11111B', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>

            {/* Tip jar */}
            {(isTipping || paywallUnlocked) && (
              <div className="p-4 flex-shrink-0"
                   style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(201,175,55,0.05)' }}>
                <h3 className="font-display text-lg tracking-wider text-white mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gold" /> TIP JAR
                </h3>
                <TipJar roomId={id || ''} recipientId={stream.userId} recipientName={stream.title} />
                {isTipping && !paywallUnlocked && (
                  <button onClick={unlockPaywall} className="btn-gold w-full mt-3 text-sm">
                    I tipped — unlock stream
                  </button>
                )}
              </div>
            )}

            {/* Chat */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 flex-shrink-0 flex items-center gap-2"
                   style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
                <span className="text-xs font-mono text-white/50">LIVE CHAT</span>
                {!isLive && !isTipping && (
                  <button onClick={() => setIsTipping(true)} className="ml-auto text-xs font-mono text-gold hover:text-gold-light transition flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Tip
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatPanel roomId={id || ''} enableTranslation />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
