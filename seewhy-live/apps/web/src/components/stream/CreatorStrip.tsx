'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Stream { id: string; creator: { id: string; username: string; displayName: string | null; avatarUrl: string | null }; status: string }

export function CreatorStrip() {
  const { data } = useQuery({
    queryKey: ['creator-strip'],
    queryFn: () => api.get<{ streams: Stream[] }>('/api/streams?status=live&limit=10'),
    refetchInterval: 30000,
  });

  if (!data?.streams.length) return null;

  const unique = Array.from(new Map(data.streams.map((s) => [s.creator.id, s])).values());

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
      {unique.map((s) => (
        <Link key={s.creator.id} href={`/watch/${s.id}`} className="flex-shrink-0 flex flex-col items-center gap-2 group">
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#FF3B3B] group-hover:border-[#C8FF00] transition-colors">
            {s.creator.avatarUrl
              ? <img src={s.creator.avatarUrl} alt={s.creator.username} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center text-xl">🎙️</div>
            }
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#FF3B3B] rounded-full border border-[#0C0806]" />
          </div>
          <span className="text-xs text-gray-400 group-hover:text-white transition-colors truncate w-16 text-center">
            {s.creator.displayName ?? s.creator.username}
          </span>
        </Link>
      ))}
    </div>
  );
}
