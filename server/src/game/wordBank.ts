import { readFileSync } from 'node:fs';
import { z } from 'zod';
import {
  CATEGORIES,
  CATEGORY_IDS,
  CUSTOM_CATEGORY_LABEL,
  type GameSettings,
  type WordPair,
} from '@bluffsketch/shared';
import { pickRandom } from '../utils/random.js';

const wordPairSchema = z.object({
  category: z.enum(CATEGORY_IDS),
  real: z.string().min(1),
  fake: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

// Resolves to server/data from both src/game (tsx) and dist/game (node).
const DATA_URL = new URL('../../data/wordPairs.json', import.meta.url);

export const WORD_PAIRS: readonly WordPair[] = z
  .array(wordPairSchema)
  .parse(JSON.parse(readFileSync(DATA_URL, 'utf8')));

export interface ChosenPair {
  key: string;
  real: string;
  fake: string;
  categoryLabel: string;
}

const keyOf = (real: string, fake: string) => `${real.toLowerCase()}|${fake.toLowerCase()}`;

function fromBuiltIn(pair: WordPair): ChosenPair {
  return {
    key: keyOf(pair.real, pair.fake),
    real: pair.real,
    fake: pair.fake,
    categoryLabel: CATEGORIES[pair.category].label,
  };
}

/**
 * Picks a pair the session has not seen yet. Host-supplied pairs go first
 * (a host who bothered to type them wants them played), then the built-in
 * pool filtered by settings. If the filters leave nothing unused we widen
 * the pool step by step rather than repeating a pair.
 */
export function pickPair(settings: GameSettings, used: ReadonlySet<string>): ChosenPair {
  const custom = settings.customPairs
    .map((pair) => ({
      key: keyOf(pair.real, pair.fake),
      real: pair.real,
      fake: pair.fake,
      categoryLabel: CUSTOM_CATEGORY_LABEL,
    }))
    .filter((pair) => !used.has(pair.key));
  if (custom.length > 0) return pickRandom(custom);

  const categories = settings.categories.length > 0 ? settings.categories : CATEGORY_IDS;
  const unused = (pairs: readonly WordPair[]) =>
    pairs.map(fromBuiltIn).filter((pair) => !used.has(pair.key));

  const tiers: readonly (readonly WordPair[])[] = [
    WORD_PAIRS.filter(
      (pair) =>
        categories.includes(pair.category) &&
        (settings.difficulty === 'mixed' || pair.difficulty === settings.difficulty),
    ),
    WORD_PAIRS.filter((pair) => categories.includes(pair.category)),
    WORD_PAIRS,
  ];
  for (const tier of tiers) {
    const candidates = unused(tier);
    if (candidates.length > 0) return pickRandom(candidates);
  }
  // Only reachable after 300+ rounds in one session.
  return fromBuiltIn(pickRandom(WORD_PAIRS));
}
