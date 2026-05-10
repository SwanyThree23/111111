import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign, Radio, Users, TrendingUp, Play, Tv2,
  ExternalLink, ChevronRight, Zap, Eye, Settings,
} from 'lucide-react';
import api from '@/utils/api';
import { useAuth } from '@/utils/auth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Stream } from '@/types';

const CREATOR_SHARE = 0.90;

interface DashboardStats {
  totalStreams: number;
  liveStreams: number;
  avgViewers: number;
  totalChatMessages: number;
  totalTipsReceived?: number;
  totalRevenueCreator?: number;
}

const STATUS_BADGE: Record<string, string> = {
  LIVE: 'badge badge-live',
  STARTING: 'badge badge-warning',
  STOPPING: 'badge badge-warning',
  STOPPED: 'badge badge-info',
  ERROR: 'badge badge-error',
  IDLE: 'badge bg-white/10 text-white/50',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [liveViewers, setLiveViewers] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const { lastMessage } = useWebSocket(undefined, {
    onMessage: (msg) => {
      if (msg.type === 'viewer_count') setLiveViewers(msg.data?.count ?? 0);
    },
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statsRes, streamsRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/streams'),
      ]);
      setStats(statsRes.data);
      setStreams(streamsRes.data.streams || []);
    } catch {
      // silently handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const liveNow = streams.filter((s) => s.isLive || s.status === 'LIVE');

  const creatorRevenue = stats?.totalRevenueCreator
    ?? Math.floor((stats?.totalTipsReceived || 0) * CREATOR_SHARE);

  const statCards = [
    {
      label: 'Creator Revenue',
      value: `$${(creatorRevenue / 100).toFixed(2)}`,
      sub: '90% of all tips',
      icon: DollarSign,
      accent: 'text-gold',
      bg: 'bg-gold/10 border-gold/20',
    },
    {
      label: 'Live Viewers',
      value: liveViewers || (stats?.liveStreams ?? 0),
      sub: 'Right now',
      icon: Users,
      accent: 'text-green-400',
      bg: 'bg-green-900/20 border-green-800/30',
    },
    {
      label: 'Total Streams',
      value: stats?.totalStreams ?? 0,
      sub: `${stats?.liveStreams ?? 0} live now`,
      icon: Radio,
      accent: 'text-burgundy-light',
      bg: 'bg-burgundy/10 border-burgundy/20',
    },
    {
      label: 'Avg Viewers',
      value: stats?.avgViewers ?? 0,
      sub: 'Per stream',
      icon: TrendingUp,
      accent: 'text-blue-400',
      bg: 'bg-blue-900/20 border-blue-800/30',
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">

      {/* NOW LIVE banner */}
      {liveNow.length > 0 && (
        <div
          className="relative rounded-2xl overflow-hidden border border-red-500/30"
          style={{ background: 'linear-gradient(135deg, rgba(139,0,0,0.25) 0%, rgba(7,7,13,0.9) 60%, rgba(20,15,5,0.9) 100%)' }}
        >
          {/* animated glow edge */}
          <div className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{ boxShadow: '0 0 40px rgba(220,38,38,0.15) inset' }} />

          <div className="relative px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* LEFT — LIVE indicator */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="font-display text-2xl tracking-widest text-red-400">NOW LIVE</span>
              {liveNow.length > 1 && (
                <span className="ml-1 text-xs font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  {liveNow.length} streams
                </span>
              )}
            </div>

            {/* CENTER — stream cards */}
            <div className="flex-1 flex flex-wrap gap-3">
              {liveNow.map((s) => {
                const latestStat = s.stats?.[s.stats.length - 1];
                const viewers = latestStat?.viewers ?? 0;
                const isOwn = s.userId === user?.id;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 min-w-0"
                  >
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate max-w-[180px]">{s.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Eye className="w-3 h-3 text-white/40" />
                        <span className="text-white/40 font-mono text-xs">{viewers} watching</span>
                        {s.destinations?.length > 0 && (
                          <span className="text-white/20 font-mono text-xs">
                            · {s.destinations.length} dest.
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      <Link
                        to={`/streams/${s.id}`}
                        className="text-xs font-mono px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" /> Watch
                      </Link>
                      {isOwn && (
                        <button
                          onClick={() => navigate('/go-live')}
                          className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/60 border border-white/10 transition flex items-center gap-1"
                        >
                          <Settings className="w-3 h-3" /> Manage
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RIGHT — dismiss hint */}
            <p className="text-white/20 text-xs font-mono shrink-0 hidden lg:block">
              {liveNow.length === 1 ? '1 active stream' : `${liveNow.length} active streams`}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-wider text-white">
            DASHBOARD
          </h1>
          <p className="text-white/40 font-mono text-sm mt-1">
            Welcome back, <span className="text-gold">{user?.username || 'Creator'}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/watch-party/party-${Date.now()}`)}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <Tv2 className="w-4 h-4" /> Watch Party
          </button>
          <button
            onClick={() => navigate('/go-live')}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Radio className="w-4 h-4" />
            <span className="live-dot" />
            Go Live
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-white/10 rounded w-2/3 mb-3" />
                <div className="h-8 bg-white/10 rounded w-1/2" />
              </div>
            ))
          : statCards.map((c) => (
              <div key={c.label} className={`card border ${c.bg}`}>
                <div className="flex items-start justify-between mb-3">
                  <p className="text-white/50 text-xs font-mono uppercase tracking-widest">{c.label}</p>
                  <c.icon className={`w-4 h-4 ${c.accent}`} />
                </div>
                <p className={`text-3xl font-bold ${c.accent} font-mono`}>{c.value}</p>
                <p className="text-white/30 text-xs font-mono mt-1">{c.sub}</p>
              </div>
            ))}
      </div>

      {/* Revenue breakdown */}
      {!loading && stats && (
        <div className="card bg-gradient-to-br from-obsidian-50 to-obsidian border-gold/10">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-gold" />
            <h2 className="font-display text-xl tracking-wider text-white">REVENUE SPLIT</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gold/5 border border-gold/10 rounded-xl">
              <p className="text-gold font-display text-3xl tracking-wider">90%</p>
              <p className="text-white/60 text-xs font-mono mt-1">Creator (you)</p>
              <p className="text-gold font-mono font-bold mt-1">${(creatorRevenue / 100).toFixed(2)}</p>
            </div>
            <div className="text-center p-4 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-white/40 font-display text-3xl tracking-wider">10%</p>
              <p className="text-white/40 text-xs font-mono mt-1">Platform fee</p>
              <p className="text-white/40 font-mono font-bold mt-1">
                ${(((stats.totalTipsReceived || 0) - creatorRevenue) / 100).toFixed(2)}
              </p>
            </div>
            <div className="text-center p-4 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-white font-display text-3xl tracking-wider">LIVE</p>
              <p className="text-white/40 text-xs font-mono mt-1">RTMP ingest</p>
              <p className="text-white/60 font-mono font-bold mt-1 text-xs">rtmp://live.seewhy.live</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent streams */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl tracking-wider text-white">RECENT STREAMS</h2>
          <Link to="/streams" className="text-gold hover:text-gold-light text-sm font-mono flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="card animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-white/5 rounded-xl" />
            ))}
          </div>
        ) : streams.length === 0 ? (
          <div className="card text-center py-16">
            <Radio className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <p className="text-white/40 font-mono">No streams yet</p>
            <button
              onClick={() => navigate('/go-live')}
              className="btn-primary mt-4 flex items-center gap-2 mx-auto"
            >
              <Play className="w-4 h-4" /> Start your first stream
            </button>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-white/8">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-mono text-white/40 uppercase tracking-widest">Title</th>
                  <th className="text-left px-6 py-3 text-xs font-mono text-white/40 uppercase tracking-widest">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-mono text-white/40 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {streams.slice(0, 5).map((s) => (
                  <tr key={s.id} className="hover:bg-white/3 transition group">
                    <td className="px-6 py-4 font-medium text-white">{s.title}</td>
                    <td className="px-6 py-4">
                      <span className={STATUS_BADGE[s.status] || 'badge bg-white/10 text-white/50'}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/40 font-mono text-xs">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/streams/${s.id}`}
                        className="text-gold/60 hover:text-gold transition flex items-center gap-1 text-xs font-mono"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
