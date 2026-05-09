'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { Users } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PartyPage() {
  const { streamId } = useParams<{ streamId: string }>();
  const { user } = useAuth();
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel(`party:${streamId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setParticipantCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await channel.track({ userId: user.id, username: user.username });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [streamId, user]);

  return (
    <div className="min-h-screen bg-[#0C0806] flex flex-col lg:flex-row">
      <div className="flex-1 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-4xl text-[#C8FF00]">WATCH PARTY</h1>
          <span className="flex items-center gap-2 text-sm text-gray-400">
            <Users size={16} /> {participantCount} watching together
          </span>
        </div>
        <div className="aspect-video bg-[#0f0f0f] rounded-2xl overflow-hidden border border-[#1E1E1E]">
          <iframe
            src={`https://vdo.ninja/?view=${streamId}&room=seewhy-${streamId.slice(0,8)}&autoplay`}
            className="w-full h-full"
            allow="autoplay; camera; microphone"
            title="Watch Party Stream"
          />
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 font-ui uppercase tracking-wider mb-2">Synchronized Playback</p>
          <p className="text-sm text-gray-400">All participants are watching the same stream in real-time. Chat syncs automatically via Supabase Realtime.</p>
        </div>
      </div>
      <div className="w-full lg:w-[340px] p-4">
        <ChatPanel streamId={streamId} />
      </div>
    </div>
  );
}
