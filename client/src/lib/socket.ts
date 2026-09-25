import type { ClientToServerEvents, ServerToClientEvents } from '@bluffsketch/shared';
import { io, type Socket } from 'socket.io-client';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL?.trim();

const options = {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnectionDelay: 500,
  reconnectionDelayMax: 4_000,
};

/** One socket for the whole app. Empty VITE_SERVER_URL = same origin (dev proxy / single container). */
export const socket: GameSocket = SERVER_URL ? io(SERVER_URL, options) : io(options);

export const ACK_TIMEOUT_MS = 6_000;
