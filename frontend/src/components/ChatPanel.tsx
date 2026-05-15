import { useState, useEffect, useRef } from 'react';
import { Send, Languages, Globe } from 'lucide-react';
import api from '@/utils/api';
import { useAuth } from '@/utils/auth';
import { supabase } from '@/lib/supabase';

interface Message {
  id?: string;
  username: string;
  text: string;
  platform: string;
  timestamp?: string;
  created_at?: string;
  isTranslated?: boolean;
  translatedText?: string;
  originalLang?: string;
  showTranslated?: boolean;
}

interface ChatPanelProps {
  roomId: string;
  initialMessages?: Message[];
  enableTranslation?: boolean;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
];

export default function ChatPanel({ roomId, initialMessages = [], enableTranslation }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState('');
  const [translateTo, setTranslateTo] = useState('');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const sendMessage = async () => {
    if (!text.trim() || isSending) return;
    const draft = text.trim();
    setText('');
    setIsSending(true);

    try {
      await api.post(`/livekit/chat/${roomId}/message`, {
        text: draft,
        platform: 'app',
        translateTo: translateTo || undefined,
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          username: user?.username || user?.email?.split('@')[0] || 'You',
          text: draft,
          platform: 'app',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleTranslation = (idx: number) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, showTranslated: !m.showTranslated } : m))
    );
  };

  const myName = user?.username || user?.email?.split('@')[0] || '';

  return (
    <div className="flex flex-col h-full bg-obsidian-50">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => {
          const isOwn = msg.username === myName;
          const displayText = msg.showTranslated && msg.translatedText ? msg.translatedText : msg.text;

          return (
            <div key={msg.id || i} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <div className="w-7 h-7 bg-gradient-to-br from-burgundy to-gold/60 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {msg.username[0]?.toUpperCase() || '?'}
              </div>
              <div className={`max-w-[75%] flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-white/40 font-mono">{msg.username}</span>
                <div
                  className={`px-3 py-2 rounded-xl text-sm ${
                    isOwn
                      ? 'bg-gradient-to-br from-burgundy to-burgundy-dark text-white'
                      : 'bg-obsidian-100 border border-white/10 text-white/90'
                  }`}
                >
                  {displayText}
                  {msg.isTranslated && (
                    <button onClick={() => toggleTranslation(i)} className="ml-2 opacity-60 hover:opacity-100">
                      <Globe className="w-3 h-3 inline" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {enableTranslation && showLangPicker && (
        <div className="px-3 py-2 bg-obsidian-100 border-t border-white/10 flex flex-wrap gap-2">
          <span className="text-xs text-white/40 w-full font-mono">Translate to:</span>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { setTranslateTo(lang.code === translateTo ? '' : lang.code); setShowLangPicker(false); }}
              className={`px-2 py-1 text-xs rounded font-mono ${
                translateTo === lang.code ? 'bg-gold text-obsidian font-bold' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-white/10 flex gap-2">
        {enableTranslation && (
          <button
            onClick={() => setShowLangPicker(!showLangPicker)}
            className={`p-2 rounded-lg flex-shrink-0 ${translateTo ? 'bg-gold/20 text-gold' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
            title="Translation"
          >
            <Languages className="w-4 h-4" />
          </button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-white/10 border border-white/10 text-white px-3 py-2 rounded-xl text-sm outline-none focus:border-gold/50 placeholder-white/30 font-mono"
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || isSending}
          className="p-2 bg-burgundy hover:bg-burgundy-dark rounded-xl disabled:opacity-40 transition flex-shrink-0"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
