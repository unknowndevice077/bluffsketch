import type {
  AckResponse,
  BestDrawing,
  ChatMessage,
  JoinedRoomData,
  Notice,
  PublicRoomInfo,
  Reaction,
  RoomSnapshot,
  Stroke,
  StrokeBatchPayload,
  StrokeBroadcast,
} from './types.js';
import type {
  CastVotePayload,
  ChatPayload,
  CreateRoomPayload,
  FakerGuessPayload,
  JoinRoomPayload,
  KickPayload,
  ReactPayload,
  ReadyPayload,
  RejoinPayload,
  SettingsPatch,
} from './schemas.js';

type Ack<T> = (response: AckResponse<T>) => void;

/** Every event a client may send. Payloads are re-validated with zod on the server. */
export interface ClientToServerEvents {
  /** NTP-style clock sync; the client measures round-trip time itself. */
  'time:sync': (ack: (response: { serverNow: number }) => void) => void;

  'room:create': (payload: CreateRoomPayload, ack: Ack<JoinedRoomData>) => void;
  'room:join': (payload: JoinRoomPayload, ack: Ack<JoinedRoomData>) => void;
  'room:rejoin': (payload: RejoinPayload, ack: Ack<JoinedRoomData>) => void;
  'room:leave': () => void;
  'rooms:listPublic': (ack: Ack<PublicRoomInfo[]>) => void;

  'lobby:ready': (payload: ReadyPayload) => void;
  'lobby:settings': (payload: SettingsPatch, ack: Ack<null>) => void;
  'lobby:kick': (payload: KickPayload) => void;
  'lobby:start': (ack: Ack<null>) => void;

  'chat:send': (payload: ChatPayload) => void;

  'stroke:batch': (payload: StrokeBatchPayload) => void;
  'stroke:undo': () => void;
  'stroke:clear': () => void;

  'gallery:react': (payload: ReactPayload) => void;
  'vote:cast': (payload: CastVotePayload, ack: Ack<null>) => void;
  'faker:guess': (payload: FakerGuessPayload, ack: Ack<null>) => void;

  'game:playAgain': () => void;
  'results:bestDrawing': (ack: Ack<BestDrawing | null>) => void;
}

/** Every event the server may send. */
export interface ServerToClientEvents {
  /** Full room state, personalised per recipient (see YouView). */
  'room:state': (state: RoomSnapshot) => void;
  'room:kicked': () => void;
  'room:notice': (notice: Notice) => void;

  'chat:history': (messages: ChatMessage[]) => void;
  'chat:message': (message: ChatMessage) => void;

  /** Live stroke data from other players (never echoed to the sender). */
  'stroke:batch': (batch: StrokeBroadcast) => void;
  /** The server refused a stroke of yours (timer over, ink out, bad payload). */
  'stroke:rejected': (payload: { strokeId: string }) => void;
  /** Undo / clear: remove these strokes everywhere. */
  'stroke:removed': (payload: { strokeIds: string[] }) => void;
  /** Authoritative full canvas for the current round (reconnects, blind-draw reveal). */
  'canvas:sync': (payload: { round: number; strokes: Stroke[] }) => void;

  'gallery:reaction': (reaction: Reaction) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  roomCode: string | null;
  playerId: string | null;
}
