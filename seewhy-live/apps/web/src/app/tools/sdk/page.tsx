'use client';
import { useState, useMemo } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SdkPage() {
  const [config, setConfig] = useState({
    room: 'my-stream-room',
    streamId: 'guest123',
    bitrate: 2500,
    codec: 'vp8',
    label: 'Guest',
    audioOnly: false,
    director: false,
    scene: false,
  });

  const urls = useMemo(() => {
    const base = 'https://vdo.ninja';
    const push = `${base}/?room=${config.room}&push=${config.streamId}&bitrate=${config.bitrate}&codec=${config.codec}&label=${encodeURIComponent(config.label)}${config.audioOnly ? '&audioonly' : ''}`;
    const view = `${base}/?room=${config.room}&view=${config.streamId}`;
    const director = `${base}/?director=${config.room}`;
    const scene = `${base}/?room=${config.room}&scene`;
    return { push, view, director, scene };
  }, [config]);

  const nodeCode = `const { AccessToken } = require('livekit-server-sdk');
const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
  identity: '${config.streamId}',
  name: '${config.label}',
});
token.addGrant({ room: '${config.room}', roomJoin: true, canPublish: true, canSubscribe: true });
const jwt = token.toJwt();`;

  const copyUrl = (url: string) => { navigator.clipboard.writeText(url); toast.success('Copied!'); };

  return (
    <div className="min-h-screen bg-[#0C0806] p-4">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <h1 className="font-display text-5xl text-[#00E5CC]">VDO.NINJA SDK EXPLORER</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h2 className="font-display text-2xl">CONFIGURE</h2>
            <div className="space-y-3">
              {[
                { key: 'room', label: 'Room Name', type: 'text' },
                { key: 'streamId', label: 'Stream / Push ID', type: 'text' },
                { key: 'label', label: 'Display Label', type: 'text' },
                { key: 'bitrate', label: 'Bitrate (kbps)', type: 'number' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 font-ui uppercase mb-1 block">{label}</label>
                  <input
                    type={type}
                    className="input"
                    value={(config as any)[key]}
                    onChange={(e) => setConfig((p) => ({ ...p, [key]: type === 'number' ? parseInt(e.target.value) : e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 font-ui uppercase mb-1 block">Codec</label>
                <select className="input" value={config.codec} onChange={(e) => setConfig((p) => ({ ...p, codec: e.target.value }))}>
                  {['vp8','vp9','h264','av1'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="checkbox" checked={config.audioOnly} onChange={(e) => setConfig((p) => ({ ...p, audioOnly: e.target.checked }))} />
                Audio Only Mode
              </label>
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="font-display text-2xl">GENERATED URLS</h2>
            {Object.entries(urls).map(([name, url]) => (
              <div key={name}>
                <p className="text-xs text-gray-500 font-ui uppercase mb-1">{name} URL</p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-[#0f0f0f] border border-[#242424] rounded-lg px-3 py-2 text-xs font-mono-custom text-[#00E5CC] truncate">{url}</code>
                  <button onClick={() => copyUrl(url)} className="btn-ghost py-1 px-2"><Copy size={12} /></button>
                  <a href={url} target="_blank" rel="noreferrer" className="btn-ghost py-1 px-2"><ExternalLink size={12} /></a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-display text-2xl mb-4">NODE.JS SIGNALING CODE</h2>
          <pre className="bg-[#0f0f0f] p-4 rounded-xl text-xs font-mono-custom text-gray-300 overflow-auto">{nodeCode}</pre>
          <button onClick={() => { navigator.clipboard.writeText(nodeCode); toast.success('Copied!'); }} className="btn-ghost mt-3 text-sm flex items-center gap-2">
            <Copy size={14} /> Copy Code
          </button>
        </div>
      </div>
    </div>
  );
}
