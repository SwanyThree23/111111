import { createClient } from '@supabase/supabase-js';
import { logger } from '../config/logger';

const supabaseUrl = process.env.SUPABASE_URL || 'https://rxlgywvfclyjdfyvfvyc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Chat History ───────────────────────────────────────────────────────────

export async function saveChatMessage(roomId: string, message: {
  username: string;
  text: string;
  platform: string;
  userId?: string;
  avatarUrl?: string;
  isTranslated?: boolean;
  translatedText?: string;
  originalLang?: string;
}) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{ room_id: roomId, ...message, created_at: new Date().toISOString() }])
    .select()
    .single();

  if (error) logger.error('Supabase chat save error:', error);
  return data;
}

export async function getChatHistory(roomId: string, limit = 100) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) logger.error('Supabase chat fetch error:', error);
  return (data || []).reverse();
}

// ─── Watch Party State ───────────────────────────────────────────────────────

export async function saveWatchPartyState(roomId: string, state: {
  videoId: string;
  isPlaying: boolean;
  currentTime: number;
  hostId: string;
}) {
  const { error } = await supabase
    .from('watch_party_state')
    .upsert([{ room_id: roomId, ...state, updated_at: new Date().toISOString() }]);

  if (error) logger.error('Supabase watch party state error:', error);
}

export async function getWatchPartyState(roomId: string) {
  const { data, error } = await supabase
    .from('watch_party_state')
    .select('*')
    .eq('room_id', roomId)
    .single();

  if (error && error.code !== 'PGRST116') logger.error('Supabase watch party get error:', error);
  return data;
}

// ─── Tip Leaderboard ─────────────────────────────────────────────────────────

export async function saveTip(tip: {
  roomId: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  amount: number;
  currency: string;
  stripePaymentId: string;
  message?: string;
}) {
  const { data, error } = await supabase
    .from('tips')
    .insert([{ ...tip, created_at: new Date().toISOString() }])
    .select()
    .single();

  if (error) logger.error('Supabase tip save error:', error);
  return data;
}

export async function getTipLeaderboard(roomId: string) {
  const { data, error } = await supabase
    .from('tips')
    .select('from_username, sum(amount)')
    .eq('room_id', roomId)
    .order('sum', { ascending: false })
    .limit(20);

  if (error) logger.error('Supabase leaderboard error:', error);
  return data || [];
}

// ─── Moderation Log ──────────────────────────────────────────────────────────

export async function saveModAction(action: {
  roomId: string;
  moderatorId: string;
  targetUserId: string;
  targetUsername: string;
  action: 'ban' | 'mute' | 'warn' | 'unban' | 'unmute';
  reason?: string;
}) {
  const { error } = await supabase
    .from('mod_actions')
    .insert([{ ...action, created_at: new Date().toISOString() }]);

  if (error) logger.error('Supabase mod action error:', error);
}

export async function getBannedUsers(roomId: string): Promise<string[]> {
  const { data } = await supabase
    .from('mod_actions')
    .select('target_user_id')
    .eq('room_id', roomId)
    .eq('action', 'ban');

  const banned = new Set<string>((data || []).map((r: any) => r.target_user_id));

  const { data: unbanned } = await supabase
    .from('mod_actions')
    .select('target_user_id')
    .eq('room_id', roomId)
    .eq('action', 'unban');

  (unbanned || []).forEach((r: any) => banned.delete(r.target_user_id));
  return Array.from(banned);
}
