import { CATEGORY_IDS } from './categories.js';
import { PLAYER_LIMITS } from './constants.js';
import type { GameSettings } from './types.js';

export const DEFAULT_SETTINGS: GameSettings = {
  rounds: 5,
  drawTimeSec: 30,
  voteTimeSec: 20,
  categories: [...CATEGORY_IDS],
  difficulty: 'mixed',
  fakerKnows: false,
  inkLimit: false,
  blindDraw: false,
  maxPlayers: PLAYER_LIMITS.max,
  customPairs: [],
  isPublic: false,
};
