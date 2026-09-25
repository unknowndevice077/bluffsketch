import type { ChatMessage, JoinedRoomData, Reaction, RoomSnapshot } from '@bluffsketch/shared';
import { create } from 'zustand';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting';

export type FatalKind =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'IN_PROGRESS'
  | 'KICKED'
  | 'ROOM_CLOSED'
  | 'SESSION_EXPIRED';

export interface FatalError {
  kind: FatalKind;
  message: string;
}

export type ToastTone = 'info' | 'success' | 'warn' | 'error';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface FloatingReaction extends Reaction {
  /** 0..1 horizontal start position so bursts spread out. */
  x: number;
}

interface GameState {
  connection: ConnectionState;
  room: RoomSnapshot | null;
  session: JoinedRoomData | null;
  /** Room code from a shared link (/r/CODE) waiting for the player to join. */
  pendingCode: string | null;
  chat: ChatMessage[];
  toasts: Toast[];
  reactions: FloatingReaction[];
  error: FatalError | null;
  announcement: string;

  setConnection: (connection: ConnectionState) => void;
  setRoom: (room: RoomSnapshot | null) => void;
  setSession: (session: JoinedRoomData | null) => void;
  setPendingCode: (code: string | null) => void;
  setChat: (messages: ChatMessage[]) => void;
  pushChat: (message: ChatMessage) => void;
  toast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
  addReaction: (reaction: Reaction) => void;
  removeReaction: (id: string) => void;
  setError: (error: FatalError | null) => void;
  announce: (message: string) => void;
  leaveRoomState: () => void;
}

let toastId = 0;

export const useGame = create<GameState>()((set, get) => ({
  connection: 'connecting',
  room: null,
  session: null,
  pendingCode: null,
  chat: [],
  toasts: [],
  reactions: [],
  error: null,
  announcement: '',

  setConnection: (connection) => set({ connection }),
  setRoom: (room) => set({ room }),
  setSession: (session) => set({ session }),
  setPendingCode: (pendingCode) => set({ pendingCode }),
  setChat: (chat) => set({ chat }),
  pushChat: (message) => set({ chat: [...get().chat.slice(-99), message] }),
  toast: (message, tone = 'info') => {
    const id = ++toastId;
    set({ toasts: [...get().toasts.slice(-3), { id, message, tone }] });
    setTimeout(() => get().dismissToast(id), 3_800);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  addReaction: (reaction) =>
    set({ reactions: [...get().reactions.slice(-30), { ...reaction, x: 0.1 + Math.random() * 0.8 }] }),
  removeReaction: (id) => set({ reactions: get().reactions.filter((r) => r.id !== id) }),
  setError: (error) => set({ error }),
  // Appending a zero-width space forces screen readers to re-read identical messages.
  announce: (message) => set({ announcement: get().announcement === message ? `${message}​` : message }),
  leaveRoomState: () => set({ room: null, session: null, chat: [], reactions: [] }),
}));

/** Convenience selector for components that only render inside a room. */
export function useRoom(): RoomSnapshot {
  const room = useGame((s) => s.room);
  if (!room) throw new Error('useRoom used outside of a room');
  return room;
}
