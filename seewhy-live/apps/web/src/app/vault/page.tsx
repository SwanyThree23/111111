'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Download, Clock, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface Vod { id: string; title: string; playbackUrl: string | null; durationSeconds: number | null; viewCount: number; createdAt: string }
interface RepurposeOutput { tiktokHook: string; instagramCaption: string; hashtags: string[]; bestPostingTime: string; bestPlatform: string }
interface AiJob { id: string; status: string; output: RepurposeOutput | null }

export default function VaultPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedVod, setSelectedVod] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => { if (!user) router.push('/auth/login'); }, [user, router]);

  const { data: vods } = useQuery({
    queryKey: ['vods'],
    queryFn: () => api.get<Vod[]>('/api/vods'),
    enabled: !!user,
  });

  const { data: job, refetch: refetchJob } = useQuery({
    queryKey: ['ai-job', jobId],
    queryFn: () => api.get<AiJob>(`/api/vods/jobs/${jobId}`),
    enabled: !!jobId,
    refetchInterval: (query) => query.state.data?.status === 'processing' || query.state.data?.status === 'queued' ? 3000 : false,
  });

  const repurpose = useMutation({
    mutationFn: (vodId: string) => api.post<{ jobId: string }>(`/api/vods/${vodId}/repurpose`),
    onSuccess: ({ jobId: jid }) => { setJobId(jid); toast.success('AI Repurpose job started'); },
    onError: (err) => toast.error((err as Error).message),
  });

  if (!user) return null;

  const output = job?.output as RepurposeOutput | null;

  return (
    <div className="min-h-screen bg-[#0C0806] p-4">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <h1 className="font-display text-5xl text-white">VOD VAULT</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vods?.map((vod) => (
            <div
              key={vod.id}
              className={`card cursor-pointer transition-all hover:border-[#C8FF00]/30 ${selectedVod === vod.id ? 'border-[#C8FF00]' : ''}`}
              onClick={() => setSelectedVod(vod.id)}
            >
              <div className="aspect-video bg-[#0f0f0f] rounded-xl mb-3 flex items-center justify-center text-4xl">🎬</div>
              <p className="font-semibold text-sm truncate">{vod.title}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Clock size={10} /> {vod.durationSeconds ? `${Math.floor(vod.durationSeconds / 60)}m` : 'N/A'}</span>
                <span className="flex items-center gap-1"><Eye size={10} /> {vod.viewCount}</span>
                <span>{new Date(vod.createdAt).toLocaleDateString()}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); repurpose.mutate(vod.id); }}
                disabled={repurpose.isPending}
                className="mt-3 w-full btn-ghost py-2 text-xs flex items-center justify-center gap-2"
              >
                <Sparkles size={12} className="text-[#A855F7]" /> AI Repurpose
              </button>
            </div>
          ))}
          {!vods?.length && <p className="text-gray-600 col-span-3 text-center py-10">No VODs yet. Stream to create recordings.</p>}
        </div>

        {/* AI Repurpose Output */}
        {jobId && (
          <div className="card border-[#A855F7]/30">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-[#A855F7]" />
              <h2 className="font-display text-2xl text-[#A855F7]">AI REPURPOSE</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full ${job?.status === 'completed' ? 'bg-[#C8FF00]/20 text-[#C8FF00]' : job?.status === 'failed' ? 'bg-[#FF3B3B]/20 text-[#FF3B3B]' : 'bg-[#A855F7]/20 text-[#A855F7]'}`}>
                {job?.status ?? 'loading'}
              </span>
            </div>
            {output && (
              <div className="space-y-4">
                <div className="bg-[#0f0f0f] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1 font-ui uppercase">TikTok Hook</p>
                  <p className="text-white font-semibold">{output.tiktokHook}</p>
                </div>
                <div className="bg-[#0f0f0f] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1 font-ui uppercase">Instagram Caption</p>
                  <p className="text-gray-300 text-sm">{output.instagramCaption}</p>
                </div>
                <div className="bg-[#0f0f0f] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2 font-ui uppercase">Hashtags</p>
                  <div className="flex flex-wrap gap-2">
                    {output.hashtags.map((h) => (
                      <span key={h} className="bg-[#1A1A1A] border border-[#242424] px-2 py-0.5 rounded text-xs text-[#C8FF00]">#{h}</span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0f0f0f] rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1 font-ui uppercase">Best Post Time</p>
                    <p className="text-white text-sm">{output.bestPostingTime}</p>
                  </div>
                  <div className="bg-[#0f0f0f] rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1 font-ui uppercase">Best Platform</p>
                    <p className="text-[#C8FF00] font-bold">{output.bestPlatform}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(output, null, 2))}
                  className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Download size={14} /> Copy All
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
