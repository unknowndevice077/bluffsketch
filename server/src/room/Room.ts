import {
  DEFAULT_SETTINGS,
  DRAW,
  PLAYER_LIMITS,
  TEXT_LIMITS,
  TIMINGS,
  cleanText,
  containsProfanity,
  isGuessCorrect,
  type AvatarId,
  type BestDrawing,
  type ChatMessage,
  type FinalResults,
  type GameSettings,
  type Notice,
  type Phase,
  type ReactPayload,
  type RoundResult,
  type SettingsPatch,
  type Standing,
  type StrokeBatchPayload,
  type VoteRecord,
} from '@bluffsketch/shared';
import { computeAwards, emptyStats } from '../game/awards.js';
import { FakerRotation } from '../game/fakerRotation.js';
import { isFakerCaught, scoreRound, toStandings } from '../game/scoring.js';
import { StrokeStore } from '../game/strokeStore.js';
import { pickPair } from '../game/wordBank.js';
import { makeId, makeToken } from '../utils/ids.js';
import { log } from '../utils/logger.js';
import { buildSnapshot } from './snapshot.js';
import { RoomError, type GameSocket, type IO, type RoundArchive, type RoundState, type ServerPlayer } from './types.js';

/** Phases during which a round is live and the Faker leaving voids it. */
const LIVE_ROUND_PHASES: ReadonlySet<Phase> = new Set([
  'ROLE_REVEAL',
  'DRAWING',
  'GALLERY_REVIEW',
  'VOTING',
  'REVEAL',
  'FAKER_LAST_CHANCE',
]);
const CHAT_PHASES: ReadonlySet<Phase> = new Set(['LOBBY', 'ROUND_RESULTS', 'FINAL_RESULTS']);
/** How long the Faker's guess result stays on screen before results. */
const GUESS_RESULT_MS = 3_500;

type RemovalReason = 'left' | 'timeout' | 'kicked';
type ArchiveEntry = RoundArchive & { players: BestDrawing['players'] };

export class Room {
  readonly channel: string;
  readonly players = new Map<string, ServerPlayer>();
  hostId = '';
  settings: GameSettings = { ...DEFAULT_SETTINGS, categories: [...DEFAULT_SETTINGS.categories], customPairs: [] };
  phase: Phase = 'LOBBY';
  phaseStartedAt = Date.now();
  phaseEndsAt: number | null = null;
  roundNumber = 0;
  round: RoundState | null = null;
  roundResult: RoundResult | null = null;
  finalResults: FinalResults | null = null;
  lastActivity = Date.now();

  private history: ArchiveEntry[] = [];
  private chat: ChatMessage[] = [];
  private readonly usedPairs = new Set<string>();
  private readonly rotation = new FakerRotation();
  private phaseTimer: NodeJS.Timeout | null = null;
  private stateQueued = false;
  private destroyed = false;

  constructor(
    private readonly io: IO,
    readonly code: string,
    private readonly onEmpty: (code: string) => void,
  ) {
    this.channel = `room:${code}`;
  }

  // ---------------------------------------------------------------- players

  join(name: string, avatar: AvatarId, socket: GameSocket): ServerPlayer {
    if (this.phase !== 'LOBBY') throw new RoomError('IN_PROGRESS', 'That game has already started.');
    if (this.players.size >= this.settings.maxPlayers) throw new RoomError('ROOM_FULL', 'That room is full.');

    const player: ServerPlayer = {
      id: makeId('p'),
      token: makeToken(),
      name: this.uniqueName(cleanText(name)),
      avatar,
      colorIndex: this.freeColorIndex(),
      isReady: false,
      socketId: null,
      connected: false,
      score: 0,
      stats: emptyStats(),
      removalTimer: null,
    };
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;

    this.bindSocket(player, socket);
    this.systemMessage(`${player.name} joined`);
    this.io.to(this.channel).except(socket.id).emit('room:notice', { kind: 'playerJoined', message: `${player.name} joined` });
    this.queueState();
    return player;
  }

