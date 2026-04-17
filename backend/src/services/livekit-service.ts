import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import { logger } from '../config/logger';

const livekitApiKey = process.env.LIVEKIT_API_KEY || '';
const livekitApiSecret = process.env.LIVEKIT_API_SECRET || '';
const livekitUrl = process.env.LIVEKIT_URL || 'wss://localhost:7880';

export class LiveKitService {
  private roomService: RoomServiceClient;

  constructor() {
    this.roomService = new RoomServiceClient(
      livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://'),
      livekitApiKey,
      livekitApiSecret
    );
  }

  // ─── Token Generation ─────────────────────────────────────────────────

  generateToken(params: {
    roomName: string;
    participantName: string;
    participantId: string;
    isHost?: boolean;
    canPublish?: boolean;
    canSubscribe?: boolean;
    canScreenShare?: boolean;
    metadata?: string;
  }) {
    const at = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: params.participantId,
      name: params.participantName,
      metadata: params.metadata,
      ttl: '24h',
    });

    at.addGrant({
      roomJoin: true,
      room: params.roomName,
      canPublish: params.canPublish ?? true,
      canSubscribe: params.canSubscribe ?? true,
      canPublishData: true,
      // Host privileges
      roomAdmin: params.isHost ?? false,
      roomRecord: params.isHost ?? false,
    });

    const token = at.toJwt();
    logger.info(`LiveKit token generated for ${params.participantName} in room ${params.roomName}`);

    return { token, url: livekitUrl };
  }

  // ─── Room Management ──────────────────────────────────────────────────

  async createRoom(roomName: string, maxParticipants = 20) {
    try {
      const room = await this.roomService.createRoom({
        name: roomName,
        maxParticipants,
        emptyTimeout: 300, // 5 minutes
        metadata: JSON.stringify({ createdAt: Date.now() }),
      });
      logger.info(`LiveKit room created: ${roomName}`);
      return room;
    } catch (error) {
      logger.error('Failed to create LiveKit room:', error);
      throw error;
    }
  }

  async getRoomParticipants(roomName: string) {
    try {
      return await this.roomService.listParticipants(roomName);
    } catch (error) {
      logger.error('Failed to get participants:', error);
      return [];
    }
  }

  async kickParticipant(roomName: string, participantId: string) {
    try {
      await this.roomService.removeParticipant(roomName, participantId);
      logger.info(`Kicked participant ${participantId} from ${roomName}`);
    } catch (error) {
      logger.error('Failed to kick participant:', error);
      throw error;
    }
  }

  async muteParticipant(roomName: string, participantId: string, trackSid: string) {
    try {
      await this.roomService.mutePublishedTrack(roomName, participantId, trackSid, true);
      logger.info(`Muted track ${trackSid} for ${participantId}`);
    } catch (error) {
      logger.error('Failed to mute participant:', error);
      throw error;
    }
  }

  async deleteRoom(roomName: string) {
    try {
      await this.roomService.deleteRoom(roomName);
      logger.info(`LiveKit room deleted: ${roomName}`);
    } catch (error) {
      logger.error('Failed to delete room:', error);
    }
  }

  async listRooms() {
    try {
      return await this.roomService.listRooms();
    } catch (error) {
      logger.error('Failed to list rooms:', error);
      return [];
    }
  }

  // ─── Ingress for RTMP/OBS ─────────────────────────────────────────────

  generateRtmpIngress(streamId: string) {
    // Returns the RTMP URL and stream key for OBS/external encoders
    const rtmpUrl = `rtmp://${process.env.VPS_HOST || 'localhost'}/live`;
    const streamKey = `${streamId}-obs`;

    return {
      rtmpUrl,
      streamKey,
      fullUrl: `${rtmpUrl}/${streamKey}`,
      obsServerUrl: rtmpUrl,
      obsStreamKey: streamKey,
    };
  }
}

export const liveKitService = new LiveKitService();
