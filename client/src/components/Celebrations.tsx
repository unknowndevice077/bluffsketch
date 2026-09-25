import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { PLAYER_COLORS } from '@bluffsketch/shared';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** Paper confetti burst. Renders nothing when motion is reduced. */
export function Confetti({ pieces = 70 }: { pieces?: number }) {
  const reduced = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.8,
        drift: (Math.random() - 0.5) * 160,
        spin: (Math.random() - 0.5) * 900,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length].hex,
        wide: Math.random() > 0.5,
      })),
    [pieces],
  );
  if (reduced) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {bits.map((bit) => (
        <motion.span
          key={bit.id}
          className="absolute top-0 block rounded-sm border border-black/20"
          style={{ left: `${bit.left}%`, width: bit.wide ? 14 : 8, height: bit.wide ? 8 : 14, backgroundColor: bit.color }}
          initial={{ y: -40, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', x: bit.drift, rotate: bit.spin, opacity: [1, 1, 0.8] }}
          transition={{ delay: bit.delay, duration: bit.duration, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

/** The Faker got away: a fox tiptoes across the screen. */
export function SneakyFox() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="pointer-events-none fixed bottom-6 left-0 z-40"
      initial={{ x: reduced ? '40vw' : '-30vw' }}
      animate={{ x: reduced ? '40vw' : '110vw' }}
      transition={{ duration: reduced ? 0 : 5, ease: 'linear' }}
      aria-hidden
    >
      <motion.svg
        viewBox="0 0 120 80"
        width="150"
        height="100"
        animate={reduced ? undefined : { y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 0.45 }}
      >
        <path d="M8 44 C0 30 14 18 26 30 C30 36 30 44 30 44" fill="#f07b3f" stroke="#2d2a26" strokeWidth="3" />
        <path d="M6 38 C8 34 12 34 14 36" fill="none" stroke="#fff" strokeWidth="3" />
        <ellipse cx="54" cy="46" rx="28" ry="15" fill="#f07b3f" stroke="#2d2a26" strokeWidth="3" />
        <path d="M78 36 L84 16 L92 32 L100 18 L102 38 C106 46 98 56 88 54 C80 52 76 44 78 36 Z" fill="#f07b3f" stroke="#2d2a26" strokeWidth="3" strokeLinejoin="round" />
        <path d="M92 48 L104 44" stroke="#2d2a26" strokeWidth="3" strokeLinecap="round" />
        <path d="M86 40 L90 38" stroke="#2d2a26" strokeWidth="3" strokeLinecap="round" />
        <path d="M40 58 L36 72 M50 60 L52 74 M64 58 L62 72 M72 56 L76 70" stroke="#2d2a26" strokeWidth="3" strokeLinecap="round" />
        <text x="84" y="10" fontFamily="Caveat Brush" fontSize="14" fill="#2d2a26">
          hehe
        </text>
      </motion.svg>
    </motion.div>
  );
}
