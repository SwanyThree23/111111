'use client';
import { useRef, useState, useEffect } from 'react';
import { Circle, Square, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RecorderPage() {
  const [recording, setRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [duration, setSec] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<number>(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: true,
      });

      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const drawWaveform = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx2 = canvas.getContext('2d')!;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        ctx2.clearRect(0, 0, canvas.width, canvas.height);
        ctx2.fillStyle = '#0f0f0f';
        ctx2.fillRect(0, 0, canvas.width, canvas.height);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.round((avg / 255) * 100));
        data.forEach((v, i) => {
          const h = (v / 255) * canvas.height;
          ctx2.fillStyle = `rgba(200, 255, 0, ${v / 255})`;
          ctx2.fillRect((i / data.length) * canvas.width, (canvas.height - h) / 2, canvas.width / data.length - 1, h);
        });
        animRef.current = requestAnimationFrame(drawWaveform);
      };
      drawWaveform();

      const mr = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      mediaRef.current = mr;
      chunksRef.current = [];
      setRecording(true);
      setSec(0);
      timerRef.current = setInterval(() => setSec((s) => s + 1), 1000);
    } catch { toast.error('Microphone/camera access denied'); }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    cancelAnimationFrame(animRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);

    mediaRef.current!.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `seewhy-recording-${Date.now()}.webm`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Recording saved!');
    };
  };

  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  return (
    <div className="min-h-screen bg-[#0C0806] p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="font-display text-5xl text-white">RECORDER</h1>
        <div className="card space-y-4">
          <canvas ref={canvasRef} width={600} height={120} className="w-full rounded-xl bg-[#0f0f0f]" />
          <div className="flex items-center justify-between">
            <div className="font-mono-custom text-[#C8FF00] text-2xl">
              {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              Level: <span className="text-[#C8FF00]">{audioLevel}%</span>
              <div className="w-24 h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div className="h-full bg-[#C8FF00] rounded-full transition-all" style={{ width: `${audioLevel}%` }} />
              </div>
            </div>
          </div>
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`w-full py-4 rounded-xl font-display text-2xl transition-all ${recording ? 'bg-[#FF3B3B] text-white hover:bg-red-700' : 'btn-volt'}`}
          >
            {recording ? <span className="flex items-center justify-center gap-3"><Square size={24} /> STOP</span>
              : <span className="flex items-center justify-center gap-3"><Circle size={24} className="text-[#FF3B3B]" /> RECORD</span>}
          </button>
          <p className="text-xs text-gray-600 text-center">Echo cancellation + noise suppression enabled. Auto-saves to device on stop.</p>
        </div>
      </div>
    </div>
  );
}
