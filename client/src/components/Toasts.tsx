import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../lib/cn';
import { useGame, type ToastTone } from '../store/gameStore';

const TONES: Record<ToastTone, string> = {
  info: 'bg-card',
  success: 'bg-mint text-[#12352a]',
  warn: 'bg-sun text-[#2d2a26]',
  error: 'bg-accent text-white',
};

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed right-0 top-16 z-50 flex w-full max-w-sm flex-col items-end gap-2 px-4">
      <AnimatePresence>
        {toasts.map((toast, i) => (
          <motion.button
            type="button"
            key={toast.id}
            layout
            onClick={() => dismiss(toast.id)}
            className={cn('card-sketch pointer-events-auto max-w-md px-4 py-2 text-left font-hand text-xl', TONES[toast.tone])}
            initial={{ opacity: 0, y: -20, rotate: i % 2 ? 2 : -2 }}
            animate={{ opacity: 1, y: 0, rotate: i % 2 ? 1 : -1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {toast.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
