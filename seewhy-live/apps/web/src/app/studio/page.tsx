'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useRouter } from 'next/navigation';
import {
  Zap, Video, Plus, Trash2, ToggleLeft, ToggleRight, Copy,
  DollarSign, Globe, ChevronDown, ChevronUp, Eye, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Stream { id: string; title: string; streamKey: string; rtmpUrl: string; status: string }
interface FanoutDest { id: string; platform: string; displayName: string | null; isActive: boolean }
interface DirectPayLink { id: string; platform: string; handle: string; url: string | null; isActive: boolean }
interface WebhookEndpoint { id: string; url: string; events: string[]; isActive: boolean; secret: string }

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#FF0000', twitch: '#9147FF', facebook: '#1877F2',
  tiktok: '#010101', instagram: '#E1306C', twitter: '#1DA1F2',
  kick: '#53FC18', rumble: '#85C742', custom: '#C8FF00',
};

const DIRECT_PAY_PLATFORMS = [
  { id: 'paypal',  label: 'PayPal',   icon: '💙', placeholder: 'yourname' },
  { id: 'cashapp', label: 'Cash App', icon: '💵', placeholder: '$cashtag' },
  { id: 'venmo',   label: 'Venmo',    icon: '🔵', placeholder: '@handle' },
  { id: 'zelle',   label: 'Zelle',    icon: '💜', placeholder: 'phone or email' },
  { id: 'chime',   label: 'Chime',    icon: '🟢', placeholder: 'username' },
];

const WEBHOOK_EVENTS = ['stream.live', 'stream.ended', 'milestone.viewers', 'poll.ended'];

