'use client';
import { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface Feed { id: string; room: string; streamId: string; bitrate: number; label: string }

export default function ExtensionPage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [form, setForm] = useState({ room: '', streamId: '', bitrate: 2500, label: '' });

  const addFeed = () => {
    if (!form.room || !form.streamId) return;
    setFeeds((p) => [...p, { id: Date.now().toString(), ...form }]);
    setForm({ room: '', streamId: '', bitrate: 2500, label: '' });
  };

  const buildUrl = (f: Feed, type: 'push' | 'view') =>
    type === 'push'
      ? `https://vdo.ninja/?room=${f.room}&push=${f.streamId}&bitrate=${f.bitrate}&label=${f.label}`
      : `https://vdo.ninja/?room=${f.room}&view=${f.streamId}`;

  return (
    <div className="min-h-screen bg-[#0C0806] p-4">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <h1 className="font-display text-5xl text-white">CHROME EXTENSION FEEDS</h1>
        <p className="text-gray-400">Manage VDO.Ninja push/view URL feeds for Chrome extension integration and OBS browser sources.</p>

        <div className="card space-y-3">
          <h2 className="font-display text-2xl">ADD FEED</h2>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Room" value={form.room} onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))} />
            <input className="input" placeholder="Stream ID" value={form.streamId} onChange={(e) => setForm((p) => ({ ...p, streamId: e.target.value }))} />
            <input className="input" placeholder="Label" value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Bitrate: {form.bitrate} kbps</label>
              <input type="range" min="250" max="8000" step="250" value={form.bitrate} onChange={(e) => setForm((p) => ({ ...p, bitrate: parseInt(e.target.value) }))} className="w-full accent-[#C8FF00]" />
            </div>
          </div>
          <button onClick={addFeed} className="btn-volt text-sm"><Plus size={14} className="inline mr-1" /> Add Feed</button>
        </div>

        {feeds.map((f) => (
          <div key={f.id} className="card space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{f.label || f.streamId}</p>
              <button onClick={() => setFeeds((p) => p.filter((x) => x.id !== f.id))} className="text-gray-600 hover:text-[#FF3B3B]"><Trash2 size={14} /></button>
            </div>
            {(['push','view'] as const).map((type) => (
              <div key={type}>
                <p className="text-xs text-gray-500 uppercase mb-1">{type} URL</p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-[#0f0f0f] border border-[#242424] rounded-lg px-3 py-2 text-xs font-mono-custom text-[#C8FF00] truncate">{buildUrl(f, type)}</code>
                  <button onClick={() => { navigator.clipboard.writeText(buildUrl(f, type)); toast.success('Copied!'); }} className="btn-ghost py-1 px-2"><Copy size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