  rejoin(token: string, socket: GameSocket, takeover: boolean): ServerPlayer {
    const player = [...this.players.values()].find((candidate) => candidate.token === token);
    if (!player) throw new RoomError('SESSION_EXPIRED', 'Your seat in that room has expired.');

    const previousSocket = player.socketId && player.socketId !== socket.id ? this.socketOf(player) : undefined;
    if (player.connected && previousSocket && !takeover) {
      throw new RoomError('SESSION_ACTIVE', 'That player is already connected in another tab.');
    }

    this.bindSocket(player, socket);
    if (previousSocket) {
      previousSocket.leave(this.channel);
      previousSocket.data = { roomCode: null, playerId: null };
      previousSocket.disconnect(true);
    }
    if (!this.players.get(this.hostId)?.connected) this.migrateHost();
    this.queueState();
    return player;
  }

  handleDisconnect(playerId: string, socketId: string): void {
    const player = this.players.get(playerId);
    if (!player || player.socketId !== socketId) return;
    player.connected = false;
    player.socketId = null;
    player.removalTimer = setTimeout(() => this.removePlayer(player.id, 'timeout'), TIMINGS.reconnectGraceMs);
    if (this.hostId === player.id) this.migrateHost();
    this.maybeEndVotingEarly();
    this.queueState();
  }

  leave(playerId: string): void {
    this.removePlayer(playerId, 'left');
  }

  kick(requesterId: string, targetId: string): void {
    this.requireHost(requesterId);
    this.requirePhase('LOBBY');
    if (targetId === requesterId) throw new RoomError('NOT_ALLOWED', 'You cannot kick yourself.');
    const target = this.players.get(targetId);
    if (!target) throw new RoomError('INVALID_PAYLOAD', 'No such player.');
    this.socketOf(target)?.emit('room:kicked');
    this.removePlayer(targetId, 'kicked');
  }

  private removePlayer(playerId: string, reason: RemovalReason): void {
    const player = this.players.get(playerId);
    if (!player || this.destroyed) return;
    if (player.removalTimer) clearTimeout(player.removalTimer);
    this.players.delete(playerId);

    const socket = this.socketOf(player);
    if (socket) {
      socket.leave(this.channel);
      socket.data = { roomCode: null, playerId: null };
    }

    const verb = reason === 'kicked' ? 'was removed by the host' : reason === 'timeout' ? 'disconnected' : 'left';
    this.systemMessage(`${player.name} ${verb}`);
    this.notify({ kind: 'playerLeft', message: `${player.name} ${verb}` });

    if (this.players.size === 0) {
      this.destroy();
      this.onEmpty(this.code);
      return;
    }
    if (this.hostId === playerId) this.migrateHost();

    if (!this.endGameIfTooFewPlayers()) {
      if (this.round && this.round.fakerId === playerId && LIVE_ROUND_PHASES.has(this.phase)) {
        this.notify({ kind: 'roundVoided', message: `The Faker (${player.name}) left, so this round does not count.` });
        this.finishRound(true);
      } else {
        this.maybeEndVotingEarly();
      }
    }
    this.queueState();
  }

  private bindSocket(player: ServerPlayer, socket: GameSocket): void {
    if (player.removalTimer) clearTimeout(player.removalTimer);
    player.removalTimer = null;
    player.socketId = socket.id;
    player.connected = true;
    socket.join(this.channel);
    socket.data = { roomCode: this.code, playerId: player.id };
    socket.emit('chat:history', this.chat);
    if (this.round) {
      const hideOthers = this.phase === 'DRAWING' && this.settings.blindDraw;
      const strokes = this.round.strokes.all().filter((s) => !hideOthers || s.playerId === player.id);
      socket.emit('canvas:sync', { round: this.round.number, strokes });
    }
  }

  private migrateHost(): void {
    const current = this.players.get(this.hostId);
    const next =
      [...this.players.values()].find((p) => p.connected && p.id !== this.hostId) ??
      (current ? undefined : [...this.players.values()][0]);
    if (!next) return;
    this.hostId = next.id;
    this.systemMessage(`${next.name} is now the host`);
    this.notify({ kind: 'hostChanged', message: `${next.name} is now the host` });
  }

