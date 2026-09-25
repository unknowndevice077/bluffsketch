import type {
  AckResponse,
  AvatarId,
  BestDrawing,
  JoinedRoomData,
  PublicRoomInfo,
  ReactionEmoji,
  SettingsPatch,
  StrokeBatchPayload,
} from '@bluffsketch/shared';
import { useDraw } from '../store/drawStore';
import { useGame, type FatalKind } from '../store/gameStore';
import { strokeModel } from '../store/strokeModel';
import { hintServerTime, syncClock } from './clock';
import { clearSession, rejoinCandidates, saveSession } from './session';
import { ACK_TIMEOUT_MS, socket } from './socket';
import { sound } from './sound';

const ROOM_PATH = /^\/r\/([A-Za-z0-9]{6})\/?$/;

export function roomCodeFromUrl(): string | null {
  const fromPath = ROOM_PATH.exec(window.location.pathname)?.[1];
  const fromQuery = new URLSearchParams(window.location.search).get('room');
  const code = (fromPath ?? fromQuery ?? '').toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}

function setRoomUrl(code: string | null): void {
  try {
    window.history.replaceState(null, '', code ? `/r/${code}` : '/');
  } catch {
    // Sandboxed iframes can refuse history changes; the game still works.
  }
}

export function shareLinkFor(code: string): string {
  return `${window.location.origin}/r/${code}`;
}

type Failure = Extract<AckResponse<never>, { ok: false }>;

const OFFLINE: Failure = {
  ok: false,
  error: 'NOT_ALLOWED',
  message: 'The server did not answer. Check your connection and try again.',
};

/** Ack requests never reject: timeouts and offline sockets become a Failure. */
async function request<R extends AckResponse<unknown>>(send: () => Promise<R>): Promise<R | Failure> {
  if (!socket.connected) return OFFLINE;
  try {
    return await send();
  } catch {
    return OFFLINE;
  }
}

const withTimeout = () => socket.timeout(ACK_TIMEOUT_MS);

function onJoined(data: JoinedRoomData): void {
  saveSession(data);
  useGame.setState({ session: data, error: null, pendingCode: null });
  setRoomUrl(data.code);
  sound.play('join');
}

const FATAL_JOIN_ERRORS: ReadonlySet<string> = new Set(['ROOM_NOT_FOUND', 'ROOM_FULL', 'IN_PROGRESS']);

function showJoinError(response: AckResponse<JoinedRoomData>): void {
  if (response.ok) return;
  if (FATAL_JOIN_ERRORS.has(response.error)) {
    useGame.getState().setError({ kind: response.error as FatalKind, message: response.message });
  } else {
    useGame.getState().toast(response.message, 'error');
  }
}

// ------------------------------------------------------------------ rooms

export async function createRoom(name: string, avatar: AvatarId): Promise<boolean> {
  const response = await request(() => withTimeout().emitWithAck('room:create', { name, avatar }));
  if (response.ok) onJoined(response.data);
  else useGame.getState().toast(response.message, 'error');
  return response.ok;
}

export async function joinRoom(code: string, name: string, avatar: AvatarId): Promise<boolean> {
  const response = await request(() => withTimeout().emitWithAck('room:join', { code, name, avatar }));
  if (response.ok) onJoined(response.data);
  else showJoinError(response);
  return response.ok;
}

/** Tries this tab's session, then the browser's. Resolves true when back in the room. */
export async function tryRejoin(code: string): Promise<boolean> {
  for (const { session, takeover } of rejoinCandidates(code)) {
    const response = await request(() =>
      withTimeout().emitWithAck('room:rejoin', { code, token: session.token, takeover }),
    );
    if (response.ok) {
      onJoined(response.data);
      return true;
    }
    if (response.error === 'ROOM_NOT_FOUND') {
      clearSession();
      return false;
    }
  }
  return false;
}

/** After a network blip: reclaim the seat we already hold in memory. */
async function resume(session: JoinedRoomData): Promise<void> {
  const response = await request(() =>
    withTimeout().emitWithAck('room:rejoin', { code: session.code, token: session.token, takeover: true }),
  );
  if (response.ok) {
    onJoined(response.data);
    return;
  }
  if (response.error === 'ROOM_NOT_FOUND' || response.error === 'SESSION_EXPIRED') {
    clearSession();
    useGame.getState().leaveRoomState();
    useGame.getState().setError({
      kind: 'SESSION_EXPIRED',
      message: 'You were away for too long and lost your seat. You can join again from the lobby link.',
    });
  }
}

export function leaveRoom(): void {
  socket.emit('room:leave');
  clearSession();
  strokeModel.sync(0, []);
  useGame.getState().leaveRoomState();
  setRoomUrl(null);
}

