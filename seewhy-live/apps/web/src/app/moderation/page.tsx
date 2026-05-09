'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, AlertTriangle, EyeOff, Ban, CheckCircle, Clock, ChevronDown } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.seewhylive.online';

interface GuardianEvent {
  id: string;
  streamId: string;
  messageId: string | null;
  contentHash: string | null;
  score: number;
  action: string | null;
  createdAt: string;
  message?: {
    id: string;
    content: string;
    userId: string | null;
    isDeleted: boolean;
    user?: { username: string; displayName: string | null };
  } | null;
}

const ACTION_META = {
  allow: { label: 'Allowed', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/20' },
  warn:  { label: 'Warning', icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  hide:  { label: 'Hidden',  icon: EyeOff, color: 'text-orange-400', bg: 'bg-orange-900/20' },
  ban:   { label: 'Banned',  icon: Ban, color: 'text-red-400', bg: 'bg-red-900/20' },
};

async function fetchEvents(filter: string): Promise<GuardianEvent[]> {
  const params = filter !== 'all' ? `?action=${filter}` : '';
  const res = await fetch(`${API}/api/analytics/moderation${params}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

async function restoreMessage(messageId: string) {
  const res = await fetch(`${API}/api/chat/${messageId}/restore`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed');
}

async function banUser(userId: string) {
  const res = await fetch(`${API}/api/auth/users/${userId}/ban`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed');
}

export default function ModerationPage() {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['guardian-events', filter],
    queryFn: () => fetchEvents(filter),
    refetchInterval: 10000,
  });

  const restore = useMutation({
    mutationFn: restoreMessage,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guardian-events'] }),
  });

  const ban = useMutation({
    mutationFn: banUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guardian-events'] }),
  });

  const counts = events.reduce<Record<string, number>>((acc, e) => {
    const a = e.action ?? 'allow';
    acc[a] = (acc[a] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield size={24} className="text-purple-400" />
          <h1 className="text-xl font-bold">Chat Moderation</h1>
          <span className="text-xs text-gray-500">Powered by Guardian AI</span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(ACTION_META).map(([key, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={key}
                onClick={() => setFilter(filter === key ? 'all' : key)}
                className={`rounded-xl p-3 text-left transition border ${
                  filter === key ? 'border-purple-500' : 'border-gray-800'
                } ${meta.bg}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={meta.color} />
                  <span className="text-xs text-gray-400">{meta.label}</span>
                </div>
                <p className={`text-2xl font-bold ${meta.color}`}>{counts[key] ?? 0}</p>
              </button>
            );
          })}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 text-sm">
          {['all', 'warn', 'hide', 'ban'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full transition ${
                filter === f ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All Events' : ACTION_META[f as keyof typeof ACTION_META]?.label}
            </button>
          ))}
        </div>

        {/* Events list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Shield size={40} className="mx-auto mb-3 opacity-30" />
            <p>No moderation events</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const meta = ACTION_META[(event.action ?? 'allow') as keyof typeof ACTION_META] ?? ACTION_META.allow;
              const Icon = meta.icon;
              const isOpen = expanded === event.id;

              return (
                <div key={event.id} className={`rounded-xl border border-gray-800 overflow-hidden ${meta.bg}`}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : event.id)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    <Icon size={16} className={meta.color} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {event.message?.content ?? <span className="text-gray-500 italic">Message deleted or unavailable</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                        <span className="text-xs text-gray-500">score: {Number(event.score).toFixed(2)}</span>
                        {event.message?.user && (
                          <span className="text-xs text-gray-500">@{event.message.user.username}</span>
                        )}
                        <Clock size={10} className="text-gray-600" />
                        <span className="text-xs text-gray-600">
                          {new Date(event.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <ChevronDown size={14} className={`text-gray-500 transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 flex gap-2 border-t border-gray-800 pt-3">
                      {event.message?.isDeleted && event.messageId && (
                        <button
                          onClick={() => restore.mutate(event.messageId!)}
                          disabled={restore.isPending}
                          className="px-3 py-1.5 bg-green-800 hover:bg-green-700 text-white text-xs rounded-lg transition"
                        >
                          Restore Message
                        </button>
                      )}
                      {event.message?.userId && (
                        <button
                          onClick={() => ban.mutate(event.message!.userId!)}
                          disabled={ban.isPending}
                          className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white text-xs rounded-lg transition"
                        >
                          Ban User
                        </button>
                      )}
                      {event.contentHash && (
                        <span className="text-xs text-gray-600 self-center font-mono">{event.contentHash.slice(0, 12)}...</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
