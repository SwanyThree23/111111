import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Radio, Eye, Filter, Flame, Clock, TrendingUp,
  Globe, X,
} from 'lucide-react';
import api from '@/utils/api';

interface PublicStream {
  id: string;
  title: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  isLive: boolean;
  currentViewers: number;
  startedAt?: string;
  createdAt: string;
  user: { id: string; username: string; avatar?: string };
  stats?: { viewers: number; bitrate: number }[];
}

const CATEGORIES = ['All', 'gaming', 'music', 'talk', 'sports', 'education', 'tech', 'creative'];

const SORT_OPTIONS = [
  { key: 'live',    label: 'Live Now',  icon: Flame },
  { key: 'viewers', label: 'Most Watched', icon: TrendingUp },
  { key: 'recent',  label: 'Recent',    icon: Clock },
];

function StreamCard({ stream }: { stream: PublicStream }) {
  const viewers = stream.currentViewers || stream.stats?.[0]?.viewers || 0;
  const avatar  = stream.user.avatar
    ? stream.user.avatar
    : `https://api.dicebear.com/8.x/initials/svg?seed=${stream.user.username}`;

  return (
    <Link
      to={`/streams/${stream.id}`}
      className="group block rounded-2xl overflow-hidden border border-white/8 bg-obsidian-50 hover:border-white/20 transition"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-obsidian flex items-center justify-center">
        {stream.thumbnailUrl ? (
          <img
            src={stream.thumbnailUrl}
            alt={stream.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#1a0a0a 0%,#0d0d1a 100%)' }}
          >
            <Radio className="w-10 h-10 text-white/10" />
          </div>
        )}

        {/* LIVE badge */}
        {stream.isLive && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-600 text-white text-xs font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            LIVE
          </div>
        )}

        {/* Viewer count */}
        {viewers > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 text-white text-xs font-mono">
            <Eye className="w-3 h-3" />
            {viewers.toLocaleString()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <img
            src={avatar}
            alt={stream.user.username}
            className="w-8 h-8 rounded-full shrink-0 mt-0.5"
          />
          <div className="min-w-0">
            <p className="text-white font-medium text-sm truncate group-hover:text-gold transition">
              {stream.title}
            </p>
            <Link
              to={`/profile/${stream.user.username}`}
              onClick={(e) => e.stopPropagation()}
              className="text-white/40 text-xs font-mono hover:text-white/70 transition"
            >
              @{stream.user.username}
            </Link>
            {stream.category && (
              <span className="ml-2 text-xs font-mono text-gold/60">{stream.category}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Discover() {
  const [streams, setStreams]       = useState<PublicStream[]>([]);
  const [loading, setLoading]       = useState(true);
  const [query, setQuery]           = useState('');
  const [category, setCategory]     = useState('All');
  const [sort, setSort]             = useState('live');
  const [liveOnly, setLiveOnly]     = useState(false);
  const [debouncedQ, setDebouncedQ] = useState('');

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchStreams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQ)           params.set('q', debouncedQ);
      if (category !== 'All')   params.set('category', category);
      if (liveOnly || sort === 'live') params.set('live', 'true');

      const res = await api.get(`/streams/public?${params.toString()}`);
      let list: PublicStream[] = res.data.streams || [];

      if (sort === 'viewers') {
        list = [...list].sort((a, b) => b.currentViewers - a.currentViewers);
      } else if (sort === 'recent') {
        list = [...list].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }

      setStreams(list);
    } catch {
      setStreams([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, category, sort, liveOnly]);

  useEffect(() => { fetchStreams(); }, [fetchStreams]);

  const liveStreams   = streams.filter((s) => s.isLive);
  const offlineStreams = streams.filter((s) => !s.isLive);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-wider text-white">DISCOVER</h1>
          <p className="text-white/40 font-mono text-sm mt-1">
            Explore live streams from creators on the network
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-white/30">
          <Globe className="w-4 h-4" />
          {streams.length} streams
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search box */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search streams…"
            className="w-full pl-9 pr-9 py-2.5 bg-obsidian border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold/40"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex gap-1 p-1 bg-obsidian border border-white/10 rounded-xl">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                sort === opt.key
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-mono border transition ${
              category === cat
                ? 'bg-burgundy/30 border-burgundy/50 text-white'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
            }`}
          >
            {cat}
          </button>
        ))}
        <button
          onClick={() => setLiveOnly((v) => !v)}
          className={`px-3 py-1 rounded-full text-xs font-mono border flex items-center gap-1.5 transition ${
            liveOnly
              ? 'bg-red-600/20 border-red-500/40 text-red-400'
              : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
          }`}
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${liveOnly ? 'bg-red-500 animate-pulse' : 'bg-white/30'}`} />
          Live only
        </button>
      </div>

      {/* Live streams section */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-white/8 bg-obsidian-50 animate-pulse">
              <div className="aspect-video bg-white/5" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : streams.length === 0 ? (
        <div className="card text-center py-20">
          <Filter className="w-10 h-10 mx-auto mb-3 text-white/20" />
          <p className="text-white/40 font-mono">No streams match your filters</p>
          <button
            onClick={() => { setQuery(''); setCategory('All'); setLiveOnly(false); }}
            className="btn-ghost mt-4 text-sm"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {liveStreams.length > 0 && (
            <section>
              <h2 className="font-display text-xl tracking-wider text-white mb-4 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                LIVE NOW
                <span className="text-sm font-mono text-white/30 font-normal">({liveStreams.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {liveStreams.map((s) => <StreamCard key={s.id} stream={s} />)}
              </div>
            </section>
          )}

          {offlineStreams.length > 0 && !liveOnly && (
            <section>
              <h2 className="font-display text-xl tracking-wider text-white/60 mb-4">
                RECENT STREAMS
                <span className="text-sm font-mono text-white/30 font-normal ml-2">({offlineStreams.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {offlineStreams.map((s) => <StreamCard key={s.id} stream={s} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
