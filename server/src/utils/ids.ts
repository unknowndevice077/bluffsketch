import { randomBytes, randomInt } from 'node:crypto';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@bluffsketch/shared';

export function makeRoomCode(isTaken: (code: string) => boolean): string {
  for (;;) {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
    }
    if (!isTaken(code)) return code;
  }
}

/** 192-bit secret used to reclaim a seat after a disconnect. */
export function makeToken(): string {
  return randomBytes(24).toString('base64url');
}

/** Short opaque id. base64url never contains ':' which stroke ids rely on. */
export function makeId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString('base64url')}`;
}
