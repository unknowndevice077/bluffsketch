import {
  castVoteSchema,
  chatSchema,
  createRoomSchema,
  fakerGuessSchema,
  joinRoomSchema,
  kickSchema,
  reactSchema,
  readySchema,
  rejoinSchema,
  settingsPatchSchema,
  strokeBatchSchema,
  type AckResponse,
  type JoinedRoomData,
  type RateLimitBucket,
} from '@bluffsketch/shared';
import { ZodError } from 'zod';
import { log } from '../utils/logger.js';
import type { Room } from '../room/Room.js';
import type { RoomManager } from '../room/RoomManager.js';
import { RoomError, type GameSocket, type ServerPlayer } from '../room/types.js';
import { RateLimiter } from './rateLimiter.js';

type Responder = (response: AckResponse<unknown>) => void;

/** Clients are untrusted: the ack may be missing or not a function at all. */
function responderFor(ack: unknown): Responder | null {
  return typeof ack === 'function' ? (ack as Responder) : null;
}

export function registerHandlers(socket: GameSocket, manager: RoomManager): void {
  const limiter = new RateLimiter();
  socket.data = { roomCode: null, playerId: null };

  function handle(bucket: RateLimitBucket, ack: unknown, action: () => unknown): void {
    const reply = responderFor(ack);
    if (!limiter.consume(bucket)) {
      reply?.({ ok: false, error: 'RATE_LIMITED', message: 'Whoa, slow down a little!' });
      return;
    }
    try {
      const data = action();
      reply?.({ ok: true, data: data ?? null });
    } catch (error) {
      if (error instanceof RoomError) {
        reply?.({ ok: false, error: error.code, message: error.message });
      } else if (error instanceof ZodError) {
        reply?.({ ok: false, error: 'INVALID_PAYLOAD', message: error.issues[0]?.message ?? 'Invalid input.' });
      } else {
        log.error('handler crashed', { socket: socket.id, error: String(error) });
        reply?.({ ok: false, error: 'NOT_ALLOWED', message: 'Something went wrong.' });
      }
    }
  }

  function current(): { room: Room; playerId: string } {
    const room = manager.get(socket.data.roomCode);
    const playerId = socket.data.playerId;
    if (!room || !playerId || !room.players.has(playerId)) {
      throw new RoomError('NOT_IN_ROOM', 'You are not in a room.');
    }
    room.touch();
    return { room, playerId };
  }

  function leaveCurrent(): void {
    const room = manager.get(socket.data.roomCode);
    const playerId = socket.data.playerId;
    if (room && playerId) {
      socket.leave(room.channel);
      room.leave(playerId);
    }
    socket.data = { roomCode: null, playerId: null };
  }

  const joined = (room: Room, player: ServerPlayer): JoinedRoomData => ({
    code: room.code,
    playerId: player.id,
    token: player.token,
  });

  socket.on('time:sync', (ack) => {
    if (typeof ack === 'function' && limiter.consume('default')) ack({ serverNow: Date.now() });
  });

  socket.on('room:create', (payload, ack) =>
    handle('default', ack, () => {
      const { name, avatar } = createRoomSchema.parse(payload);
      leaveCurrent();
      const room = manager.create();
      try {
        return joined(room, room.join(name, avatar, socket));
      } catch (error) {
        manager.delete(room.code);
        throw error;
      }
    }),
  );

  socket.on('room:join', (payload, ack) =>
    handle('default', ack, () => {
      const { code, name, avatar } = joinRoomSchema.parse(payload);
      const room = manager.get(code);
      if (!room) throw new RoomError('ROOM_NOT_FOUND', 'We could not find that room.');
      if (socket.data.roomCode) leaveCurrent();
      room.touch();
      return joined(room, room.join(name, avatar, socket));
    }),
  );

  socket.on('room:rejoin', (payload, ack) =>
    handle('default', ack, () => {
      const { code, token, takeover } = rejoinSchema.parse(payload);
      const room = manager.get(code);
      if (!room) throw new RoomError('ROOM_NOT_FOUND', 'That room no longer exists.');
      if (socket.data.roomCode && socket.data.roomCode !== room.code) leaveCurrent();
      room.touch();
      return joined(room, room.rejoin(token, socket, takeover));
    }),
  );

  socket.on('room:leave', () => handle('default', undefined, leaveCurrent));

  socket.on('rooms:listPublic', (ack) => handle('default', ack, () => manager.listPublic()));

  socket.on('lobby:ready', (payload) =>
    handle('default', undefined, () => {
      const { ready } = readySchema.parse(payload);
      const { room, playerId } = current();
      room.setReady(playerId, ready);
    }),
  );

  socket.on('lobby:settings', (payload, ack) =>
    handle('default', ack, () => {
      const patch = settingsPatchSchema.parse(payload);
      const { room, playerId } = current();
      room.updateSettings(playerId, patch);
      return null;
    }),
  );

  socket.on('lobby:kick', (payload) =>
    handle('default', undefined, () => {
      const { playerId: targetId } = kickSchema.parse(payload);
      const { room, playerId } = current();
      room.kick(playerId, targetId);
    }),
  );

  socket.on('lobby:start', (ack) =>
    handle('default', ack, () => {
      const { room, playerId } = current();
      room.start(playerId);
      return null;
    }),
  );

  socket.on('chat:send', (payload) =>
    handle('chat', undefined, () => {
      const { text } = chatSchema.parse(payload);
      const { room, playerId } = current();
      room.sendChat(playerId, text);
    }),
  );

  socket.on('stroke:batch', (payload) =>
    handle('stroke', undefined, () => {
      const batch = strokeBatchSchema.parse(payload);
      const { room, playerId } = current();
      room.strokeBatch(playerId, batch);
    }),
  );

  socket.on('stroke:undo', () =>
    handle('default', undefined, () => {
      const { room, playerId } = current();
      room.undo(playerId);
    }),
  );

  socket.on('stroke:clear', () =>
    handle('default', undefined, () => {
      const { room, playerId } = current();
      room.clearOwn(playerId);
    }),
  );

  socket.on('gallery:react', (payload) =>
    handle('reaction', undefined, () => {
      const reaction = reactSchema.parse(payload);
      const { room, playerId } = current();
      room.react(playerId, reaction);
    }),
  );

  socket.on('vote:cast', (payload, ack) =>
    handle('default', ack, () => {
      const { targetId } = castVoteSchema.parse(payload);
      const { room, playerId } = current();
      room.vote(playerId, targetId);
      return null;
    }),
  );

  socket.on('faker:guess', (payload, ack) =>
    handle('default', ack, () => {
      const { guess } = fakerGuessSchema.parse(payload);
      const { room, playerId } = current();
      room.guess(playerId, guess);
      return null;
    }),
  );

  socket.on('game:playAgain', () =>
    handle('default', undefined, () => {
      const { room, playerId } = current();
      room.playAgain(playerId);
    }),
  );

  socket.on('results:bestDrawing', (ack) =>
    handle('default', ack, () => {
      const { room } = current();
      return room.bestDrawing();
    }),
  );

  socket.on('disconnect', () => {
    const room = manager.get(socket.data.roomCode);
    const playerId = socket.data.playerId;
    if (room && playerId) room.handleDisconnect(playerId, socket.id);
  });
}
