import { useState, useEffect, useRef } from 'react';
import { Send, Globe, Languages } from 'lucide-react';
import api from '@/utils/api';
import { useAuth } from '@/utils/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

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
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
];

export default function ChatPanel({ roomId, initialMessages = [], enableTranslation }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState('');
  const [translateTo, setTranslateTo] = useState<string>('');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Supabase real-time subscription
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

    const channel = supabase
      .channel(`chat:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const sendMessage = async () => {
    if (!text.trim() || isSending) return;
    setIsSending(true);

    try {
      await api.post(`/livekit/chat/${roomId}/message`, {
        text: text.trim(),
        platform: 'app',
        translateTo: translateTo || undefined,
      });
      setText('');
    } catch {
      // Optimistic fallback
      setMessages(prev => [
        ...prev,
        {
          username: user?.email.split('@')[0] || 'You',
          text: text.trim(),
          platform: 'app',
          created_at: new Date().toISOString(),
        },
      ]);
      setText('');
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

  const toggleTranslation = (msg: Message) => {
    setMessages(prev =>
      prev.map(m => m === msg ? { ...m, showTranslated: !m.showTranslated } : m)
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => {
          const isOwn = msg.username === user?.email.split('@')[0];
          const displayText = msg.showTranslated && msg.translatedText ? msg.translatedText : msg.text;

          return (
            <div key={msg.id || i} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <div className="w-7 h-7 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                {msg.username[0].toUpperCase()}
              </div>
              <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <span className="text-xs text-gray-500">{msg.username}</span>
                <div
                  className={`px-3 py-2 rounded-xl text-sm ${
                    isOwn
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  {displayText}
                  {msg.isTranslated && (
                    <button
                      onClick={() => toggleTranslation(msg)}
                      className="ml-2 text-xs opacity-70 hover:opacity-100"
                    >
                      <Globe className="w-3 h-3 inline" />
                    </button>
                  )}
                </div>
                {msg.originalLang && (
                  <span className="text-xs text-gray-600">
                    {msg.showTranslated ? 'translated' : `original (${msg.originalLang})`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Translation Picker */}
      {enableTranslation && showLangPicker && (
        <div className="px-3 py-2 bg-gray-800 border-t border-gray-700 flex flex-wrap gap-2">
          <span className="text-xs text-gray-400 w-full">Translate messages to:</span>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setTranslateTo(lang.code === translateTo ? '' : lang.code); setShowLangPicker(false); }}
              className={`px-2 py-1 text-xs rounded ${
                translateTo === lang.code
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-800 flex gap-2">
        {enableTranslation && (
          <button
            onClick={() => setShowLangPicker(!showLangPicker)}
            className={`p-2 rounded-lg flex-shrink-0 ${translateTo ? 'bg-purple-900 text-purple-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            title="Translation settings"
          >
            <Languages className="w-4 h-4" />
          </button>
        )}
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-xl text-sm outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-500"
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || isSending}
          className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl disabled:opacity-50 hover:scale-105 transition flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
