'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  DollarSign, Users, Video, MessageSquare, TrendingUp, Eye,
  Clock, BarChart2, ArrowRight, Radio
} from 'lucide-react';
import Link from 'next/link';

type Period = 'today' | 'week' | 'month' | 'all';

interface EarningsData {
  totals: { gross: number; creator: number; platform: number };
  byType: { type: string; _sum: { grossAmount: number | null; creatorAmount: number | null } }[];
  transactions: { id: string; type: string; grossAmount: number; creatorAmount: number; status: string; createdAt: string }[];
}

interface DashboardData { totalStreams: number; liveStreams: number; totalEarnings: number; totalMessages: number }

interface StreamStat {
  id: string; title: string; status: string; category: string;
  viewerCount: number; peakViewerCount: number; tipTotal: string;
  startedAt: string | null; endedAt: string | null; createdAt: string;
  _count: { chatMessages: number; guests: number };
  earnings: { creator: number; gross: number; txCount: number };
}

function durationLabel(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return '—';
  const end = endedAt ? new Date(endedAt) : new Date();
  const secs = Math.round((end.getTime() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('month');

  useEffect(() => { if (!user) router.push('/auth/login'); }, [user, router]);

  const { data: earnings } = useQuery({
    queryKey: ['earnings', period],
    queryFn: () => api.get<EarningsData>(`/api/analytics/earnings?period=${period}`),
    enabled: !!user,
  });

  const { data: dash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/api/analytics/dashboard'),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: streams } = useQuery({
    queryKey: ['analytics-streams'],
    queryFn: () => api.get<StreamStat[]>('/api/analytics/streams'),
    enabled: !!user,
  });

  if (!user) return null;

  const STATS = [
    { label: 'Total Streams', value: dash?.totalStreams ?? 0, icon: Video, color: '#C8FF00' },
    { label: 'Live Now', value: dash?.liveStreams ?? 0, icon: Radio, color: '#FF3B3B' },
    { label: 'Your Earnings', value: `$${(Number(dash?.totalEarnings ?? 0)).toFixed(2)}`, icon: DollarSign, color: '#D4AF37' },
    { label: 'Chat Messages', value: (dash?.totalMessages ?? 0).toLocaleString(), icon: MessageSquare, color: '#A855F7' },
  ];

  const byTypeMap = Object.fromEntries(
    (earnings?.byType ?? []).map((b) => [b.type, Number(b._sum.creatorAmount ?? 0)])
  );

  return (
    <div className="min-h-screen bg-[#0C0806] p-4">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="font-display text-5xl text-white">DASHBOARD</h1>
          <p className="text-sm text-gray-500">
            Welcome back, <span className="text-[#C8FF00]">{user.displayName ?? user.username}</span>
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 font-ui uppercase tracking-wider">{s.label}</p>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <p className="font-display text-3xl" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Earnings section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-display text-2xl flex items-center gap-2"><DollarSign size={18} /> EARNINGS</h2>
            <div className="flex gap-1">
              {(['today','week','month','all'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-ui uppercase transition-all ${period === p ? 'bg-[#C8FF00] text-[#0C0806] font-bold' : 'text-gray-500 hover:text-white'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#0f0f0f] rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Gross</p>
              <p className="font-display text-2xl text-white">${(earnings?.totals.gross ?? 0).toFixed(2)}</p>
            </div>
            <div className="bg-[#0f0f0f] rounded-xl p-4 text-center border border-[#C8FF00]/20">
              <p className="text-xs text-[#C8FF00] mb-1">Your Share (90%)</p>
              <p className="font-display text-2xl text-[#C8FF00]">${(earnings?.totals.creator ?? 0).toFixed(2)}</p>
            </div>
            <div className="bg-[#0f0f0f] rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Platform (10%)</p>
              <p className="font-display text-2xl text-gray-400">${(earnings?.totals.platform ?? 0).toFixed(2)}</p>
            </div>
          </div>

          {/* Revenue by type */}
          {Object.keys(byTypeMap).length > 0 && (
            <div className="mb-6 space-y-2">
              <p className="text-xs text-gray-500 uppercase font-ui tracking-wider mb-3">By Type</p>
              {Object.entries(byTypeMap).map(([type, amount]) => {
                const total = earnings?.totals.creator ?? 1;
                const pct = total ? Math.round((amount / total) * 100) : 0;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-20 capitalize">{type}</span>
                    <div className="flex-1 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                      <div className="h-full bg-[#C8FF00] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-300 w-14 text-right font-mono-custom">${amount.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 90/10 donut */}
          <div className="flex items-center gap-6 mb-6">
            <svg width="72" height="72" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="30" fill="none" stroke="#1A1A1A" strokeWidth="12" />
              <circle cx="40" cy="40" r="30" fill="none" stroke="#C8FF00" strokeWidth="12"
                strokeDasharray={`${0.9 * 188.5} ${188.5}`} strokeDashoffset="47" strokeLinecap="round" transform="rotate(-90 40 40)" />
              <circle cx="40" cy="40" r="30" fill="none" stroke="#D4AF37" strokeWidth="12"
                strokeDasharray={`${0.1 * 188.5} ${188.5}`} strokeDashoffset={`${47 - 0.9 * 188.5}`} strokeLinecap="round" transform="rotate(-90 40 40)" />
            </svg>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#C8FF00]" /><span>You — 90%</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#D4AF37]" /><span>Platform — 10%</span></div>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="space-y-2">
            {earnings?.transactions.slice(0, 8).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-[#0f0f0f] rounded-xl text-sm">
                <div>
                  <span className="text-gray-400 capitalize">{t.type}</span>
                  <span className="text-xs text-gray-600 ml-2">{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[#C8FF00] font-mono-custom">${Number(t.creatorAmount).toFixed(2)}</span>
                  <span className="text-gray-600 text-xs ml-1">of ${Number(t.grossAmount).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Streams */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl flex items-center gap-2"><BarChart2 size={18} /> RECENT STREAMS</h2>
            <Link href="/studio" className="text-xs text-[#C8FF00] hover:underline flex items-center gap-1">
              New stream <ArrowRight size={12} />
            </Link>
          </div>

          {!streams?.length ? (
            <div className="text-center py-10 text-gray-600">
              <Video size={36} className="mx-auto mb-3 opacity-30" />
              <p>No streams yet — go live from Studio</p>
            </div>
          ) : (
            <div className="space-y-2">
              {streams.map((s) => (
                <div key={s.id} className="bg-[#0f0f0f] border border-[#1E1E1E] rounded-xl p-3 hover:border-[#242424] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {s.status === 'live' && <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-full">● LIVE</span>}
                        <p className="font-semibold text-sm text-white truncate">{s.title}</p>
                        <span className="text-xs text-gray-600 bg-[#1A1A1A] px-1.5 py-0.5 rounded">{s.category}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Eye size={10} /> peak {s.peakViewerCount.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Users size={10} /> {s._count.guests} guests</span>
                        <span className="flex items-center gap-1"><MessageSquare size={10} /> {s._count.chatMessages.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> {durationLabel(s.startedAt, s.endedAt)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[#C8FF00] font-mono-custom text-sm">${s.earnings.creator.toFixed(2)}</p>
                      <p className="text-xs text-gray-600">{s.earnings.txCount} tips</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/studio', label: 'Studio', icon: Video, color: '#C8FF00' },
            { href: '/moderation', label: 'Moderation', icon: TrendingUp, color: '#A855F7' },
            { href: '/vault', label: 'VOD Vault', icon: BarChart2, color: '#D4AF37' },
            { href: '/spotlight', label: 'Battles', icon: Users, color: '#00E5CC' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="card flex items-center gap-3 hover:border-[#242424] transition-colors group"
            >
              <link.icon size={18} style={{ color: link.color }} />
              <span className="text-sm font-semibold group-hover:text-white transition-colors">{link.label}</span>
              <ArrowRight size={14} className="ml-auto text-gray-700 group-hover:text-gray-400 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
