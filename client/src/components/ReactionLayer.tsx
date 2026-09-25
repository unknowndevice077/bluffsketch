import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../store/gameStore';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** Emoji reactions float up from the bottom of the gallery canvas. */
export function ReactionLayer() {
  const reactions = useGame((s) => s.reactions);
  const remove = useGame((s) => s.removeReaction);
  const players = useGame((s) => s.room?.players ?? []);
  const reduced = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {reactions.map((reaction) => {
          const from = players.find((p) => p.id === reaction.playerId);
          return (
            <motion.div
              key={reaction.id}
              className="absolute bottom-2 flex flex-col items-center"
              style={{ left: `${reaction.x * 100}%` }}
              initial={{ y: 0, opacity: 0, scale: 0.4 }}
              animate={reduced ? { opacity: [0, 1, 0] } : { y: -260, opacity: [0, 1, 1, 0], scale: 1.2, rotate: (reaction.x - 0.5) * 40 }}
              transition={{ duration: reduced ? 1.2 : 2.2, ease: 'easeOut' }}
              onAnimationComplete={() => remove(reaction.id)}
            >
              <span className="text-5xl drop-shadow">{reaction.emoji}</span>
              {from && <span className="rounded bg-card/80 px-1 font-hand text-sm">{from.name}</span>}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
