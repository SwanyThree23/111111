export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  role: string;
  isPublic?: boolean;
  stripeAccountId?: string;
  createdAt: string;
}

export interface Stream {
  id: string;
  userId: string;
  title: string;
  description?: string;
  streamKey: string;
  destinations: string[];
  status: StreamStatus;
  isLive: boolean;
  isPublic?: boolean;
  paywallEnabled?: boolean;
  paywallPreviewSeconds?: number;
  currentViewers?: number;
  category?: string;
  thumbnailUrl?: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, 'id' | 'username' | 'avatar' | 'bio'>;
  stats?: StreamStats[];
  vdoRoom?: VdoRoom;
  chatMessages?: ChatMessage[];
}

export type StreamStatus = 'IDLE' | 'STARTING' | 'LIVE' | 'STOPPING' | 'STOPPED' | 'ERROR';

export interface StreamStats {
  id: string;
  streamId: string;
  viewers: number;
  bitrate: number;
  fps: number;
  resolution?: string;
  duration: number;
  timestamp: string;
}

export interface VdoRoom {
  id: string;
  streamId: string;
  roomName: string;
  password: string;
  directorUrl: string;
  guestUrl: string;
  createdAt: string;
  participants: VdoParticipant[];
}

export interface VdoParticipant {
  id: string;
  roomId: string;
  viewId: string;
  name: string;
  role: string;
  isActive: boolean;
  joinedAt: string;
  leftAt?: string;
}

export interface ChatMessage {
  id: string;
  streamId: string;
  username: string;
  message: string;
  platform: string;
  isModerated: boolean;
  moderationResult?: string;
  timestamp: string;
}

export interface Tip {
  id: string;
  streamId?: string;
  fromUserId?: string;
  toUserId: string;
  username: string;
  amount: number;
  message?: string;
  platform: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  platform: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
}

export interface Analytics {
  summary: {
    totalStreams: number;
    liveStreams: number;
    completedStreams: number;
    totalWatchTime: number;
    avgViewers: number;
    totalChatMessages: number;
  };
  recentStreams: {
    id: string;
    title: string;
    status: string;
    isLive: boolean;
    startedAt?: string;
    endedAt?: string;
    currentViewers: number;
    destinations: string[];
  }[];
}

export interface WebSocketMessage {
  type: string;
  streamId?: string;
  data?: any;
  timestamp: string;
}
