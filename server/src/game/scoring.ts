import { SCORING, type Standing, type VoteRecord } from '@bluffsketch/shared';

export function tallyVotes(votes: readonly VoteRecord[]): Map<string, number> {
  const tally = new Map<string, number>();
  for (const vote of votes) tally.set(vote.targetId, (tally.get(vote.targetId) ?? 0) + 1);
  return tally;
}

/** Caught = the Faker has strictly more votes than anyone else. Ties let the Faker escape. */
export function isFakerCaught(votes: readonly VoteRecord[], fakerId: string): boolean {
  const tally = tallyVotes(votes);
  const fakerVotes = tally.get(fakerId) ?? 0;
  if (fakerVotes === 0) return false;
  for (const [playerId, count] of tally) {
    if (playerId !== fakerId && count >= fakerVotes) return false;
  }
  return true;
}

export interface RoundScoreInput {
  playerIds: readonly string[];
  fakerId: string;
  /** Must be sorted by elapsedMs ascending. */
  votes: readonly VoteRecord[];
  caught: boolean;
  stolen: boolean;
}

export interface RoundScore {
  deltas: Record<string, number>;
  speedBonusPlayerId: string | null;
}

export function scoreRound({ playerIds, fakerId, votes, caught, stolen }: RoundScoreInput): RoundScore {
  const deltas: Record<string, number> = Object.fromEntries(playerIds.map((id) => [id, 0]));
  const add = (id: string, points: number) => {
    if (id in deltas) deltas[id] += points;
  };
  const correctVoters = votes.filter((vote) => vote.targetId === fakerId).map((vote) => vote.voterId);

  if (!caught) {
    add(fakerId, SCORING.fakerUncaught);
    for (const vote of votes) if (vote.targetId !== fakerId) add(vote.voterId, SCORING.wrongVoter);
  } else if (stolen) {
    add(fakerId, SCORING.fakerSteal);
    for (const id of correctVoters) add(id, SCORING.correctVoterWhenStolen);
  } else {
    add(fakerId, SCORING.fakerCaught);
    for (const id of correctVoters) add(id, SCORING.correctVoterCaught);
  }

  const speedBonusPlayerId = correctVoters.find((id) => id in deltas) ?? null;
  if (speedBonusPlayerId) add(speedBonusPlayerId, SCORING.speedBonus);

  return { deltas, speedBonusPlayerId };
}

/** Standard competition ranking: 1, 2, 2, 4. */
export function toStandings(scores: readonly { playerId: string; score: number }[]): Standing[] {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  return sorted.map((entry, index) => {
    const firstWithScore = sorted.findIndex((other) => other.score === entry.score);
    return { playerId: entry.playerId, score: entry.score, rank: (firstWithScore === -1 ? index : firstWithScore) + 1 };
  });
}
