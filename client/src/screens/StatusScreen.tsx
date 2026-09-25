import { motion } from 'framer-motion';
import { goHome } from '../lib/net';
import type { FatalError, FatalKind } from '../store/gameStore';

const COPY: Record<FatalKind, { emoji: string; title: string }> = {
  ROOM_NOT_FOUND: { emoji: '🔍', title: 'Room not found' },
  ROOM_FULL: { emoji: '🚪', title: 'Room is full' },
  IN_PROGRESS: { emoji: '⏳', title: 'Game in progress' },
  KICKED: { emoji: '👢', title: 'You were removed' },
  ROOM_CLOSED: { emoji: '💤', title: 'Room closed' },
  SESSION_EXPIRED: { emoji: '🔌', title: 'Disconnected' },
};

export function StatusScreen({ error }: { error: FatalError }) {
  const copy = COPY[error.kind];
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 pt-10 text-center">
      <motion.div
        className="card-sketch relative w-full p-6"
        initial={{ rotate: -6, scale: 0.8, opacity: 0 }}
        animate={{ rotate: -1, scale: 1, opacity: 1 }}
        role="alert"
      >
        <span className="tape" aria-hidden />
        <div className="text-7xl" aria-hidden>
          {copy.emoji}
        </div>
        <h1 className="mt-2 text-5xl">{copy.title}</h1>
        <p className="mt-2 text-lg">{error.message}</p>
        <button type="button" className="btn btn-primary mt-5 w-full !text-2xl" onClick={goHome}>
          Back to the start
        </button>
      </motion.div>
    </div>
  );
}
