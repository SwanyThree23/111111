'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Eye } from 'lucide-react';

interface Stream {
  id: string;
  title: string;
  category: string;
  viewerCount: number;
  status: string;
  thumbnailUrl: string | null;
  creator: { username: string; displayName: string | null; avatarUrl: string | null };
}

interface StreamsResponse { streams: Stream[]; total: number }

export function StreamGrid({ category }: { category?: string }) {
  const { data } = useQuery({
    queryKey: ['streams', category],
    queryFn: () => api.get<StreamsResponse>(`/api/streams?status=live${category ? `&category=${category}` : ''}`),
    refetchInterval: 15000,
  });

  if (!data?.streams.length) {
    return (
      <div className="text-center py-20 text-gray-600">
        <p className="font-display text-3xl mb-2">NO LIVE STREAMS</p>
        <p className="text-sm">Be the first to go live today</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {data.streams.map((stream) => (
        <Link key={stream.id} href={`/watch/${stream.id}`} className="group card p-0 overflow-hidden hover:border-[#C8FF00]/30 transition-all">
          <div className="relative aspect-video bg-[#1A1A1A]">
            {stream.thumbnailUrl
              ? <img src={stream.thumbnailUrl} alt={stream.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-4xl">📡</div>
            }
            {stream.status === 'live' && (
              <span className="absolute top-2 left-2 live-badge">● LIVE</span>
            )}
            <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
              <Eye size={10} /> {stream.viewerCount.toLocaleString()}
            </span>
          </div>
          <div className="p-3">
            <p className="font-semibold text-sm truncate group-hover:text-[#C8FF00] transition-colors">{stream.title}</p>
            <p className="text-gray-500 text-xs mt-0.5">{stream.creator.displayName ?? stream.creator.username}</p>
            <span className="inline-block mt-1.5 text-xs bg-[#1A1A1A] border border-[#242424] px-2 py-0.5 rounded-full text-gray-400">
              {stream.category}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
