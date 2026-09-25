import { motion } from 'framer-motion';
import { cn } from '../lib/cn';

const WORDS = [
  { text: 'Bluff', color: 'text-accent' },
  { text: 'Sketch', color: 'text-sky' },
];

interface LogoProps {
  size?: 'sm' | 'lg';
  className?: string;
}

/** Letters drop in one by one, then a marker underline scribbles itself. */
export function Logo({ size = 'lg', className }: LogoProps) {
  const large = size === 'lg';
  let index = 0;
  return (
    <div className={cn('relative inline-block select-none', className)} aria-label="Bluff Sketch" role="img">
      <div className={cn('flex flex-wrap justify-center gap-x-3 font-display leading-none', large ? 'text-6xl sm:text-8xl' : 'text-3xl')}>
        {WORDS.map((word) => (
          <span key={word.text} className={cn('inline-flex', word.color)} aria-hidden>
            {word.text.split('').map((letter) => {
              const i = index++;
              return (
                <motion.span
                  key={`${word.text}-${i}`}
                  className="inline-block [text-shadow:3px_3px_0_rgb(var(--ink))]"
                  initial={large ? { y: -40, opacity: 0, rotate: -20 } : false}
                  animate={{ y: 0, opacity: 1, rotate: i % 2 === 0 ? -4 : 4 }}
                  transition={{ delay: large ? i * 0.05 : 0, type: 'spring', stiffness: 400, damping: 14 }}
                  whileHover={{ y: -6, rotate: 0 }}
                >
                  {letter}
                </motion.span>
              );
            })}
          </span>
        ))}
      </div>
      {large && (
        <svg viewBox="0 0 300 20" className="mx-auto mt-1 h-5 w-4/5" aria-hidden>
          <motion.path
            d="M5 12 C 60 2, 110 18, 160 9 S 250 4, 295 11"
            fill="none"
            stroke="rgb(var(--sun))"
            strokeWidth="7"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.7, duration: 0.8, ease: 'easeInOut' }}
          />
        </svg>
      )}
    </div>
  );
}