  private uniqueName(base: string): string {
    const taken = new Set([...this.players.values()].map((p) => p.name.toLowerCase()));
    if (!taken.has(base.toLowerCase())) return base;
    for (let n = 2; ; n++) {
      const suffix = ` ${n}`;
      const candidate = `${base.slice(0, TEXT_LIMITS.nameMax - suffix.length)}${suffix}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }

  private freeColorIndex(): number {
    const used = new Set([...this.players.values()].map((p) => p.colorIndex));
    for (let i = 0; i < PLAYER_LIMITS.max; i++) if (!used.has(i)) return i;
    return 0;
  }

  // ------------------------------------------------------------------ lobby

  setReady(playerId: string, ready: boolean): void {
    this.requirePhase('LOBBY');
    this.requirePlayer(playerId).isReady = ready;
    this.queueState();
  }

  updateSettings(playerId: string, patch: SettingsPatch): void {
    this.requireHost(playerId);
    this.requirePhase('LOBBY');
    const next: GameSettings = { ...this.settings, ...patch };
    if (patch.categories) next.categories = [...new Set(patch.categories)];
    if (patch.customPairs) {
      next.customPairs = patch.customPairs
        .filter((pair) => !containsProfanity(pair.real) && !containsProfanity(pair.fake))
        .map((pair) => ({ real: pair.real.trim(), fake: pair.fake.trim() }));
    }
    next.maxPlayers = Math.max(next.maxPlayers, this.players.size);
    this.settings = next;
    this.queueState();
  }

  start(playerId: string): void {
    this.requireHost(playerId);
    this.requirePhase('LOBBY');
    const connected = [...this.players.values()].filter((p) => p.connected).length;
    if (connected < PLAYER_LIMITS.minToStart) {
      throw new RoomError('NOT_ENOUGH_PLAYERS', `You need at least ${PLAYER_LIMITS.minToStart} players to start.`);
    }
    for (const player of this.players.values()) {
      player.score = 0;
      player.stats = emptyStats();
    }
    this.history = [];
    this.roundNumber = 0;
    this.roundResult = null;
    this.finalResults = null;
    this.rotation.reset();
    this.systemMessage('The game has started. Chat is paused until the round results.');
    this.startRound();
  }

  playAgain(playerId: string): void {
    this.requireHost(playerId);
    this.requirePhase('FINAL_RESULTS');
    for (const player of this.players.values()) {
      player.score = 0;
      player.isReady = false;
      player.stats = emptyStats();
    }
    this.round = null;
    this.roundNumber = 0;
    this.roundResult = null;
    this.finalResults = null;
    this.history = [];
    this.rotation.reset();
    this.systemMessage('Back in the lobby. Same crew, new words!');
    this.setPhase('LOBBY', null);
  }

  // ------------------------------------------------------------ round flow

  private startRound(): void {
    const everyone = [...this.players.values()];
    const connected = everyone.filter((p) => p.connected).map((p) => p.id);
    const fakerId = this.rotation.next(connected.length > 0 ? connected : everyone.map((p) => p.id));
    const pair = pickPair(this.settings, this.usedPairs);
    this.usedPairs.add(pair.key);
    this.roundNumber += 1;
    this.round = {
      number: this.roundNumber,
      pair,
      fakerId,
      strokes: new StrokeStore(this.settings.inkLimit ? DRAW.inkLimit : null, this.settings.drawTimeSec * 1000),
      drawingStartedAt: 0,
      votingStartedAt: 0,
      votes: new Map(),
      undosUsed: new Map(),
      reactions: 0,
      reveal: null,
      lastChance: null,
    };
    this.requirePlayer(fakerId).stats.timesFaker += 1;
    this.roundResult = null;
    this.io.to(this.channel).emit('canvas:sync', { round: this.roundNumber, strokes: [] });
    log.debug('round started', { room: this.code, round: this.roundNumber });
    this.setPhase('ROLE_REVEAL', TIMINGS.roleRevealMs);
  }

  private setPhase(phase: Phase, durationMs: number | null): void {
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.phaseTimer = null;
    const now = Date.now();
    this.phase = phase;
    this.phaseStartedAt = now;
    this.phaseEndsAt = durationMs === null ? null : now + durationMs;
    if (durationMs !== null) this.phaseTimer = setTimeout(() => this.onPhaseTimeout(), durationMs);
    this.touch();
    this.queueState();
  }

  private onPhaseTimeout(): void {
    this.phaseTimer = null;
    const round = this.round;
    try {
      switch (this.phase) {
        case 'ROLE_REVEAL':
          if (!round) return;
          round.drawingStartedAt = Date.now();
          this.setPhase('DRAWING', this.settings.drawTimeSec * 1000);
          return;
        case 'DRAWING':
          this.endDrawing();
          return;
        case 'GALLERY_REVIEW':
          if (!round) return;
          round.votingStartedAt = Date.now();
          this.setPhase('VOTING', this.settings.voteTimeSec * 1000);
          return;
        case 'VOTING':
          this.endVoting();
          return;
        case 'REVEAL':
          if (round?.reveal?.caught) this.setPhase('FAKER_LAST_CHANCE', TIMINGS.lastChanceMs);
          else this.finishRound(false);
          return;
        case 'FAKER_LAST_CHANCE':
          this.finishRound(false);
          return;
        case 'ROUND_RESULTS':
          if (this.roundNumber >= this.settings.rounds) this.finishGame(false);
          else this.startRound();
          return;
        case 'LOBBY':
        case 'FINAL_RESULTS':
          return;
      }
    } catch (error) {
      log.error('phase transition failed', { room: this.code, phase: this.phase, error: String(error) });
    }
  }

  private endDrawing(): void {
    const round = this.round;
    if (!round) return;
    round.strokes.finishAll();
    // Authoritative copy for everyone: reveals blind-draw canvases and fixes any dropped packets.
    this.io.to(this.channel).emit('canvas:sync', { round: round.number, strokes: round.strokes.all() });
    this.setPhase('GALLERY_REVIEW', TIMINGS.galleryMs);
  }

  private sortedVotes(round: RoundState): VoteRecord[] {
    return [...round.votes]
      .map(([voterId, vote]) => ({ voterId, targetId: vote.targetId, elapsedMs: vote.elapsedMs }))
      .sort((a, b) => a.elapsedMs - b.elapsedMs);
  }

  private endVoting(): void {
    const round = this.round;
    if (!round) return;
    const votes = this.sortedVotes(round);
    const caught = isFakerCaught(votes, round.fakerId);
    round.reveal = {
      votes,
      fakerId: round.fakerId,
      caught,
      fakerWord: round.pair.fake,
      realWord: caught ? null : round.pair.real,
    };
    round.lastChance = caught ? { guess: null, correct: null } : null;
    this.setPhase('REVEAL', TIMINGS.revealBaseMs + TIMINGS.revealPerVoteMs * votes.length);
  }

  private maybeEndVotingEarly(): void {
    if (this.phase !== 'VOTING' || !this.round) return;
    const connected = [...this.players.values()].filter((p) => p.connected);
    const round = this.round;
    if (connected.length > 0 && connected.every((p) => round.votes.has(p.id))) this.endVoting();
  }

  private currentStandings(): Standing[] {
    return toStandings([...this.players.values()].map((p) => ({ playerId: p.id, score: p.score })));
  }

  private finishRound(voided: boolean): void {
    const round = this.round;
    if (!round) return;
    const standingsBefore = this.currentStandings();
    const votes = round.reveal?.votes ?? this.sortedVotes(round);
    const caught = round.reveal?.caught ?? false;
    const stolen = round.lastChance?.correct === true;
    let deltas: Record<string, number> = {};
    let speedBonusPlayerId: string | null = null;

    if (!voided) {
      const result = scoreRound({ playerIds: [...this.players.keys()], fakerId: round.fakerId, votes, caught, stolen });
      deltas = result.deltas;
      speedBonusPlayerId = result.speedBonusPlayerId;
      for (const [playerId, delta] of Object.entries(deltas)) {
        const player = this.players.get(playerId);
        if (player) player.score += delta;
      }
      const faker = this.players.get(round.fakerId);
      if (faker && (!caught || stolen)) faker.stats.fakerSuccesses += 1;
      for (const vote of votes) {
        const voter = this.players.get(vote.voterId);
        if (voter) {
          voter.stats.voteTimesMs.push(vote.elapsedMs);
          if (vote.targetId === round.fakerId) voter.stats.correctVotes += 1;
        }
        const target = this.players.get(vote.targetId);
        if (target && vote.targetId !== round.fakerId) target.stats.votesReceivedAsInnocent += 1;
      }
      this.history.push({
        round: round.number,
        realWord: round.pair.real,
        strokes: round.strokes.all(),
        reactions: round.reactions,
        players: [...this.players.values()].map((p) => ({ id: p.id, name: p.name, colorIndex: p.colorIndex })),
      });
    }

    if (round.reveal) round.reveal.realWord = round.pair.real;
    this.roundResult = {
      round: round.number,
      fakerId: round.fakerId,
      realWord: round.pair.real,
      fakerWord: round.pair.fake,
      categoryLabel: round.pair.categoryLabel,
      caught,
      stolen,
      voided,
      fakerGuess: round.lastChance?.guess ?? null,
      deltas,
      speedBonusPlayerId,
      standingsBefore,
      standingsAfter: this.currentStandings(),
    };
    this.setPhase('ROUND_RESULTS', TIMINGS.roundResultsMs);
  }

  private finishGame(endedEarly: boolean): void {
    const best = this.history.reduce<ArchiveEntry | null>((top, entry) => {
      if (!top) return entry;
      if (entry.reactions !== top.reactions) return entry.reactions > top.reactions ? entry : top;
      return entry.strokes.length > top.strokes.length ? entry : top;
    }, null);
    this.finalResults = {
      standings: this.currentStandings(),
      awards: computeAwards([...this.players.values()].map((p) => ({ playerId: p.id, score: p.score, stats: p.stats }))),
      endedEarly,
      roundsPlayed: this.history.length,
      bestRound: best?.round ?? null,
    };
    this.round = null;
    if (endedEarly) {
      this.notify({ kind: 'gameEndedEarly', message: 'Too few players left, so here are the results so far.' });
    }
    this.setPhase('FINAL_RESULTS', null);
  }

  /** Returns true if the game was ended. */
  private endGameIfTooFewPlayers(): boolean {
    if (this.phase === 'LOBBY' || this.phase === 'FINAL_RESULTS') return false;
    if (this.players.size >= PLAYER_LIMITS.minInGame) return false;
    this.finishGame(true);
    return true;
  }

  bestDrawing(): BestDrawing | null {
    const bestRound = this.finalResults?.bestRound;
    const entry = this.history.find((archive) => archive.round === bestRound);
    if (!entry) return null;
    return { round: entry.round, realWord: entry.realWord, strokes: entry.strokes, players: entry.players };
  }

  // ---------------------------------------------------------------- drawing

  strokeBatch(playerId: string, batch: StrokeBatchPayload): void {
    const round = this.round;
    const now = Date.now();
    if (this.phase !== 'DRAWING' || !round || (this.phaseEndsAt !== null && now > this.phaseEndsAt)) return;
    const player = this.requirePlayer(playerId);
    const result = round.strokes.addBatch(playerId, player.colorIndex, batch, now - round.drawingStartedAt);
    if (!result.ok) {
      if (result.isNewStroke && player.socketId) {
        this.io.to(player.socketId).emit('stroke:rejected', { strokeId: batch.strokeId });
      }
      log.debug('stroke rejected', { room: this.code, playerId, reason: result.reason });
      return;
    }
    if (!this.settings.blindDraw && player.socketId) {
      this.io.to(this.channel).except(player.socketId).emit('stroke:batch', result.broadcast);
    }
  }

  undo(playerId: string): void {
    this.requirePhase('DRAWING');
    const round = this.round;
    if (!round) return;
    const used = round.undosUsed.get(playerId) ?? 0;
    if (used >= DRAW.maxUndos) throw new RoomError('NOT_ALLOWED', 'No undos left this round.');
    const removed = round.strokes.removeLast(playerId);
    if (!removed) return;
    round.undosUsed.set(playerId, used + 1);
    this.io.to(this.channel).emit('stroke:removed', { strokeIds: [removed] });
    this.queueState();
  }

  clearOwn(playerId: string): void {
    this.requirePhase('DRAWING');
    const removed = this.round?.strokes.clear(playerId) ?? [];
    if (removed.length > 0) this.io.to(this.channel).emit('stroke:removed', { strokeIds: removed });
  }

  // ------------------------------------------------- gallery / vote / guess

  react(playerId: string, { emoji, targetId }: ReactPayload): void {
    this.requirePhase('GALLERY_REVIEW');
    this.requirePlayer(playerId);
    const round = this.round;
    if (!round) return;
    const target = targetId ? this.players.get(targetId) : undefined;
    if (target && target.id !== playerId) target.stats.reactionsReceived += 1;
    round.reactions += 1;
    this.io.to(this.channel).emit('gallery:reaction', {
      id: makeId('r'),
      playerId,
      emoji,
      targetId: target ? target.id : null,
    });
  }

  vote(playerId: string, targetId: string): void {
    this.requirePhase('VOTING');
    this.requirePlayer(playerId);
    const round = this.round;
    if (!round) return;
    if (targetId === playerId) throw new RoomError('NOT_ALLOWED', 'You cannot vote for yourself.');
    if (!this.players.has(targetId)) throw new RoomError('INVALID_PAYLOAD', 'That player is not here.');
    if (round.votes.has(playerId)) throw new RoomError('NOT_ALLOWED', 'Your vote is already locked in.');
    round.votes.set(playerId, { targetId, elapsedMs: Date.now() - round.votingStartedAt });
    this.queueState();
    this.maybeEndVotingEarly();
  }

  guess(playerId: string, text: string): void {
    this.requirePhase('FAKER_LAST_CHANCE');
    const round = this.round;
    if (!round || !round.lastChance || !round.reveal) return;
    if (round.fakerId !== playerId) throw new RoomError('NOT_ALLOWED', 'Only the Faker gets a last chance.');
    if (round.lastChance.guess !== null) throw new RoomError('NOT_ALLOWED', 'You already guessed.');
    round.lastChance = {
      guess: cleanText(text).slice(0, TEXT_LIMITS.guessMax),
      correct: isGuessCorrect(text, round.pair.real),
    };
    round.reveal.realWord = round.pair.real;
    this.setPhase('FAKER_LAST_CHANCE', GUESS_RESULT_MS);
  }

  // ------------------------------------------------------------------- chat

  get chatEnabled(): boolean {
    return CHAT_PHASES.has(this.phase);
  }

  sendChat(playerId: string, text: string): void {
    if (!this.chatEnabled) throw new RoomError('NOT_ALLOWED', 'Chat is paused during the round.');
    const player = this.requirePlayer(playerId);
    this.pushChat({
      id: makeId('m'),
      playerId,
      name: player.name,
      text: cleanText(text),
      at: Date.now(),
      system: false,
    });
  }

  private systemMessage(text: string): void {
    this.pushChat({ id: makeId('m'), playerId: null, name: 'Bluff Sketch', text, at: Date.now(), system: true });
  }

  private pushChat(message: ChatMessage): void {
    this.chat.push(message);
    if (this.chat.length > TEXT_LIMITS.chatHistory) this.chat.splice(0, this.chat.length - TEXT_LIMITS.chatHistory);
    this.io.to(this.channel).emit('chat:message', message);
  }

  // ---------------------------------------------------------------- helpers

  touch(): void {
    this.lastActivity = Date.now();
  }

  private notify(notice: Notice): void {
    this.io.to(this.channel).emit('room:notice', notice);
  }

  private socketOf(player: ServerPlayer): GameSocket | undefined {
    return player.socketId ? this.io.sockets.sockets.get(player.socketId) : undefined;
  }

  requirePlayer(playerId: string): ServerPlayer {
    const player = this.players.get(playerId);
    if (!player) throw new RoomError('NOT_IN_ROOM', 'You are not in this room.');
    return player;
  }

  private requireHost(playerId: string): void {
    this.requirePlayer(playerId);
    if (this.hostId !== playerId) throw new RoomError('NOT_HOST', 'Only the host can do that.');
  }

  private requirePhase(phase: Phase): void {
    if (this.phase !== phase) throw new RoomError('NOT_ALLOWED', 'That is not possible right now.');
  }

  /** Coalesces every change made in one tick into a single personalised broadcast. */
  queueState(): void {
    if (this.stateQueued || this.destroyed) return;
    this.stateQueued = true;
    setImmediate(() => {
      this.stateQueued = false;
      if (this.destroyed) return;
      for (const player of this.players.values()) {
        if (player.socketId) this.io.to(player.socketId).emit('room:state', buildSnapshot(this, player));
      }
    });
  }

  destroy(notice?: Notice): void {
    if (this.destroyed) return;
    if (notice) this.notify(notice);
    this.destroyed = true;
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    for (const player of this.players.values()) {
      if (player.removalTimer) clearTimeout(player.removalTimer);
      const socket = this.socketOf(player);
      if (socket) {
        socket.leave(this.channel);
        socket.data = { roomCode: null, playerId: null };
      }
    }
  }

  get isDestroyed(): boolean {
    return this.destroyed;
  }
}