export default function StudioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [activeStream, setActiveStream] = useState<Stream | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStream, setNewStream] = useState({ title: '', category: 'IRL', isPublic: true });
  const [newDest, setNewDest] = useState({ platform: 'youtube', rtmpUrl: '', streamKey: '', displayName: '' });
  const [showDestForm, setShowDestForm] = useState(false);
  const [showKeyFor, setShowKeyFor] = useState<string | null>(null);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(WEBHOOK_EVENTS);
  const [expandedSection, setExpandedSection] = useState<string | null>('stream');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => { if (!user) router.push('/auth/login'); }, [user, router]);

  const { data: dests, refetch: refetchDests } = useQuery({
    queryKey: ['fanout-dests'],
    queryFn: () => api.get<FanoutDest[]>('/api/fanout'),
    enabled: !!user,
  });

  const { data: directPayLinks, refetch: refetchDPL } = useQuery({
    queryKey: ['direct-pay'],
    queryFn: () => api.get<DirectPayLink[]>('/api/directpay'),
    enabled: !!user,
  });

  const { data: webhooks, refetch: refetchWebhooks } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => api.get<WebhookEndpoint[]>('/api/webhooks'),
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

  const saveDirectPay = useMutation({
    mutationFn: ({ platform, handle }: { platform: string; handle: string }) =>
      api.put(`/api/directpay/${platform}`, { handle }),
    onSuccess: () => { refetchDPL(); toast.success('Saved!'); },
  });

  const deleteDirectPay = useMutation({
    mutationFn: (platform: string) => api.delete(`/api/directpay/${platform}`),
    onSuccess: () => refetchDPL(),
  });

  const addWebhook = useMutation({
    mutationFn: () => api.post('/api/webhooks', { url: newWebhookUrl, events: newWebhookEvents }),
    onSuccess: () => { refetchWebhooks(); setShowWebhookForm(false); setNewWebhookUrl(''); toast.success('Webhook added'); },
    onError: (err) => toast.error((err as Error).message),
  });

  const deleteWebhook = useMutation({
    mutationFn: (id: string) => api.delete(`/api/webhooks/${id}`),
    onSuccess: () => refetchWebhooks(),
  });

  const toggleWebhook = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/webhooks/${id}`, { isActive: !isActive }),
    onSuccess: () => refetchWebhooks(),
  });

  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch { toast.error('Camera/mic permission denied'); }
  };

  function SectionHeader({ id, title, children }: { id: string; title: string; children?: React.ReactNode }) {
    const open = expandedSection === id;
    return (
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setExpandedSection(open ? null : id)}
      >
        <h2 className="font-display text-2xl text-left">{title}</h2>
        <div className="flex items-center gap-2">
          {children}
          {open ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </div>
      </button>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0C0806] p-4">
      <div className="max-w-[1200px] mx-auto space-y-4">
        <h1 className="font-display text-5xl text-[#C8FF00]">STUDIO</h1>

        {/* ─── Stream Setup ─── */}
        <div className="card space-y-4">
          <SectionHeader id="stream" title="STREAM SETUP" />
          {expandedSection === 'stream' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {!activeStream ? (
                  showCreateForm ? (
                    <div className="space-y-3">
                      <input className="input" placeholder="Stream title" value={newStream.title} onChange={(e) => setNewStream((p) => ({ ...p, title: e.target.value }))} />
                      <select className="input" value={newStream.category} onChange={(e) => setNewStream((p) => ({ ...p, category: e.target.value }))}>
                        {['Gaming','Music','Sports','IRL','Talk Shows','Education','Art','Domino','Tech','Fitness'].map((c) => <option key={c}>{c}</option>)}
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
                        <code className="flex-1 bg-[#0f0f0f] border border-[#242424] rounded-lg px-3 py-2 text-xs font-mono-custom text-[#C8FF00] truncate">{activeStream.streamKey}</code>
                        <button onClick={() => { navigator.clipboard.writeText(activeStream.streamKey); toast.success('Copied!'); }} className="btn-ghost py-2 px-3"><Copy size={14} /></button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1 font-ui">RTMP URL</p>
                      <code className="block bg-[#0f0f0f] border border-[#242424] rounded-lg px-3 py-2 text-xs font-mono-custom text-gray-300">{activeStream.rtmpUrl}</code>
                    </div>
                    <button
                      onClick={() => goLive.mutate(activeStream.id)}
                      disabled={goLive.isPending || activeStream.status === 'live'}
                      className={`w-full py-3 rounded-xl font-bold transition-all ${activeStream.status === 'live' ? 'bg-[#FF3B3B] text-white cursor-default' : 'btn-volt'}`}
                    >
                      {activeStream.status === 'live' ? '🔴 LIVE NOW' : goLive.isPending ? 'Starting...' : '⚡ GO LIVE'}
                    </button>
                    {activeStream.status === 'live' && (
                      <a href={`/panel/${activeStream.id}`} className="block text-center text-xs text-[#C8FF00] underline">Open Guest Panel →</a>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="relative aspect-video bg-[#0f0f0f] rounded-xl overflow-hidden">
                  <video ref={videoRef} muted className="w-full h-full object-cover" />
                  {!videoRef.current?.srcObject && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button onClick={startPreview} className="btn-ghost flex items-center gap-2"><Video size={16} /> Preview Camera</button>
                    </div>
                  )}
                </div>
                {activeStream && (
                  <p className="text-xs text-gray-600 font-mono-custom break-all">
                    VDO Scene: https://vdo.ninja/?scene&room=seewhy-{activeStream.id.slice(0, 8)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Direct Pay Links ─── */}
        <div className="card space-y-4">
          <SectionHeader id="directpay" title="DIRECT PAY LINKS">
            <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">0% Fees</span>
          </SectionHeader>
          {expandedSection === 'directpay' && (
            <>
              <p className="text-sm text-gray-500">Viewers can send money directly to you — 100% goes to your pocket, no platform cut.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DIRECT_PAY_PLATFORMS.map((p) => {
                  const existing = directPayLinks?.find((l) => l.platform === p.id);
                  const [handle, setHandle] = useState(existing?.handle ?? '');

                  return (
                    <div key={p.id} className="bg-[#0f0f0f] border border-[#242424] rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{p.icon}</span>
                          <span className="text-sm font-semibold">{p.label}</span>
                        </div>
                        {existing && (
                          <button onClick={() => deleteDirectPay.mutate(p.id)} className="text-gray-600 hover:text-[#FF3B3B]">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <input
                        className="input text-xs py-1.5"
                        placeholder={p.placeholder}
                        defaultValue={existing?.handle ?? ''}
                        onChange={(e) => setHandle(e.target.value)}
                        onBlur={(e) => { if (e.target.value.trim()) saveDirectPay.mutate({ platform: p.id, handle: e.target.value.trim() }); }}
                      />
                      {existing?.url && (
                        <a href={existing.url} target="_blank" rel="noreferrer" className="text-xs text-[#C8FF00] truncate block hover:underline">{existing.url}</a>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ─── Fanout Destinations ─── */}
        <div className="card space-y-4">
          <SectionHeader id="fanout" title="FANOUT DESTINATIONS" />
          {expandedSection === 'fanout' && (
            <>
              <button onClick={() => setShowDestForm(!showDestForm)} className="btn-ghost py-2 px-4 text-sm flex items-center gap-2 self-start">
                <Plus size={14} /> Add Destination
              </button>
              {showDestForm && (
                <div className="bg-[#0f0f0f] border border-[#242424] rounded-xl p-4 space-y-3">
                  <select className="input" value={newDest.platform} onChange={(e) => setNewDest((p) => ({ ...p, platform: e.target.value }))}>
                    {['youtube','twitch','facebook','tiktok','instagram','twitter','kick','rumble','custom'].map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                  <input className="input" placeholder="RTMP URL" value={newDest.rtmpUrl} onChange={(e) => setNewDest((p) => ({ ...p, rtmpUrl: e.target.value }))} />
                  <input className="input" placeholder="Stream Key" type="password" value={newDest.streamKey} onChange={(e) => setNewDest((p) => ({ ...p, streamKey: e.target.value }))} />
                  <input className="input" placeholder="Display name (optional)" value={newDest.displayName} onChange={(e) => setNewDest((p) => ({ ...p, displayName: e.target.value }))} />
                  <button onClick={() => addDest.mutate()} className="btn-volt" disabled={addDest.isPending}>{addDest.isPending ? 'Adding...' : 'Add'}</button>
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
                      <button onClick={() => toggleDest.mutate(dest.id)} className="text-gray-400 hover:text-[#C8FF00]">
                        {dest.isActive ? <ToggleRight size={20} className="text-[#C8FF00]" /> : <ToggleLeft size={20} />}
                      </button>
                      <button onClick={() => deleteDest.mutate(dest.id)} className="text-gray-600 hover:text-[#FF3B3B]">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {!dests?.length && <p className="text-gray-600 text-sm text-center py-4">No destinations added yet</p>}
              </div>
            </>
          )}
        </div>

        {/* ─── Webhooks ─── */}
        <div className="card space-y-4">
          <SectionHeader id="webhooks" title="WEBHOOKS">
            <Globe size={14} className="text-gray-500" />
          </SectionHeader>
          {expandedSection === 'webhooks' && (
            <>
              <p className="text-sm text-gray-500">Receive HMAC-signed POST requests when events happen on your stream.</p>
              <button onClick={() => setShowWebhookForm(!showWebhookForm)} className="btn-ghost py-2 px-4 text-sm flex items-center gap-2 self-start">
                <Plus size={14} /> Add Endpoint
              </button>
              {showWebhookForm && (
                <div className="bg-[#0f0f0f] border border-[#242424] rounded-xl p-4 space-y-3">
                  <input
                    className="input"
                    placeholder="https://yourserver.com/webhook"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                  />
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Events to receive:</p>
                    <div className="flex flex-wrap gap-2">
                      {WEBHOOK_EVENTS.map((ev) => (
                        <label key={ev} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newWebhookEvents.includes(ev)}
                            onChange={(e) => setNewWebhookEvents((prev) =>
                              e.target.checked ? [...prev, ev] : prev.filter((x) => x !== ev)
                            )}
                          />
                          <code className="text-gray-300">{ev}</code>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => addWebhook.mutate()} className="btn-volt" disabled={addWebhook.isPending || !newWebhookUrl}>
                    {addWebhook.isPending ? 'Adding...' : 'Add Endpoint'}
                  </button>
                </div>
              )}
              <div className="space-y-2">
                {webhooks?.map((wh) => (
                  <div key={wh.id} className="bg-[#0f0f0f] border border-[#242424] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-mono-custom text-gray-300 truncate flex-1 mr-2">{wh.url}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => toggleWebhook.mutate({ id: wh.id, isActive: wh.isActive })} className="text-gray-400 hover:text-[#C8FF00]">
                          {wh.isActive ? <ToggleRight size={18} className="text-[#C8FF00]" /> : <ToggleLeft size={18} />}
                        </button>
                        <button onClick={() => deleteWebhook.mutate(wh.id)} className="text-gray-600 hover:text-[#FF3B3B]">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowKeyFor(showKeyFor === wh.id ? null : wh.id)}
                        className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-300"
                      >
                        {showKeyFor === wh.id ? <EyeOff size={10} /> : <Eye size={10} />}
                        {showKeyFor === wh.id ? 'Hide secret' : 'Show secret'}
                      </button>
                      {showKeyFor === wh.id && (
                        <div className="flex items-center gap-1 flex-1">
                          <code className="text-xs font-mono-custom text-yellow-400 truncate">{wh.secret}</code>
                          <button onClick={() => { navigator.clipboard.writeText(wh.secret); toast.success('Copied!'); }}>
                            <Copy size={10} className="text-gray-500" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(wh.events as string[]).map((ev) => (
                        <span key={ev} className="text-xs bg-[#242424] text-gray-400 px-1.5 py-0.5 rounded font-mono-custom">{ev}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {!webhooks?.length && <p className="text-gray-600 text-sm text-center py-4">No webhook endpoints configured</p>}
              </div>
            </>
          )}
        </div>

        {/* ─── Stripe Connect ─── */}
        <div className="card border-[#D4AF37]/30 space-y-3">
          <SectionHeader id="stripe" title="STRIPE CONNECT">
            <DollarSign size={14} className="text-[#D4AF37]" />
          </SectionHeader>
          {expandedSection === 'stripe' && (
            <>
              <p className="text-gray-400 text-sm">Connect your Stripe account to receive platform tip/sub payouts (90% yours).</p>
              <button
                onClick={async () => {
                  const { url } = await api.post<{ url: string }>('/api/payments/connect/onboard', { email: user.username });
                  window.location.href = url;
                }}
                className="btn-volt"
              >
                Connect Stripe Account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
