import { useState, useEffect } from 'react';
import { Search, Play, ExternalLink, Loader } from 'lucide-react';
import api from '@/utils/api';

interface Video {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
}

interface Channel {
  id: string;
  name: string;
  handle: string;
  url: string;
  fanbaseUrl?: string;
  category: string;
}

interface YouTubeSearchProps {
  onSelect: (videoId: string) => void;
}

const DEMO_VIDEOS: Video[] = [
  {
    id: 'BFfb2P5wxC0',
    title: 'Hip Hop Biochemistry with Dr. Muk',
    channelTitle: 'STEAMulater',
    thumbnail: 'https://img.youtube.com/vi/BFfb2P5wxC0/hqdefault.jpg',
    publishedAt: new Date().toISOString(),
  },
  {
    id: 'dQw4w9WgXcQ',
    title: 'A.I. Verse Podcast — Strategic Partnerships',
    channelTitle: 'AIVerse',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    publishedAt: new Date().toISOString(),
  },
];

export default function YouTubeSearch({ onSelect }: YouTubeSearchProps) {
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  useEffect(() => {
    api.get('/watch-party/channels')
      .then((r) => setChannels(r.data.channels || []))
      .catch(() => {});
  }, []);

  const search = async () => {
    if (!query.trim() && !activeChannel) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (activeChannel) params.set('channelId', activeChannel);
      const res = await api.get(`/watch-party/youtube/search?${params}`);
      setVideos(res.data.videos || []);
    } catch {
      setVideos(DEMO_VIDEOS);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Channel chips */}
      {channels.length > 0 && (
        <div className="p-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-mono text-white/30 mb-2 uppercase tracking-widest">Fanbase Network</p>
          <div className="flex gap-2 flex-wrap">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id === activeChannel ? null : ch.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition ${
                  activeChannel === ch.id
                    ? 'bg-burgundy text-white'
                    : 'text-white/50 hover:text-white/80'
                }`}
                style={{
                  background: activeChannel === ch.id ? undefined : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                {ch.name}
                {ch.fanbaseUrl && (
                  <a
                    href={ch.fanbaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-50 hover:opacity-100"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="p-3 flex gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Search YouTube..."
            className="input pl-10"
          />
        </div>
        <button
          onClick={search}
          disabled={loading}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-40 flex items-center gap-1.5"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {videos.length === 0 && !loading && (
          <div className="text-center py-12 text-white/20 font-mono text-sm">
            {activeChannel ? 'Click Search to load channel videos' : 'Search for any YouTube video'}
          </div>
        )}
        {videos.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className="w-full flex gap-3 p-2.5 rounded-xl transition text-left group"
            style={{ background: 'rgba(255,255,255,0)', border: '1px solid transparent' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0)';
              (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
            }}
          >
            <div className="relative flex-shrink-0">
              <img
                src={v.thumbnail}
                alt={v.title}
                className="w-28 h-16 object-cover rounded-lg"
                onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="112" height="64" fill="%231a1a28"><rect width="112" height="64"/></svg>'; }}
              />
              <div className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                   style={{ background: 'rgba(0,0,0,0.4)' }}>
                <Play className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white line-clamp-2 leading-snug">{v.title}</p>
              <p className="text-xs text-white/40 font-mono mt-1">{v.channelTitle}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
