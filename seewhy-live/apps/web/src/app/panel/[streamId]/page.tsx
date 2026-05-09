'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useParams } from 'next/navigation';
import { Mic, MicOff, Video, VideoOff, Monitor, UserX, ExternalLink, Copy, Maximize2, Minimize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PollCreator from '@/components/polls/PollCreator';
import ShareSheet from '@/components/social/ShareSheet';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.seewhylive.online';

type GridSize = 4 | 9 | 12 | 16;
interface Guest {
  id: string; displayName: string | null; isHost: boolean;
  isSpeaking: boolean; isMuted: boolean; userId: string | null;
  vdoStreamId: string | null;
  user: { username: string; avatarUrl: string | null } | null;
}

export default function PanelPage() {
  const { streamId } = useParams<{ streamId: string }>();
  const { user } = useAuth();
  const [gridSize, setGridSize] = useState<GridSize>(9);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOn, setIsCamOn] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [expandedGuest, setExpandedGuest] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const { data: stream } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => api.get<{ id: string; creatorId: string; title: string; status: string; vdoRoom: string | null }>(`/api/streams/${streamId}`),
  });

  const { data: guests, refetch } = useQuery({
    queryKey: ['guests', streamId],
    queryFn: () => api.get<Guest[]>(`/api/guests/${streamId}`),
    refetchInterval: 5000,
  });

  const kickGuest = useMutation({
    mutationFn: (userId: string) => api.post(`/api/guests/${streamId}/kick/${userId}`, {}),
    onSuccess: () => { toast.success('Guest removed'); refetch(); },
  });

  const muteGuest = useMutation({
    mutationFn: ({ userId, muted }: { userId: string; muted: boolean }) =>
      api.patch(`/api/guests/${streamId}/mute/${userId}`, { muted }),
    onSuccess: () => refetch(),
  });

  const generateInvite = async () => {
    const res = await api.post<{ inviteUrl: string; guestStreamId: string }>(`/api/guests/${streamId}/invite`, {});
    setInviteUrl(res.inviteUrl);
    setInviteOpen(true);
    refetch();
  };

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (localVideoRef.current) { localVideoRef.current.srcObject = stream; localVideoRef.current.play(); }
    }).catch(() => {});
  }, []);

  const isHost = user?.id === stream?.creatorId;
  const room = stream?.vdoRoom ?? (stream ? `seewhy-${stream.id.slice(0, 8)}` : '');
  const myVdoUrl = room ? `https://vdo.ninja/?push&room=${room}&autoplay&webcam` : null;

  const gridCols = {
    4:  'grid-cols-2',
    9:  'grid-cols-3',
    12: 'grid-cols-4',
    16: 'grid-cols-4',
  }[gridSize];

  return (
    <div className="min-h-screen bg-[#0C0806] flex flex-col">
      {/* Header */}
      <div className="bg-[#0f0f0f] border-b border-[#1E1E1E] px-4 h-12 flex items-center justify-between">
        <h1 className="font-display text-xl text-[#C8FF00]">{stream?.title ?? 'LIVE PANEL'}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-600 hidden sm:block">Grid:</span>
          {([4,9,12,16] as GridSize[]).map((g) => (
            <button key={g} onClick={() => setGridSize(g)} className={`px-2 py-1 text-xs rounded ${gridSize === g ? 'bg-[#C8FF00] text-[#0C0806] font-bold' : 'text-gray-500 hover:text-white'}`}>{g}</button>
          ))}
          {isHost && (
            <>
              <button onClick={generateInvite} className="btn-volt py-1 px-3 text-xs ml-2">+ Guest</button>
              <PollCreator streamId={streamId} apiUrl={API_URL} onLaunched={() => toast.success('Poll launched!')} />
              <button onClick={() => setShowShare(true)} className="btn-ghost py-1 px-3 text-xs">Share</button>
            </>
          )}
        </div>
      </div>

      {/* Guest grid */}
      <div className={`flex-1 grid ${gridCols} gap-1 p-1 auto-rows-fr`} style={{ maxHeight: 'calc(100vh - 96px)' }}>
        {/* Slot 0 — local (creator) via VDO.Ninja push */}
        <div
          className={`relative bg-[#161616] rounded-xl overflow-hidden border border-[#C8FF00]/30 transition-all ${
            expandedGuest === 'local' ? 'col-span-2 row-span-2' : ''
          }`}
        >
          {myVdoUrl ? (
            <iframe
              src={myVdoUrl}
              className="w-full h-full"
              allow="autoplay; camera; microphone"
              title="Your feed"
            />
          ) : (
            <video ref={localVideoRef} muted className="w-full h-full object-cover" />
          )}
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <span className="text-xs bg-black/70 px-2 py-0.5 rounded text-[#C8FF00]">
              You {isMuted && '🔇'}
            </span>
            {stream?.status === 'live' && <span className="text-xs bg-red-600 px-1.5 py-0.5 rounded">● LIVE</span>}
          </div>
          <button
            onClick={() => setExpandedGuest(expandedGuest === 'local' ? null : 'local')}
            className="absolute top-2 right-2 bg-black/70 p-1 rounded text-gray-400 hover:text-white"
          >
            {expandedGuest === 'local' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>

        {/* Guest slots */}
        {guests?.map((g) => {
          const vdoSrc = g.vdoStreamId && room
            ? `https://vdo.ninja/?view=${g.vdoStreamId}&room=${room}&autoplay&muted=0&transparent`
            : null;

          return (
            <div
              key={g.id}
              className={`relative bg-[#161616] rounded-xl overflow-hidden border transition-all ${
                g.isSpeaking ? 'border-[#00E5CC] shadow-[0_0_12px_#00E5CC44]' : 'border-[#1E1E1E]'
              } ${expandedGuest === g.id ? 'col-span-2 row-span-2' : ''}`}
            >
              {vdoSrc ? (
                <iframe
                  src={vdoSrc}
                  className="w-full h-full"
                  allow="autoplay"
                  title={g.displayName ?? 'Guest'}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {g.user?.avatarUrl
                    ? <img src={g.user.avatarUrl} alt={g.displayName ?? ''} className="w-16 h-16 rounded-full" />
                    : <div className="w-16 h-16 rounded-full bg-[#242424] flex items-center justify-center text-2xl">🎙️</div>
                  }
                </div>
              )}

              <div className="absolute bottom-2 left-2 text-xs bg-black/70 px-2 py-0.5 rounded text-white flex items-center gap-1">
                {g.isMuted && <MicOff size={10} className="text-[#FF3B3B]" />}
                {g.displayName ?? g.user?.username ?? 'Guest'}
              </div>

              <button
                onClick={() => setExpandedGuest(expandedGuest === g.id ? null : g.id)}
                className="absolute top-2 left-2 bg-black/70 p-1 rounded text-gray-400 hover:text-white"
              >
                {expandedGuest === g.id ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>

              {isHost && (
                <div className="absolute top-2 right-2 flex gap-1">
                  {g.userId && (
                    <>
                      <button onClick={() => muteGuest.mutate({ userId: g.userId!, muted: !g.isMuted })} className="bg-black/70 p-1 rounded hover:bg-[#FF3B3B]/20">
                        {g.isMuted ? <Mic size={12} /> : <MicOff size={12} />}
                      </button>
                      <button onClick={() => kickGuest.mutate(g.userId!)} className="bg-black/70 p-1 rounded hover:bg-[#FF3B3B]/20">
                        <UserX size={12} className="text-[#FF3B3B]" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, (gridSize - 1) - (guests?.length ?? 0)) }).map((_, i) => (
          <div
            key={i}
            className="bg-[#0a0a0a] border border-dashed border-[#1E1E1E] rounded-xl flex items-center justify-center text-gray-800 cursor-pointer hover:border-[#C8FF00]/20 transition-colors"
            onClick={isHost ? generateInvite : undefined}
          >
            <span className="text-3xl">+</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-[#0f0f0f] border-t border-[#1E1E1E] px-4 py-2 flex items-center justify-center gap-3">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-2.5 rounded-full border transition-all ${isMuted ? 'bg-[#FF3B3B] border-[#FF3B3B]' : 'border-[#242424] hover:border-[#C8FF00]/40'}`}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button
          onClick={() => setIsCamOn(!isCamOn)}
          className={`p-2.5 rounded-full border transition-all ${!isCamOn ? 'bg-[#FF3B3B] border-[#FF3B3B]' : 'border-[#242424] hover:border-[#C8FF00]/40'}`}
        >
          {isCamOn ? <Video size={16} /> : <VideoOff size={16} />}
        </button>
        <button
          onClick={async () => {
            await navigator.mediaDevices.getDisplayMedia({ video: true });
            toast.success('Screen share started');
          }}
          className="p-2.5 rounded-full border border-[#242424] hover:border-[#00E5CC]/40 transition-all"
        >
          <Monitor size={16} className="text-[#00E5CC]" />
        </button>
        {isHost && stream && (
          <a
            href={`/watch/${streamId}`}
            target="_blank"
            rel="noreferrer"
            className="p-2.5 rounded-full border border-[#242424] hover:border-[#C8FF00]/40 transition-all"
          >
            <ExternalLink size={16} className="text-[#C8FF00]" />
          </a>
        )}
      </div>

      {showShare && stream && (
        <ShareSheet
          streamId={stream.id}
          title={stream.title}
          isLive={stream.status === 'live'}
          onClose={() => setShowShare(false)}
        />
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <h3 className="font-display text-2xl mb-2">INVITE GUEST</h3>
            <p className="text-xs text-gray-500 mb-4">Share this link — guest will appear live in the grid</p>
            <div className="flex gap-2">
              <input value={inviteUrl} readOnly className="input text-xs font-mono-custom" />
              <button onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success('Copied!'); }} className="btn-ghost py-2 px-3">
                <Copy size={14} />
              </button>
              <a href={inviteUrl} target="_blank" rel="noreferrer" className="btn-volt py-2 px-3">
                <ExternalLink size={14} />
              </a>
            </div>
            <button onClick={() => setInviteOpen(false)} className="btn-ghost w-full mt-4 text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
