import { z } from 'zod';
import { AVATAR_IDS } from './avatars.js';
import { CATEGORY_IDS } from './categories.js';
import {
  DRAW,
  REACTION_EMOJIS,
  ROOM_CODE_LENGTH,
  SETTINGS_BOUNDS,
  TEXT_LIMITS,
} from './constants.js';

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const nameSchema = trimmed(TEXT_LIMITS.nameMax);
export const avatarSchema = z.enum(AVATAR_IDS);
export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(ROOM_CODE_LENGTH)
  .regex(/^[A-Z0-9]+$/);

export const createRoomSchema = z.object({
  name: nameSchema,
  avatar: avatarSchema,
});
export type CreateRoomPayload = z.infer<typeof createRoomSchema>;

export const joinRoomSchema = z.object({
  code: roomCodeSchema,
  name: nameSchema,
  avatar: avatarSchema,
});
export type JoinRoomPayload = z.infer<typeof joinRoomSchema>;

export const rejoinSchema = z.object({
  code: roomCodeSchema,
  token: z.string().min(16).max(64),
  /** true when the token came from this very tab (safe to replace an old socket). */
  takeover: z.boolean(),
});
export type RejoinPayload = z.infer<typeof rejoinSchema>;

export const readySchema = z.object({ ready: z.boolean() });
export type ReadyPayload = z.infer<typeof readySchema>;

export const customPairSchema = z
  .object({
    real: trimmed(TEXT_LIMITS.wordMax),
    fake: trimmed(TEXT_LIMITS.wordMax),
  })
  .refine((pair) => pair.real.toLowerCase() !== pair.fake.toLowerCase(), {
    message: 'The two words must be different',
  });

const intIn = (bounds: { min: number; max: number }) => z.number().int().min(bounds.min).max(bounds.max);

export const settingsPatchSchema = z
  .object({
    rounds: intIn(SETTINGS_BOUNDS.rounds),
    drawTimeSec: intIn(SETTINGS_BOUNDS.drawTimeSec),
    voteTimeSec: intIn(SETTINGS_BOUNDS.voteTimeSec),
    categories: z.array(z.enum(CATEGORY_IDS)).max(CATEGORY_IDS.length),
    difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']),
    fakerKnows: z.boolean(),
    inkLimit: z.boolean(),
    blindDraw: z.boolean(),
    maxPlayers: intIn(SETTINGS_BOUNDS.maxPlayers),
    customPairs: z.array(customPairSchema).max(TEXT_LIMITS.customPairsMax),
    isPublic: z.boolean(),
  })
  .partial()
  .strict();
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

export const kickSchema = z.object({ playerId: z.string().min(1).max(64) });
export type KickPayload = z.infer<typeof kickSchema>;

export const chatSchema = z.object({ text: trimmed(TEXT_LIMITS.chatMax) });
export type ChatPayload = z.infer<typeof chatSchema>;

const pointSchema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().min(0).max(1),
  z.number().min(0).max(120_000),
]);

export const strokeBatchSchema = z.object({
  strokeId: z.string().min(3).max(80),
  tool: z.enum(['brush', 'eraser']),
  sizeIndex: z
    .number()
    .int()
    .min(0)
    .max(DRAW.brushSizes.length - 1),
  points: z.array(pointSchema).max(DRAW.maxPointsPerBatch),
  done: z.boolean(),
});

export const reactSchema = z.object({
  emoji: z.enum(REACTION_EMOJIS),
  targetId: z.string().min(1).max(64).nullable(),
});
export type ReactPayload = z.infer<typeof reactSchema>;

export const castVoteSchema = z.object({ targetId: z.string().min(1).max(64) });
export type CastVotePayload = z.infer<typeof castVoteSchema>;

export const fakerGuessSchema = z.object({ guess: trimmed(TEXT_LIMITS.guessMax) });
export type FakerGuessPayload = z.infer<typeof fakerGuessSchema>;
