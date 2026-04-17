import { prisma } from '../server';
import { logger } from '../config/logger';

function randomPassword(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function randomRoomName(): string {
  return 'room-' + Math.random().toString(36).slice(2, 10);
}

class VDONinjaService {
  private baseUrl = 'https://vdo.ninja';

  generateInviteLink(roomName: string, password: string, role: 'director' | 'guest'): string {
    const params = new URLSearchParams({ room: roomName, password });

    if (role === 'director') {
      params.set('director', '1');
      return `${this.baseUrl}/?${params.toString()}`;
    }

    return `${this.baseUrl}/?${params.toString()}&push`;
  }

  async createRoom(streamId: string) {
    const existing = await prisma.vdoRoom.findUnique({ where: { streamId } });
    if (existing) return existing;

    const roomName = randomRoomName();
    const password = randomPassword();
    const directorUrl = this.generateInviteLink(roomName, password, 'director');
    const guestUrl = this.generateInviteLink(roomName, password, 'guest');

    const room = await prisma.vdoRoom.create({
      data: {
        streamId,
        roomName,
        password,
        directorUrl,
        guestUrl,
      },
    });

    logger.info(`VDO.Ninja room created: ${roomName}`);
    return room;
  }

  async addParticipant(roomId: string, name: string, role: string = 'guest') {
    const room = await prisma.vdoRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new Error('Room not found');

    const viewId = 'view-' + Math.random().toString(36).slice(2, 10);

    const participant = await prisma.vdoParticipant.create({
      data: {
        roomId,
        viewId,
        name,
        role,
        isActive: true,
      },
    });

    return participant;
  }

  async removeParticipant(id: string) {
    const participant = await prisma.vdoParticipant.update({
      where: { id },
      data: { isActive: false, leftAt: new Date() },
    });
    return participant;
  }

  async getRoom(id: string) {
    return prisma.vdoRoom.findUnique({
      where: { id },
      include: { participants: { where: { isActive: true } } },
    });
  }

  async getRoomByStreamId(streamId: string) {
    return prisma.vdoRoom.findUnique({
      where: { streamId },
      include: { participants: { where: { isActive: true } } },
    });
  }

  async getRoomStats(roomId: string) {
    const room = await prisma.vdoRoom.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });

    if (!room) throw new Error('Room not found');

    const activeParticipants = room.participants.filter((p) => p.isActive);
    return {
      roomId,
      roomName: room.roomName,
      totalParticipants: room.participants.length,
      activeParticipants: activeParticipants.length,
      participants: activeParticipants,
    };
  }
}

export const vdoNinjaService = new VDONinjaService();
