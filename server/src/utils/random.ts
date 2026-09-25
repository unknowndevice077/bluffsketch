import { randomInt } from 'node:crypto';

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRandom<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error('pickRandom called with an empty list');
  return items[randomInt(items.length)];
}
