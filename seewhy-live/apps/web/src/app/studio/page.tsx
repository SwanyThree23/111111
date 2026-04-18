'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { Zap, Video, Monitor, Plus, Trash2, ToggleLeft, ToggleRight, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface Stream { id: string; title: string; streamKey: string; rtmpUrl: string; status: string }
interface FanoutDest { id: string; platform: string; displayName: string | null; isActive: boolean }

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#FF0000', twitch: '#9147FF', facebook: '#1877F2',
  tiktok: '#010101', instagram: '#E1306C', twitter: '#1DA1F2',
  kick: '#53FC18', rumble: '#85C742', custom: '#C8FF00',
};

export default function StudioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [activeStream, setActiveStream] = useState<Stream | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStream, setNewStream] = useState({ title: '', category: 'IRL', isPublic: true });
  const [newDest, setNewDest] = useState({ platform: 'youtube', rtmpUrl: '', streamKey: '', displayName: '' });
  const [showDestForm, setShowDestForm] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!user) router.push('/auth/login');
  }, [user, router]);

  const { data: dests, refetch: refetchDests } = useQuery({
    queryKey: ['fanout-dests'],
    queryFn: () => api.get<FanoutDest[]>('/api/fanout'),
    enabled: !!user,
  });

  const createStream = useMutation({
    mutationFn: () => api.post<Stream>('/api/streams', newStream),
    onSuccess: (stream) => { setActiveStream(stream); setShowCreateForm(false); qc.invalidateQueries({ queryKey: ['streams'] }); },
    onError: (err) => toast.error((err as Error).message),
  });

  const goLive = useMutation({
    mutationFn: (id: string) => api.post(`/api/streams/${id}/go-live`),
    onSuccess: () => { toast.success('You are LIVE! 🔴'); qc.invalidateQueries({ queryKey: ['streams'] }); },
    onError: (err) => toast.error((err as Error).message),
  });

  const addDest = useMutation({
    mutationFn: () => api.post('/api/fanout', newDest),
    onSuccess: () => { refetchDests(); setShowDestForm(false); setNewDest({ platform: 'youtube', rtmpUrl: '', streamKey: '', displayName: '' }); },
    onError: (err) => toast.error((err as Error).message),
  });

  const toggleDest = useMutation({
    mutationFn: (id: string) => api.patch(`/api/fanout/${id}/toggle`, {}),
    onSuccess: () => refetchDests(),
  });

  const deleteDest = useMutation({
    mutationFn: (id: string) => api.delete(`/api/fanout/${id}`),
    onSuccess: () => refetchDests(),
  });

  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch { toast.error('Camera/mic permission denied'); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0C0806] p-4">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <h1 className="font-display text-5xl text-[#C8FF00]">STUDIO</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stream Setup */}
          <div className="card space-y-4">
            <h2 className="font-display text-2xl">STREAM SETUP</h2>
            {!activeStream ? (
              showCreateForm ? (
                <div className="space-y-3">
                  <input className="input" placeholder="Stream title" value={newStream.title} onChange={(e) => setNewStream((p) => ({ ...p, title: e.target.value }))} />
                  <select className="input" value={newStream.category} onChange={(e) => setNewStream((p) => ({ ...p, category: e.target.value }))}>
                    {['Gaming','Music','Sports','IRL','Talk Shows','Education','Art','Domino','Tech','Fitness'].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input type="checkbox" checked={newStream.isPublic} onChange={(e) => setNewStream((p) => ({ ...p, isPublic: e.target.checked }))} />
                    Public stream
                  </label>
                  <button onClick={() => createStream.mutate()} className="btn-volt w-full" disabled={createStream.isPending || !newStream.title}>
                    {createStream.isPending ? 'Creating...' : 'Create Stream'}
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowCreateForm(true)} className="btn-volt w-full flex items-center justify-center gap-2">
                  <Plus size={16} /> New Stream
                </button>
              )
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-ui">STREAM KEY</p>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-[#0f0f0f] border border-[#242424] rounded-lg px-3 py-2 text-xs font-mono-custom text-[#C8FF00] truncate">
                      {activeStream.streamKey}
                    </code>
                    <button onClick={() => { navigator.clipboard.writeText(activeStream.streamKey); toast.success('Copied!'); }} className="btn-ghost py-2 px-3">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-ui">RTMP URL</p>
                  <code className="block bg-[#0f0f0f] border border-[#242424] rounded-lg px-3 py-2 text-xs font-mono-custom text-gray-300">
                    {activeStream.rtmpUrl}
                  </code>
                </div>
                <button
                  onClick={() => goLive.mutate(activeStream.id)}
                  disabled={goLive.isPending || activeStream.status === 'live'}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${activeStream.status === 'live' ? 'bg-[#FF3B3B] text-white cursor-default' : 'btn-volt'}`}
                >
                  {activeStream.status === 'live' ? '🔴 LIVE NOW' : goLive.isPending ? 'Starting...' : '⚡ GO LIVE'}
                </button>
              </div>
            )}
          </div>

          {/* Browser Preview */}
          <div className="card space-y-4">
            <h2 className="font-display text-2xl">PREVIEW</h2>
            <div className="relative aspect-video bg-[#0f0f0f] rounded-xl overflow-hidden">
              <video ref={videoRef} muted className="w-full h-full object-cover" />
              {!videoRef.current?.srcObject && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button onClick={startPreview} className="btn-ghost flex items-center gap-2">
                    <Video size={16} /> Start Camera Preview
                  </button>
                </div>
              )}
            </div>
            {activeStream && (
              <div className="text-xs text-gray-500 font-mono-custom">
                VDO.Ninja Scene: https://vdo.ninja/?scene&room=seewhy-{activeStream.id.slice(0, 8)}
              </div>
            )}
          </div>
        </div>

        {/* Fanout Destinations */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">FANOUT DESTINATIONS</h2>
            <button onClick={() => setShowDestForm(!showDestForm)} className="btn-ghost py-2 px-4 text-sm flex items-center gap-2">
              <Plus size={14} /> Add Destination
            </button>
          </div>

          {showDestForm && (
            <div className="bg-[#0f0f0f] border border-[#242424] rounded-xl p-4 space-y-3">
              <select className="input" value={newDest.platform} onChange={(e) => setNewDest((p) => ({ ...p, platform: e.target.value }))}>
                {['youtube','twitch','facebook','tiktok','instagram','twitter','kick','rumble','custom'].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
              <input className="input" placeholder="RTMP URL" value={newDest.rtmpUrl} onChange={(e) => setNewDest((p) => ({ ...p, rtmpUrl: e.target.value }))} />
              <input className="input" placeholder="Stream Key (encrypted at rest)" type="password" value={newDest.streamKey} onChange={(e) => setNewDest((p) => ({ ...p, streamKey: e.target.value }))} />
              <input className="input" placeholder="Display name (optional)" value={newDest.displayName} onChange={(e) => setNewDest((p) => ({ ...p, displayName: e.target.value }))} />
              <button onClick={() => addDest.mutate()} className="btn-volt" disabled={addDest.isPending}>
                {addDest.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
          )}

          <div className="space-y-2">
            {dests?.map((dest) => (
              <div key={dest.id} className="flex items-center justify-between p-3 bg-[#0f0f0f] border border-[#242424] rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLATFORM_COLORS[dest.platform] ?? '#fff' }} />
                  <div>
                    <p className="text-sm font-semibold">{dest.displayName ?? dest.platform}</p>
                    <p className="text-xs text-gray-500 capitalize">{dest.platform}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleDest.mutate(dest.id)} className="text-gray-400 hover:text-[#C8FF00] transition-colors">
                    {dest.isActive ? <ToggleRight size={20} className="text-[#C8FF00]" /> : <ToggleLeft size={20} />}
                  </button>
                  <button onClick={() => deleteDest.mutate(dest.id)} className="text-gray-600 hover:text-[#FF3B3B] transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {!dests?.length && <p className="text-gray-600 text-sm text-center py-4">No destinations added yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
