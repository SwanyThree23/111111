import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, ExternalLink, Radio } from 'lucide-react';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import { Stream } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  LIVE: 'badge badge-success',
  STARTING: 'badge badge-warning',
  STOPPING: 'badge badge-warning',
  STOPPED: 'badge badge-info',
  ERROR: 'badge badge-error',
  IDLE: 'badge bg-gray-100 text-gray-600',
};

export default function StreamManager() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const res = await api.get('/streams');
      setStreams(res.data.streams);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const createStream = async () => {
    const title = prompt('Stream title:');
    if (!title) return;
    setCreating(true);
    try {
      await api.post('/streams', { title });
      toast.success('Stream created!');
      fetchStreams();
    } catch {
      // handled
    } finally {
      setCreating(false);
    }
  };

  const deleteStream = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/streams/${id}`);
      toast.success('Stream deleted');
      setStreams((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // handled
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Streams</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your multicast streams</p>
        </div>
        <button onClick={createStream} disabled={creating} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Plus className="w-4 h-4" />
          New Stream
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading streams...</div>
      ) : streams.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Radio className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">No streams yet</p>
          <p className="text-sm">Create a stream to start multicasting to your platforms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {streams.map((s) => (
            <div key={s.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-900 truncate flex-1">{s.title}</h3>
                <span className={STATUS_COLORS[s.status] || 'badge bg-gray-100 text-gray-600'}>{s.status}</span>
              </div>

              {s.description && (
                <p className="text-sm text-gray-500 line-clamp-2">{s.description}</p>
              )}

              <div className="text-xs text-gray-400">
                {Array.isArray(s.destinations) && s.destinations.length > 0
                  ? `${s.destinations.length} destination${s.destinations.length > 1 ? 's' : ''}`
                  : 'No destinations'}
              </div>

              <div className="flex gap-2 mt-auto pt-2 border-t">
                <Link to={`/streams/${s.id}`} className="btn-secondary flex items-center gap-1 text-sm flex-1 justify-center">
                  <ExternalLink className="w-3 h-3" /> View
                </Link>
                <button
                  onClick={() => deleteStream(s.id, s.title)}
                  className="btn-danger flex items-center gap-1 text-sm px-3"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
