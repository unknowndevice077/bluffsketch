/**
 * Small, deliberately conservative blocklist. Matching happens on a
 * leetspeak-normalised copy of the text so "sh1t" and "$hit" are caught,
 * but only whole words are masked, so "Scunthorpe" and "classic" survive.
 */
const BLOCKED_WORDS = [
  'anal',
  'anus',
  'arse',
  'arsehole',
  'ass',
  'asshole',
  'bastard',
  'bitch',
  'bitches',
  'bollocks',
  'boner',
  'bullshit',
  'clit',
  'cock',
  'cocks',
  'coon',
  'crap',
  'cum',
  'cunt',
  'cunts',
  'damn',
  'dick',
  'dickhead',
  'dildo',
  'douche',
  'fag',
  'faggot',
  'fuck',
  'fucked',
  'fucker',
  'fucking',
  'fucks',
  'goddamn',
  'hitler',
  'jizz',
  'kike',
  'motherfucker',
  'nazi',
  'nigga',
  'nigger',
  'penis',
  'piss',
  'porn',
  'prick',
  'pussy',
  'rape',
  'rapist',
  'retard',
  'retarded',
  'shit',
  'shitty',
  'slut',
  'spic',
  'tits',
  'twat',
  'vagina',
  'wank',
  'wanker',
  'whore',
];

const BLOCKED = new Set(BLOCKED_WORDS);

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
  '!': 'i',
  '+': 't',
};

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .split('')
    .map((ch) => LEET[ch] ?? ch)
    .join('')
    .replace(/[^a-z]/g, '')
    // Collapse stretched letters: "fuuuuck" -> "fuck".
    .replace(/(.)\1{2,}/g, '$1');
}

function isBlocked(token: string): boolean {
  const normalized = normalizeToken(token);
  if (normalized.length < 3) return false;
  if (BLOCKED.has(normalized)) return true;
  // Also catch a doubled letter collapsed once more ("fuuck" -> "fuck").
  return BLOCKED.has(normalized.replace(/(.)\1+/g, '$1'));
}

export function containsProfanity(text: string): boolean {
  return text.split(/\s+/).some(isBlocked);
}

/** Replaces each blocked word with asterisks, keeping whitespace and length. */
export function cleanText(text: string): string {
  return text.replace(/\S+/g, (token) => (isBlocked(token) ? '*'.repeat(token.length) : token));
}