export function goHome(): void {
  useGame.setState({ error: null, pendingCode: null });
  setRoomUrl(null);
}

export async function listPublicRooms(): Promise<PublicRoomInfo[]> {
  const response = await request(() => withTimeout().emitWithAck('rooms:listPublic'));
  return response.ok ? response.data : [];
}

// ------------------------------------------------------------------ lobby

export const setReady = (ready: boolean) => socket.emit('lobby:ready', { ready });
export const kickPlayer = (playerId: string) => socket.emit('lobby:kick', { playerId });
export const sendChat = (text: string) => socket.emit('chat:send', { text });
export const playAgain = () => socket.emit('game:playAgain');

export async function updateSettings(patch: SettingsPatch): Promise<void> {
  const response = await request(() => withTimeout().emitWithAck('lobby:settings', patch));
  if (!response.ok) useGame.getState().toast(response.message, 'error');
}

export async function startGame(): Promise<void> {
  sound.unlock();
  const response = await request(() => withTimeout().emitWithAck('lobby:start'));
  if (!response.ok) useGame.getState().toast(response.message, 'error');
}

// ---------------------------------------------------------------- in game

export const sendStrokeBatch = (batch: StrokeBatchPayload) => socket.emit('stroke:batch', batch);
export const undoStroke = () => {
  sound.play('undo');
  socket.emit('stroke:undo');
};
export const clearOwnStrokes = () => {
  sound.play('crumple');
  socket.emit('stroke:clear');
};
export const react = (emoji: ReactionEmoji, targetId: string | null) => socket.emit('gallery:react', { emoji, targetId });

export async function castVote(targetId: string): Promise<boolean> {
  const response = await request(() => withTimeout().emitWithAck('vote:cast', { targetId }));
  if (!response.ok) useGame.getState().toast(response.message, 'error');
  return response.ok;
}

export async function submitGuess(guess: string): Promise<boolean> {
  const response = await request(() => withTimeout().emitWithAck('faker:guess', { guess }));
  if (!response.ok) useGame.getState().toast(response.message, 'error');
  return response.ok;
}

export async function fetchBestDrawing(): Promise<BestDrawing | null> {
  const response = await request(() => withTimeout().emitWithAck('results:bestDrawing'));
  return response.ok ? response.data : null;
}

// ----------------------------------------------------------------- wiring

let initialised = false;

export function initNetwork(): void {
  if (initialised) return;
  initialised = true;
  const game = useGame.getState;

  const linkCode = roomCodeFromUrl();
  if (linkCode) game().setPendingCode(linkCode);

  socket.on('connect', () => {
    game().setConnection('connected');
    void syncClock();
    const { session, pendingCode } = game();
    if (session) void resume(session);
    else if (pendingCode) void tryRejoin(pendingCode);
  });

  socket.on('disconnect', (reason) => {
    if (reason !== 'io client disconnect') game().setConnection('reconnecting');
  });
  socket.io.on('reconnect_attempt', () => game().setConnection('reconnecting'));

  socket.on('room:state', (state) => {
    hintServerTime(state.serverNow);
    useDraw.getState().syncInk(state.round, state.you.inkUsed);
    game().setRoom(state);
  });

  socket.on('room:kicked', () => {
    clearSession();
    strokeModel.sync(0, []);
    game().leaveRoomState();
    game().setError({ kind: 'KICKED', message: 'The host removed you from the room.' });
    setRoomUrl(null);
  });

  socket.on('room:notice', (notice) => {
    if (notice.kind === 'roomClosed') {
      clearSession();
      game().leaveRoomState();
      game().setError({ kind: 'ROOM_CLOSED', message: notice.message });
      setRoomUrl(null);
      return;
    }
    if (notice.kind === 'playerJoined') {
      // The lobby grid and chat already show joins; a toast would just cover the screen.
      sound.play('pop');
      return;
    }
    const tone = notice.kind === 'gameEndedEarly' || notice.kind === 'roundVoided' ? 'warn' : 'info';
    game().toast(notice.message, tone);
    game().announce(notice.message);
  });

  socket.on('chat:history', (messages) => game().setChat(messages));
  socket.on('chat:message', (message) => {
    game().pushChat(message);
    if (!message.system && message.playerId !== game().room?.you.playerId) sound.play('chat');
  });

  socket.on('stroke:batch', (batch) => strokeModel.applyRemote(batch));
  socket.on('stroke:rejected', ({ strokeId }) => strokeModel.remove([strokeId]));
  socket.on('stroke:removed', ({ strokeIds }) => strokeModel.remove(strokeIds));
  socket.on('canvas:sync', ({ round, strokes }) => strokeModel.sync(round, strokes));

  socket.on('gallery:reaction', (reaction) => {
    game().addReaction(reaction);
    sound.play('reaction');
  });

  socket.connect();
}
