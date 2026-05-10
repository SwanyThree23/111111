import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { DollarSign, Users, Radio, TrendingUp, Award } from 'lucide-react';
import api from '@/utils/api';
import { format, subDays } from 'date-fns';

const CREATOR_SHARE = 0.90;

interface DashboardStats {
  totalStreams: number;
  liveStreams: number;
  avgViewers: number;
  totalChatMessages: number;
  totalTipsReceived?: number;
}

// Generate mock chart data keyed to past 30 days
const buildChartData = (totalTips: number) =>
  Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i);
    const raw = Math.floor(Math.random() * (totalTips / 10 + 500));
    return {
      date: format(d, 'MMM d'),
      total: raw,
      creator: Math.floor(raw * CREATOR_SHARE),
      viewers: Math.floor(Math.random() * 200 + 20),
    };
  });

const TOOLTIP_STYLE = {
  backgroundColor: '#12121C',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  color: '#ffffff',
  fontFamily: 'IBM Plex Mono',
  fontSize: '12px',
};

export default function Analytics() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ReturnType<typeof buildChartData>>([]);

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then((res) => {
        setStats(res.data);
        setChartData(buildChartData(res.data.totalTipsReceived || 5000));
      })
      .catch(() => {
        setChartData(buildChartData(5000));
      })
      .finally(() => setLoading(false));
  }, []);

  const creatorRevenue = Math.floor((stats?.totalTipsReceived || 0) * CREATOR_SHARE);

  const kpis = [
    {
      label: 'Creator Revenue',
      value: `$${(creatorRevenue / 100).toFixed(2)}`,
      sub: '90% of tips',
      icon: DollarSign,
      accent: 'text-gold',
      border: 'border-gold/20 bg-gold/5',
    },
    {
      label: 'Total Streams',
      value: stats?.totalStreams ?? 0,
      sub: `${stats?.liveStreams ?? 0} live now`,
      icon: Radio,
      accent: 'text-burgundy-light',
      border: 'border-burgundy/20 bg-burgundy/5',
    },
    {
      label: 'Avg Viewers',
      value: stats?.avgViewers ?? 0,
      sub: 'Per stream',
      icon: Users,
      accent: 'text-blue-400',
      border: 'border-blue-800/30 bg-blue-900/10',
    },
    {
      label: 'Chat Messages',
      value: (stats?.totalChatMessages ?? 0).toLocaleString(),
      sub: 'All time',
      icon: TrendingUp,
      accent: 'text-green-400',
      border: 'border-green-800/30 bg-green-900/10',
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-burgundy/20 border border-burgundy/40 rounded-xl flex items-center justify-center">
          <Award className="w-5 h-5 text-burgundy-light" />
        </div>
        <div>
          <h1 className="font-display text-4xl tracking-wider text-white">ANALYTICS</h1>
          <p className="text-white/40 font-mono text-sm">30-day performance overview</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse h-28" />
            ))
          : kpis.map((k) => (
              <div key={k.label} className={`card border ${k.border}`}>
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-mono text-white/40 uppercase tracking-widest">{k.label}</p>
                  <k.icon className={`w-4 h-4 ${k.accent}`} />
                </div>
                <p className={`text-3xl font-bold font-mono ${k.accent}`}>{k.value}</p>
                <p className="text-white/30 text-xs font-mono mt-1">{k.sub}</p>
              </div>
            ))}
      </div>

      {/* Revenue chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl tracking-wider text-white">REVENUE — LAST 30 DAYS</h2>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-gold inline-block" /> Creator (90%)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-white/20 inline-block" /> Total</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C9AF37" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#C9AF37" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number, name: string) => [`$${(v / 100).toFixed(2)}`, name === 'creator' ? 'Creator (90%)' : 'Total']}
              labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
            />
            <Area type="monotone" dataKey="total" stroke="rgba(255,255,255,0.2)" fill="url(#totalGrad)" strokeWidth={1} />
            <Area type="monotone" dataKey="creator" stroke="#C9AF37" fill="url(#goldGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Viewer trend */}
      <div className="card">
        <h2 className="font-display text-xl tracking-wider text-white mb-6">VIEWER TREND</h2>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: 'rgba(255,255,255,0.6)' }} />
            <Line type="monotone" dataKey="viewers" stroke="#800020" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card border-gold/10">
            <h3 className="font-mono text-xs text-white/40 uppercase tracking-widest mb-3">Revenue Split</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-sm text-white/60">Creator (90%)</span>
                <span className="font-mono font-bold text-gold">${(creatorRevenue / 100).toFixed(2)}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gold rounded-full" style={{ width: '90%' }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-sm text-white/30">Platform (10%)</span>
                <span className="font-mono text-white/30">${(((stats.totalTipsReceived || 0) - creatorRevenue) / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-mono text-xs text-white/40 uppercase tracking-widest mb-3">Engagement</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-mono text-sm text-white/60">Messages per stream</span>
                <span className="font-mono font-bold text-white">
                  {stats.totalStreams > 0
                    ? Math.round(stats.totalChatMessages / stats.totalStreams)
                    : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-sm text-white/60">Live streams now</span>
                <span className={`font-mono font-bold ${stats.liveStreams > 0 ? 'text-green-400' : 'text-white/40'}`}>
                  {stats.liveStreams}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
