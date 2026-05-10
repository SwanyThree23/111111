import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, Settings2,
  Play, Square, Radio, Camera, AlertCircle, CheckCircle,
  Loader, Copy, Eye, EyeOff, Lock, Unlock, Globe,
} from 'lucide-react';
import api from '@/utils/api';
import toast from 'react-hot-toast';

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', color: 'bg-red-700 border-red-600' },
  { id: 'twitch', label: 'Twitch', color: 'bg-purple-800 border-purple-600' },
  { id: 'tiktok', label: 'TikTok', color: 'bg-gray-800 border-gray-600' },
  { id: 'facebook', label: 'Facebook', color: 'bg-blue-800 border-blue-600' },
  { id: 'kick', label: 'Kick', color: 'bg-green-800 border-green-600' },
  { id: 'twitter', label: 'X (Twitter)', color: 'bg-zinc-800 border-zinc-600' },
];

type PermState = 'idle' | 'requesting' | 'granted' | 'denied';

export default function GoLive() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micPerm, setMicPerm] = useState<PermState>('idle');
  const [camPerm, setCamPerm] = useState<PermState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenShare, setIsScreenShare] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>(['youtube', 'twitch']);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [paywallEnabled, setPaywallEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [quality, setQuality] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [audioLevel, setAudioLevel] = useState(0);
  const [streamKey, setStreamKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState('');

  const RTMP_URL = 'rtmp://live.seewhy.live/stream';

  useEffect(() => {
    requestPerms();
    fetchStreamKey();
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const fetchStreamKey = async () => {
    try {
      const res = await api.get('/streams/my-key');
      setStreamKey(res.data.streamKey || '');
    } catch {
      setStreamKey('sk_' + Math.random().toString(36).slice(2, 18).toUpperCase());
    }
  };

  const requestPerms = async () => {
    setMicPerm('requesting');
    setCamPerm('requesting');
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 }, audio: true });
      setStream(ms);
      setMicPerm('granted');
      setCamPerm('granted');
      if (videoRef.current) videoRef.current.srcObject = ms;
      monitorAudio(ms);
    } catch {
      setMicPerm('denied');
      setCamPerm('denied');
      toast.error('Camera/mic access required. Check browser permissions.');
    }
  };

  const monitorAudio = (ms: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(ms);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.round(avg));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {}
  };

  const toggleMic = () => {
    stream?.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
  };

  const toggleCam = () => {
    stream?.getVideoTracks().forEach((t) => { t.enabled = isCamOff; });
    setIsCamOff(!isCamOff);
  };

  const toggleScreen = async () => {
    if (!isScreenShare) {
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = ss;
        ss.getVideoTracks()[0].onended = () => {
          setIsScreenShare(false);
          if (videoRef.current && stream) videoRef.current.srcObject = stream;
        };
        setIsScreenShare(true);
      } catch { toast.error('Screen sharing denied'); }
    } else {
      setIsScreenShare(false);
      if (videoRef.current && stream) videoRef.current.srcObject = stream;
    }
  };

  const togglePlatform = (id: string) => {
    setPlatforms((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const goLive = async () => {
    if (!title.trim()) { toast.error('Enter a stream title'); return; }
    if (platforms.length === 0) { toast.error('Select at least one platform'); return; }
    setIsGoingLive(true);
    try {
      const res = await api.post('/streams', {
        title,
        destinations: platforms,
        paywallEnabled,
        paywallPreviewSeconds: 120,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      const sid = res.data.stream?.id;
      if (sid) {
        setCurrentStreamId(sid);
        await api.post(`/streams/${sid}/start`);
      }
      setIsLive(true);
      toast.success(`Live on ${platforms.length} platform${platforms.length > 1 ? 's' : ''}!`);
    } catch {
      toast.error('Failed to go live. Check your API keys in Settings.');
    } finally {
      setIsGoingLive(false);
    }
  };

  const endStream = async () => {
    if (currentStreamId) {
      try { await api.post(`/streams/${currentStreamId}/stop`); } catch {}
    }
    stream?.getTracks().forEach((t) => t.stop());
    setIsLive(false);
    toast('Stream ended');
    navigate('/dashboard');
  };

  const copyKey = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Copied!');
  };

  return (
    <div className="min-h-screen bg-obsidian text-white">
      {/* Top bar */}
      <div className="border-b border-white/8 px-6 h-14 flex items-center justify-between bg-obsidian-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-white/40 hover:text-white font-mono text-sm">
            ← Back
          </button>
          <span className="font-display text-2xl tracking-wider text-white">GO LIVE</span>
        </div>
        {isLive && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-red-900/40 border border-red-700/50 rounded-full">
            <span className="live-dot" />
            <span className="text-red-300 font-mono text-sm font-bold">BROADCASTING</span>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">

          {/* Preview column */}
          <div className="col-span-8 space-y-4">
            {/* Video preview */}
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video border border-white/10">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isCamOff ? 'hidden' : ''}`}
              />

              {(isCamOff || camPerm !== 'granted') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-obsidian">
                  <Camera className="w-16 h-16 text-white/10 mb-3" />
                  <p className="text-white/30 font-mono text-sm">
                    {camPerm === 'denied' ? 'Camera access denied' : camPerm === 'requesting' ? 'Requesting...' : 'Camera off'}
                  </p>
                  {camPerm === 'denied' && (
                    <button onClick={requestPerms} className="mt-3 btn-primary text-sm">
                      Allow Camera
                    </button>
                  )}
                </div>
              )}

              {/* Audio meter */}
              {micPerm === 'granted' && !isMuted && (
                <div className="absolute bottom-4 left-4 flex items-end gap-0.5 h-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="vu-bar"
                      style={{ height: `${Math.min(100, (audioLevel / 40) * 100 * (0.3 + i / 8 * 0.7))}%`, minHeight: '2px' }}
                    />
                  ))}
                </div>
              )}

              {isScreenShare && (
                <div className="absolute top-3 right-3 badge bg-burgundy/80 text-white border-burgundy/50">
                  <MonitorUp className="w-3 h-3 inline mr-1" /> Screen
                </div>
              )}

              {isLive && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-red-600/80 rounded-lg">
                  <span className="live-dot" />
                  <span className="text-white text-xs font-bold font-mono">LIVE</span>
                </div>
              )}
            </div>

            {/* Device status */}
            <div className="card flex gap-6 py-3">
              {[
                { state: micPerm, label: 'Microphone', on: !isMuted },
                { state: camPerm, label: 'Camera', on: !isCamOff },
              ].map(({ state, label }) => (
                <div key={label} className="flex items-center gap-2">
                  {state === 'granted' ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : state === 'denied' ? (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <Loader className="w-4 h-4 text-white/40 animate-spin" />
                  )}
                  <span className="text-sm font-mono text-white/60">{label}</span>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={toggleMic}
                className={`p-4 rounded-2xl transition ${isMuted ? 'bg-red-900/60 text-red-300 border border-red-700/50' : 'bg-white/8 hover:bg-white/12 text-white'}`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button
                onClick={toggleCam}
                className={`p-4 rounded-2xl transition ${isCamOff ? 'bg-red-900/60 text-red-300 border border-red-700/50' : 'bg-white/8 hover:bg-white/12 text-white'}`}
              >
                {isCamOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
              <button
                onClick={toggleScreen}
                className={`p-4 rounded-2xl transition ${isScreenShare ? 'bg-burgundy/60 text-white border border-burgundy/50' : 'bg-white/8 hover:bg-white/12 text-white'}`}
              >
                <MonitorUp className="w-6 h-6" />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-4 rounded-2xl transition ${showSettings ? 'bg-gold/20 text-gold' : 'bg-white/8 hover:bg-white/12 text-white'}`}
              >
                <Settings2 className="w-6 h-6" />
              </button>
            </div>

            {showSettings && (
              <div className="card space-y-3">
                <h3 className="font-mono text-sm text-white/60 uppercase tracking-widest">Output Quality</h3>
                <div className="flex gap-2">
                  {(['1080p', '720p', '480p'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`px-4 py-2 rounded-xl font-mono text-sm border transition ${
                        quality === q
                          ? 'bg-burgundy text-white border-burgundy-light/40'
                          : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* OBS/RTMP Config */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-gold" />
                <h3 className="font-mono text-sm text-white/60 uppercase tracking-widest">OBS / External Encoder</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-mono text-white/40 mb-1.5">RTMP Server</p>
                  <div className="flex gap-2">
                    <code className="flex-1 text-sm bg-obsidian-100 border border-white/8 px-3 py-2 rounded-xl text-gold font-mono truncate">
                      {RTMP_URL}
                    </code>
                    <button onClick={() => copyKey(RTMP_URL)} className="btn-ghost p-2.5">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-mono text-white/40 mb-1.5">Stream Key</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <code className={`w-full text-sm bg-obsidian-100 border border-white/8 px-3 py-2 rounded-xl font-mono block ${showKey ? 'text-white' : 'text-white/0 select-none'} truncate`}>
                        {showKey ? (streamKey || '—') : '••••••••••••••••••••••••'}
                      </code>
                      {!showKey && (
                        <div className="absolute inset-0 flex items-center px-3">
                          <span className="text-white/30 font-mono text-sm">••••••••••••••••••••••••</span>
                        </div>
                      )}
                    </div>
                    <button onClick={() => setShowKey(!showKey)} className="btn-ghost p-2.5">
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => streamKey && copyKey(streamKey)} className="btn-ghost p-2.5">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] font-mono text-white/20 mt-1.5">
                    Never share your stream key. Rotate in Settings if compromised.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="col-span-4 space-y-4">
            {/* Stream info */}
            <div className="card space-y-4">
              <h3 className="font-display text-xl tracking-wider text-white">STREAM INFO</h3>
              <div>
                <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What are you streaming?"
                  className="input"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">Tags</label>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="music, gaming, talk (comma separated)"
                  className="input"
                />
              </div>
            </div>

            {/* Golden Paywall */}
            <div className={`card border transition-colors ${paywallEnabled ? 'border-gold/30 bg-gold/5' : 'border-white/8'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl tracking-wider text-white flex items-center gap-2">
                    {paywallEnabled ? <Lock className="w-4 h-4 text-gold" /> : <Unlock className="w-4 h-4 text-white/40" />}
                    GOLDEN PAYWALL
                  </h3>
                  <p className="text-white/40 font-mono text-xs mt-1">
                    120-second free preview, then gate
                  </p>
                </div>
                <button
                  onClick={() => setPaywallEnabled(!paywallEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${paywallEnabled ? 'bg-gold' : 'bg-white/20'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${paywallEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              {paywallEnabled && (
                <div className="mt-3 px-3 py-2 bg-gold/10 border border-gold/20 rounded-xl">
                  <p className="text-gold font-mono text-xs">
                    First 2:00 free → paywall activates → viewers must tip to unlock
                  </p>
                </div>
              )}
            </div>

            {/* Platform selection */}
            <div className="card space-y-3">
              <h3 className="font-display text-xl tracking-wider text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-white/40" />
                DESTINATIONS
                <span className="text-white/30 font-mono text-sm font-normal">({platforms.length})</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-mono border transition ${
                      platforms.includes(p.id)
                        ? `${p.color} text-white`
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70'
                    }`}
                  >
                    <Radio className="w-3 h-3" />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Go Live / End */}
            {!isLive ? (
              <button
                onClick={goLive}
                disabled={isGoingLive || !title.trim() || platforms.length === 0}
                className="w-full py-5 bg-gradient-to-br from-burgundy to-burgundy-dark text-white rounded-2xl font-display text-2xl tracking-wider
                           hover:shadow-burgundy transition-all disabled:opacity-40 disabled:cursor-not-allowed
                           flex items-center justify-center gap-3 border border-burgundy-light/30"
              >
                {isGoingLive ? (
                  <><Loader className="w-6 h-6 animate-spin" /> STARTING...</>
                ) : (
                  <><Play className="w-6 h-6" /> GO LIVE</>
                )}
              </button>
            ) : (
              <button
                onClick={endStream}
                className="w-full py-5 bg-obsidian-100 border-2 border-red-700/60 text-red-400 rounded-2xl font-display text-2xl
                           tracking-wider hover:bg-red-900/20 transition flex items-center justify-center gap-3"
              >
                <Square className="w-6 h-6" /> END STREAM
              </button>
            )}

            {platforms.length > 0 && !isLive && (
              <p className="text-center text-white/20 font-mono text-xs">
                Broadcasting to: {platforms.join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
