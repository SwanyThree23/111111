import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, Settings,
  Play, Square, Users, ChevronDown, ChevronUp, Radio,
  Camera, AlertCircle, CheckCircle, Loader,
} from 'lucide-react';
import api from '@/utils/api';
import toast from 'react-hot-toast';

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', color: 'bg-red-600' },
  { id: 'twitch', label: 'Twitch', color: 'bg-purple-700' },
  { id: 'facebook', label: 'Facebook', color: 'bg-blue-600' },
  { id: 'twitter', label: 'Twitter/X', color: 'bg-black' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-blue-700' },
  { id: 'instagram', label: 'Instagram', color: 'bg-pink-600' },
  { id: 'tiktok', label: 'TikTok', color: 'bg-gray-900' },
  { id: 'kick', label: 'Kick', color: 'bg-green-600' },
];

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied';

export default function GoLive() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micPermission, setMicPermission] = useState<PermissionState>('idle');
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['youtube', 'twitch']);
  const [showSettings, setShowSettings] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [quality, setQuality] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [audioLevel, setAudioLevel] = useState(0);
  const [rtmpInfo, setRtmpInfo] = useState<any>(null);

  useEffect(() => {
    requestPermissions();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const requestPermissions = async () => {
    setMicPermission('requesting');
    setCameraPermission('requesting');

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080 },
        audio: true,
      });

      setStream(mediaStream);
      setMicPermission('granted');
      setCameraPermission('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Start audio level monitoring
      monitorAudioLevel(mediaStream);

      toast.success('Camera and microphone ready!');
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        setMicPermission('denied');
        setCameraPermission('denied');
        toast.error('Please allow camera and microphone access');
      } else {
        toast.error('Could not access camera/microphone');
      }
    }
  };

  const monitorAudioLevel = (mediaStream: MediaStream) => {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(mediaStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const update = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setAudioLevel(Math.round(avg));
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  };

  const toggleMic = () => {
    stream?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    stream?.getVideoTracks().forEach(t => { t.enabled = isCameraOff; });
    setIsCameraOff(!isCameraOff);
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];

        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }

        videoTrack.onended = () => {
          setIsScreenSharing(false);
          if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
          }
        };

        setIsScreenSharing(true);
        toast.success('Screen sharing active');
      } catch {
        toast.error('Screen sharing denied');
      }
    } else {
      setIsScreenSharing(false);
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const goLive = async () => {
    if (!streamTitle.trim()) {
      toast.error('Please enter a stream title');
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform');
      return;
    }

    setIsGoingLive(true);
    try {
      // Create stream
      const streamRes = await api.post('/streams', {
        title: streamTitle,
        destinations: selectedPlatforms,
      });

      const newStream = streamRes.data.stream;

      // Get RTMP info
      const rtmpRes = await api.post('/livekit/rtmp-ingress', { streamId: newStream.id });
      setRtmpInfo(rtmpRes.data.ingress);

      // Start stream
      await api.post(`/streams/${newStream.id}/start`);

      setIsLive(true);
      toast.success(`Going live on ${selectedPlatforms.length} platforms!`);
    } catch (error) {
      toast.error('Failed to go live. Configure your API keys in Settings.');
    } finally {
      setIsGoingLive(false);
    }
  };

  const stopLive = async () => {
    setIsLive(false);
    toast('Stream ended');
    navigate('/dashboard');
  };

  const PermissionStatus = ({ state, label }: { state: PermissionState; label: string }) => (
    <div className="flex items-center gap-2">
      {state === 'idle' && <div className="w-4 h-4 rounded-full bg-gray-400" />}
      {state === 'requesting' && <Loader className="w-4 h-4 text-yellow-400 animate-spin" />}
      {state === 'granted' && <CheckCircle className="w-4 h-4 text-green-400" />}
      {state === 'denied' && <AlertCircle className="w-4 h-4 text-red-400" />}
      <span className="text-sm text-gray-300">{label}</span>
      {state === 'denied' && (
        <button onClick={requestPermissions} className="text-xs text-purple-400 underline">
          Retry
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Go Live</h1>
          {isLive && (
            <div className="flex items-center gap-2 bg-red-900/50 border border-red-700 px-4 py-2 rounded-full">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="font-bold text-red-300">LIVE</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Preview */}
          <div className="col-span-2 space-y-4">
            {/* Video Preview */}
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`}
              />

              {(isCameraOff || cameraPermission !== 'granted') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                  <Camera className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-gray-500">
                    {cameraPermission === 'denied'
                      ? 'Camera access denied'
                      : cameraPermission === 'requesting'
                      ? 'Requesting camera...'
                      : 'Camera off'}
                  </p>
                  {cameraPermission === 'denied' && (
                    <button onClick={requestPermissions} className="mt-3 btn-primary text-sm">
                      Allow Camera
                    </button>
                  )}
                </div>
              )}

              {/* Audio level indicator */}
              {micPermission === 'granted' && !isMuted && (
                <div className="absolute bottom-4 left-4 flex items-end gap-0.5 h-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-green-400 rounded-full transition-all"
                      style={{ height: `${Math.min(100, (audioLevel / 40) * 100 * (i / 8 + 0.2))}%` }}
                    />
                  ))}
                </div>
              )}

              {/* Status badges */}
              {isScreenSharing && (
                <div className="absolute top-4 right-4 bg-purple-900/80 text-purple-300 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <MonitorUp className="w-3 h-3" /> Screen Sharing
                </div>
              )}
            </div>

            {/* Permission status */}
            <div className="bg-gray-900 rounded-xl p-4 flex gap-6">
              <PermissionStatus state={micPermission} label="Microphone" />
              <PermissionStatus state={cameraPermission} label="Camera" />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={toggleMic}
                className={`p-4 rounded-2xl transition ${isMuted ? 'bg-red-900 text-red-300' : 'bg-gray-800 hover:bg-gray-700'}`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button
                onClick={toggleCamera}
                className={`p-4 rounded-2xl transition ${isCameraOff ? 'bg-red-900 text-red-300' : 'bg-gray-800 hover:bg-gray-700'}`}
              >
                {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
              <button
                onClick={toggleScreenShare}
                className={`p-4 rounded-2xl transition ${isScreenSharing ? 'bg-purple-900 text-purple-300' : 'bg-gray-800 hover:bg-gray-700'}`}
              >
                <MonitorUp className="w-6 h-6" />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-4 rounded-2xl bg-gray-800 hover:bg-gray-700 transition"
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>

            {/* Settings panel */}
            {showSettings && (
              <div className="bg-gray-900 rounded-xl p-4 space-y-3">
                <h3 className="font-bold">Stream Quality</h3>
                <div className="flex gap-2">
                  {(['1080p', '720p', '480p'] as const).map(q => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${quality === q ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300'}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* RTMP Info (after going live) */}
            {rtmpInfo && (
              <div className="bg-gray-900 rounded-xl p-4 space-y-2">
                <h3 className="font-bold flex items-center gap-2">
                  <Radio className="w-5 h-5 text-red-400" /> OBS / External Encoder
                </h3>
                <div>
                  <p className="text-xs text-gray-500 mb-1">RTMP Server URL</p>
                  <code className="text-sm bg-gray-800 px-3 py-2 rounded-lg block text-green-400">
                    {rtmpInfo.rtmpUrl}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Stream Key</p>
                  <code className="text-sm bg-gray-800 px-3 py-2 rounded-lg block text-yellow-400">
                    {rtmpInfo.streamKey}
                  </code>
                </div>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Stream title */}
            <div className="bg-gray-900 rounded-xl p-4 space-y-3">
              <h3 className="font-bold">Stream Info</h3>
              <input
                value={streamTitle}
                onChange={e => setStreamTitle(e.target.value)}
                placeholder="Stream title..."
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-xl text-sm outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-500"
              />
            </div>

            {/* Platform selection */}
            <div className="bg-gray-900 rounded-xl p-4 space-y-3">
              <h3 className="font-bold">Destinations ({selectedPlatforms.length})</h3>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      selectedPlatforms.includes(platform.id)
                        ? `${platform.color} text-white`
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Radio className="w-3 h-3" />
                    {platform.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Go Live button */}
            <div className="space-y-3">
              {!isLive ? (
                <button
                  onClick={goLive}
                  disabled={isGoingLive || cameraPermission !== 'granted' || !streamTitle.trim()}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-2xl font-bold text-lg hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isGoingLive ? (
                    <><Loader className="w-6 h-6 animate-spin" /> Starting...</>
                  ) : (
                    <><Play className="w-6 h-6" /> Go Live</>
                  )}
                </button>
              ) : (
                <button
                  onClick={stopLive}
                  className="w-full py-4 bg-gray-800 border-2 border-red-600 text-red-400 rounded-2xl font-bold text-lg hover:bg-red-900/20 transition flex items-center justify-center gap-3"
                >
                  <Square className="w-6 h-6" />
                  End Stream
                </button>
              )}
              {selectedPlatforms.length > 0 && (
                <p className="text-center text-xs text-gray-500">
                  Broadcasting to {selectedPlatforms.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
