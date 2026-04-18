'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { TipJar } from '@/components/payment/TipJar';
import { GoldenPaywall } from '@/components/payment/GoldenPaywall';
import { DirectPayPanel } from '@/components/payment/DirectPayPanel';
import { Eye } from 'lucide-react';
import { useParams } from 'next/navigation';

const PREVIEW_SECS = 120;

export default function WatchPage() {
  const { streamId } = useParams<{ streamId: string }>();
  const { user } = useAuth();
  const [previewSecsLeft, setPreviewSecsLeft] = useState(PREVIEW_SECS);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: stream } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => api.get<{
      id: string; title: string; description: string | null;
      viewerCount: number; status: string; startedAt: string | null; creatorId: string;
      creator: { id: string; username: string; displayName: string | null; stripeOnboarded: boolean };
    }>(`/api/streams/${streamId}`),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!stream?.startedAt || hasAccess) return;
    const elapsed = (Date.now() - new Date(stream.startedAt).getTime()) / 1000;
    const remaining = Math.max(0, PREVIEW_SECS - elapsed);
    setPreviewSecsLeft(Math.floor(remaining));
    if (remaining <= 0) { setPaywallOpen(true); return; }
    timerRef.current = setInterval(() => {
      setPreviewSecsLeft((prev) => {
        if (prev <= 1) { setPaywallOpen(true); clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stream?.startedAt, hasAccess]);

  if (!stream) return <div className="min-h-screen bg-[#0C0806] animate-pulse" />;

  const room = `seewhy-${stream.id.slice(0, 8)}`;

  return (
    <div className="min-h-screen bg-[#0C0806] flex flex-col">
      <div className="max-w-[1600px] mx-auto w-full px-4 py-4 flex gap-4 flex-col lg:flex-row">
        <div className="flex-1 space-y-4">
          <div className="relative aspect-video bg-[#0f0f0f] rounded-2xl overflow-hidden border border-[#1E1E1E]">
            {stream.status === 'live' ? (
              <iframe
                src={`https://vdo.ninja/?view=${streamId}&room=${room}&autoplay`}
                className="w-full h-full"
                allow="autoplay; camera; microphone"
                title={stream.title}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-gray-600">
                  <div className="text-5xl mb-4">📡</div>
                  <p className="font-display text-2xl">STREAM OFFLINE</p>
                </div>
              </div>
            )}
            {stream.status === 'live' && !hasAccess && previewSecsLeft > 0 && (
              <div className="absolute top-3 right-3 bg-black/80 px-3 py-1.5 rounded-lg text-sm font-mono-custom text-[#C8FF00]">
                FREE PREVIEW: {Math.floor(previewSecsLeft / 60)}:{String(previewSecsLeft % 60).padStart(2, '0')}
              </div>
            )}
            {stream.status === 'live' && (
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="live-badge">● LIVE</span>
                <span className="bg-black/70 text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Eye size={10} /> {stream.viewerCount.toLocaleString()}
                </span>
              </div>
            )}
          </div>
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl">{stream.title}</h1>
                <p className="text-gray-500 text-sm mt-1">{stream.creator.displayName ?? stream.creator.username}</p>
                {stream.description && <p className="text-gray-400 text-sm mt-2">{stream.description}</p>}
              </div>
              {user?.id !== stream.creatorId && stream.creator.stripeOnboarded && (
                <TipJar streamId={stream.id} creatorId={stream.creatorId} />
              )}
            </div>
          </div>
          <DirectPayPanel creatorUsername={stream.creator.username} />
        </div>
        <div className="w-full lg:w-[340px] flex-shrink-0">
          <ChatPanel streamId={stream.id} />
        </div>
      </div>
      {paywallOpen && !hasAccess && (
        <GoldenPaywall
          streamId={stream.id}
          creatorId={stream.creatorId}
          onUnlocked={() => { setHasAccess(true); setPaywallOpen(false); }}
          onClose={() => setPaywallOpen(false)}
        />
      )}
    </div>
  );
}
