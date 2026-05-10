import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, ExternalLink, Radio, Play } from 'lucide-react';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import { Stream } from '@/types';

const STATUS_BADGE: Record<string, string> = {
  LIVE: 'badge badge-live',
  STARTING: 'badge badge-warning',
  STOPPING: 'badge badge-warning',
  STOPPED: 'badge badge-info',
  ERROR: 'badge badge-error',
  IDLE: 'badge bg-white/10 text-white/50',
};

export default function StreamManager() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchStreams(); }, []);

  const fetchStreams = async () => {
    try {
      const res = await api.get('/streams');
      setStreams(res.data.streams || []);
    } catch {} finally { setLoading(false); }
  };

  const deleteStream = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await api.delete(`/streams/${id}`);
      toast.success('Stream deleted');
      setStreams((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-wider text-white">STREAMS</h1>
          <p className="text-white/40 font-mono text-sm">Manage your multicast broadcasts</p>
        </div>
        <button onClick={() => navigate('/go-live')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Stream
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="card animate-pulse h-36" />)}
        </div>
      ) : streams.length === 0 ? (
        <div className="card text-center py-20">
          <Radio className="w-12 h-12 mx-auto mb-4 text-white/10" />
          <p className="text-white/40 font-mono text-lg mb-1">No streams yet</p>
          <p className="text-white/20 font-mono text-sm mb-6">Go live to create your first broadcast</p>
          <button onClick={() => navigate('/go-live')} className="btn-primary flex items-center gap-2 mx-auto">
            <Play className="w-4 h-4" /> Go Live
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {streams.map((s) => (
            <div key={s.id} className="card flex flex-col gap-3 hover:border-white/15 transition">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-white truncate flex-1">{s.title}</h3>
                <span className={STATUS_BADGE[s.status] || 'badge bg-white/10 text-white/50'}>
                  {s.status}
                </span>
              </div>

              {s.description && (
                <p className="text-sm text-white/40 font-mono line-clamp-2">{s.description}</p>
              )}

              <div className="text-xs font-mono text-white/30">
                {Array.isArray(s.destinations) && s.destinations.length > 0
                  ? `${s.destinations.length} destination${s.destinations.length > 1 ? 's' : ''}`
                  : 'No destinations'}
                <span className="mx-2">·</span>
                {new Date(s.createdAt).toLocaleDateString()}
              </div>

              <div className="flex gap-2 mt-auto pt-2 border-t border-white/8">
                <Link
                  to={`/streams/${s.id}`}
                  className="btn-ghost flex items-center gap-1.5 text-sm flex-1 justify-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View
                </Link>
                <Link
                  to={`/vdo-guests/${s.id}`}
                  className="btn-ghost flex items-center gap-1.5 text-sm"
                >
                  Guests
                </Link>
                <button
                  onClick={() => deleteStream(s.id, s.title)}
                  className="btn-danger p-2 flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
