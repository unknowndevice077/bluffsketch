import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { TEXT_LIMITS, TIMINGS, type PublicPlayer, type RevealInfo, type RoomSnapshot } from '@bluffsketch/shared';
import { Avatar } from '../components/Avatar';
import { Confetti, SneakyFox } from '../components/Celebrations';
import { PlayerBadge } from '../components/PlayerBadge';
import { CountdownRing } from '../components/ui/CountdownRing';
import { useElapsed } from '../hooks/useCountdown';
import { cn } from '../lib/cn';
import { vibrate } from '../lib/haptics';
import { submitGuess } from '../lib/net';
import { sound } from '../lib/sound';
import { useRoom } from '../store/gameStore';

/** Beat before the first vote flips, while the drum rolls. */
const INTRO_MS = 1_200;
const SPOTLIGHT_DELAY_MS = 600;

function WordPair({ fakerWord, realWord }: { fakerWord: string; realWord: string | null }) {
  return (
    <div className="grid w-full max-w-lg grid-cols-2 gap-3">
      <div className="card-sketch rotate-[-2deg] p-3 text-center">
        <p className="label-hand">Everyone else drew</p>
        <p className="break-words font-display text-3xl sm:text-4xl">{realWord ?? '???'}</p>
      </div>
      <div className="card-sketch rotate-[2deg] bg-accent p-3 text-center text-white">
        <p className="font-hand text-lg opacity-90">The Faker had</p>
        <p className="break-words font-display text-3xl sm:text-4xl">{fakerWord}</p>
      </div>
    </div>
  );
}

function VoteFlip({ voter, target, flipped }: { voter?: PublicPlayer; target?: PublicPlayer; flipped: boolean }) {
  return (
    <li className="flex items-center gap-2 rounded-xl border-2 border-ink/30 bg-card/80 px-2 py-1">
      {voter && <Avatar id={voter.avatar} size={32} title={voter.name} />}
      <span className="font-hand text-lg" aria-hidden>
        →
      </span>
      <div className="h-10 w-10 [perspective:400px]">
        <motion.div
          className="relative h-full w-full [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <span className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-ink bg-grape font-display text-2xl text-white [backface-visibility:hidden]">
            ?
          </span>
          <span className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {target && <Avatar id={target.avatar} size={40} />}
          </span>
        </motion.div>
      </div>
      <span className="sr-only">{flipped ? `${voter?.name} voted for ${target?.name}` : `${voter?.name}'s vote is hidden`}</span>
    </li>
  );
}

