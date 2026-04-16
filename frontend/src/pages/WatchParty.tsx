import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, Pause, Users, MessageCircle, DollarSign, Settings,
  Mic, MicOff, Video, VideoOff, MonitorUp, X, Search,
  Crown, Shield, AlertTriangle, Volume2, VolumeX,
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

export default function WatchParty() {
  const { roomName } = useParams<{ roomName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [watchState, setWatchState] = useState<WatchState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'leaderboard'>('chat');
  const [showYouTubeSearch, setShowYouTubeSearch] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [livekitToken, setLivekitToken] = useState('');
  const playerRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (roomName) {
      joinRoom();
    }
  }, [roomName]);

  const joinRoom = async () => {
    try {
      const res = await api.post(`/watch-party/rooms/${roomName}/join`);
      setLivekitToken(res.data.token?.token || '');
      if (res.data.state) setWatchState(res.data.state);
      if (res.data.chatHistory) setChatHistory(res.data.chatHistory);

      setIsHost(res.data.state?.hostId === user?.id);

      // Mock participants for now
      setParticipants([
        {
          id: user?.id || '1',
          name: user?.email.split('@')[0] || 'You',
          isHost: isHost,
          isMuted: false,
          isCameraOff: false,
          isSpeaking: false,
        },
      ]);

      toast.success('Joined watch party!');
    } catch (error) {
      toast.error('Failed to join room');
    }
  };

  const handleVideoSelect = async (videoId: string) => {
    try {
      await api.put(`/watch-party/rooms/${roomName}/state`, {
        videoId,
        isPlaying: false,
        currentTime: 0,
      });
      setWatchState(prev => ({ ...(prev || { hostId: user?.id || '', isPlaying: false, currentTime: 0 }), videoId }));
      setShowYouTubeSearch(false);
      toast.success('Video selected!');
    } catch (error) {
      toast.error('Failed to select video');
    }
  };

  const togglePlayPause = async () => {
    if (!isHost || !watchState) return;
    const newState = { ...watchState, isPlaying: !watchState.isPlaying };
    setWatchState(newState);
    await api.put(`/watch-party/rooms/${roomName}/state`, newState);
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setIsScreenSharing(true);
        stream.getVideoTracks()[0].onended = () => setIsScreenSharing(false);
        toast.success('Screen sharing started');
      } catch {
        toast.error('Screen sharing denied');
      }
    } else {
      setIsScreenSharing(false);
      toast('Screen sharing stopped');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Watch Party</h1>
          <span className="badge bg-green-900 text-green-300 text-xs">
            {participants.length} / 20
          </span>
          {isHost && (
            <span className="flex items-center gap-1 text-xs bg-yellow-900 text-yellow-300 px-2 py-1 rounded-full">
              <Crown className="w-3 h-3" /> Host
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg ${isMuted ? 'bg-red-900 text-red-300' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsCameraOff(!isCameraOff)}
            className={`p-2 rounded-lg ${isCameraOff ? 'bg-red-900 text-red-300' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleScreenShare}
            className={`p-2 rounded-lg ${isScreenSharing ? 'bg-purple-900 text-purple-300' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            <MonitorUp className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Grid */}
          <div className="flex-1 bg-black">
            {watchState?.videoId ? (
              <iframe
                ref={playerRef}
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${watchState.videoId}?autoplay=${watchState.isPlaying ? 1 : 0}&enablejsapi=1`}
                allow="autoplay; fullscreen"
                title="Watch Party Video"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <p className="text-gray-400 text-lg">No video selected</p>
                {isHost && (
                  <button
                    onClick={() => setShowYouTubeSearch(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                    Search YouTube
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Participant Grid (up to 20) */}
          <div className="bg-gray-900 border-t border-gray-800 p-3">
            <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className={`relative bg-gray-800 rounded-lg aspect-video flex items-center justify-center text-sm ${
                    p.isSpeaking ? 'ring-2 ring-green-500' : ''
                  }`}
                >
                  <div className="text-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-bold">
                      {p.name[0].toUpperCase()}
                    </div>
                    <p className="text-xs text-gray-300 truncate px-1">{p.name}</p>
                  </div>
                  {p.isMuted && (
                    <div className="absolute top-1 right-1">
                      <MicOff className="w-3 h-3 text-red-400" />
                    </div>
                  )}
                  {p.isHost && (
                    <div className="absolute top-1 left-1">
                      <Crown className="w-3 h-3 text-yellow-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Playback controls (host only) */}
            {isHost && watchState?.videoId && (
              <div className="flex items-center justify-center gap-4 mt-3">
                <button
                  onClick={togglePlayPause}
                  className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:scale-105 transition"
                >
                  {watchState?.isPlaying
                    ? <Pause className="w-6 h-6" />
                    : <Play className="w-6 h-6" />
                  }
                </button>
                <button
                  onClick={() => setShowYouTubeSearch(true)}
                  className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 flex items-center gap-2 text-sm"
                >
                  <Search className="w-4 h-4" /> Change Video
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {([
              { id: 'chat', label: 'Chat', icon: MessageCircle },
              { id: 'participants', label: `People (${participants.length})`, icon: Users },
              { id: 'leaderboard', label: 'Tips', icon: DollarSign },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'chat' && (
              <ChatPanel
                roomId={roomName || ''}
                initialMessages={chatHistory}
                enableTranslation
              />
            )}

            {activeTab === 'participants' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {p.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        {p.isHost && <p className="text-xs text-yellow-400">Host</p>}
                      </div>
                    </div>
                    {isHost && p.id !== user?.id && (
                      <div className="flex gap-1">
                        <button className="p-1 hover:bg-gray-700 rounded text-red-400" title="Remove">
                          <Shield className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <TipLeaderboard roomId={roomName || ''} />
                <div className="p-4 border-t border-gray-800">
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

      {/* YouTube Search Modal */}
      {showYouTubeSearch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-lg font-bold">Select YouTube Video</h3>
              <button onClick={() => setShowYouTubeSearch(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <YouTubeSearch onSelect={handleVideoSelect} />
          </div>
        </div>
      )}
    </div>
  );
}
