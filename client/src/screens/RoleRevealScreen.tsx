import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { TIMINGS } from '@bluffsketch/shared';
import { CountdownRing } from '../components/ui/CountdownRing';
import { cn } from '../lib/cn';
import { useRoom } from '../store/gameStore';

/** Card that only shows the word while pressed, so neighbours can't peek. */
function HoldToReveal({ word, isFaker }: { word: string; isFaker: boolean | null }) {
  const [holding, setHolding] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (!holding) return undefined;
    setSeen(true);
    const release = () => setHolding(false);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
    };
  }, [holding]);

  return (
    <button
      type="button"
      className="relative h-72 w-full max-w-sm select-none [perspective:1000px] focus-visible:outline-none"
      onPointerDown={(event) => {
        event.preventDefault();
        setHolding(true);
      }}
      onKeyDown={(event) => {
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
          event.preventDefault();
          setHolding(true);
        }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') setHolding(false);
      }}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={holding ? `Your word is ${word}` : 'Press and hold to reveal your secret word'}
      aria-live="polite"
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: holding ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <div className="card-sketch absolute inset-0 flex flex-col items-center justify-center gap-3 bg-grape text-white [backface-visibility:hidden]">
          <span className="text-7xl" aria-hidden>
            🤫
          </span>
          <span className="font-display text-4xl">Hold to peek</span>
          <span className="font-hand text-lg opacity-90">{seen ? 'Hold again to re-check' : 'Keep it hidden!'}</span>
        </div>
        <div
          className={cn(
            'card-sketch absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]',
            isFaker ? 'bg-accent text-white' : 'bg-card',
          )}
        >
          {isFaker === true && <span className="font-display text-3xl">You are the FAKER 🦊</span>}
          {isFaker === false && <span className="font-hand text-xl text-muted">You are innocent. Your word:</span>}
          {isFaker === null && <span className="font-hand text-xl text-muted">Your secret word:</span>}
          <span className="break-words text-center font-display text-6xl leading-tight">{word}</span>
          {isFaker === true && <span className="font-hand text-lg">Everyone else has a similar word. Blend in!</span>}
        </div>
      </motion.div>
    </button>
  );
}

export function RoleRevealScreen() {
  const room = useRoom();
  const word = room.you.word ?? '…';
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-4 pb-16 pt-4 text-center">
      <div className="flex items-center gap-4">
        <CountdownRing endsAt={room.phaseEndsAt} totalMs={TIMINGS.roleRevealMs} label="Drawing starts in" />
        <div className="text-left">
          <p className="label-hand">
            Round {room.round} of {room.totalRounds}
          </p>
          <h1 className="text-4xl sm:text-5xl">Your secret word</h1>
        </div>
      </div>
      {room.categoryLabel && (
        <p className="chip bg-sun text-[#2d2a26]">
          Category: <strong>{room.categoryLabel}</strong>
        </p>
      )}
      <HoldToReveal word={word} isFaker={room.you.isFaker} />
      <p className="max-w-sm text-muted">
        {room.settings.fakerKnows
          ? 'One player got a different word and knows it.'
          : 'One player got a different word, and even they do not know it is them.'}
      </p>
    </div>
  );
}
