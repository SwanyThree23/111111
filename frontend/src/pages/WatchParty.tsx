import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, Pause, Users, MessageCircle, DollarSign,
  Mic, MicOff, Video, VideoOff, MonitorUp, X, Search,
  Crown, UserX, Radio, Settings2, LayoutGrid, Maximize2,
  Film, Columns2, Tv2, Link2, Clock,
} from 'lucide-react';
import api from '@/utils/api';
import { useAuth } from '@/utils/auth';
import { useWebSocket } from '@/hooks/useWebSocket';
import toast from 'react-hot-toast';
import TipJar from '@/components/TipJar';
import ChatPanel from '@/components/ChatPanel';
import TipLeaderboard from '@/components/TipLeaderboard';
import YouTubeSearch from '@/components/YouTubeSearch';
import ParticipantTile, { PanelSlot } from '@/components/ParticipantTile';
import RoomCustomizer, { RoomMeta, LayoutMode } from '@/components/RoomCustomizer';

type SideTab = 'chat' | 'people' | 'tips';

interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeaking: boolean;
}

interface WatchState {
  videoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  hostId: string;
  syncedAt?: number;
}

const EMPTY_SLOTS: PanelSlot[] = Array.from({ length: 20 }, (_, i) => ({
  id: `slot-${i + 1}`,
  type: 'empty',
}));

