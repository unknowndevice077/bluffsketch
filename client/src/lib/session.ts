import { isAvatarId, type AvatarId, type JoinedRoomData } from '@bluffsketch/shared';
import { readJson, removeKey, writeJson } from './storage';

const TAB_KEY = 'bluffsketch:tab-session';
const PERSISTED_KEY = 'bluffsketch:session';
const PROFILE_KEY = 'bluffsketch:profile';
/** Server forgets disconnected seats after 60s; keep a little slack for slow reloads. */
const MAX_AGE_MS = 5 * 60 * 1000;

interface StoredSession extends JoinedRoomData {
  savedAt: number;
}

export interface RejoinCandidate {
  session: JoinedRoomData;
  /** Only this tab's own token may replace a still-connected socket. */
  takeover: boolean;
}

export function saveSession(session: JoinedRoomData): void {
  const stored: StoredSession = { ...session, savedAt: Date.now() };
  writeJson('session', TAB_KEY, stored);
  writeJson('local', PERSISTED_KEY, stored);
}

/**
 * Sessions to try for a room, best first. The tab-scoped copy survives
 * reloads; the localStorage copy survives closing the tab. Several tabs
 * in one browser share localStorage, so that copy never forces a takeover.
 */
export function rejoinCandidates(code: string): RejoinCandidate[] {
  const candidates: RejoinCandidate[] = [];
  const fresh = (s: StoredSession | null): s is StoredSession =>
    s !== null && s.code === code && Date.now() - s.savedAt < MAX_AGE_MS;
  const tab = readJson<StoredSession>('session', TAB_KEY);
  const persisted = readJson<StoredSession>('local', PERSISTED_KEY);
  if (fresh(tab)) candidates.push({ session: tab, takeover: true });
  if (fresh(persisted) && persisted.token !== tab?.token) candidates.push({ session: persisted, takeover: false });
  return candidates;
}

export function clearSession(): void {
  removeKey('session', TAB_KEY);
  removeKey('local', PERSISTED_KEY);
}

export interface Profile {
  name: string;
  avatar: AvatarId;
}

export function loadProfile(): Profile | null {
  const profile = readJson<Profile>('local', PROFILE_KEY);
  if (!profile || typeof profile.name !== 'string' || !isAvatarId(profile.avatar)) return null;
  return profile;
}

export function saveProfile(profile: Profile): void {
  writeJson('local', PROFILE_KEY, profile);
}
