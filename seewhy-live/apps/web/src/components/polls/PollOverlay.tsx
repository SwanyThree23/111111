'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface PollOption {
  idx: number;
  text: string;
}

interface PollResult {
  optionIdx: number;
  count: number;
}

interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  endsAt: string;
  status: string;
}

interface Props {
  streamId: string;
  apiUrl: string;
}

export default function PollOverlay({ streamId, apiUrl }: Props) {
  const [poll, setPoll] = useState<PollData | null>(null);
  const [results, setResults] = useState<PollResult[]>([]);
  const [voted, setVoted] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [visible, setVisible] = useState(false);

  const totalVotes = results.reduce((s, r) => s + r.count, 0);

  // Fetch active poll on mount
  useEffect(() => {
    fetch(`${apiUrl}/api/polls/stream/${streamId}/active`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.poll) {
          setPoll(data.poll);
          setResults(data.results ?? []);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, [streamId, apiUrl]);

  // Listen for poll events via Supabase Realtime broadcast channel
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channel = supabase.channel(`stream:${streamId}`)
      .on('broadcast', { event: 'poll:started' }, ({ payload }) => {
        setPoll(payload as PollData);
        setResults([]);
        setVoted(null);
        setVisible(true);
      })
      .on('broadcast', { event: 'poll:update' }, ({ payload }) => {
        if (payload.pollId === poll?.id) setResults(payload.results as PollResult[]);
      })
      .on('broadcast', { event: 'poll:ended' }, ({ payload }) => {
        if (payload.pollId === poll?.id) {
          setTimeout(() => setVisible(false), 5000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId, poll?.id]);

  // Countdown timer
  useEffect(() => {
    if (!poll) return;
    const tick = () => {
      const secs = Math.max(0, Math.round((new Date(poll.endsAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(secs);
      if (secs === 0) setVisible(false);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [poll]);

  async function castVote(optionIdx: number) {
    if (voted !== null || !poll) return;
    setVoted(optionIdx);
    try {
      const res = await fetch(`${apiUrl}/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ optionIdx }),
      });
      if (res.ok) {
        const { results: r } = await res.json();
        setResults(r);
      }
    } catch {
      setVoted(null);
    }
  }

  if (!visible || !poll) return null;

  return (
    <div className="absolute bottom-20 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-2xl p-4 text-white z-30 max-w-sm mx-auto">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-purple-400">Live Poll</span>
        <span className="text-xs tabular-nums text-gray-400">{secondsLeft}s</span>
      </div>

      <p className="font-semibold text-sm mb-3 leading-snug">{poll.question}</p>

      <div className="space-y-2">
        {poll.options.map((opt) => {
          const count = results.find((r) => r.optionIdx === opt.idx)?.count ?? 0;
          const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
          const isVoted = voted === opt.idx;

          return (
            <button
              key={opt.idx}
              onClick={() => castVote(opt.idx)}
              disabled={voted !== null}
              className="w-full text-left group"
            >
              <div className="flex justify-between text-xs mb-0.5">
                <span className={isVoted ? 'text-purple-300 font-semibold' : 'text-gray-200'}>{opt.text}</span>
                {voted !== null && <span className="tabular-nums text-gray-400">{pct}%</span>}
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: voted !== null ? `${pct}%` : '0%',
                    background: isVoted ? '#a855f7' : '#6b7280',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {totalVotes > 0 && (
        <p className="text-xs text-gray-500 text-right mt-2">{totalVotes.toLocaleString()} votes</p>
      )}
    </div>
  );
}