function gridCols(n: number): number {
  if (n <= 1) return 1;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  if (n <= 16) return 4;
  return 5;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function WatchParty() {
  const { roomName } = useParams<{ roomName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Core state ────────────────────────────────────────────────
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [watchState, setWatchState] = useState<WatchState | null>(null);
  const [slots, setSlots] = useState<PanelSlot[]>(EMPTY_SLOTS);
  const [isHost, setIsHost] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  // ── UI state ──────────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenShare, setIsScreenShare] = useState(false);
  const [sideTab, setSideTab] = useState<SideTab>('chat');
  const [sideOpen, setSideOpen] = useState(true);
  const [ytSearchTarget, setYtSearchTarget] = useState<string | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);

  const [roomMeta, setRoomMeta] = useState<RoomMeta>({
    name: roomName ? roomName.replace(/-/g, ' ') : 'Watch Party',
    maxParticipants: 20,
    accent: 'burgundy',
    layout: 'auto',
    isLocked: false,
  });
  const [layout, setLayout] = useState<LayoutMode>('auto');

  // ── WebSocket for room sync ───────────────────────────────────
  const { sendMessage } = useWebSocket(undefined, {
    onMessage: (msg) => {
      if (msg.roomId !== roomName) return;
      switch (msg.type) {
        case 'room_video_sync': {
          const lag = (Date.now() - (msg.syncedAt || Date.now())) / 1000;
          setWatchState({
            videoId: msg.videoId,
            isPlaying: msg.isPlaying,
            currentTime: (msg.currentTime || 0) + lag,
            hostId: msg.hostId || '',
            syncedAt: msg.syncedAt,
          });
          if (msg.videoId) {
            setSlots((prev) =>
              prev.map((s) =>
                s.type === 'youtube' ? { ...s, videoId: msg.videoId } : s,
              ),
            );
          }
          break;
        }
        case 'room_slot_update':
          if (msg.slot) setSlots((prev) => prev.map((s) => (s.id === msg.slot.id ? msg.slot : s)));
          break;
        case 'room_meta_update':
          if (msg.meta) {
            setRoomMeta((prev) => ({ ...prev, ...msg.meta }));
            if (msg.meta.layout) setLayout(msg.meta.layout as LayoutMode);
          }
          break;
        case 'room_participant_join':
          if (msg.participant) setParticipants((prev) => [...prev, msg.participant]);
          break;
        case 'room_participant_leave':
          if (msg.participantId) setParticipants((prev) => prev.filter((p) => p.id !== msg.participantId));
          break;
      }
    },
  });

  // ── Join room on mount ────────────────────────────────────────
  useEffect(() => {
    if (roomName) {
      sendMessage({ type: 'room_subscribe', roomId: roomName });
      joinRoom();
    }
    return () => { if (roomName) sendMessage({ type: 'room_unsubscribe', roomId: roomName }); };
  }, [roomName]);

  const joinRoom = useCallback(async () => {
    try {
      const res = await api.post(`/watch-party/rooms/${roomName}/join`);
      if (res.data.state) setWatchState(res.data.state);
      if (res.data.chatHistory) setChatHistory(res.data.chatHistory);
      if (res.data.meta) {
        setRoomMeta((prev) => ({ ...prev, ...res.data.meta }));
        if (res.data.meta.layout) setLayout(res.data.meta.layout);
      }
      const host = res.data.state?.hostId === user?.id;
      setIsHost(host);
      setParticipants([{
        id: user?.id || 'me',
        name: user?.username || user?.email?.split('@')[0] || 'You',
        isHost: host,
        isMuted: false,
        isCameraOff: false,
        isSpeaking: false,
      }]);
      toast.success('Joined watch party!');
    } catch {
      toast.error('Failed to join room');
    }
  }, [roomName, user]);

  // ── Elapsed timer ─────────────────────────────────────────────
  useEffect(() => {
    if (!watchState) return;
    setElapsed(watchState.currentTime);
    elapsedRef.current = watchState.currentTime;
    if (!watchState.isPlaying) return;
    const startAt = Date.now();
    const startOffset = watchState.currentTime;
    const timer = setInterval(() => {
      const t = startOffset + (Date.now() - startAt) / 1000;
      elapsedRef.current = t;
      setElapsed(t);
    }, 500);
    return () => clearInterval(timer);
  }, [watchState?.isPlaying, watchState?.currentTime]);

  // ── Participants → camera slots ───────────────────────────────
  useEffect(() => {
    setSlots((prev) => {
      const next = [...prev];
      // Clear stale camera slots
      for (let i = 0; i < next.length; i++) {
        if (next[i].type === 'camera') next[i] = { id: next[i].id, type: 'empty' };
      }
      // Assign participants to empty slots
      let ei = 0;
      for (const p of participants) {
        while (ei < next.length && next[ei].type !== 'empty') ei++;
        if (ei >= next.length) break;
        next[ei] = {
          id: next[ei].id,
          type: 'camera',
          label: p.name,
          participantId: p.id,
          isMuted: p.isMuted,
          isHost: p.isHost,
          isSpeaking: p.isSpeaking,
          isPinned: false,
        };
        ei++;
      }
      return next;
    });
  }, [participants]);

  // ── Host: add YouTube player to slot ─────────────────────────
  const handleVideoSelected = async (videoId: string) => {
    const target = ytSearchTarget;
    setSlots((prev) => {
      const next = [...prev];
      let idx: number;
      if (target && target !== 'auto') {
        idx = next.findIndex((s) => s.id === target);
      } else {
        // Reuse existing YouTube slot or take first empty
        idx = next.findIndex((s) => s.type === 'youtube');
        if (idx === -1) idx = next.findIndex((s) => s.type === 'empty');
      }
      if (idx === -1) return prev;
      next[idx] = { ...next[idx], type: 'youtube', videoId, label: 'Watch Together', isPinned: true };
      return next;
    });

    const syncState: WatchState = {
      videoId,
      isPlaying: false,
      currentTime: 0,
      hostId: user?.id || '',
      syncedAt: Date.now(),
    };
    setWatchState(syncState);
    setYtSearchTarget(null);

    sendMessage({ type: 'room_video_sync', roomId: roomName, ...syncState });
    try { await api.put(`/watch-party/rooms/${roomName}/state`, { videoId, isPlaying: false, currentTime: 0 }); } catch {}
    toast.success('Video loaded into panel!');
  };

  // ── Host: play / pause sync ───────────────────────────────────
  const togglePlay = async () => {
    if (!isHost || !watchState) return;
    const newPlaying = !watchState.isPlaying;
    const next: WatchState = {
      ...watchState,
      isPlaying: newPlaying,
      currentTime: elapsedRef.current,
      syncedAt: Date.now(),
    };
    setWatchState(next);
    sendMessage({ type: 'room_video_sync', roomId: roomName, ...next });
    await api.put(`/watch-party/rooms/${roomName}/state`, next).catch(() => {});
  };

  // ── Host: tile controls ───────────────────────────────────────
  const handlePin = (slotId: string) => {
    setSlots((prev) => prev.map((s) => ({ ...s, isPinned: s.id === slotId ? !s.isPinned : false })));
  };

  const handleMute = (slotId: string) => {
    setSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, isMuted: !s.isMuted } : s));
  };

  const handleKick = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    setParticipants((prev) => prev.filter((p) => p.id !== slot.participantId));
    setSlots((prev) => prev.map((s) => s.id === slotId ? { id: s.id, type: 'empty' } : s));
    toast('Participant removed');
  };

  const handleClearSlot = (slotId: string) => {
    setSlots((prev) => prev.map((s) => s.id === slotId ? { id: s.id, type: 'empty' } : s));
    // Clear watchState if this was the YouTube slot
    const slot = slots.find((s) => s.id === slotId);
    if (slot?.type === 'youtube') setWatchState(null);
  };

  // ── Room meta change (host) ───────────────────────────────────
  const handleMetaChange = useCallback((partial: Partial<RoomMeta>) => {
    setRoomMeta((prev) => ({ ...prev, ...partial }));
    if (partial.layout) setLayout(partial.layout);
    sendMessage({ type: 'room_meta_update', roomId: roomName, meta: partial });
  }, [roomName, sendMessage]);

  // ── Screen share ──────────────────────────────────────────────
  const toggleScreen = async () => {
    if (!isScreenShare) {
      try {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setIsScreenShare(true);
        s.getVideoTracks()[0].onended = () => setIsScreenShare(false);
        toast.success('Screen sharing started');
      } catch { toast.error('Screen sharing denied'); }
    } else {
      setIsScreenShare(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────
  const activeSlots = slots.filter((s) => s.type !== 'empty');
  const emptySlots  = slots.filter((s) => s.type === 'empty');
  const pinnedSlot  = slots.find((s) => s.isPinned);
  const ytSlot      = slots.find((s) => s.type === 'youtube');
  const cameraSlots = slots.filter((s) => s.type === 'camera');
  const unpinnedActive = activeSlots.filter((s) => !s.isPinned);

  const SIDE_TABS: { id: SideTab; label: string; icon: typeof MessageCircle }[] = [
    { id: 'chat',   label: 'Chat',               icon: MessageCircle },
    { id: 'people', label: `${participants.length}`, icon: Users },
    { id: 'tips',   label: 'Tips',               icon: DollarSign },
  ];

  // ── Grid renderer ─────────────────────────────────────────────
  const tileProps = (slot: PanelSlot, spotlight = false) => ({
    slot,
    isCurrentUserHost: isHost,
    isSpotlight: spotlight,
    isYtPlaying: watchState?.isPlaying ?? false,
    onAddContent: (id: string) => setYtSearchTarget(id),
    onMute: handleMute,
    onKick: handleKick,
    onPin: handlePin,
    onClear: handleClearSlot,
    onYtTogglePlay: slot.type === 'youtube' ? togglePlay : undefined,
  });

  const renderGrid = () => {
    // ── CINEMA ──────────────────────────────────────────────────
    if (layout === 'cinema') {
      return (
        <div className="flex flex-col h-full gap-3">
          {/* Main player */}
          <div className="flex-1 min-h-0 rounded-xl overflow-hidden relative"
               style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
            {ytSlot?.videoId ? (
              <iframe
                key={`${ytSlot.videoId}-${watchState?.isPlaying ? 1 : 0}`}
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${ytSlot.videoId}?autoplay=${watchState?.isPlaying ? 1 : 0}&controls=0&rel=0&enablejsapi=1`}
                allow="autoplay; fullscreen; encrypted-media"
                title="Watch Together"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-obsidian">
                <Tv2 className="w-14 h-14 text-white/8" />
                <p className="text-white/25 font-mono text-sm">No video loaded</p>
                {isHost && (
                  <button onClick={() => setYtSearchTarget('auto')} className="btn-primary flex items-center gap-2 text-sm">
                    <Search className="w-4 h-4" /> Load Video
                  </button>
                )}
              </div>
            )}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-mono text-white/60">CINEMA</span>
            </div>
          </div>

          {/* Participant strip */}
          <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0" style={{ minHeight: '80px' }}>
            {cameraSlots.map((slot) => (
              <div key={slot.id} className="flex-shrink-0 w-36">
                <ParticipantTile {...tileProps(slot)} />
              </div>
            ))}
            {isHost && emptySlots.slice(0, 4).map((slot) => (
              <div key={slot.id} className="flex-shrink-0 w-36">
                <ParticipantTile {...tileProps(slot)} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── SPOTLIGHT ────────────────────────────────────────────────
    if (layout === 'spotlight') {
      const featured = pinnedSlot || ytSlot || activeSlots[0];
      const rest = activeSlots.filter((s) => s.id !== featured?.id);
      return (
        <div className="flex gap-3 h-full">
          {/* Featured tile */}
          <div className="flex-1 min-w-0">
            {featured ? (
              <ParticipantTile {...tileProps(featured, true)} />
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2"
                   style={{ aspectRatio: '16/9' }}>
                <p className="text-white/20 font-mono text-sm">Pin a tile to spotlight it</p>
                {isHost && (
                  <button onClick={() => setYtSearchTarget('auto')} className="btn-ghost text-xs flex items-center gap-1.5">
                    <Tv2 className="w-3.5 h-3.5" /> Add YouTube Player
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar strip */}
          <div className="w-36 xl:w-44 flex flex-col gap-2 overflow-y-auto">
            {rest.map((slot) => (
              <ParticipantTile key={slot.id} {...tileProps(slot)} />
            ))}
            {isHost && emptySlots.slice(0, 3).map((slot) => (
              <ParticipantTile key={slot.id} {...tileProps(slot)} />
            ))}
          </div>
        </div>
      );
    }

    // ── SPLIT ────────────────────────────────────────────────────
    if (layout === 'split') {
      const visible = [...activeSlots, ...emptySlots.slice(0, Math.max(0, 2 - activeSlots.length))];
      return (
        <div className="grid grid-cols-2 gap-3 content-start">
          {visible.map((slot) => (
            <ParticipantTile key={slot.id} {...tileProps(slot)} />
          ))}
        </div>
      );
    }

    // ── AUTO GRID (default) ──────────────────────────────────────
    const cols = gridCols(Math.max(activeSlots.length, 1));
    const showEmpty = isHost ? emptySlots.slice(0, Math.min(4, 20 - activeSlots.length)) : [];
    return (
      <div
        className="grid gap-3 content-start"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {activeSlots.map((slot) => (
          <ParticipantTile key={slot.id} {...tileProps(slot)} />
        ))}
        {showEmpty.map((slot) => (
          <ParticipantTile key={slot.id} {...tileProps(slot)} />
        ))}
      </div>
    );
  };

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col text-white overflow-hidden" style={{ background: '#07070D' }}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 h-14 flex-shrink-0 z-20"
              style={{ background: '#11111B', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 hover:bg-white/10 rounded-lg transition flex-shrink-0">
            <X className="w-5 h-5 text-white/40" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Radio className="w-3.5 h-3.5 text-burgundy-light flex-shrink-0" />
            <span className="font-display text-lg tracking-wider truncate">{roomMeta.name}</span>
          </div>
          <span className="badge badge-gold text-xs px-2 py-0.5 flex-shrink-0">{participants.length}/{roomMeta.maxParticipants}</span>
          {isHost && (
            <span className="flex items-center gap-1 text-xs font-mono text-gold flex-shrink-0">
              <Crown className="w-3 h-3" /> Host
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => setIsMuted(!isMuted)}
                  className={`p-2 rounded-lg transition ${isMuted ? 'bg-red-900/50 text-red-300' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}>
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsCamOff(!isCamOff)}
                  className={`p-2 rounded-lg transition ${isCamOff ? 'bg-red-900/50 text-red-300' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}>
            {isCamOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>
          <button onClick={toggleScreen}
                  className={`p-2 rounded-lg transition ${isScreenShare ? 'bg-burgundy/50 text-white' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}>
            <MonitorUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/8 transition"
          >
            <Link2 className="w-3.5 h-3.5" /> Invite
          </button>
          <button
            onClick={() => setSideOpen((o) => !o)}
            className={`p-2 rounded-lg transition ${sideOpen ? 'bg-white/10 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── PANEL GRID COLUMN ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Grid scroll area */}
          <div className="flex-1 overflow-auto p-3">
            {renderGrid()}
          </div>

          {/* ── HOST TOOLBAR ─────────────────────────────────────── */}
          {isHost && (
            <div className="flex-shrink-0 px-4 py-2.5 flex items-center gap-2 flex-wrap"
                 style={{ background: '#0D0D18', borderTop: '1px solid rgba(255,255,255,0.08)' }}>

              {/* Sync controls (visible only when a video is loaded) */}
              {watchState?.videoId && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                     style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <button
                    onClick={togglePlay}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition text-white"
                    title={watchState.isPlaying ? 'Pause (syncs all viewers)' : 'Play (syncs all viewers)'}
                  >
                    {watchState.isPlaying
                      ? <Pause className="w-4 h-4" />
                      : <Play className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-1 text-xs font-mono text-white/45 pr-1">
                    <Clock className="w-3 h-3" />
                    {fmtTime(elapsed)}
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${watchState.isPlaying ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
                </div>
              )}

              {/* Add/change YouTube player */}
              <button
                onClick={() => setYtSearchTarget('auto')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-mono transition"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}
              >
                <Tv2 className="w-4 h-4" />
                {ytSlot ? 'Change Video' : 'Add YouTube Player'}
              </button>

              {/* Layout switcher */}
              <div className="flex items-center gap-0.5 p-1 rounded-xl"
                   style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {([
                  { id: 'auto'      as LayoutMode, Icon: LayoutGrid, title: 'Auto Grid'  },
                  { id: 'spotlight' as LayoutMode, Icon: Maximize2,  title: 'Spotlight'  },
                  { id: 'cinema'    as LayoutMode, Icon: Film,       title: 'Cinema Mode' },
                  { id: 'split'     as LayoutMode, Icon: Columns2,   title: 'Split View'  },
                ]).map(({ id, Icon, title }) => (
                  <button
                    key={id}
                    onClick={() => { setLayout(id); handleMetaChange({ layout: id }); }}
                    title={title}
                    className={`p-1.5 rounded-lg transition ${layout === id ? 'bg-burgundy text-white' : 'text-white/30 hover:text-white/60 hover:bg-white/8'}`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>

              {/* Customize room */}
              <button
                onClick={() => setCustomizerOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-mono transition"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}
              >
                <Settings2 className="w-4 h-4" /> Customize
              </button>
            </div>
          )}
        </div>

        {/* ── SIDE PANEL ─────────────────────────────────────────── */}
        {sideOpen && (
          <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col"
               style={{ background: '#11111B', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>

            {/* Tab bar */}
            <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {SIDE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSideTab(tab.id)}
                  className={`flex-1 py-3 text-xs font-mono flex items-center justify-center gap-1.5 border-b-2 transition ${
                    sideTab === tab.id ? 'border-gold text-gold' : 'border-transparent text-white/30 hover:text-white/50'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {sideTab === 'chat' && (
                <ChatPanel roomId={roomName || ''} initialMessages={chatHistory} enableTranslation />
              )}

              {sideTab === 'people' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <p className="text-xs font-mono text-white/30 uppercase tracking-widest px-1 mb-3">
                    {participants.length} / {roomMeta.maxParticipants} guests
                  </p>
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl"
                         style={{ background: 'rgba(22,22,34,1)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-burgundy to-gold/60 rounded-full flex items-center justify-center text-sm font-bold">
                          {p.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{p.name}</p>
                          {p.isHost && <p className="text-xs text-gold font-mono">Host</p>}
                        </div>
                      </div>
                      {isHost && p.id !== user?.id && (
                        <button
                          onClick={() => {
                            const slot = slots.find((s) => s.participantId === p.id);
                            if (slot) handleKick(slot.id);
                          }}
                          className="p-1.5 rounded-lg transition text-white/20 hover:text-red-400 hover:bg-red-900/20"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {sideTab === 'tips' && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <TipLeaderboard roomId={roomName || ''} />
                  <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <TipJar
                      roomId={roomName || ''}
                      recipientId={watchState?.hostId || ''}
                      recipientName="Host"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── YOUTUBE SEARCH MODAL ───────────────────────────────── */}
      {ytSearchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-2xl max-h-[82vh] flex flex-col rounded-2xl shadow-2xl"
               style={{ background: '#12121C', border: '1px solid rgba(255,255,255,0.11)' }}>
            <div className="flex items-center justify-between p-4 flex-shrink-0"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <h3 className="font-display text-xl tracking-wider text-white">ADD TO PANEL</h3>
                <p className="text-xs font-mono text-white/30 mt-0.5">
                  Select a video — it will appear in the watch party grid
                </p>
              </div>
              <button onClick={() => setYtSearchTarget(null)} className="p-2 hover:bg-white/10 rounded-xl transition">
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>
            <YouTubeSearch onSelect={handleVideoSelected} />
          </div>
        </div>
      )}

      {/* ── ROOM CUSTOMIZER DRAWER ─────────────────────────────── */}
      <RoomCustomizer
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        meta={roomMeta}
        onChange={handleMetaChange}
        roomUrl={window.location.href}
      />
    </div>
  );
}
