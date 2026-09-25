/** Logical canvas resolution. All stroke coordinates live in this space. */
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

/** Round scoring. Tweak freely; server and client both read from here. */
export const SCORING = {
  fakerUncaught: 3,
  wrongVoter: 0,
  correctVoterCaught: 2,
  fakerCaught: 0,
  fakerSteal: 2,
  correctVoterWhenStolen: 1,
  /** Awarded to the earliest correct voter, whatever the outcome. */
  speedBonus: 1,
} as const;

export const PLAYER_LIMITS = {
  minToStart: 4,
  /** Below this many players mid-game, the game ends with results so far. */
  minInGame: 3,
  max: 10,
} as const;

export const TIMINGS = {
  roleRevealMs: 5_000,
  galleryMs: 15_000,
  lastChanceMs: 15_000,
  roundResultsMs: 10_000,
  revealBaseMs: 5_000,
  revealPerVoteMs: 900,
  reconnectGraceMs: 60_000,
  roomIdleMs: 30 * 60 * 1000,
  cleanupIntervalMs: 60_000,
  strokeBatchMs: 30,
  /** Replay collapses idle gaps longer than this so the gallery stays snappy. */
  replayMaxGapMs: 350,
} as const;

export const DRAW = {
  /** Brush diameters in logical pixels: small / medium / large. */
  brushSizes: [4, 10, 22] as const,
  eraserSizeMultiplier: 2.2,
  maxUndos: 3,
  maxPointsPerBatch: 120,
  maxPointsPerStroke: 2_000,
  maxStrokesPerPlayer: 400,
  maxPointsPerPlayerRound: 15_000,
  /** Total brush path length (logical px) per round when the ink limit is on. */
  inkLimit: 9_000,
  /** Points closer than this to the previous one are dropped client-side. */
  minPointDistance: 1.5,
} as const;

export const SETTINGS_BOUNDS = {
  rounds: { min: 3, max: 10 },
  drawTimeSec: { min: 20, max: 60 },
  voteTimeSec: { min: 10, max: 40 },
  maxPlayers: { min: PLAYER_LIMITS.minToStart, max: PLAYER_LIMITS.max },
} as const;

export const TEXT_LIMITS = {
  nameMax: 16,
  chatMax: 200,
  wordMax: 24,
  guessMax: 40,
  customPairsMax: 50,
  chatHistory: 60,
} as const;

export const ROOM_CODE_LENGTH = 6;
/** No 0/O/1/I to keep codes readable aloud. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const REACTION_EMOJIS = ['😂', '🔥', '🤔', '😱', '👏', '🦊', '💀', '❤️'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

/** Token buckets per socket: capacity = burst, refillPerSec = sustained rate. */
export const RATE_LIMITS = {
  stroke: { capacity: 90, refillPerSec: 60 },
  chat: { capacity: 5, refillPerSec: 0.6 },
  reaction: { capacity: 8, refillPerSec: 3 },
  default: { capacity: 20, refillPerSec: 6 },
} as const;
export type RateLimitBucket = keyof typeof RATE_LIMITS;
