import { api } from '@/lib/api';
import Link from 'next/link';
import { Eye, Zap } from 'lucide-react';

interface Stream {
  id: string; title: string; description: string | null;
  viewerCount: number; creator: { username: string; displayName: string | null };
}

async function getFeatured(): Promise<Stream | null> {
  try {
    const { streams } = await api.get<{ streams: Stream[] }>('/api/streams?status=live&limit=1');
    return streams[0] ?? null;
  } catch { return null; }
}

export async function FeaturedStream() {
  const stream = await getFeatured();
  if (!stream) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#C8FF00]/20 bg-gradient-to-r from-[#161616] to-[#0f0f0f] p-8 flex items-center justify-between">
      <div>
        <span className="live-badge mb-3 inline-block">● LIVE NOW</span>
        <h2 className="font-display text-5xl text-white mb-2">{stream.title}</h2>
        <p className="text-gray-400 text-sm mb-4">{stream.creator.displayName ?? stream.creator.username}</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-sm text-gray-400">
            <Eye size={14} /> {stream.viewerCount.toLocaleString()} watching
          </span>
          <Link href={`/watch/${stream.id}`} className="btn-volt flex items-center gap-2 py-2.5 px-5">
            <Zap size={16} /> Watch Now
          </Link>
        </div>
      </div>
      <div className="hidden md:block text-[120px] opacity-10 font-display">LIVE</div>
    </div>
  );
}
