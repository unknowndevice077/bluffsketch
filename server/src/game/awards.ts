import type { Award, AwardId } from '@bluffsketch/shared';

export interface PlayerStats {
  timesFaker: number;
  /** Rounds as Faker that ended uncaught or with a stolen win. */
  fakerSuccesses: number;
  correctVotes: number;
  votesReceivedAsInnocent: number;
  reactionsReceived: number;
  voteTimesMs: number[];
}

export function emptyStats(): PlayerStats {
  return {
    timesFaker: 0,
    fakerSuccesses: 0,
    correctVotes: 0,
    votesReceivedAsInnocent: 0,
    reactionsReceived: 0,
    voteTimesMs: [],
  };
}

export interface AwardCandidate {
  playerId: string;
  score: number;
  stats: PlayerStats;
}

interface AwardRule {
  id: AwardId;
  title: string;
  emoji: string;
  description: string;
  /** Higher is better; return null to exclude the player. */
  metric: (stats: PlayerStats) => number | null;
  detail: (value: number) => string;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const average = (values: readonly number[]) =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

const RULES: readonly AwardRule[] = [
  {
    id: 'masterBluffer',
    title: 'Master Bluffer',
    emoji: '🦊',
    description: 'Most successful rounds as the Faker',
    metric: (s) => (s.fakerSuccesses > 0 ? s.fakerSuccesses : null),
    detail: (v) => plural(v, 'clean getaway'),
  },
  {
    id: 'bloodhound',
    title: 'Bloodhound',
    emoji: '🐶',
    description: 'Sniffed out the Faker the most',
    metric: (s) => (s.correctVotes > 0 ? s.correctVotes : null),
    detail: (v) => plural(v, 'correct vote'),
  },
  {
    id: 'picasso',
    title: 'Picasso',
    emoji: '🎨',
    description: 'Most reactions received in the gallery',
    metric: (s) => (s.reactionsReceived > 0 ? s.reactionsReceived : null),
    detail: (v) => plural(v, 'reaction'),
  },
  {
    id: 'scribbleDisaster',
    title: 'Scribble Disaster',
    emoji: '🌀',
    description: 'Innocent, yet looked the guiltiest',
    metric: (s) => (s.votesReceivedAsInnocent > 0 ? s.votesReceivedAsInnocent : null),
    detail: (v) => `${plural(v, 'vote')} while innocent`,
  },
  {
    id: 'speedDemon',
    title: 'Speed Demon',
    emoji: '⚡',
    description: 'Fastest average vote',
    // Negated so "higher is better" still holds.
    metric: (s) => {
      const avg = average(s.voteTimesMs);
      return avg === null ? null : -avg;
    },
    detail: (v) => `${(-v / 1000).toFixed(1)}s average`,
  },
];

export function computeAwards(candidates: readonly AwardCandidate[]): Award[] {
  const awards: Award[] = [];
  for (const rule of RULES) {
    let best: { candidate: AwardCandidate; value: number } | null = null;
    for (const candidate of candidates) {
      const value = rule.metric(candidate.stats);
      if (value === null) continue;
      if (!best || value > best.value || (value === best.value && candidate.score > best.candidate.score)) {
        best = { candidate, value };
      }
    }
    if (best) {
      awards.push({
        id: rule.id,
        title: rule.title,
        emoji: rule.emoji,
        description: rule.description,
        playerId: best.candidate.playerId,
        detail: rule.detail(best.value),
      });
    }
  }
  return awards;
}
