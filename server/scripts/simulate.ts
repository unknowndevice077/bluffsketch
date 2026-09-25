/**
 * Headless end-to-end playtest: four bots play a full round against a running
 * server, then exercise reconnection, early game end, best-drawing export and
 * "play again". Run with the server up:  npm run simulate
 * Takes about a minute and a half because the server's timers are real.
 */
import { io, type Socket } from 'socket.io-client';
import type {
  AckResponse,
  ClientToServerEvents,
  JoinedRoomData,
  RoomSnapshot,
  ServerToClientEvents,
  StrokeBroadcast,
} from '@bluffsketch/shared';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
const URL = process.env.SERVER_URL ?? 'http://localhost:3001';

interface Bot {
  name: string;
  socket: ClientSocket;
  state: RoomSnapshot | null;
  session: JoinedRoomData | null;
  received: StrokeBroadcast[];
  syncedStrokes: number;
  reactions: number;
}

let failures = 0;
function check(condition: boolean, label: string): void {
  if (condition) console.log(`  ✔ ${label}`);
  else {
    failures++;
    console.log(`  ✘ ${label}`);
  }
}

function connect(name: string): Promise<Bot> {
  const socket: ClientSocket = io(URL, { transports: ['websocket'], forceNew: true });
  const bot: Bot = { name, socket, state: null, session: null, received: [], syncedStrokes: 0, reactions: 0 };
  socket.on('room:state', (state) => (bot.state = state));
  socket.on('stroke:batch', (batch) => bot.received.push(batch));
  socket.on('canvas:sync', ({ strokes }) => (bot.syncedStrokes = strokes.length));
  socket.on('gallery:reaction', () => bot.reactions++);
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(bot));
    socket.once('connect_error', reject);
  });
}

function unwrap<T>(response: AckResponse<T>): T {
  if (!response.ok) throw new Error(`${response.error}: ${response.message}`);
  return response.data;
}

async function waitFor(bot: Bot, label: string, predicate: (s: RoomSnapshot) => boolean, timeoutMs = 70_000) {
  const started = Date.now();
  while (!bot.state || !predicate(bot.state)) {
    if (Date.now() - started > timeoutMs) throw new Error(`Timed out waiting for ${label} (${bot.name})`);
    await new Promise((r) => setTimeout(r, 50));
  }
  return bot.state;
}

const waitPhase = (bot: Bot, phase: RoomSnapshot['phase']) => waitFor(bot, phase, (s) => s.phase === phase);

