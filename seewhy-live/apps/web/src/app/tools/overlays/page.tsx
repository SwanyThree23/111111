'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Download, Code, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const THEMES = ['SeeWhy','Minecraft','Domino','NeonCity','RetroTV'];
const EVENTS = ['follow','subscribe','raid','bits','tip','superchat','join','shoutout'];

export default function OverlaysPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ streamId: '', theme: 'SeeWhy', eventType: 'tip', username: 'viewer', message: '', amount: '' });
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  const generate = async () => {
    if (!form.streamId && !user) { toast.error('Enter a stream ID'); return; }
    setLoading(true);
    try {
      const { html: generated } = await api.post<{ html: string }>('/api/overlays/generate', {
        streamId: form.streamId || 'preview',
        theme: form.theme,
        eventType: form.eventType,
        username: form.username,
        message: form.message || undefined,
        amount: form.amount ? parseFloat(form.amount) : undefined,
      });
      setHtml(generated);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `seewhy-overlay-${form.eventType}.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0C0806] p-4">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <h1 className="font-display text-5xl text-white">OVERLAY BUILDER</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h2 className="font-display text-2xl">CONFIGURE</h2>
            <div>
              <label className="text-xs text-gray-500 font-ui uppercase mb-1 block">Theme</label>
              <select className="input" value={form.theme} onChange={(e) => setForm((p) => ({ ...p, theme: e.target.value }))}>
                {THEMES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-ui uppercase mb-1 block">Event Type</label>
              <select className="input" value={form.eventType} onChange={(e) => setForm((p) => ({ ...p, eventType: e.target.value }))}>
                {EVENTS.map((e) => <option key={e}>{e}</option>)}
              </select>
            </div>
            <input className="input" placeholder="Username" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
            <input className="input" placeholder="Message (optional)" value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
            <input className="input" type="number" placeholder="Amount $ (optional)" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
            <input className="input" placeholder="Stream ID (optional)" value={form.streamId} onChange={(e) => setForm((p) => ({ ...p, streamId: e.target.value }))} />
            <button onClick={generate} disabled={loading} className="btn-volt w-full">
              {loading ? 'Generating with AI...' : '✨ Generate Overlay'}
            </button>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl">PREVIEW</h2>
              {html && (
                <div className="flex gap-2">
                  <button onClick={() => setPreview(!preview)} className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1">
                    <Eye size={12} /> {preview ? 'Code' : 'Preview'}
                  </button>
                  <button onClick={download} className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1">
                    <Download size={12} /> Download
                  </button>
                </div>
              )}
            </div>
            {html ? (
              preview ? (
                <div className="aspect-video bg-transparent border border-[#242424] rounded-xl overflow-hidden">
                  <iframe srcDoc={html} className="w-full h-full" title="Overlay Preview" />
                </div>
              ) : (
                <pre className="text-xs text-gray-400 bg-[#0f0f0f] p-3 rounded-xl overflow-auto max-h-80 font-mono-custom">{html}</pre>
              )
            ) : (
              <div className="aspect-video bg-[#0f0f0f] border border-[#242424] rounded-xl flex items-center justify-center text-gray-600">
                <Code size={32} />
              </div>
            )}
            {html && (
              <p className="text-xs text-gray-600 mt-3">Add as OBS Browser Source (800×200px, transparent background)</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
