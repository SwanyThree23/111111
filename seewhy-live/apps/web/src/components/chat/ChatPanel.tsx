'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { createClient } from '@supabase/supabase-js';
import { Send, Shield } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Message {
  id: string;
  content: string;
  type: string;
  amount: number | null;
  moderationScore: number | null;
  createdAt: string;
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
}

export function ChatPanel({ streamId }: { streamId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: history } = useQuery({
    queryKey: ['chat', streamId],
    queryFn: () => api.get<Message[]>(`/api/chat/${streamId}/messages?limit=50`),
  });

  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `stream_id=eq.${streamId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message].slice(-200));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useMutation({
    mutationFn: (content: string) =>
      api.post<Message>(`/api/chat/${streamId}/messages`, { content }),
    onSuccess: () => setText(''),
  });

  const handleSend = () => {
    if (!text.trim() || !user) return;
    send.mutate(text.trim());
    setText('');
  };

  return (
    <div className="card h-[600px] flex flex-col p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1E1E1E] flex items-center justify-between">
        <span className="font-ui text-sm font-semibold">Live Chat</span>
        <Shield size={14} className="text-[#A855F7]" title="Guardian AI moderation active" />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {messages.map((msg) => (
          <div key={msg.id} className={`text-sm ${msg.type === 'system' ? 'text-[#A855F7] italic' : ''}`}>
            {msg.type === 'superchat' && (
              <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-2 mb-1">
                <span className="text-[#D4AF37] font-bold text-xs">💛 SUPERCHAT ${msg.amount}</span>
              </div>
            )}
            <span className="font-semibold text-[#C8FF00] mr-1.5">
              {msg.user?.displayName ?? msg.user?.username ?? 'Aura'}
            </span>
            <span className="text-gray-300">{msg.content}</span>
            {msg.moderationScore !== null && msg.moderationScore >= 0.5 && (
              <span className="ml-1 text-yellow-500 text-xs" title={`Score: ${msg.moderationScore}`}>⚠</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-[#1E1E1E]">
        {user ? (
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Say something..."
              maxLength={500}
              className="input text-sm py-2"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || send.isPending}
              className="btn-volt py-2 px-3"
            >
              <Send size={16} />
            </button>
          </div>
        ) : (
          <p className="text-gray-600 text-xs text-center">Sign in to chat</p>
        )}
      </div>
    </div>
  );
}
