'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Zap, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Battle {
  id: string; status: string; scoreA: number; scoreB: number;
  durationSeconds: number; startedAt: string; endedAt: string | null; winnerId: string | null;
  creatorA: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  creatorB: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
}

export default function SpotlightPage() {
  const { battleId } = useParams<{ battleId: string }>();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const { data: initialBattle } = useQuery({
    queryKey: ['battle', battleId],
    queryFn: () => api.get<Battle>(`/api/battles/${battleId}`),
  });

  useEffect(() => {
    if (initialBattle) setBattle(initialBattle);
  }, [initialBattle]);

  useEffect(() => {
    if (!battle) return;
    const channel = supabase
      .channel(`battle:${battleId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'spotlight_battles', filter: `id=eq.${battleId}` }, (p) => {
        setBattle((prev) => ({ ...prev!, ...p.new }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [battleId, battle]);

  useEffect(() => {
    if (!battle?.startedAt || battle.status !== 'active') return;
    const elapsed = (Date.now() - new Date(battle.startedAt).getTime()) / 1000;
    const remaining = Math.max(0, battle.durationSeconds - elapsed);
    setTimeLeft(Math.floor(remaining));
    const interval = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, [battle?.startedAt, battle?.status, battle?.durationSeconds]);

  const boost = useMutation({
    mutationFn: ({ creatorId, amount }: { creatorId: string; amount: number }) =>
      api.post<{ checkoutUrl: string }>(`/api/battles/${battleId}/boost`, {
        targetCreatorId: creatorId,
        grossAmountCents: amount,
        successUrl: window.location.href + '?boosted=true',
        cancelUrl: window.location.href,
      }),
    onSuccess: ({ checkoutUrl }) => { window.location.href = checkoutUrl; },
    onError: (err) => toast.error((err as Error).message),
  });

  if (!battle) return <div className="min-h-screen bg-[#0C0806] animate-pulse" />;

  const totalScore = Number(battle.scoreA) + Number(battle.scoreB) || 1;
  const pctA = (Number(battle.scoreA) / totalScore) * 100;
  const pctB = (Number(battle.scoreB) / totalScore) * 100;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="min-h-screen bg-[#0C0806] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <span className="live-badge mb-3 inline-block">⚡ SPOTLIGHT BATTLE</span>
          {battle.status === 'active' ? (
            <div className="font-display text-7xl text-white">{String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}</div>
          ) : (
            <div className="font-display text-4xl text-[#D4AF37] flex items-center justify-center gap-2">
              <Trophy size={32} /> BATTLE ENDED
            </div>
          )}
        </div>

        {/* Score bars */}
        <div className="card">
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-[#C8FF00] font-bold">{battle.creatorA.displayName ?? battle.creatorA.username}</span>
            <span className="text-gray-500">vs</span>
            <span className="text-[#FF3B3B] font-bold">{battle.creatorB.displayName ?? battle.creatorB.username}</span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden bg-[#1A1A1A]">
            <motion.div animate={{ width: `${pctA}%` }} transition={{ type: 'spring' }} className="bg-[#C8FF00] h-full" />
            <motion.div animate={{ width: `${pctB}%` }} transition={{ type: 'spring' }} className="bg-[#FF3B3B] h-full" />
          </div>
          <div className="flex justify-between mt-2 font-mono-custom text-sm">
            <span className="text-[#C8FF00]">${Number(battle.scoreA).toFixed(2)}</span>
            <span className="text-[#FF3B3B]">${Number(battle.scoreB).toFixed(2)}</span>
          </div>
        </div>

        {/* Boost buttons */}
        {battle.status === 'active' && (
          <div className="grid grid-cols-2 gap-4">
            {[battle.creatorA, battle.creatorB].map((creator, i) => (
              <div key={creator.id} className="card text-center space-y-3">
                <div className="font-bold" style={{ color: i === 0 ? '#C8FF00' : '#FF3B3B' }}>
                  {creator.displayName ?? creator.username}
                </div>
                <div className="space-y-2">
                  {[100, 500, 1000, 2500].map((cents) => (
                    <button
                      key={cents}
                      onClick={() => boost.mutate({ creatorId: creator.id, amount: cents })}
                      disabled={boost.isPending}
                      className="w-full py-2 rounded-lg border border-[#242424] text-sm hover:border-[#C8FF00]/40 transition-all flex items-center justify-center gap-1"
                    >
                      <Zap size={12} className="text-[#C8FF00]" /> ${(cents / 100).toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Winner announcement */}
        {battle.status === 'ended' && battle.winnerId && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card text-center border-[#D4AF37]/50 gold-glow">
            <Trophy size={48} className="text-[#D4AF37] mx-auto mb-3" />
            <h2 className="font-display text-4xl text-[#D4AF37]">
              {battle.winnerId === battle.creatorA.id
                ? (battle.creatorA.displayName ?? battle.creatorA.username)
                : (battle.creatorB.displayName ?? battle.creatorB.username)} WINS!
            </h2>
          </motion.div>
        )}
      </div>
    </div>
  );
}
