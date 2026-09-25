import type {
  AvatarId,
  ClientToServerEvents,
  ErrorCode,
  InterServerEvents,
  LastChanceInfo,
  RevealInfo,
  ServerToClientEvents,
  SocketData,
  Stroke,
} from '@bluffsketch/shared';
import type { Server, Socket } from 'socket.io';
import type { PlayerStats } from '../game/awards.js';
import type { ChosenPair } from '../game/wordBank.js';
import type { StrokeStore } from '../game/strokeStore.js';

export type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export interface ServerPlayer {
  id: string;
  token: string;
  name: string;
  avatar: AvatarId;
  colorIndex: number;
  isReady: boolean;
  socketId: string | null;
  connected: boolean;
  score: number;
  stats: PlayerStats;
  removalTimer: NodeJS.Timeout | null;
}

export interface StoredVote {
  targetId: string;
  elapsedMs: number;
}

export interface RoundState {
  number: number;
  pair: ChosenPair;
  fakerId: string;
  strokes: StrokeStore;
  drawingStartedAt: number;
  votingStartedAt: number;
  votes: Map<string, StoredVote>;
  undosUsed: Map<string, number>;
  reactions: number;
  reveal: RevealInfo | null;
  lastChance: LastChanceInfo | null;
}

export interface RoundArchive {
  round: number;
  realWord: string;
  strokes: Stroke[];
  reactions: number;
}

export class RoomError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RoomError';
  }
}
