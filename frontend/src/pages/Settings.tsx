import { useEffect, useState, FormEvent } from 'react';
import { Key, Trash2, Plus, Settings as SettingsIcon } from 'lucide-react';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import { ApiKey } from '@/types';

const PLATFORMS = ['YouTube', 'Twitch', 'Facebook', 'Twitter', 'TikTok', 'Custom'];

export default function Settings() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('YouTube');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await api.get('/streams/api-keys/list');
      setKeys(res.data.keys);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const addKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      await api.post('/streams/placeholder-id/api-keys', { name: name.trim(), platform });
      toast.success('API key added');
      setName('');
      fetchKeys();
    } catch {
      // handled
    } finally {
      setAdding(false);
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Delete this API key?')) return;
    try {
      await api.delete(`/streams/api-keys/${id}`);
      toast.success('Key deleted');
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      // handled
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your platform stream keys</p>
        </div>
      </div>

      {/* Add Key Form */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Key className="w-4 h-4" /> Add Platform Key
        </h2>
        <form onSubmit={addKey} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            className="input flex-1"
            placeholder="Key name (e.g. My YouTube Channel)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select
            className="input sm:w-40"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button type="submit" disabled={adding} className="btn-primary flex items-center gap-2 disabled:opacity-60 whitespace-nowrap">
            <Plus className="w-4 h-4" />
            {adding ? 'Adding...' : 'Add Key'}
          </button>
        </form>
      </div>

      {/* Keys List */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Your Platform Keys</h2>
        {loading ? (
          <p className="text-gray-400 text-sm">Loading keys...</p>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Key className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No keys added yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{key.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="badge badge-info">{key.platform}</span>
                    <span className="text-xs text-gray-400">Added {new Date(key.createdAt).toLocaleDateString()}</span>
                    {key.lastUsed && (
                      <span className="text-xs text-gray-400">Last used {new Date(key.lastUsed).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteKey(key.id)}
                  className="btn-danger p-2"
                  title="Delete key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
