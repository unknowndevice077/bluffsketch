import type { AvatarId } from './avatars.js';
import type { CategoryId } from './categories.js';
import type { ReactionEmoji } from './constants.js';

export type Phase =
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'DRAWING'
  | 'GALLERY_REVIEW'
  | 'VOTING'
  | 'REVEAL'
  | 'FAKER_LAST_CHANCE'
  | 'ROUND_RESULTS'
  | 'FINAL_RESULTS';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type DifficultySetting = Difficulty | 'mixed';

export interface WordPair {
  category: CategoryId;
  real: string;
  fake: string;
  difficulty: Difficulty;
}

export interface CustomPair {
  real: string;
  fake: string;
}

export interface GameSettings {
  rounds: number;
  drawTimeSec: number;
  voteTimeSec: number;
  categories: CategoryId[];
  difficulty: DifficultySetting;
  fakerKnows: boolean;
  inkLimit: boolean;
  blindDraw: boolean;
  maxPlayers: number;
  customPairs: CustomPair[];
  isPublic: boolean;
}

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: AvatarId;
  colorIndex: number;
  isHost: boolean;
  isReady: boolean;
  connected: boolean;
  score: number;
  hasVoted: boolean;
}

export type StrokeTool = 'brush' | 'eraser';

/** [x, y, pressure 0..1, ms since stroke start]. Tuples keep payloads small. */
export type StrokePoint = [number, number, number, number];

export interface Stroke {
  /** `${playerId}:${clientSequence}` so ids are unique and owner-checkable. */
  id: string;
  playerId: string;
  colorIndex: number;
  tool: StrokeTool;
  sizeIndex: number;
  /** ms since the DRAWING phase began (server clock). */
  startedAt: number;
  points: StrokePoint[];
  done: boolean;
}

export interface StrokeBatchPayload {
  strokeId: string;
  tool: StrokeTool;
  sizeIndex: number;
  points: StrokePoint[];
  done: boolean;
}

export interface StrokeBroadcast extends StrokeBatchPayload {
  playerId: string;
  colorIndex: number;
  startedAt: number;
}

export interface VoteRecord {
  voterId: string;
  targetId: string;
  /** ms after voting opened. */
  elapsedMs: number;
}

export interface RevealInfo {
  /** Ordered by time cast, which is also the flip order. */
  votes: VoteRecord[];
  fakerId: string;
  caught: boolean;
  fakerWord: string;
  /** Hidden (null) while the caught Faker is still guessing it. */
  realWord: string | null;
}

export interface LastChanceInfo {
  guess: string | null;
  correct: boolean | null;
}

export interface Standing {
  playerId: string;
  score: number;
  rank: number;
}

export interface RoundResult {
  round: number;
  fakerId: string;
  realWord: string;
  fakerWord: string;
  categoryLabel: string;
  caught: boolean;
  stolen: boolean;
  /** True when the Faker left mid-round and nothing was scored. */
  voided: boolean;
  fakerGuess: string | null;
  deltas: Record<string, number>;
  speedBonusPlayerId: string | null;
  standingsBefore: Standing[];
  standingsAfter: Standing[];
}

export type AwardId = 'masterBluffer' | 'bloodhound' | 'picasso' | 'scribbleDisaster' | 'speedDemon';

export interface Award {
  id: AwardId;
  title: string;
  emoji: string;
  description: string;
  playerId: string;
  detail: string;
}

export interface FinalResults {
  standings: Standing[];
  awards: Award[];
  endedEarly: boolean;
  roundsPlayed: number;
  bestRound: number | null;
}

export interface BestDrawing {
  round: number;
  realWord: string;
  strokes: Stroke[];
  players: { id: string; name: string; colorIndex: number }[];
}

export interface ChatMessage {
  id: string;
  playerId: string | null;
  name: string;
  text: string;
  at: number;
  system: boolean;
}

export interface Reaction {
  id: string;
  playerId: string;
  emoji: ReactionEmoji;
  targetId: string | null;
}

/** The only place secrets appear; built separately for each player. */
export interface YouView {
  playerId: string;
  isHost: boolean;
  word: string | null;
  /** null = you have not been told (Faker-knows is off, or the round has not been revealed). */
  isFaker: boolean | null;
  myVoteId: string | null;
  undosLeft: number;
  inkUsed: number;
  inkLimit: number | null;
  canGuess: boolean;
}

export interface RoomSnapshot {
  code: string;
  hostId: string;
  phase: Phase;
  phaseStartedAt: number;
  phaseEndsAt: number | null;
  serverNow: number;
  round: number;
  totalRounds: number;
  /** Custom pairs are only sent to the host; everyone else just sees the count. */
  settings: GameSettings;
  customPairCount: number;
  players: PublicPlayer[];
  categoryLabel: string | null;
  voteProgress: { voted: number; total: number } | null;
  reveal: RevealInfo | null;
  lastChance: LastChanceInfo | null;
  roundResult: RoundResult | null;
  finalResults: FinalResults | null;
  chatEnabled: boolean;
  you: YouView;
}

export interface PublicRoomInfo {
  code: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
}

export interface JoinedRoomData {
  code: string;
  playerId: string;
  token: string;
}

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'IN_PROGRESS'
  | 'INVALID_PAYLOAD'
  | 'NOT_HOST'
  | 'NOT_ALLOWED'
  | 'RATE_LIMITED'
  | 'SESSION_EXPIRED'
  | 'SESSION_ACTIVE'
  | 'NOT_ENOUGH_PLAYERS'
  | 'NOT_IN_ROOM';

export type AckResponse<T> = { ok: true; data: T } | { ok: false; error: ErrorCode; message: string };

export type NoticeKind =
  | 'hostChanged'
  | 'gameEndedEarly'
  | 'playerLeft'
  | 'playerJoined'
  | 'roundVoided'
  | 'roomClosed';

export interface Notice {
  kind: NoticeKind;
  message: string;
}
