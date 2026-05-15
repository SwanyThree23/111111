import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, Settings2,
  Play, Square, Radio, Camera, AlertCircle, CheckCircle,
  Loader, Copy, Eye, EyeOff, Lock, Unlock, Globe,
  Users, Activity, Zap, Clock, Tv2, Link2, UserPlus,
  LayoutGrid, Pin, X, Crown,
} from 'lucide-react';
import api from '@/utils/api';
import { useAuth } from '@/utils/auth';
import { useWebSocket } from '@/hooks/useWebSocket';
import toast from 'react-hot-toast';
import ParticipantTile, { PanelSlot } from '@/components/ParticipantTile';

// ── Constants ─────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'youtube',  label: 'YouTube',   color: 'bg-red-700   border-red-600'   },
  { id: 'twitch',   label: 'Twitch',    color: 'bg-purple-800 border-purple-600'},
  { id: 'tiktok',   label: 'TikTok',    color: 'bg-gray-800  border-gray-600'  },
  { id: 'facebook', label: 'Facebook',  color: 'bg-blue-800  border-blue-600'  },
  { id: 'kick',     label: 'Kick',      color: 'bg-green-800 border-green-600' },
  { id: 'twitter',  label: 'X / Twitter',color:'bg-zinc-800  border-zinc-600'  },
];

const SCENES = [
  { id: 'camera', label: 'Camera',  Icon: Camera    },
  { id: 'screen', label: 'Screen',  Icon: MonitorUp },
  { id: 'grid',   label: 'Panel',   Icon: LayoutGrid},
  { id: 'guest',  label: 'Spotlight',Icon: Pin       },
] as const;
type Scene = (typeof SCENES)[number]['id'];

type PermState = 'idle' | 'requesting' | 'granted' | 'denied';

const EMPTY_PANEL = (label: string, userId: string): PanelSlot[] => [
  { id: 'slot-1', type: 'camera', label, participantId: userId, isHost: true },
  ...Array.from({ length: 19 }, (_, i) => ({ id: `slot-${i + 2}`, type: 'empty' as const })),
];

function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

