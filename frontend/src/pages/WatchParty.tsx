import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, Pause, Users, MessageCircle, DollarSign,
  Mic, MicOff, Video, VideoOff, MonitorUp, X, Search,
  Crown, UserX, Radio,
} from 'lucide-react';
import api from '@/utils/api';
import { useAuth } from '@/utils/auth';
import toast from 'react-hot-toast';
import TipJar from '@/components/TipJar';
import ChatPanel from '@/components/ChatPanel';
import TipLeaderboard from '@/components/TipLeaderboard';
import YouTubeSearch from '@/components/YouTubeSearch';

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
}

type SideTab = 'chat' | 'people' | 'tips';

export default function WatchParty() {
  const { roomName } = useParams<{ roomName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [watchState, setWatchState] = useState<WatchState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenShare, setIsScreenShare] = useState(false);
  const [sideTab, setSideTab] = useState<SideTab>('chat');
  const [showYTSearch, setShowYTSearch] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  useEffect(() => {
    if (roomName) joinRoom();
  }, [roomName]);

  const joinRoom = useCallback(async () => {
    try {
      const res = await api.post(`/watch-party/rooms/${roomName}/join`);
      if (res.data.state) setWatchState(res.data.state);
      if (res.data.chatHistory) setChatHistory(res.data.chatHistory);
      const host = res.data.state?.hostId === user?.id;
      setIsHost(host);
      setParticipants([
        {
          id: user?.id || '1',
          name: user?.username || user?.email?.split('@')[0] || 'You',
          isHost: host,
          isMuted: false,
          isCameraOff: false,
          isSpeaking: false,
        },
      ]);
      toast.success('Joined watch party!');
    } catch {
      toast.error('Failed to join room');
    }
  }, [roomName, user]);

  const selectVideo = async (videoId: string) => {
    try {
      await api.put(`/watch-party/rooms/${roomName}/state`, {
        videoId,
        isPlaying: false,
        currentTime: 0,
      });
      setWatchState((prev) => ({
        ...(prev || { hostId: user?.id || '', isPlaying: false, currentTime: 0 }),
        videoId,
      }));
      setShowYTSearch(false);
      toast.success('Video selected!');
    } catch {
      toast.error('Failed to select video');
    }
  };

  const togglePlay = async () => {
    if (!isHost || !watchState) return;
    const next = { ...watchState, isPlaying: !watchState.isPlaying };
    setWatchState(next);
    await api.put(`/watch-party/rooms/${roomName}/state`, next).catch(() => {});
  };

  const toggleScreen = async () => {
    if (!isScreenShare) {
      try {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setIsScreenShare(true);
        s.getVideoTracks()[0].onended = () => setIsScreenShare(false);
        toast.success('Screen share started');
      } catch { toast.error('Screen sharing denied'); }
    } else {
      setIsScreenShare(false);
    }
  };

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Room link copied!');
  };

  const SIDE_TABS: { id: SideTab; label: string; icon: typeof MessageCircle }[] = [
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'people', label: `${participants.length}`, icon: Users },
    { id: 'tips', label: 'Tips', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-obsidian text-white flex flex-col">
      {/* Header */}
      <div className="bg-obsidian-50 border-b border-white/8 px-4 h-14 flex items-center justify-between flex-shrink-0"
           style={{ borderBottomColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 hover:bg-white/10 rounded-lg transition">
            <X className="w-5 h-5 text-white/50" />
          </button>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-burgundy-light" />
            <span className="font-display text-xl tracking-wider">WATCH PARTY</span>
          </div>
          <span className="badge badge-gold text-xs">{participants.length}/20</span>
          {isHost && (
            <span className="flex items-center gap-1 badge bg-gold/10 text-gold text-xs"
                  style={{ border: '1px solid rgba(201,175,55,0.2)' }}>
              <Crown className="w-3 h-3" /> Host
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg transition ${isMuted ? 'bg-red-900/50 text-red-300' : 'bg-white/5 hover:bg-white/10 text-white/70'}`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsCamOff(!isCamOff)}
            className={`p-2 rounded-lg transition ${isCamOff ? 'bg-red-900/50 text-red-300' : 'bg-white/5 hover:bg-white/10 text-white/70'}`}
          >
            {isCamOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleScreen}
            className={`p-2 rounded-lg transition ${isScreenShare ? 'bg-burgundy/50 text-white' : 'bg-white/5 hover:bg-white/10 text-white/70'}`}
          >
            <MonitorUp className="w-4 h-4" />
          </button>
          <button onClick={shareLink} className="btn-ghost text-xs py-1.5 px-3 hidden sm:flex items-center gap-1">
            Share Link
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video + panel area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video player */}
          <div className="flex-1 bg-black relative">
            {watchState?.videoId ? (
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${watchState.videoId}?autoplay=${watchState.isPlaying ? 1 : 0}&enablejsapi=1`}
                allow="autoplay; fullscreen"
                title="Watch Party"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                     style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Play className="w-10 h-10 text-white/20" />
                </div>
                <p className="text-white/30 font-mono">No video selected</p>
                {isHost && (
                  <button onClick={() => setShowYTSearch(true)} className="btn-primary flex items-center gap-2">
                    <Search className="w-4 h-4" /> Search YouTube
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Participant strip + host controls */}
          <div className="bg-obsidian-50 border-t border-white/8 p-3 flex-shrink-0"
               style={{ borderTopColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-thin">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className={`relative flex-shrink-0 w-14 h-10 rounded-xl flex items-center justify-center transition ${
                    p.isSpeaking ? 'shadow-[0_0_8px_rgba(34,197,94,0.4)]' : ''
                  }`}
                  style={{
                    background: 'rgba(26,26,40,1)',
                    border: p.isSpeaking ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="w-6 h-6 bg-gradient-to-br from-burgundy to-gold/60 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  {p.isMuted && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full flex items-center justify-center">
                      <MicOff className="w-2 h-2 text-white" />
                    </div>
                  )}
                  {p.isHost && (
                    <Crown className="absolute -top-1 -left-1 w-2.5 h-2.5 text-gold" />
                  )}
                </div>
              ))}
              {Array.from({ length: Math.min(3, 20 - participants.length) }).map((_, i) => (
                <div key={`empty-${i}`}
                  className="flex-shrink-0 w-14 h-10 rounded-xl flex items-center justify-center opacity-30"
                  style={{ border: '1px dashed rgba(255,255,255,0.15)' }}
                />
              ))}
            </div>

            {isHost && (
              <div className="flex items-center justify-center gap-3">
                {watchState?.videoId && (
                  <button onClick={togglePlay} className="p-2.5 bg-burgundy hover:bg-burgundy-dark rounded-full transition">
                    {watchState.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                )}
                <button onClick={() => setShowYTSearch(true)} className="btn-ghost flex items-center gap-2 text-sm py-2">
                  <Search className="w-4 h-4" />
                  {watchState?.videoId ? 'Change Video' : 'Pick a Video'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col"
             style={{ background: '#12121C', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Tabs */}
          <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {SIDE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSideTab(tab.id)}
                className={`flex-1 py-3 text-xs font-mono flex items-center justify-center gap-1.5 border-b-2 transition ${
                  sideTab === tab.id
                    ? 'border-gold text-gold'
                    : 'border-transparent text-white/30 hover:text-white/50'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {sideTab === 'chat' && (
              <ChatPanel
                roomId={roomName || ''}
                initialMessages={chatHistory}
                enableTranslation
              />
            )}

            {sideTab === 'people' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <p className="text-xs font-mono text-white/30 uppercase tracking-widest px-1 mb-3">
                  {participants.length} / 20 guests
                </p>
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl"
                       style={{ background: 'rgba(26,26,40,1)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-burgundy to-gold/60 rounded-full flex items-center justify-center text-sm font-bold text-white">
                        {p.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        {p.isHost && <p className="text-xs text-gold font-mono">Host</p>}
                      </div>
                    </div>
                    {isHost && p.id !== user?.id && (
                      <button className="p-1.5 rounded-lg transition text-white/20 hover:text-red-400 hover:bg-red-900/20">
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
      </div>

      {/* YouTube search modal */}
      {showYTSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl"
               style={{ background: '#12121C', border: '1px solid rgba(255,255,255,0.10)' }}>
            <div className="flex items-center justify-between p-4"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="font-display text-xl tracking-wider text-white">SELECT VIDEO</h3>
              <button onClick={() => setShowYTSearch(false)} className="p-2 hover:bg-white/10 rounded-xl transition">
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>
            <YouTubeSearch onSelect={selectVideo} />
          </div>
        </div>
      )}
    </div>
  );
}
