export interface User { id: string; email: string; username: string; firstName?: string; lastName?: string; avatar?: string; role: string; createdAt: string; }
export interface Stream { id: string; userId: string; title: string; description?: string; streamKey: string; destinations: string[]; status: StreamStatus; isLive: boolean; scheduledAt?: string; startedAt?: string; endedAt?: string; createdAt: string; updatedAt: string; stats?: StreamStats[]; vdoRooms?: VdoRoom[]; chatMessages?: ChatMessage[]; }
export type StreamStatus = 'IDLE' | 'STARTING' | 'LIVE' | 'STOPPING' | 'STOPPED' | 'ERROR';
export interface StreamStats { id: string; streamId: string; viewers: number; bitrate: number; fps: number; resolution?: string; duration: number; timestamp: string; }
export interface VdoRoom { id: string; streamId: string; roomName: string; password: string; directorUrl: string; guestUrl: string; createdAt: string; participants: VdoParticipant[]; }
export interface VdoParticipant { id: string; roomId: string; viewId: string; name: string; role: string; isActive: boolean; joinedAt: string; leftAt?: string; }
export interface ChatMessage { id: string; streamId: string; username: string; message: string; platform: string; isModerated: boolean; moderationResult?: string; timestamp: string; }
export interface ApiKey { id: string; platform: string; name: string; createdAt: string; lastUsed?: string; }
export interface Analytics { summary: { totalStreams: number; liveStreams: number; completedStreams: number; totalWatchTime: number; avgViewers: number; totalChatMessages: number; }; recentStreams: { id: string; title: string; status: string; isLive: boolean; startedAt?: string; endedAt?: string; currentViewers: number; destinations: string[]; }[]; }
export interface WebSocketMessage { type: string; streamId?: string; data?: any; timestamp: string; }
