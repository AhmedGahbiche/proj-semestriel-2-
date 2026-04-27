import type http from 'http';
import { Server } from 'socket.io';

let io: Server | null = null;

export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.on('connection', (socket) => {
    socket.on('subscribe', (payload: { deviceId?: string } = {}) => {
      if (payload.deviceId) socket.join(`device:${payload.deviceId}`);
    });
  });

  return io;
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