function VoteReveal({ room, reveal }: { room: RoomSnapshot; reveal: RevealInfo }) {
  const elapsed = useElapsed(room.phaseStartedAt, 50);
  const flippedCount = Math.max(0, Math.min(reveal.votes.length, Math.floor((elapsed - INTRO_MS) / TIMINGS.revealPerVoteMs) + 1));
  const spotlight = elapsed >= INTRO_MS + reveal.votes.length * TIMINGS.revealPerVoteMs + SPOTLIGHT_DELAY_MS;
  const playersById = new Map(room.players.map((p) => [p.id, p]));
  const faker = playersById.get(reveal.fakerId);
  const flippedSound = useRef(flippedCount);
  const [announcedSpotlight, setAnnouncedSpotlight] = useState(spotlight);

  // Drum roll only at the start: someone reconnecting mid-reveal should not hear it.
  const elapsedAtMount = useRef(elapsed);
  useEffect(() => {
    if (elapsedAtMount.current < INTRO_MS) sound.play('drumroll');
  }, []);

  useEffect(() => {
    if (flippedCount > flippedSound.current) sound.play('flip');
    flippedSound.current = flippedCount;
  }, [flippedCount]);

  useEffect(() => {
    if (!spotlight || announcedSpotlight) return;
    setAnnouncedSpotlight(true);
    sound.play(reveal.caught ? 'caught' : 'escape');
    vibrate('reveal');
  }, [spotlight, announcedSpotlight, reveal.caught]);

  const tally = new Map<string, number>();
  reveal.votes.slice(0, flippedCount).forEach((vote) => tally.set(vote.targetId, (tally.get(vote.targetId) ?? 0) + 1));

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <h1 className="text-center text-4xl sm:text-5xl">{spotlight ? 'The Faker was…' : 'Counting the votes…'}</h1>
      {reveal.votes.length === 0 ? (
        <p className="font-hand text-xl text-muted">Nobody voted!</p>
      ) : (
        <ul className="flex flex-wrap justify-center gap-2" aria-label="Votes">
          {reveal.votes.map((vote, i) => (
            <VoteFlip key={vote.voterId} voter={playersById.get(vote.voterId)} target={playersById.get(vote.targetId)} flipped={i < flippedCount} />
          ))}
        </ul>
      )}
      <ul className="flex flex-wrap justify-center gap-3" aria-label="Vote tally">
        {room.players.map((player) => (
          <li key={player.id} className="flex flex-col items-center">
            <motion.span
              key={tally.get(player.id) ?? 0}
              className="font-display text-3xl"
              initial={{ scale: 1.8 }}
              animate={{ scale: 1 }}
            >
              {tally.get(player.id) ?? 0}
            </motion.span>
            <Avatar id={player.avatar} size={36} title={player.name} />
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {spotlight && faker && (
          <motion.div
            className="flex flex-col items-center gap-3"
            initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            role="status"
          >
            <div className="relative">
              <Avatar id={faker.avatar} size={120} />
              <PlayerBadge colorIndex={faker.colorIndex} size={36} className="absolute -bottom-1 -right-1" />
            </div>
            <p className="font-display text-5xl">{faker.name}!</p>
            <p
              className={cn(
                'rotate-[-4deg] rounded-xl border-[3px] border-ink px-4 py-1 font-display text-4xl shadow-sketch',
                reveal.caught ? 'bg-mint text-[#12352a]' : 'bg-accent text-white',
              )}
            >
              {reveal.caught ? 'CAUGHT! 🎯' : 'GOT AWAY! 🦊'}
            </p>
            <WordPair fakerWord={reveal.fakerWord} realWord={reveal.realWord} />
          </motion.div>
        )}
      </AnimatePresence>
      {spotlight && (reveal.caught ? <Confetti /> : <SneakyFox />)}
    </div>
  );
}

function LastChance({ room, reveal }: { room: RoomSnapshot; reveal: RevealInfo }) {
  const [guess, setGuess] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const faker = room.players.find((p) => p.id === reveal.fakerId);
  const result = room.lastChance;
  const guessed = result?.guess !== null && result?.guess !== undefined;

  useEffect(() => {
    if (room.you.canGuess) inputRef.current?.focus();
  }, [room.you.canGuess]);

  useEffect(() => {
    if (!guessed) return;
    sound.play(result?.correct ? 'steal' : 'sadTrombone');
    vibrate(result?.correct ? 'fail' : 'success');
  }, [guessed, result?.correct]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!guess.trim()) return;
    setSending(true);
    await submitGuess(guess.trim());
    setSending(false);
  };

  return (
    <div className="flex w-full flex-col items-center gap-5 text-center">
      <div className="flex items-center gap-3">
        {!guessed && <CountdownRing endsAt={room.phaseEndsAt} totalMs={TIMINGS.lastChanceMs} label="Guess time left" />}
        <h1 className="text-4xl sm:text-5xl">Faker&apos;s last chance!</h1>
      </div>
      {faker && <Avatar id={faker.avatar} size={96} title={faker.name} />}

      {guessed ? (
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3" role="status">
          <p className="font-hand text-2xl">
            {faker?.name} guessed <strong>&ldquo;{result?.guess}&rdquo;</strong>
          </p>
          <p
            className={cn(
              'rotate-[-3deg] rounded-xl border-[3px] border-ink px-4 py-1 font-display text-4xl shadow-sketch',
              result?.correct ? 'bg-accent text-white' : 'bg-mint text-[#12352a]',
            )}
          >
            {result?.correct ? 'STOLEN! The Faker wins 🦊' : 'Wrong! The innocents win 🎉'}
          </p>
          <WordPair fakerWord={reveal.fakerWord} realWord={reveal.realWord} />
          {result?.correct ? <SneakyFox /> : <Confetti pieces={40} />}
        </motion.div>
      ) : room.you.canGuess ? (
        <form onSubmit={submit} className="card-sketch flex w-full max-w-md flex-col gap-3 p-4">
          <label htmlFor="guess" className="font-hand text-2xl">
            You were caught! Your word was <strong>{reveal.fakerWord}</strong>. What did everyone else draw?
          </label>
          <input
            ref={inputRef}
            id="guess"
            className="input-sketch text-center !text-3xl"
            value={guess}
            maxLength={TEXT_LIMITS.guessMax}
            onChange={(event) => setGuess(event.target.value)}
            autoComplete="off"
            placeholder="Your guess"
          />
          <button type="submit" className="btn btn-primary !text-2xl" disabled={!guess.trim() || sending}>
            Steal the win!
          </button>
        </form>
      ) : (
        <p className="font-hand text-2xl text-muted">
          {faker?.name ?? 'The Faker'} is trying to guess the real word…
          <span className="ml-2 inline-block animate-floaty" aria-hidden>
            🤔
          </span>
        </p>
      )}
    </div>
  );
}

export function RevealScreen() {
  const room = useRoom();
  const reveal = room.reveal;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 pb-16 pt-4">
      {!reveal ? (
        <p className="font-hand text-2xl">Revealing…</p>
      ) : room.phase === 'FAKER_LAST_CHANCE' ? (
        <LastChance room={room} reveal={reveal} />
      ) : (
        <VoteReveal room={room} reveal={reveal} />
      )}
    </div>
  );
}