// ── Component ──────────────────────────────────────────────────
export default function GoLive() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Media state ──────────────────────────────────────────────
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micPerm, setMicPerm]   = useState<PermState>('idle');
  const [camPerm, setCamPerm]   = useState<PermState>('idle');
  const [isMuted,   setIsMuted]   = useState(false);
  const [isCamOff,  setIsCamOff]  = useState(false);
  const [isScreenShare, setIsScreenShare] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // ── Stream setup state ───────────────────────────────────────
  const [title,    setTitle]    = useState('');
  const [tags,     setTags]     = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['youtube', 'twitch']);
  const [paywallEnabled, setPaywallEnabled] = useState(false);
  const [isPublic,  setIsPublic]  = useState(true);
  const [category,  setCategory]  = useState('');
  const [quality,  setQuality]  = useState<'1080p' | '720p' | '480p'>('1080p');
  const [showSettings, setShowSettings] = useState(false);
  const [streamKey, setStreamKey] = useState('');
  const [showKey,  setShowKey]  = useState(false);

  // ── Live broadcast state ─────────────────────────────────────
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState('');
  const [scene, setScene] = useState<Scene>('camera');
  const [panelSlots, setPanelSlots] = useState<PanelSlot[]>([]);
  const [inviteTarget, setInviteTarget] = useState<string | null>(null);
  const [vdoGuestUrl, setVdoGuestUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [liveStats, setLiveStats] = useState({ viewers: 0, bitrate: 0, fps: 30 });
  const durationRef = useRef<ReturnType<typeof setInterval>>();

  const RTMP_URL = 'rtmp://live.seewhy.live/stream';

  // ── WebSocket for live metrics ───────────────────────────────
  const { isConnected } = useWebSocket(currentStreamId || undefined, {
    onMessage: (msg) => {
      if (msg.type === 'metrics' && msg.streamId === currentStreamId) {
        setLiveStats({
          viewers: msg.data?.viewers ?? 0,
          bitrate: msg.data?.bitrate ?? 0,
          fps:     msg.data?.fps ?? 30,
        });
      }
    },
  });

  // ── Init ─────────────────────────────────────────────────────
  useEffect(() => {
    requestPerms();
    fetchStreamKey();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      clearInterval(durationRef.current);
    };
  }, []);

  // ── Duration timer ───────────────────────────────────────────
  useEffect(() => {
    if (isLive) {
      const startAt = Date.now();
      durationRef.current = setInterval(() => setDuration(Math.floor((Date.now() - startAt) / 1000)), 1000);
    } else {
      clearInterval(durationRef.current);
      setDuration(0);
    }
    return () => clearInterval(durationRef.current);
  }, [isLive]);

  const fetchStreamKey = async () => {
    try {
      const res = await api.get('/streams/my-key');
      setStreamKey(res.data.streamKey || '');
    } catch {
      setStreamKey('sk_' + Math.random().toString(36).slice(2, 18).toUpperCase());
    }
  };

  const requestPerms = async () => {
    setMicPerm('requesting'); setCamPerm('requesting');
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 }, audio: true });
      setStream(ms);
      setMicPerm('granted'); setCamPerm('granted');
      if (videoRef.current) videoRef.current.srcObject = ms;
      monitorAudio(ms);
    } catch {
      setMicPerm('denied'); setCamPerm('denied');
      toast.error('Camera/mic access required.');
    }
  };

  const monitorAudio = (ms: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(ms).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        setAudioLevel(data.reduce((a, b) => a + b, 0) / data.length);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {}
  };

  // ── Media controls ───────────────────────────────────────────
  const toggleMic = () => { stream?.getAudioTracks().forEach((t) => { t.enabled = isMuted; }); setIsMuted(!isMuted); };
  const toggleCam = () => { stream?.getVideoTracks().forEach((t) => { t.enabled = isCamOff; }); setIsCamOff(!isCamOff); };

  const toggleScreen = async () => {
    if (!isScreenShare) {
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = ss;
        ss.getVideoTracks()[0].onended = () => { setIsScreenShare(false); if (videoRef.current && stream) videoRef.current.srcObject = stream; };
        setIsScreenShare(true);
        setScene('screen');
      } catch { toast.error('Screen sharing denied'); }
    } else {
      setIsScreenShare(false);
      if (videoRef.current && stream) videoRef.current.srcObject = stream;
      setScene('camera');
    }
  };

  // ── Go Live ──────────────────────────────────────────────────
  const goLive = async () => {
    if (!title.trim()) { toast.error('Enter a stream title'); return; }
    if (platforms.length === 0) { toast.error('Select at least one platform'); return; }
    setIsGoingLive(true);
    try {
      const res = await api.post('/streams', {
        title,
        destinations: platforms,
        paywallEnabled,
        paywallPreviewSeconds: 120,
        isPublic,
        category: category || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      const sid = res.data.stream?.id;
      if (sid) {
        setCurrentStreamId(sid);
        await api.post(`/streams/${sid}/start`);
        setupVdoRoom(sid);
      }
      setPanelSlots(EMPTY_PANEL(user?.username || 'Host', user?.id || 'host'));
      setIsLive(true);
      toast.success(`Live on ${platforms.length} platform${platforms.length > 1 ? 's' : ''}!`);
    } catch {
      toast.error('Failed to go live. Check Settings → API Keys.');
    } finally { setIsGoingLive(false); }
  };

  const endStream = async () => {
    if (currentStreamId) try { await api.post(`/streams/${currentStreamId}/stop`); } catch {}
    stream?.getTracks().forEach((t) => t.stop());
    setIsLive(false);
    toast('Stream ended');
    navigate('/dashboard');
  };

  // ── VDO.Ninja setup ──────────────────────────────────────────
  const setupVdoRoom = useCallback(async (sid: string) => {
    try {
      const res = await api.get(`/vdo/rooms/stream/${sid}`);
      setVdoGuestUrl(res.data.room?.guestUrl || '');
    } catch {
      try {
        const res = await api.post('/vdo/rooms', { streamId: sid });
        setVdoGuestUrl(res.data.room?.guestUrl || '');
      } catch {}
    }
  }, []);

  // ── Panel controls (live mode) ───────────────────────────────
  const handlePanelAddContent = (slotId: string) => setInviteTarget(slotId);
  const handlePanelPin   = (slotId: string) => setPanelSlots((p) => p.map((s) => ({ ...s, isPinned: s.id === slotId ? !s.isPinned : false })));
  const handlePanelMute  = (slotId: string) => setPanelSlots((p) => p.map((s) => s.id === slotId ? { ...s, isMuted: !s.isMuted } : s));
  const handlePanelKick  = (slotId: string) => setPanelSlots((p) => p.map((s) => s.id === slotId ? { id: s.id, type: 'empty' } : s));
  const handlePanelClear = (slotId: string) => setPanelSlots((p) => p.map((s) => s.id === slotId ? { id: s.id, type: 'empty' } : s));

  const copyLink = (url: string) => { navigator.clipboard.writeText(url); toast.success('Copied!'); };

  const activePanelCount = panelSlots.filter((s) => s.type !== 'empty').length;

  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  // LIVE BROADCAST CONTROL ROOM
  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  if (isLive) {
    return (
      <div className="h-screen flex flex-col text-white overflow-hidden" style={{ background: '#07070D' }}>

        {/* ── TOP STATS BAR ─────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 h-12 flex-shrink-0 overflow-x-auto"
             style={{ background: '#11111B', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {/* LIVE badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full flex-shrink-0"
               style={{ background: 'rgba(153,27,27,0.4)', border: '1px solid rgba(185,28,28,0.5)' }}>
            <span className="live-dot" />
            <span className="text-red-300 font-mono text-xs font-bold">LIVE</span>
          </div>

          {/* Platforms */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {platforms.map((p) => (
              <span key={p} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/8 text-white/60 uppercase">
                {p === 'twitter' ? 'X' : p.slice(0, 2).toUpperCase()}
              </span>
            ))}
          </div>

          <div className="w-px h-4 bg-white/10 flex-shrink-0" />

          {/* Metrics */}
          {[
            { label: 'VIEWERS', value: liveStats.viewers, Icon: Users },
            { label: 'BITRATE', value: `${Math.round(liveStats.bitrate)}k`, Icon: Activity },
            { label: 'FPS',     value: liveStats.fps, Icon: Zap },
            { label: 'TIME',    value: fmtDuration(duration), Icon: Clock },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="flex items-center gap-1.5 flex-shrink-0">
              <Icon className="w-3 h-3 text-white/30" />
              <span className="text-xs font-mono text-white/60">{value}</span>
              <span className="text-[9px] font-mono text-white/20">{label}</span>
            </div>
          ))}

          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {isConnected
              ? <span className="text-[9px] font-mono text-green-400">● CONNECTED</span>
              : <span className="text-[9px] font-mono text-red-400">○ OFFLINE</span>
            }
            <button
              onClick={endStream}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-red-300 border border-red-800/50 bg-red-900/30 hover:bg-red-900/50 transition"
            >
              <Square className="w-3 h-3" /> End Stream
            </button>
          </div>
        </div>

        {/* ── CONTROL ROOM BODY ─────────────────────────────── */}
        <div className="flex flex-1 min-h-0 p-2 gap-2 overflow-hidden">

          {/* Left: preview + scene switcher */}
          <div className="w-48 xl:w-56 flex-shrink-0 flex flex-col gap-2">
            {/* Preview */}
            <div className="rounded-xl overflow-hidden relative flex-shrink-0"
                 style={{ aspectRatio: '16/9', background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.08)' }}>
              <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isCamOff && scene === 'camera' ? 'opacity-0' : ''}`} />
              {isCamOff && scene === 'camera' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white/10" />
                </div>
              )}
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600/80">
                <span className="live-dot" /><span className="text-[9px] font-mono text-white">PREVIEW</span>
              </div>
              {/* Audio VU */}
              {!isMuted && (
                <div className="absolute bottom-1.5 left-1.5 flex items-end gap-px h-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="vu-bar" style={{ height: `${Math.min(100, (audioLevel / 40) * 100 * (0.2 + i / 6 * 0.8))}%`, minHeight: '2px', width: '3px' }} />
                  ))}
                </div>
              )}
            </div>

            {/* Media buttons */}
            <div className="flex gap-1.5">
              <button onClick={toggleMic} className={`flex-1 p-2 rounded-xl text-center transition ${isMuted ? 'bg-red-900/50 text-red-300' : 'bg-white/6 hover:bg-white/10 text-white/70'}`}>
                {isMuted ? <MicOff className="w-4 h-4 mx-auto" /> : <Mic className="w-4 h-4 mx-auto" />}
              </button>
              <button onClick={toggleCam} className={`flex-1 p-2 rounded-xl text-center transition ${isCamOff ? 'bg-red-900/50 text-red-300' : 'bg-white/6 hover:bg-white/10 text-white/70'}`}>
                {isCamOff ? <VideoOff className="w-4 h-4 mx-auto" /> : <Video className="w-4 h-4 mx-auto" />}
              </button>
              <button onClick={toggleScreen} className={`flex-1 p-2 rounded-xl text-center transition ${isScreenShare ? 'bg-burgundy/50 text-white' : 'bg-white/6 hover:bg-white/10 text-white/70'}`}>
                <MonitorUp className="w-4 h-4 mx-auto" />
              </button>
            </div>

            {/* Scene switcher */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest px-3 pt-2.5 pb-1">SCENE</p>
              {SCENES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setScene(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-mono transition ${scene === id ? 'text-white bg-burgundy/30' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {label}
                  {scene === id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-burgundy" />}
                </button>
              ))}
            </div>

            {/* RTMP reminder */}
            <div className="rounded-xl px-3 py-2.5 flex-shrink-0"
                 style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-1.5">OBS / ENCODER</p>
              <code className="text-[10px] font-mono text-gold/70 block truncate">{RTMP_URL}</code>
              <button onClick={() => copyLink(RTMP_URL)} className="mt-1.5 text-[9px] font-mono text-white/20 hover:text-white/50 transition flex items-center gap-1">
                <Copy className="w-2.5 h-2.5" /> Copy RTMP
              </button>
            </div>
          </div>

          {/* Center: 20-slot panel grid */}
          <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-white/40 uppercase tracking-widest">
                  LIVE PANEL
                </span>
                <span className="badge badge-gold text-[10px] px-1.5">{activePanelCount}/20</span>
              </div>
              <button
                onClick={() => setInviteTarget('auto')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}
              >
                <UserPlus className="w-3.5 h-3.5" /> Invite Guest
              </button>
            </div>

            {/* Grid — 5 cols */}
            <div className="flex-1 overflow-auto">
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
                {panelSlots.map((slot) => (
                  <ParticipantTile
                    key={slot.id}
                    slot={slot}
                    isCurrentUserHost
                    isYtPlaying={false}
                    onAddContent={handlePanelAddContent}
                    onMute={handlePanelMute}
                    onKick={handlePanelKick}
                    onPin={handlePanelPin}
                    onClear={handlePanelClear}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: quick actions */}
          <div className="w-44 xl:w-52 flex-shrink-0 flex flex-col gap-2">
            {/* Stream info */}
            <div className="rounded-xl px-3 py-3"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-1.5">NOW STREAMING</p>
              <p className="text-sm font-semibold text-white leading-tight line-clamp-2">{title}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {platforms.map((p) => (
                  <span key={p} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/8 text-white/50 uppercase">
                    {p === 'twitter' ? 'X' : p.slice(0,3)}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest px-3 pt-2.5 pb-1">QUICK ACTIONS</p>

              <button
                onClick={() => navigate(`/watch-party/live-${currentStreamId}`)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-mono text-white/60 hover:text-white hover:bg-white/6 transition border-t border-white/5"
              >
                <Tv2 className="w-3.5 h-3.5 text-gold" />
                Start Watch Party
              </button>

              <button
                onClick={() => setInviteTarget('auto')}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-mono text-white/60 hover:text-white hover:bg-white/6 transition border-t border-white/5"
              >
                <UserPlus className="w-3.5 h-3.5 text-burgundy-light" />
                Invite Guest
              </button>

              <button
                onClick={() => { navigator.clipboard.writeText(window.location.origin + `/streams/${currentStreamId}`); toast.success('Stream link copied!'); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-mono text-white/60 hover:text-white hover:bg-white/6 transition border-t border-white/5"
              >
                <Link2 className="w-3.5 h-3.5" />
                Share Stream
              </button>
            </div>

            {/* Panel status */}
            <div className="rounded-xl px-3 py-2.5"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-2">PANEL STATUS</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Total Slots', value: '20' },
                  { label: 'Active',      value: String(activePanelCount) },
                  { label: 'Available',   value: String(20 - activePanelCount) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-[10px] font-mono text-white/30">{label}</span>
                    <span className="text-[10px] font-mono text-white/60">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Health indicators */}
            <div className="rounded-xl px-3 py-2.5"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-2">HEALTH</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Encoder',  ok: camPerm === 'granted' },
                  { label: 'Audio',    ok: micPerm === 'granted' && !isMuted },
                  { label: 'Network',  ok: isConnected },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/30">{label}</span>
                    <span className={`text-[10px] font-mono ${ok ? 'text-green-400' : 'text-red-400'}`}>{ok ? '● OK' : '○ —'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto">
              <button
                onClick={endStream}
                className="w-full py-3 rounded-xl font-mono text-sm text-red-400 border transition hover:bg-red-900/20"
                style={{ border: '1px solid rgba(127,29,29,0.5)', background: 'rgba(127,29,29,0.15)' }}
              >
                <Square className="w-4 h-4 inline mr-1.5" /> End Stream
              </button>
            </div>
          </div>
        </div>

        {/* ── GUEST INVITE MODAL ─────────────────────────────── */}
        {inviteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
               style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
            <div className="w-full max-w-md rounded-2xl shadow-2xl"
                 style={{ background: '#12121C', border: '1px solid rgba(255,255,255,0.11)' }}>
              <div className="flex items-center justify-between p-5"
                   style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <h3 className="font-display text-xl tracking-wider text-white">INVITE GUEST</h3>
                  <p className="text-xs font-mono text-white/30 mt-0.5">Share the link below with your panelist</p>
                </div>
                <button onClick={() => setInviteTarget(null)} className="p-2 hover:bg-white/10 rounded-xl transition">
                  <X className="w-5 h-5 text-white/50" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2">VDO.Ninja Guest Link</p>
                  {vdoGuestUrl ? (
                    <div className="flex gap-2">
                      <input value={vdoGuestUrl} readOnly className="input flex-1 text-xs text-white/60" />
                      <button onClick={() => { copyLink(vdoGuestUrl); setInviteTarget(null); }} className="btn-primary px-3 py-2 text-xs flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4 gap-3">
                      <Loader className="w-6 h-6 text-white/30 animate-spin" />
                      <p className="text-xs font-mono text-white/30">Setting up guest room...</p>
                      {currentStreamId && (
                        <button onClick={() => setupVdoRoom(currentStreamId)} className="btn-ghost text-xs">
                          Retry setup
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'rgba(201,175,55,0.08)', border: '1px solid rgba(201,175,55,0.15)' }}>
                  <p className="text-xs font-mono text-gold/70 leading-relaxed">
                    Guests open this link in their browser and join the panel. They appear in your guest grid when connected via VDO.Ninja.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-gold" />
                  <p className="text-xs font-mono text-white/40">Up to 19 guests · 20-slot panel max</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  // PRE-LIVE SETUP
  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  return (
    <div className="min-h-screen bg-obsidian text-white">
      {/* Top bar */}
      <div className="border-b px-6 h-14 flex items-center justify-between bg-obsidian-50"
           style={{ borderBottomColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-white/40 hover:text-white font-mono text-sm transition">← Back</button>
          <span className="font-display text-2xl tracking-wider text-white">GO LIVE</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">

          {/* LEFT COLUMN */}
          <div className="col-span-8 space-y-4">
            {/* Camera preview */}
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video border border-white/10">
              <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isCamOff ? 'hidden' : ''}`} />
              {(isCamOff || camPerm !== 'granted') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-obsidian">
                  <Camera className="w-16 h-16 text-white/10 mb-3" />
                  <p className="text-white/30 font-mono text-sm">
                    {camPerm === 'denied' ? 'Camera access denied' : camPerm === 'requesting' ? 'Requesting...' : 'Camera off'}
                  </p>
                  {camPerm === 'denied' && <button onClick={requestPerms} className="mt-3 btn-primary text-sm">Allow Camera</button>}
                </div>
              )}
              {/* Audio VU */}
              {micPerm === 'granted' && !isMuted && (
                <div className="absolute bottom-4 left-4 flex items-end gap-0.5 h-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="vu-bar" style={{ height: `${Math.min(100, (audioLevel / 40) * 100 * (0.3 + i / 8 * 0.7))}%`, minHeight: '2px' }} />
                  ))}
                </div>
              )}
              {isScreenShare && <div className="absolute top-3 right-3 badge bg-burgundy/80 text-white"><MonitorUp className="w-3 h-3 inline mr-1" /> Screen</div>}
            </div>

            {/* Device status */}
            <div className="card flex gap-6 py-3">
              {[{ state: micPerm, label: 'Microphone' }, { state: camPerm, label: 'Camera' }].map(({ state, label }) => (
                <div key={label} className="flex items-center gap-2">
                  {state === 'granted' ? <CheckCircle className="w-4 h-4 text-green-400" /> : state === 'denied' ? <AlertCircle className="w-4 h-4 text-red-400" /> : <Loader className="w-4 h-4 text-white/40 animate-spin" />}
                  <span className="text-sm font-mono text-white/60">{label}</span>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <button onClick={toggleMic} className={`p-4 rounded-2xl transition ${isMuted ? 'bg-red-900/60 text-red-300 border border-red-700/50' : 'bg-white/8 hover:bg-white/12 text-white'}`}>
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button onClick={toggleCam} className={`p-4 rounded-2xl transition ${isCamOff ? 'bg-red-900/60 text-red-300 border border-red-700/50' : 'bg-white/8 hover:bg-white/12 text-white'}`}>
                {isCamOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
              <button onClick={toggleScreen} className={`p-4 rounded-2xl transition ${isScreenShare ? 'bg-burgundy/60 text-white border border-burgundy/50' : 'bg-white/8 hover:bg-white/12 text-white'}`}>
                <MonitorUp className="w-6 h-6" />
              </button>
              <button onClick={() => setShowSettings(!showSettings)} className={`p-4 rounded-2xl transition ${showSettings ? 'bg-gold/20 text-gold' : 'bg-white/8 hover:bg-white/12 text-white'}`}>
                <Settings2 className="w-6 h-6" />
              </button>
            </div>

            {showSettings && (
              <div className="card space-y-3">
                <h3 className="font-mono text-sm text-white/60 uppercase tracking-widest">Output Quality</h3>
                <div className="flex gap-2">
                  {(['1080p', '720p', '480p'] as const).map((q) => (
                    <button key={q} onClick={() => setQuality(q)}
                      className={`px-4 py-2 rounded-xl font-mono text-sm border transition ${quality === q ? 'bg-burgundy text-white border-burgundy-light/40' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'}`}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* RTMP Config */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-gold" />
                <h3 className="font-mono text-sm text-white/60 uppercase tracking-widest">OBS / External Encoder</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-mono text-white/40 mb-1.5">RTMP Server</p>
                  <div className="flex gap-2">
                    <code className="flex-1 text-sm bg-obsidian-100 border border-white/8 px-3 py-2 rounded-xl text-gold font-mono truncate">{RTMP_URL}</code>
                    <button onClick={() => copyLink(RTMP_URL)} className="btn-ghost p-2.5"><Copy className="w-4 h-4" /></button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-mono text-white/40 mb-1.5">Stream Key</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <code className={`w-full text-sm bg-obsidian-100 border border-white/8 px-3 py-2 rounded-xl font-mono block truncate ${showKey ? 'text-white' : 'text-transparent select-none'}`}>{streamKey || '—'}</code>
                      {!showKey && <div className="absolute inset-0 flex items-center px-3"><span className="text-white/30 font-mono text-sm">••••••••••••••••••••••••</span></div>}
                    </div>
                    <button onClick={() => setShowKey(!showKey)} className="btn-ghost p-2.5">{showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    <button onClick={() => streamKey && copyLink(streamKey)} className="btn-ghost p-2.5"><Copy className="w-4 h-4" /></button>
                  </div>
                  <p className="text-[11px] font-mono text-white/20 mt-1.5">Never share your stream key publicly.</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="col-span-4 space-y-4">
            {/* Stream info */}
            <div className="card space-y-4">
              <h3 className="font-display text-xl tracking-wider text-white">STREAM INFO</h3>
              <div>
                <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Title *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you streaming?" className="input" maxLength={120} />
              </div>
              <div>
                <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Tags</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="music, gaming (comma separated)" className="input" />
              </div>
            </div>

            {/* Visibility + Category */}
            <div className="card space-y-4">
              <h3 className="font-display text-xl tracking-wider text-white">DISCOVERY</h3>

              {/* Public / Private toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Public stream</p>
                  <p className="text-white/30 font-mono text-xs mt-0.5">
                    {isPublic ? 'Anyone can find this on Discover' : 'Only you can see this stream'}
                  </p>
                </div>
                <button
                  onClick={() => setIsPublic((v) => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${isPublic ? 'bg-green-500' : 'bg-white/20'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isPublic ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input"
                >
                  <option value="">— None —</option>
                  {['gaming', 'music', 'talk', 'sports', 'education', 'tech', 'creative'].map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Golden Paywall */}
            <div className={`card border transition-colors ${paywallEnabled ? 'border-gold/30 bg-gold/5' : 'border-white/8'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl tracking-wider text-white flex items-center gap-2">
                    {paywallEnabled ? <Lock className="w-4 h-4 text-gold" /> : <Unlock className="w-4 h-4 text-white/40" />}
                    GOLDEN PAYWALL
                  </h3>
                  <p className="text-white/40 font-mono text-xs mt-1">120-second free preview, then gate</p>
                </div>
                <button onClick={() => setPaywallEnabled(!paywallEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${paywallEnabled ? 'bg-gold' : 'bg-white/20'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${paywallEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              {paywallEnabled && (
                <div className="mt-3 px-3 py-2 bg-gold/10 border border-gold/20 rounded-xl">
                  <p className="text-gold font-mono text-xs">First 2:00 free → paywall activates → tip to unlock</p>
                </div>
              )}
            </div>

            {/* Platform selection */}
            <div className="card space-y-3">
              <h3 className="font-display text-xl tracking-wider text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-white/40" />
                DESTINATIONS
                <span className="text-white/30 font-mono text-sm font-normal">({platforms.length})</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => (
                  <button key={p.id} onClick={() => setPlatforms((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id])}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-mono border transition ${platforms.includes(p.id) ? `${p.color} text-white` : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}>
                    <Radio className="w-3 h-3" />{p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Go Live */}
            <button
              onClick={goLive}
              disabled={isGoingLive || !title.trim() || platforms.length === 0}
              className="w-full py-5 bg-gradient-to-br from-burgundy to-burgundy-dark text-white rounded-2xl font-display text-2xl tracking-wider hover:shadow-burgundy transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-burgundy-light/30"
            >
              {isGoingLive ? <><Loader className="w-6 h-6 animate-spin" /> STARTING...</> : <><Play className="w-6 h-6" /> GO LIVE</>}
            </button>

            {platforms.length > 0 && (
              <p className="text-center text-white/20 font-mono text-xs">
                Will broadcast to: {platforms.join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
