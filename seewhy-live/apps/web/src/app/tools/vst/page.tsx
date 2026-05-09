'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Plus, Copy, ExternalLink, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface VstTrack {
  id: string; name: string; mode: string; daw: string | null;
  faderLevel: number; isMuted: boolean; isActive: boolean; url: string;
}

export default function VstPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ streamId: '', name: '', mode: 'publish', daw: '', faderLevel: 80 });

  const { data: tracks } = useQuery({
    queryKey: ['vst', form.streamId],
    queryFn: () => api.get<VstTrack[]>(`/api/vst/${form.streamId}`),
    enabled: !!form.streamId,
  });

  const addTrack = useMutation({
    mutationFn: () => api.post('/api/vst', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vst'] }); toast.success('VST track added'); },
    onError: (err) => toast.error((err as Error).message),
  });

  const updateTrack = useMutation({
    mutationFn: ({ id, ...data }: { id: string; faderLevel?: number; isMuted?: boolean }) =>
      api.patch(`/api/vst/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vst'] }),
  });

  const deleteTrack = useMutation({
    mutationFn: (id: string) => api.delete(`/api/vst/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vst'] }),
  });

  return (
    <div className="min-h-screen bg-[#0C0806] p-4">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <h1 className="font-display text-5xl text-[#FF7A1A]">VST BRIDGE</h1>
        <p className="text-gray-400">Route DAW audio through VDO.Ninja into your stream. Zero-latency WebRTC.</p>

        <div className="card space-y-4">
          <h2 className="font-display text-2xl">ADD TRACK</h2>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Stream ID" value={form.streamId} onChange={(e) => setForm((p) => ({ ...p, streamId: e.target.value }))} />
            <input className="input" placeholder="Track name (e.g. Main Mix)" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <select className="input" value={form.mode} onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))}>
              <option value="publish">Publish (DAW → Stream)</option>
              <option value="receive">Receive (Stream → DAW)</option>
            </select>
            <select className="input" value={form.daw} onChange={(e) => setForm((p) => ({ ...p, daw: e.target.value }))}>
              <option value="">Select DAW</option>
              {['Ableton Live','FL Studio','Logic Pro','Pro Tools','Reaper','Cubase','Studio One'].map((d) => <option key={d}>{d}</option>)}
            </select>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Fader Level: {form.faderLevel}%</label>
              <input type="range" min="0" max="100" value={form.faderLevel} onChange={(e) => setForm((p) => ({ ...p, faderLevel: parseInt(e.target.value) }))} className="w-full accent-[#FF7A1A]" />
            </div>
          </div>
          <button onClick={() => addTrack.mutate()} disabled={addTrack.isPending || !form.streamId || !form.name} className="btn-volt">
            <Plus size={14} className="inline mr-1" /> Add Track
          </button>
        </div>

        {tracks?.map((track) => (
          <div key={track.id} className="card border-[#FF7A1A]/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{track.name}</p>
                <p className="text-xs text-gray-500 capitalize">{track.mode} • {track.daw ?? 'No DAW'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard.writeText(track.url).then(() => toast.success('Copied!'))} className="btn-ghost py-1 px-2 text-xs"><Copy size={12} /></button>
                <a href={track.url} target="_blank" rel="noreferrer" className="btn-ghost py-1 px-2 text-xs"><ExternalLink size={12} /></a>
                <button onClick={() => deleteTrack.mutate(track.id)} className="text-gray-600 hover:text-[#FF3B3B] p-1"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-500 mb-1 block">Fader: {track.faderLevel}%</label>
              <input
                type="range" min="0" max="100" value={track.faderLevel}
                onChange={(e) => updateTrack.mutate({ id: track.id, faderLevel: parseInt(e.target.value) })}
                className="w-full accent-[#FF7A1A]"
              />
            </div>
            <code className="block mt-3 text-xs font-mono-custom text-gray-400 bg-[#0f0f0f] p-2 rounded-lg truncate">{track.url}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
