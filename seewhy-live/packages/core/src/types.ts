export interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'viewer' | 'creator' | 'admin';
  stripeOnboarded: boolean;
}

export interface Stream {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  category: string;
  thumbnailUrl: string | null;
  streamKey: string;
  rtmpUrl: string;
  status: 'idle' | 'live' | 'ended' | 'archived';
  viewerCount: number;
  peakViewerCount: number;
  tipTotal: number;
  previewSecs: number;
  startedAt: string | null;
  createdAt: string;
  creator: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
}

export interface Transaction {
  id: string;
  streamId: string | null;
  creatorId: string;
  type: 'subscription' | 'superchat' | 'tip' | 'paywall' | 'direct_pay';
  grossAmount: number;
  creatorAmount: number;
  platformAmount: number;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  streamId: string;
  content: string;
  type: 'message' | 'superchat' | 'system' | 'tip_alert';
  amount: number | null;
  isDeleted: boolean;
  moderationScore: number | null;
  createdAt: string;
  user: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'> | null;
}
