import { motion } from 'framer-motion';
import { TIMINGS } from '@bluffsketch/shared';
import { Avatar } from '../components/Avatar';
import { Chat } from '../components/Chat';
import { Leaderboard } from '../components/Leaderboard';
import { CountdownRing } from '../components/ui/CountdownRing';
import { cn } from '../lib/cn';
import { useRoom } from '../store/gameStore';

export function RoundResultsScreen() {
  const room = useRoom();
  const result = room.roundResult;
  if (!result) return null;
  const faker = room.players.find((p) => p.id === result.fakerId);
  const speedy = room.players.find((p) => p.id === result.speedBonusPlayerId);
  const last = room.round >= room.totalRounds;

  const outcome = result.voided
    ? { text: 'Round voided: the Faker left', tone: 'bg-card' }
    : result.stolen
      ? { text: `${faker?.name} was caught but stole the win!`, tone: 'bg-accent text-white' }
      : result.caught
        ? { text: `${faker?.name} was caught!`, tone: 'bg-mint text-[#12352a]' }
        : { text: `${faker?.name} fooled everyone!`, tone: 'bg-accent text-white' };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 pb-16 pt-2 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <CountdownRing
            endsAt={room.phaseEndsAt}
            totalMs={TIMINGS.roundResultsMs}
            size={60}
            label={last ? 'Final results in' : 'Next round in'}
          />
          <div className="min-w-0 flex-1">
            <p className="label-hand leading-none">
              Round {result.round} of {room.totalRounds} · {result.categoryLabel}
            </p>
            <h1 className="text-4xl">Round results</h1>
          </div>
        </div>

        <motion.div
          className={cn('card-sketch flex items-center gap-3 p-3', outcome.tone)}
          initial={{ scale: 0.8, rotate: -3, opacity: 0 }}
          animate={{ scale: 1, rotate: -1, opacity: 1 }}
          role="status"
        >
          {faker && <Avatar id={faker.avatar} size={56} />}
          <p className="font-display text-3xl">{outcome.text}</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card-sketch rotate-[-1.5deg] p-3 text-center">
            <p className="label-hand">Real word</p>
            <p className="break-words font-display text-3xl sm:text-4xl">{result.realWord}</p>
          </div>
          <div className="card-sketch rotate-[1.5deg] p-3 text-center">
            <p className="label-hand">Faker&apos;s word</p>
            <p className="break-words font-display text-3xl sm:text-4xl">{result.fakerWord}</p>
          </div>
        </div>
        {result.fakerGuess && (
          <p className="font-hand text-xl">
            The Faker guessed &ldquo;{result.fakerGuess}&rdquo;, which was {result.stolen ? 'right!' : 'wrong.'}
          </p>
        )}
        {speedy && <p className="font-hand text-xl">⚡ Speed bonus: {speedy.name} was the first to spot the Faker.</p>}

        <Leaderboard
          players={room.players}
          before={result.standingsBefore}
          after={result.standingsAfter}
          deltas={result.deltas}
          youId={room.you.playerId}
          highlightId={result.fakerId}
        />
      </div>
      <Chat enabled={room.chatEnabled} className="h-96 lg:h-auto" />
    </div>
  );
}
