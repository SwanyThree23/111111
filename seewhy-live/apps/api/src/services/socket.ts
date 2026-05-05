import { Server as SocketServer } from 'socket.io';

let _io: SocketServer;

export function setIO(io: SocketServer): void {
  _io = io;
}

export function getIO(): SocketServer {
  if (!_io) throw new Error('Socket.io not initialized');
  return _io;
}