async function main(): Promise<void> {
  console.log(`Connecting 4 bots to ${URL}`);
  const bots = await Promise.all(['Alice', 'Bob', 'Cara', 'D4mn'].map(connect));
  const [host, ...guests] = bots;

  console.log('Lobby');
  host.session = unwrap(await host.socket.emitWithAck('room:create', { name: host.name, avatar: 'cat' }));
  const code = host.session.code;
  for (const [i, bot] of guests.entries()) {
    bot.session = unwrap(await bot.socket.emitWithAck('room:join', { code, name: bot.name, avatar: i === 0 ? 'dog' : 'fox' }));
  }
  const joinFull = await host.socket.emitWithAck('room:join', { code: 'ZZZZZZ', name: 'x', avatar: 'cat' });
  check(!joinFull.ok && joinFull.error === 'ROOM_NOT_FOUND', 'unknown room code is rejected');

  const badSettings = await guests[0].socket.emitWithAck('lobby:settings', { rounds: 4 });
  check(!badSettings.ok && badSettings.error === 'NOT_HOST', 'non-host cannot change settings');
  unwrap(
    await host.socket.emitWithAck('lobby:settings', {
      rounds: 3,
      drawTimeSec: 20,
      voteTimeSec: 10,
      fakerKnows: true,
      customPairs: [{ real: 'pineapple', fake: 'coconut' }],
    }),
  );
  const guestView = await waitFor(guests[0], 'settings', (s) => s.settings.rounds === 3 && s.customPairCount === 1);
  check(guestView.settings.customPairs.length === 0, 'custom words are hidden from non-hosts');
  check(guestView.players.some((p) => p.name === '****'), 'profane name is masked');

  unwrap(await host.socket.emitWithAck('lobby:start'));

  console.log('Round 1: role reveal');
  const states = await Promise.all(bots.map((b) => waitPhase(b, 'ROLE_REVEAL')));
  const fakerIndex = states.findIndex((s) => s.you.isFaker === true);
  const faker = bots[fakerIndex];
  const innocents = bots.filter((_, i) => i !== fakerIndex);
  check(fakerIndex >= 0 && states.filter((s) => s.you.isFaker).length === 1, 'exactly one Faker');
  check(states.every((s, i) => s.you.word === (i === fakerIndex ? 'coconut' : 'pineapple')), 'custom pair used, words private');
  check(states.every((s) => s.reveal === null && s.categoryLabel === 'Custom'), 'Faker identity not broadcast');
  check(states.every((s) => !s.chatEnabled), 'chat disabled during round');

  console.log('Round 1: drawing');
  await Promise.all(bots.map((b) => waitPhase(b, 'DRAWING')));
  for (const bot of bots) {
    const id = `${bot.session?.playerId}:1`;
    bot.socket.emit('stroke:batch', { strokeId: id, tool: 'brush', sizeIndex: 1, points: [[100, 100, 0.5, 0], [200, 150, 0.5, 30]], done: false });
    bot.socket.emit('stroke:batch', { strokeId: id, tool: 'brush', sizeIndex: 1, points: [[300, 200, 0.5, 60]], done: true });
    bot.socket.emit('stroke:batch', { strokeId: `${bot.session?.playerId}:2`, tool: 'brush', sizeIndex: 0, points: [[5, 5, 0.5, 0]], done: true });
  }
  host.socket.emit('stroke:batch', { strokeId: `${guests[0].session?.playerId}:9`, tool: 'brush', sizeIndex: 0, points: [[1, 1, 0.5, 0]], done: true });
  host.socket.emit('stroke:undo');
  await new Promise((r) => setTimeout(r, 600));
  check(guests[0].received.filter((b) => b.playerId === host.session?.playerId).length === 3, 'live strokes relayed to others');
  check(host.received.every((b) => b.playerId !== host.session?.playerId), 'strokes not echoed to sender');
  check(!guests[1].received.some((b) => b.strokeId.endsWith(':9')), 'spoofed stroke id rejected');
  check(host.state?.you.undosLeft === 2, 'undo consumed');

  console.log('Round 1: gallery');
  await Promise.all(bots.map((b) => waitPhase(b, 'GALLERY_REVIEW')));
  await new Promise((r) => setTimeout(r, 200));
  check(guests[1].syncedStrokes === 7, `authoritative canvas synced (got ${guests[1].syncedStrokes}, want 7)`);
  host.socket.emit('gallery:react', { emoji: '🔥', targetId: guests[0].session?.playerId ?? null });
  guests[1].socket.emit('gallery:react', { emoji: '😂', targetId: guests[0].session?.playerId ?? null });
  const lateStrokeId = `${host.session?.playerId}:50`;
  host.socket.emit('stroke:batch', { strokeId: lateStrokeId, tool: 'brush', sizeIndex: 0, points: [[9, 9, 0.5, 0]], done: true });

  console.log('Round 1: voting');
  await Promise.all(bots.map((b) => waitPhase(b, 'VOTING')));
  check(guests[2].reactions === 2, 'reactions broadcast');
  check(!guests[2].received.some((b) => b.strokeId === lateStrokeId), 'strokes after the timer are rejected');
  const self = await faker.socket.emitWithAck('vote:cast', { targetId: faker.session?.playerId ?? '' });
  check(!self.ok, 'cannot vote for yourself');
  for (const bot of innocents) {
    unwrap(await bot.socket.emitWithAck('vote:cast', { targetId: faker.session?.playerId ?? '' }));
    await new Promise((r) => setTimeout(r, 40));
  }
  const again = await innocents[0].socket.emitWithAck('vote:cast', { targetId: innocents[1].session?.playerId ?? '' });
  check(!again.ok, 'votes lock after casting');
  const progress = await waitFor(host, 'vote progress', (s) => s.voteProgress?.voted === 3);
  check(progress.voteProgress?.total === 4, 'vote progress shows X/Y');
  unwrap(await faker.socket.emitWithAck('vote:cast', { targetId: innocents[0].session?.playerId ?? '' }));

  console.log('Round 1: reveal + last chance');
  const reveal = await waitPhase(host, 'REVEAL');
  check(reveal.reveal?.caught === true && reveal.reveal.realWord === null, 'Faker caught, real word hidden during guess');
  check(reveal.reveal?.votes.length === 4, 'all votes revealed in order');
  await waitPhase(faker, 'FAKER_LAST_CHANCE');
  check(faker.state?.you.canGuess === true && innocents[0].state?.you.canGuess === false, 'only the Faker can guess');
  unwrap(await faker.socket.emitWithAck('faker:guess', { guess: '  Pinapples ' }));
  const guessed = await waitFor(host, 'guess result', (s) => s.lastChance?.guess !== null && s.lastChance?.guess !== undefined);
  check(guessed.lastChance?.correct === true, 'fuzzy guess accepted (typo + plural + case + spaces)');

  console.log('Round 1: results');
  const results = await waitPhase(host, 'ROUND_RESULTS');
  const deltas = results.roundResult?.deltas ?? {};
  check(results.roundResult?.stolen === true, 'win stolen');
  check(deltas[faker.session?.playerId ?? ''] === 2, 'Faker +2 for stealing');
  const firstVoter = innocents[0].session?.playerId ?? '';
  check(deltas[firstVoter] === 2 && results.roundResult?.speedBonusPlayerId === firstVoter, 'first correct voter +1 +1 speed bonus');
  check(deltas[innocents[1].session?.playerId ?? ''] === 1, 'other correct voters +1');
  check(results.chatEnabled, 'chat enabled on results');

  console.log('Reconnection');
  const dropped = guests[0];
  const session = dropped.session;
  dropped.socket.disconnect();
  await waitFor(host, 'disconnect seen', (s) => s.players.some((p) => p.id === session?.playerId && !p.connected));
  const returning = await connect(dropped.name);
  const rejoined = unwrap(await returning.socket.emitWithAck('room:rejoin', { code, token: session?.token ?? '', takeover: false }));
  check(rejoined.playerId === session?.playerId, 'rejoined as the same player');
  const restored = await waitFor(returning, 'restored state', () => true);
  check(restored.phase === 'ROUND_RESULTS' && restored.you.playerId === session?.playerId, 'restored into the current phase');
  const hijack = await connect('Mallory');
  const hijackRes = await hijack.socket.emitWithAck('room:rejoin', { code, token: session?.token ?? '', takeover: false });
  check(!hijackRes.ok && hijackRes.error === 'SESSION_ACTIVE', 'active session cannot be silently duplicated');
  hijack.socket.disconnect();

  console.log('Early end + final results');
  await waitPhase(host, 'ROLE_REVEAL');
  returning.socket.emit('room:leave');
  guests[1].socket.emit('room:leave');
  const final = await waitPhase(host, 'FINAL_RESULTS');
  check(final.finalResults?.endedEarly === true, 'game ends when fewer than 3 players remain');
  check((final.finalResults?.awards.length ?? 0) > 0, `awards computed (${final.finalResults?.awards.map((a) => a.title).join(', ')})`);
  const best = unwrap(await host.socket.emitWithAck('results:bestDrawing'));
  check(best?.round === 1 && best.strokes.length === 7, 'best drawing available for share image');

  host.socket.emit('game:playAgain');
  const lobby = await waitPhase(host, 'LOBBY');
  check(lobby.players.every((p) => p.score === 0), 'play again resets to lobby');

  for (const bot of [...bots, returning]) bot.socket.disconnect();
  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
