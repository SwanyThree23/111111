'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { createClient } from '@supabase/supabase-js';
import { Send, Shield, Crown, Star, BadgeCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null; role?: string; badge?: string | null } | null;
}

// --- Role badge configuration ---
const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string; bg: string; glow: string }> = {
  founder: { label: 'Founder', icon: Crown, color: '#D4AF37', bg: 'rgba(212,175,55,0.12)', glow: '0 0 8px rgba(212,175,55,0.4)' },
  admin:   { label: 'Admin',   icon: Shield, color: '#FF3B3B', bg: 'rgba(255,59,59,0.12)', glow: '0 0 8px rgba(255,59,59,0.4)' },
  mod:     { label: 'Mod',     icon: BadgeCheck, color: '#A855F7', bg: 'rgba(168,85,247,0.12)', glow: '0 0 8px rgba(168,85,247,0.4)' },
  vip:     { label: 'VIP',     icon: Star, color: '#00E5CC', bg: 'rgba(0,229,204,0.12)', glow: '0 0 8px rgba(0,229,204,0.4)' },
  creator: { label: 'Creator', icon: Sparkles, color: '#C8FF00', bg: 'rgba(200,255,0,0.12)', glow: '0 0 8px rgba(200,255,0,0.4)' },
};

function RoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mr-1.5 select-none"
      style={{ color: config.color, background: config.bg, boxShadow: config.glow }}
    >
      <Icon size={10} />
      {config.label}
    </span>
  );
}

// --- Username color based on role ---
function getUsernameColor(role?: string): string {
  if (role && ROLE_CONFIG[role]) return ROLE_CONFIG[role].color;
  return '#C8FF00';
}

// --- Resolve display badge: prefer user.badge, fall back to role if notable ---
function getDisplayBadge(user: Message['user']): string | null {
  if (!user) return null;
  if (user.badge && ROLE_CONFIG[user.badge]) return user.badge;
  if (user.role && user.role !== 'viewer' && ROLE_CONFIG[user.role]) return user.role;
  return null;
}

// --- Message animation variants ---
const messageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
};

const superchatVariants = {
  initial: { opacity: 0, y: 20, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export function ChatPanel({ streamId }: { streamId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll only if user is near bottom
  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 60);
  };

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
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1E1E1E] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF3B3B] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF3B3B]" />
          </span>
          <span className="font-ui text-sm font-semibold">Live Chat</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 font-mono-custom">{messages.length} msgs</span>
          <Shield size={14} className="text-[#A855F7]" />
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              variants={msg.type === 'superchat' ? superchatVariants : messageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
              layout
            >
              {/* System message */}
              {msg.type === 'system' && (
                <div className="text-xs text-[#A855F7] italic py-1 text-center font-ui">
                  {msg.content}
                </div>
              )}

              {/* Superchat */}
              {msg.type === 'superchat' && (
                <div className="bg-gradient-to-r from-[#D4AF37]/15 to-[#D4AF37]/5 border border-[#D4AF37]/30 rounded-lg p-3 mb-1 gold-glow">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown size={12} className="text-[#D4AF37]" />
                    <span className="text-[#D4AF37] font-bold text-xs font-ui">SUPERCHAT</span>
                    <span className="text-[#D4AF37] font-mono-custom text-xs ml-auto">${msg.amount}</span>
                  </div>
                  <div className="text-sm">
                    {msg.user?.role && <RoleBadge role={msg.user.role} />}
                    <span className="font-semibold mr-1.5" style={{ color: getUsernameColor(msg.user?.role) }}>
                      {msg.user?.displayName ?? msg.user?.username ?? 'Aura'}
                    </span>
                    <span className="text-gray-200">{msg.content}</span>
                  </div>
                </div>
              )}

              {/* Regular message */}
              {msg.type !== 'system' && msg.type !== 'superchat' && (
                <div className="text-sm py-0.5 px-1 rounded hover:bg-white/[0.03] transition-colors group">
                  {msg.user?.role && <RoleBadge role={msg.user.role} />}
                  <span className="font-semibold mr-1.5" style={{ color: getUsernameColor(msg.user?.role) }}>
                    {msg.user?.displayName ?? msg.user?.username ?? 'Aura'}
                  </span>
                  <span className="text-gray-300">{msg.content}</span>
                  {msg.moderationScore !== null && msg.moderationScore >= 0.5 && (
                    <span className="ml-1 text-yellow-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity" title={`Score: ${msg.moderationScore}`}>⚠</span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom indicator */}
      <AnimatePresence>
        {!isAtBottom && messages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#C8FF00] text-[#0C0806] text-xs font-bold px-3 py-1 rounded-full shadow-lg hover:bg-[#d4ff33] transition-colors"
          >
            ↓ New messages
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-3 border-t border-[#1E1E1E]">
        {user ? (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="chat-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Say something..."
                maxLength={500}
                className="input text-sm py-2 pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-mono-custom">
                {text.length}/500
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!text.trim() || send.isPending}
              className="btn-volt py-2 px-3 disabled:opacity-40"
              id="chat-send-btn"
            >
              <Send size={16} />
            </motion.button>
          </div>
        ) : (
          <p className="text-gray-600 text-xs text-center py-2">
            <a href="/auth/login" className="text-[#C8FF00] hover:underline">Sign in</a> to chat
          </p>
        )}
      </div>
    </div>
  );
}
