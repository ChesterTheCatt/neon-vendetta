import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = () => {
  if (typeof window === 'undefined') {
    return {
      on: () => {},
      off: () => {},
      emit: () => {},
    } as any;
  }
  if (!socket) {
    socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};
