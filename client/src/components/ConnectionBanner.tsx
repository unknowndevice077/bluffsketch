import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../store/gameStore';

export function ConnectionBanner() {
  const connection = useGame((s) => s.connection);
  const show = connection !== 'connected';
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="alert"
          className="fixed inset-x-0 bottom-4 z-50 mx-auto w-fit max-w-[calc(100vw-2rem)]"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
        >
          <div className="card-sketch flex items-center gap-3 bg-sun px-4 py-2 font-hand text-xl text-[#2d2a26]">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-[3px] border-[#2d2a26] border-t-transparent" aria-hidden />
            {connection === 'connecting' ? 'Connecting to the game server…' : 'Connection lost, reconnecting…'}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
