import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Radio, Users, MessageSquare, Plus, ExternalLink } from 'lucide-react';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import { Stream } from '@/types';

interface DashboardStats {
  totalStreams: number;
  liveStreams: number;
  avgViewers: number;
  totalChatMessages: number;
}

const STATUS_COLORS: Record<string, string> = {
  LIVE: 'badge badge-success',
  STARTING: 'badge badge-warning',
  STOPPING: 'badge badge-warning',
  STOPPED: 'badge badge-info',
  ERROR: 'badge badge-error',
  IDLE: 'badge bg-gray-100 text-gray-600',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentStreams, setRecentStreams] = useState<Stream[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, streamsRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/streams'),
      ]);
      setStats(analyticsRes.data);
      setRecentStreams(streamsRes.data.streams.slice(0, 5));
    } catch {
      // handled by interceptor
    }
  };

  const createStream = async () => {
    const title = prompt('Stream title:');
    if (!title) return;
    setCreating(true);
    try {
      await api.post('/streams', { title });
      toast.success('Stream created!');
      fetchData();
    } catch {
      // handled
    } finally {
      setCreating(false);
    }
  };

  const statCards = stats
    ? [
        { label: 'Total Streams', value: stats.totalStreams, icon: Radio, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Live Now', value: stats.liveStreams, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Avg Viewers', value: stats.avgViewers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Chat Messages', value: stats.totalChatMessages, icon: MessageSquare, color: 'text-pink-600', bg: 'bg-pink-50' },
      ]
    : [];

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your streaming overview</p>
        </div>
        <button onClick={createStream} disabled={creating} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Plus className="w-4 h-4" />
          Create Stream
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg}`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
        {!stats && (
          <div className="col-span-4 text-center py-8 text-gray-400">Loading stats...</div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Streams</h2>
          <Link to="/streams" className="text-sm text-purple-600 hover:underline">View all</Link>
        </div>

        {recentStreams.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <Radio className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No streams yet. Create your first one!</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentStreams.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.title}</td>
                    <td className="px-4 py-3">
                      <span className={STATUS_COLORS[s.status] || 'badge bg-gray-100'}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Link to={`/streams/${s.id}`} className="text-purple-600 hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> View
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
