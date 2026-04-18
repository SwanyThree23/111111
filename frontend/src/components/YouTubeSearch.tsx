import { useState, useEffect } from 'react';
import { Search, Play, ExternalLink } from 'lucide-react';
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

export default function YouTubeSearch({ onSelect }: YouTubeSearchProps) {
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await api.get('/watch-party/channels');
      setChannels(res.data.channels);
    } catch { /* Silently fail */ }
  };

  const search = async () => {
    if (!query.trim() && !activeChannel) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (activeChannel) params.set('channelId', activeChannel);
      const res = await api.get(`/watch-party/youtube/search?${params}`);
      setVideos(res.data.videos || []);
    } catch {
      // Show demo videos
      setVideos([
        {
          id: 'BFfb2P5wxC0',
          title: 'Hip Hop Biochemistry with Dr. Muk',
          channelTitle: 'STEAMulater',
          thumbnail: 'https://img.youtube.com/vi/BFfb2P5wxC0/hqdefault.jpg',
          publishedAt: new Date().toISOString(),
        },
        {
          id: 'dQw4w9WgXcQ',
          title: 'A.I. Verse Podcast - Strategic Partnerships',
          channelTitle: 'AIVerse',
          thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
          publishedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search();
  };

  const handleChannelClick = (channelId: string) => {
    setActiveChannel(channelId === activeChannel ? null : channelId);
    setQuery('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Featured Channels */}
      <div className="p-4 border-b border-gray-800">
        <p className="text-xs text-gray-400 mb-2">Fanbase Network Channels</p>
        <div className="flex gap-2 flex-wrap">
          {channels.map(ch => (
            <button
              key={ch.id}
              onClick={() => handleChannelClick(ch.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                activeChannel === ch.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {ch.name}
              {ch.fanbaseUrl && (
                <a
                  href={ch.fanbaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="opacity-60 hover:opacity-100"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="p-4 flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search YouTube..."
            className="w-full bg-gray-800 text-white pl-10 pr-3 py-2 rounded-xl text-sm outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-500"
          />
        </div>
        <button
          onClick={search}
          disabled={isLoading}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-bold disabled:opacity-50"
        >
          {isLoading ? '...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {videos.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500 text-sm">
            {activeChannel ? 'Click Search to load channel videos' : 'Search for videos above'}
          </div>
        )}
        {videos.map(video => (
          <button
            key={video.id}
            onClick={() => onSelect(video.id)}
            className="w-full flex gap-3 p-2 hover:bg-gray-800 rounded-xl transition text-left group"
          >
            <div className="relative flex-shrink-0">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-28 h-16 object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <Play className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white line-clamp-2">{video.title}</p>
              <p className="text-xs text-gray-500 mt-1">{video.channelTitle}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
