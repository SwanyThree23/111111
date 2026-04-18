'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DollarSign, Users, Video, MessageSquare, TrendingUp } from 'lucide-react';

type Period = 'today' | 'week' | 'month' | 'all';

interface EarningsData {
  totals: { gross: number; creator: number; platform: number };
  byType: { type: string; _sum: { grossAmount: number | null; creatorAmount: number | null } }[];
  transactions: { id: string; type: string; grossAmount: number; creatorAmount: number; status: string; createdAt: string }[];
}

interface DashboardData { totalStreams: number; liveStreams: number; totalEarnings: number; totalMessages: number }

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
  });

  if (!user) return null;

  const creatorPct = earnings?.totals.gross ? ((earnings.totals.creator / earnings.totals.gross) * 100).toFixed(0) : '90';

  const STATS = [
    { label: 'Total Streams', value: dash?.totalStreams ?? 0, icon: Video, color: '#C8FF00' },
    { label: 'Live Now', value: dash?.liveStreams ?? 0, icon: TrendingUp, color: '#FF3B3B' },
    { label: 'Your Earnings', value: `$${(dash?.totalEarnings ?? 0).toFixed(2)}`, icon: DollarSign, color: '#D4AF37' },
    { label: 'Chat Messages', value: (dash?.totalMessages ?? 0).toLocaleString(), icon: MessageSquare, color: '#A855F7' },
  ];

  return (
    <div className="min-h-screen bg-[#0C0806] p-4">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-5xl text-white">DASHBOARD</h1>
          <p className="text-sm text-gray-500">Welcome back, <span className="text-[#C8FF00]">{user.displayName ?? user.username}</span></p>
        </div>

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

        {/* Earnings breakdown */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">EARNINGS</h2>
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

          {/* 90/10 donut */}
          <div className="flex items-center gap-6">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="30" fill="none" stroke="#1A1A1A" strokeWidth="12" />
              <circle cx="40" cy="40" r="30" fill="none" stroke="#C8FF00" strokeWidth="12"
                strokeDasharray={`${0.9 * 188.5} ${188.5}`} strokeDashoffset="47" strokeLinecap="round" transform="rotate(-90 40 40)" />
              <circle cx="40" cy="40" r="30" fill="none" stroke="#D4AF37" strokeWidth="12"
                strokeDasharray={`${0.1 * 188.5} ${188.5}`} strokeDashoffset={`${47 - 0.9 * 188.5}`} strokeLinecap="round" transform="rotate(-90 40 40)" />
            </svg>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#C8FF00]" /> <span>You — 90%</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#D4AF37]" /> <span>Platform — 10%</span></div>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="mt-4 space-y-2">
            {earnings?.transactions.slice(0, 10).map((t) => (
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

        {/* Stripe Connect */}
        <div className="card border-[#D4AF37]/30">
          <h2 className="font-display text-2xl text-[#D4AF37] mb-3">STRIPE CONNECT</h2>
          <p className="text-gray-400 text-sm mb-4">Connect your Stripe account to receive payouts directly.</p>
          <button
            onClick={async () => {
              const { url } = await api.post<{ url: string }>('/api/payments/connect/onboard', { email: user.username });
              window.location.href = url;
            }}
            className="btn-volt"
          >
            Connect Stripe Account
          </button>
        </div>
      </div>
    </div>
  );
}
