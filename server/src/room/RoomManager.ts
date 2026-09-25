import { TIMINGS, type PublicRoomInfo } from '@bluffsketch/shared';
import { makeRoomCode } from '../utils/ids.js';
import { log } from '../utils/logger.js';
import { Room } from './Room.js';
import type { IO } from './types.js';

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private readonly io: IO) {}

  create(): Room {
    const code = makeRoomCode((candidate) => this.rooms.has(candidate));
    const room = new Room(this.io, code, (emptyCode) => this.delete(emptyCode));
    this.rooms.set(code, room);
    log.info('room created', { code, rooms: this.rooms.size });
    return room;
  }

  get(code: string | null | undefined): Room | undefined {
    if (!code) return undefined;
    const room = this.rooms.get(code.toUpperCase());
    return room && !room.isDestroyed ? room : undefined;
  }

  delete(code: string): void {
    if (this.rooms.delete(code)) log.info('room closed', { code, rooms: this.rooms.size });
  }

  listPublic(): PublicRoomInfo[] {
    return [...this.rooms.values()]
      .filter((room) => room.settings.isPublic && room.phase === 'LOBBY' && room.players.size < room.settings.maxPlayers)
      .slice(0, 30)
      .map((room) => ({
        code: room.code,
        hostName: room.players.get(room.hostId)?.name ?? 'Someone',
        playerCount: room.players.size,
        maxPlayers: room.settings.maxPlayers,
      }));
  }

  get size(): number {
    return this.rooms.size;
  }

  startCleanup(): void {
    this.cleanupTimer = setInterval(() => this.sweep(), TIMINGS.cleanupIntervalMs);
    this.cleanupTimer.unref();
  }

  stopCleanup(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  private sweep(): void {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      if (room.players.size === 0 || now - room.lastActivity > TIMINGS.roomIdleMs) {
        room.destroy({ kind: 'roomClosed', message: 'This room was closed after 30 minutes of inactivity.' });
        this.delete(room.code);
      }
    }
  }
}
