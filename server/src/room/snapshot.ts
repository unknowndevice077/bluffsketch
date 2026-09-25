import { DRAW, type Phase, type PublicPlayer, type RoomSnapshot, type YouView } from '@bluffsketch/shared';
import type { Room } from './Room.js';
import type { ServerPlayer } from './types.js';

/** Phases where the current round's words are shown to players. */
const WORD_PHASES: ReadonlySet<Phase> = new Set([
  'ROLE_REVEAL',
  'DRAWING',
  'GALLERY_REVIEW',
  'VOTING',
  'REVEAL',
  'FAKER_LAST_CHANCE',
  'ROUND_RESULTS',
]);
/** Phases where the Faker's identity is public. */
const REVEALED_PHASES: ReadonlySet<Phase> = new Set(['REVEAL', 'FAKER_LAST_CHANCE', 'ROUND_RESULTS']);

function buildYou(room: Room, player: ServerPlayer): YouView {
  const round = room.round && WORD_PHASES.has(room.phase) ? room.round : null;
  const isFakerPlayer = round?.fakerId === player.id;
  const identityKnown = REVEALED_PHASES.has(room.phase) || room.settings.fakerKnows;
  return {
    playerId: player.id,
    isHost: room.hostId === player.id,
    word: round ? (isFakerPlayer ? round.pair.fake : round.pair.real) : null,
    isFaker: round && identityKnown ? isFakerPlayer : null,
    myVoteId: round?.votes.get(player.id)?.targetId ?? null,
    undosLeft: DRAW.maxUndos - (round?.undosUsed.get(player.id) ?? 0),
    inkUsed: round ? Math.round(round.strokes.inkUsed(player.id)) : 0,
    inkLimit: room.settings.inkLimit ? DRAW.inkLimit : null,
    canGuess:
      room.phase === 'FAKER_LAST_CHANCE' && isFakerPlayer && round?.lastChance?.guess === null,
  };
}

/**
 * Builds the state one specific player is allowed to see. Secrets (the
 * words, the Faker's identity, custom pairs) are filtered here and nowhere
 * else, so a broadcast can never leak them.
 */
export function buildSnapshot(room: Room, recipient: ServerPlayer): RoomSnapshot {
  const round = room.round;
  const isHost = room.hostId === recipient.id;
  const voting = room.phase === 'VOTING' && round !== null;

  const players: PublicPlayer[] = [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    colorIndex: p.colorIndex,
    isHost: p.id === room.hostId,
    isReady: p.isReady,
    connected: p.connected,
    score: p.score,
    hasVoted: voting ? round.votes.has(p.id) : false,
  }));

  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    phaseStartedAt: room.phaseStartedAt,
    phaseEndsAt: room.phaseEndsAt,
    serverNow: Date.now(),
    round: room.roundNumber,
    totalRounds: room.settings.rounds,
    settings: { ...room.settings, customPairs: isHost ? room.settings.customPairs : [] },
    customPairCount: room.settings.customPairs.length,
    players,
    categoryLabel: round && WORD_PHASES.has(room.phase) ? round.pair.categoryLabel : null,
    voteProgress: voting
      ? { voted: round.votes.size, total: players.filter((p) => p.connected).length }
      : null,
    reveal: round && REVEALED_PHASES.has(room.phase) ? round.reveal : null,
    lastChance: round && REVEALED_PHASES.has(room.phase) ? round.lastChance : null,
    roundResult: room.phase === 'ROUND_RESULTS' ? room.roundResult : null,
    finalResults: room.phase === 'FINAL_RESULTS' ? room.finalResults : null,
    chatEnabled: room.chatEnabled,
    you: buildYou(room, recipient),
  };
}
