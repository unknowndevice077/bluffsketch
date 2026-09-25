import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { colorOf } from '@bluffsketch/shared';
import { StrokeThumbnail } from '../canvas/StrokeThumbnail';
import { Avatar } from '../components/Avatar';
import { PlayerBadge } from '../components/PlayerBadge';
import { CountdownRing } from '../components/ui/CountdownRing';
import { cn } from '../lib/cn';
import { vibrate } from '../lib/haptics';
import { castVote } from '../lib/net';
import { sound } from '../lib/sound';
import { useRoom } from '../store/gameStore';

export function VotingScreen() {
  const room = useRoom();
  const lockedId = room.you.myVoteId;
  const [selected, setSelected] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const progress = room.voteProgress;
  const locked = lockedId !== null;

  const confirm = async () => {
    if (!selected || locked) return;
    setSending(true);
    const ok = await castVote(selected);
    setSending(false);
    if (ok) {
      sound.play('stamp');
      vibrate('lock');
    }
  };

  const target = room.players.find((p) => p.id === (lockedId ?? selected));

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-32 pt-2 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <CountdownRing endsAt={room.phaseEndsAt} totalMs={room.settings.voteTimeSec * 1000} size={60} label="Voting time left" />
        <div className="min-w-0 flex-1">
          <p className="label-hand leading-none">Round {room.round} · {room.categoryLabel}</p>
          <h1 className="text-3xl sm:text-4xl">Who is the Faker?</h1>
        </div>
        {progress && (
          <p className="chip bg-sun text-[#2d2a26]" aria-live="polite">
            🗳️ {progress.voted}/{progress.total} voted
          </p>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Players to vote for">
        {room.players.map((player, index) => {
          const isYou = player.id === room.you.playerId;
          const isSelected = (lockedId ?? selected) === player.id;
          const disabled = isYou || locked;
          return (
            <motion.li
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, rotate: index % 2 === 0 ? -1 : 1 }}
              transition={{ delay: index * 0.04 }}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => setSelected(player.id)}
                aria-pressed={isSelected}
                aria-label={isYou ? `${player.name} (you, cannot vote for yourself)` : `Vote for ${player.name}`}
                className={cn(
                  'card-sketch relative flex w-full flex-col gap-2 p-2 text-left transition-transform',
                  !disabled && 'hover:-rotate-1 hover:scale-[1.02]',
                  isSelected && 'scale-[1.03]',
                  isYou && 'opacity-60',
                )}
                style={isSelected ? { boxShadow: `0 0 0 5px ${colorOf(player.colorIndex).hex}, 4px 4px 0 5px rgb(var(--ink))` } : undefined}
              >
                <StrokeThumbnail playerId={player.id} label={`${player.name}'s lines`} />
                <span className="flex items-center gap-2">
                  <Avatar id={player.avatar} size={32} />
                  <PlayerBadge colorIndex={player.colorIndex} size={20} />
                  <span className="min-w-0 flex-1 truncate font-hand text-lg">
                    {player.name}
                    {isYou && <span className="text-muted"> (you)</span>}
                  </span>
                  {player.hasVoted && (
                    <span className="text-lg" title="Has voted" aria-label="has voted">
                      ✅
                    </span>
                  )}
                </span>
                <AnimatePresence>
                  {locked && lockedId === player.id && (
                    <motion.span
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ scale: 3, opacity: 0, rotate: -30 }}
                      animate={{ scale: 1, opacity: 1, rotate: -12 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      aria-hidden
                    >
                      <span className="rounded-xl border-4 border-accent bg-card/90 px-3 py-1 font-display text-3xl text-accent">
                        🔒 LOCKED
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </motion.li>
          );
        })}
      </ul>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t-[3px] border-ink bg-card/95 px-4 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <p className="min-w-0 flex-1 truncate font-hand text-xl">
            {locked
              ? `Vote locked: ${target?.name ?? ''}. Waiting for the others…`
              : target
                ? `Accuse ${target.name}?`
                : 'Tap the player you suspect.'}
          </p>
          <button type="button" className="btn btn-primary !text-2xl" disabled={!selected || locked || sending} onClick={() => void confirm()}>
            {locked ? '🔒 Locked' : 'Lock vote'}
          </button>
        </div>
      </div>
    </div>
  );
}
