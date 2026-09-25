import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactElement } from 'react';
import { cn } from '../lib/cn';
import { Modal } from './ui/Modal';

const INK = '#2d2a26';

const SecretIllustration = () => (
  <svg viewBox="0 0 240 140" className="h-36 w-full" aria-hidden>
    {[0, 1, 2].map((i) => (
      <g key={i} transform={`translate(${20 + i * 72} ${20 + (i % 2) * 8}) rotate(${i === 1 ? 4 : -4})`}>
        <rect width="60" height="84" rx="8" fill={i === 2 ? '#ff5a5f' : '#fffdf6'} stroke={INK} strokeWidth="3" />
        <text x="30" y="50" textAnchor="middle" fontFamily="Patrick Hand" fontSize="18" fill={i === 2 ? '#fff' : INK}>
          {i === 2 ? 'tiger' : 'cat'}
        </text>
      </g>
    ))}
    <text x="186" y="130" textAnchor="middle" fontFamily="Patrick Hand" fontSize="16" fill="#ff5a5f">
      the Faker!
    </text>
  </svg>
);

const DrawIllustration = () => (
  <svg viewBox="0 0 240 140" className="h-36 w-full" aria-hidden>
    <rect x="20" y="10" width="200" height="120" rx="10" fill="#fffdf6" stroke={INK} strokeWidth="3" />
    <path d="M50 90 C60 50 90 40 110 70 S150 110 170 60" fill="none" stroke="#0072B2" strokeWidth="6" strokeLinecap="round" />
    <path d="M60 40 L90 30 L80 60" fill="none" stroke="#E69F00" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="170" cy="95" r="14" fill="none" stroke="#009E73" strokeWidth="6" />
    <path d="M120 30 C130 20 140 40 150 28" fill="none" stroke="#CC79A7" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

const VoteIllustration = () => (
  <svg viewBox="0 0 240 140" className="h-36 w-full" aria-hidden>
    {[0, 1, 2, 3].map((i) => (
      <circle key={i} cx={40 + i * 54} cy="100" r="20" fill={['#0072B2', '#E69F00', '#009E73', '#CC79A7'][i]} stroke={INK} strokeWidth="3" />
    ))}
    <path d="M40 70 L130 30 M94 70 L140 34 M202 70 L146 32" stroke={INK} strokeWidth="3" strokeDasharray="6 5" fill="none" />
    <text x="143" y="26" textAnchor="middle" fontFamily="Caveat Brush" fontSize="26" fill="#ff5a5f">
      ?!
    </text>
  </svg>
);

const STEPS: { title: string; body: string; art: () => ReactElement }[] = [
  {
    title: '1. Get a secret word',
    body: 'Everyone gets the same secret word, except the Faker, who gets a similar but different one. Hold the card to peek, and keep it hidden!',
    art: SecretIllustration,
  },
  {
    title: '2. Draw together',
    body: 'Everyone draws at the same time on one shared canvas, each in their own colour. Draw enough to prove you know the word, but not so much that the Faker catches on.',
    art: DrawIllustration,
  },
  {
    title: '3. Vote out the Faker',
    body: 'Replay the drawing, then vote for who you think the Faker is. A caught Faker gets one guess at the real word to steal the win. Unless the Faker knows, they might not even realise it is them!',
    art: VoteIllustration,
  },
];

export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Art = current.art;
  const go = (next: number) => setStep(Math.min(STEPS.length - 1, Math.max(0, next)));

  return (
    <Modal open={open} onClose={onClose} title="How to play">
      <div
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') go(step + 1);
          if (event.key === 'ArrowLeft') go(step - 1);
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40, rotate: 2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: -40, rotate: -2 }}
            className="min-h-[18rem]"
            aria-live="polite"
          >
            <div className="rounded-xl border-2 border-dashed border-ink/40 p-2">
              <Art />
            </div>
            <h3 className="mt-3 text-3xl">{current.title}</h3>
            <p className="mt-1 text-lg leading-relaxed">{current.body}</p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)} disabled={step === 0}>
            ← Back
          </button>
          <div className="flex gap-2" role="tablist" aria-label="Steps">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                role="tab"
                aria-selected={i === step}
                aria-label={s.title}
                onClick={() => go(i)}
                className="flex h-11 w-11 items-center justify-center"
              >
                <span className={cn('block h-3.5 w-3.5 rounded-full border-2 border-ink', i === step ? 'bg-accent' : 'bg-card')} />
              </button>
            ))}
          </div>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-secondary" onClick={() => go(step + 1)}>
              Next →
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Got it!
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
