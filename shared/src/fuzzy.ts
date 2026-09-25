export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

export function normalizeWord(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strips English plural endings from each word ("berries" -> "berry", "boxes" -> "box"). */
export function singularize(input: string): string {
  return input
    .split(' ')
    .map((word) => {
      if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
      if (word.length > 4 && /(ss|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
      if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
      return word;
    })
    .join(' ');
}

/**
 * Case-insensitive, trimmed, plural-insensitive match allowing one typo.
 * Answers of three letters or fewer must match exactly, otherwise "cat"
 * would accept "car", "hat", "bat", ... and the Faker could brute-force it.
 */
export function isGuessCorrect(guess: string, answer: string): boolean {
  const g = singularize(normalizeWord(guess)).replace(/ /g, '');
  const a = singularize(normalizeWord(answer)).replace(/ /g, '');
  if (g.length === 0) return false;
  if (a.length <= 3) return g === a;
  return levenshtein(g, a) <= 1;
}
