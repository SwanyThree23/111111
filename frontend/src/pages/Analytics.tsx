import { useEffect, useState } from 'react';
import { BarChart2, Radio, Users, MessageSquare, TrendingUp } from 'lucide-react';
import api from '@/utils/api';

interface DashboardStats {
  totalStreams: number;
  liveStreams: number;
  avgViewers: number;
  totalChatMessages: number;
}

export default function Analytics() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = stats
    ? [
        { label: 'Total Streams', value: stats.totalStreams, icon: Radio, color: 'text-purple-600', bg: 'bg-purple-50', trend: null },
        { label: 'Live Streams', value: stats.liveStreams, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', trend: null },
        { label: 'Avg Viewers', value: stats.avgViewers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: null },
        { label: 'Chat Messages', value: stats.totalChatMessages, icon: MessageSquare, color: 'text-pink-600', bg: 'bg-pink-50', trend: null },
      ]
    : [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm">Your streaming performance</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading analytics...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-gray-900">{card.value.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {stats && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">Summary</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-gray-500">Live / Total</p>
              <p className="text-xl font-bold mt-1">{stats.liveStreams} / {stats.totalStreams}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-gray-500">Engagement Rate</p>
              <p className="text-xl font-bold mt-1">
                {stats.totalStreams > 0
                  ? `${Math.round((stats.totalChatMessages / Math.max(stats.totalStreams, 1)))} msg/stream`
                  : '--'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
