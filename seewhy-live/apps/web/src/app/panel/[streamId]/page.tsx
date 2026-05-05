'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useParams } from 'next/navigation';
import { Mic, MicOff, Video, VideoOff, Monitor, UserX, ExternalLink, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import PollCreator from '@/components/polls/PollCreator';
import ShareSheet from '@/components/social/ShareSheet';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.seewhylive.online';

type GridSize = 4 | 9 | 12 | 16;
interface Guest {
  id: string; displayName: string | null; isHost: boolean;
  isSpeaking: boolean; isMuted: boolean; userId: string | null;
  user: { username: string; avatarUrl: string | null } | null;
}

export default function PanelPage() {
  const { streamId } = useParams<{ streamId: string }>();
  const { user } = useAuth();
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOn, setIsCamOn] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const { data: stream } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => api.get<{ id: string; creatorId: string; title: string; status: string }>(`/api/streams/${streamId}`),
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
    const { inviteUrl: url } = await api.post<{ inviteUrl: string }>(`/api/guests/${streamId}/invite`, {});
    setInviteUrl(url);
    setInviteOpen(true);
  };

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (localVideoRef.current) { localVideoRef.current.srcObject = stream; localVideoRef.current.play(); }
    }).catch(() => {});
  }, []);

  const isHost = user?.id === stream?.creatorId;
  const gridCols = gridSize === 4 ? 'grid-cols-2' : gridSize === 9 ? 'grid-cols-3' : gridSize === 12 ? 'grid-cols-4' : 'grid-cols-4';

  return (
    <div className="min-h-screen bg-[#0C0806] flex flex-col">
      {/* Header */}
      <div className="bg-[#0f0f0f] border-b border-[#1E1E1E] px-4 h-12 flex items-center justify-between">
        <h1 className="font-display text-xl text-[#C8FF00]">{stream?.title ?? 'LIVE PANEL'}</h1>
        <div className="flex items-center gap-2">
          {([4,9,12,16] as GridSize[]).map((g) => (
            <button key={g} onClick={() => setGridSize(g)} className={`px-2 py-1 text-xs rounded ${gridSize === g ? 'bg-[#C8FF00] text-[#0C0806] font-bold' : 'text-gray-500 hover:text-white'}`}>{g}</button>
          ))}
          {isHost && (
            <>
              <button onClick={generateInvite} className="btn-volt py-1 px-3 text-xs ml-2">+ Invite</button>
              <PollCreator streamId={streamId} apiUrl={API_URL} onLaunched={() => toast.success('Poll launched!')} />
              <button onClick={() => setShowShare(true)} className="btn-ghost py-1 px-3 text-xs">Share</button>
            </>
          )}
        </div>
      </div>

      {/* Guest grid */}
      <div className={`flex-1 grid ${gridCols} gap-2 p-2`}>
        {/* Local preview */}
        <div className="relative bg-[#161616] rounded-xl overflow-hidden aspect-video border border-[#C8FF00]/30">
          <video ref={localVideoRef} muted className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 text-xs bg-black/70 px-2 py-0.5 rounded text-[#C8FF00]">
            You {isMuted && '🔇'}
          </div>
        </div>

        {guests?.map((g) => (
          <div key={g.id} className={`relative bg-[#161616] rounded-xl overflow-hidden aspect-video border ${g.isSpeaking ? 'border-[#00E5CC]' : 'border-[#1E1E1E]'}`}>
            <div className="w-full h-full flex items-center justify-center">
              {g.user?.avatarUrl
                ? <img src={g.user.avatarUrl} alt={g.displayName ?? ''} className="w-16 h-16 rounded-full" />
                : <div className="w-16 h-16 rounded-full bg-[#242424] flex items-center justify-center text-2xl">🎙️</div>
              }
            </div>
            <div className="absolute bottom-2 left-2 text-xs bg-black/70 px-2 py-0.5 rounded text-white flex items-center gap-1">
              {g.isMuted && <MicOff size={10} className="text-[#FF3B3B]" />}
              {g.displayName ?? g.user?.username ?? 'Guest'}
            </div>
            {isHost && g.userId && (
              <div className="absolute top-2 right-2 flex gap-1">
                <button onClick={() => muteGuest.mutate({ userId: g.userId!, muted: !g.isMuted })} className="bg-black/70 p-1 rounded hover:bg-[#FF3B3B]/20">
                  {g.isMuted ? <Mic size={12} /> : <MicOff size={12} />}
                </button>
                <button onClick={() => kickGuest.mutate(g.userId!)} className="bg-black/70 p-1 rounded hover:bg-[#FF3B3B]/20">
                  <UserX size={12} className="text-[#FF3B3B]" />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, (gridSize - 1) - (guests?.length ?? 0)) }).map((_, i) => (
          <div key={i} className="bg-[#0f0f0f] border border-[#1E1E1E] rounded-xl aspect-video flex items-center justify-center text-gray-700">
            <span className="text-3xl">+</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-[#0f0f0f] border-t border-[#1E1E1E] px-4 py-3 flex items-center justify-center gap-4">
        <button onClick={() => setIsMuted(!isMuted)} className={`p-3 rounded-full border ${isMuted ? 'bg-[#FF3B3B] border-[#FF3B3B]' : 'border-[#242424] hover:border-[#C8FF00]/40'}`}>
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button onClick={() => setIsCamOn(!isCamOn)} className={`p-3 rounded-full border ${!isCamOn ? 'bg-[#FF3B3B] border-[#FF3B3B]' : 'border-[#242424] hover:border-[#C8FF00]/40'}`}>
          {isCamOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>
        <button onClick={async () => {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          toast.success('Screen share started');
        }} className="p-3 rounded-full border border-[#242424] hover:border-[#00E5CC]/40">
          <Monitor size={18} className="text-[#00E5CC]" />
        </button>
      </div>

      {showShare && stream && (
        <ShareSheet
          streamId={stream.id}
          title={stream.title}
          isLive={stream.status === 'live'}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <h3 className="font-display text-2xl mb-4">INVITE GUEST</h3>
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
