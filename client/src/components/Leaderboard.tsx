import { motion } from 'framer-motion';
import { colorOf, type PublicPlayer, type Standing } from '@bluffsketch/shared';
import { cn } from '../lib/cn';
import { PlayerTag } from './PlayerTag';

interface LeaderboardProps {
  players: PublicPlayer[];
  before: Standing[];
  after: Standing[];
  deltas: Record<string, number>;
  youId: string;
  highlightId?: string | null;
}

/** Bars grow from the old score to the new one; arrows show rank movement. */
export function Leaderboard({ players, before, after, deltas, youId, highlightId }: LeaderboardProps) {
  const maxScore = Math.max(1, ...after.map((s) => s.score));
  // Everyone tied before (e.g. round 1): rank arrows would just be noise.
  const hadOrder = new Set(before.map((s) => s.score)).size > 1;
  const rows = after
    .map((standing) => ({ standing, player: players.find((p) => p.id === standing.playerId) }))
    .filter((row): row is { standing: Standing; player: PublicPlayer } => row.player !== undefined);

  return (
    <ol className="space-y-2" aria-label="Leaderboard">
      {rows.map(({ standing, player }, index) => {
        const previous = before.find((s) => s.playerId === player.id);
        const previousScore = previous?.score ?? 0;
        const movement = previous && hadOrder ? previous.rank - standing.rank : 0;
        const delta = deltas[player.id] ?? 0;
        return (
          <motion.li
            key={player.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className={cn(
              'card-sketch flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2',
              player.id === highlightId && 'ring-4 ring-sun',
            )}
            aria-label={`Rank ${standing.rank}: ${player.name}, ${standing.score} points${delta ? `, gained ${delta}` : ''}${movement > 0 ? `, up ${movement}` : movement < 0 ? `, down ${-movement}` : ''}`}
          >
            <span className="w-8 font-display text-3xl">{standing.rank}</span>
            <span className="w-6 text-center text-lg" aria-hidden>
              {movement > 0 ? <span className="text-mint">▲</span> : movement < 0 ? <span className="text-danger">▼</span> : <span className="text-muted">•</span>}
            </span>
            <PlayerTag player={player} size="sm" isYou={player.id === youId} className="min-w-[8rem] flex-1" />
            <div className="order-last h-4 w-full overflow-hidden rounded-full border-2 border-ink bg-paper sm:order-none sm:w-40">
              <motion.div
                className="h-full"
                style={{ backgroundColor: colorOf(player.colorIndex).hex }}
                initial={{ width: `${(previousScore / maxScore) * 100}%` }}
                animate={{ width: `${(standing.score / maxScore) * 100}%` }}
                transition={{ delay: 0.4 + index * 0.08, duration: 0.9, ease: 'easeOut' }}
              />
            </div>
            <span className="w-12 text-right font-display text-2xl">{standing.score}</span>
            {delta !== 0 && (
              <motion.span
                className="rounded-full border-2 border-ink bg-sun px-2 font-bold text-[#2d2a26]"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.9 + index * 0.08, type: 'spring' }}
              >
                +{delta}
              </motion.span>
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}
