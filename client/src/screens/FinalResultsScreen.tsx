import { motion } from 'framer-motion';
import { useState } from 'react';
import { colorOf, type PublicPlayer, type Standing } from '@bluffsketch/shared';
import { Avatar } from '../components/Avatar';
import { Confetti } from '../components/Celebrations';
import { Chat } from '../components/Chat';
import { PlayerBadge } from '../components/PlayerBadge';
import { cn } from '../lib/cn';
import { fetchBestDrawing, leaveRoom, playAgain } from '../lib/net';
import { buildShareImage, shareOrDownload } from '../lib/shareImage';
import { useGame, useRoom } from '../store/gameStore';

const PODIUM_STYLE = [
  { height: 'h-40', color: 'bg-sun', medal: '🥇', order: 'order-2' },
  { height: 'h-28', color: 'bg-sky', medal: '🥈', order: 'order-1' },
  { height: 'h-20', color: 'bg-grape', medal: '🥉', order: 'order-3' },
];

function Podium({ standings, players }: { standings: Standing[]; players: PublicPlayer[] }) {
  const top = standings.slice(0, 3);
  return (
    <ol className="flex items-end justify-center gap-2 sm:gap-4" aria-label="Podium">
      {top.map((standing, i) => {
        const player = players.find((p) => p.id === standing.playerId);
        const style = PODIUM_STYLE[i];
        if (!player) return null;
        return (
          <li key={standing.playerId} className={cn('flex w-28 flex-col items-center sm:w-36', style.order)}>
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 + (2 - i) * 0.35, type: 'spring' }}
              className="flex flex-col items-center"
            >
              <span className="text-4xl" aria-hidden>
                {style.medal}
              </span>
              <Avatar id={player.avatar} size={i === 0 ? 84 : 64} />
              <span className="mt-1 max-w-full truncate font-hand text-xl">{player.name}</span>
              <span className="font-display text-2xl">{standing.score} pts</span>
            </motion.div>
            <motion.div
              className={cn('mt-1 flex w-full items-start justify-center rounded-t-xl border-[3px] border-b-0 border-ink', style.color)}
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              transition={{ delay: (2 - i) * 0.35, duration: 0.5 }}
            >
              <span className={cn('flex w-full items-start justify-center pt-2 font-display text-4xl text-[#2d2a26]', style.height)}>
                {standing.rank}
              </span>
            </motion.div>
          </li>
        );
      })}
    </ol>
  );
}

export function FinalResultsScreen() {
  const room = useRoom();
  const toast = useGame((s) => s.toast);
  const [sharing, setSharing] = useState(false);
  const results = room.finalResults;
  if (!results) return null;
  const others = results.standings.slice(3);

  const share = async () => {
    setSharing(true);
    try {
      const drawing = await fetchBestDrawing();
      const blob = await buildShareImage({ drawing, standings: results.standings, players: room.players, awards: results.awards });
      if (!blob) throw new Error('render failed');
      const how = await shareOrDownload(blob, `bluff-sketch-${room.code}.png`);
      toast(how === 'shared' ? 'Shared!' : 'Image downloaded!', 'success');
    } catch {
      toast('Could not create the image.', 'error');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-16 pt-2 lg:grid-cols-[1.4fr_1fr]">
      <Confetti />
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl">Final results</h1>
          <p className="label-hand">
            {results.endedEarly ? 'The game ended early. ' : ''}
            {results.roundsPlayed} round{results.roundsPlayed === 1 ? '' : 's'} played
          </p>
        </div>

        <Podium standings={results.standings} players={room.players} />

        {others.length > 0 && (
          <ol className="space-y-1" aria-label="Other players">
            {others.map((standing) => {
              const player = room.players.find((p) => p.id === standing.playerId);
              if (!player) return null;
              return (
                <li key={standing.playerId} className="flex items-center gap-3 rounded-xl border-2 border-ink/30 bg-card/80 px-3 py-1">
                  <span className="w-8 font-display text-2xl">{standing.rank}</span>
                  <Avatar id={player.avatar} size={32} />
                  <span className="flex-1 truncate font-hand text-xl">{player.name}</span>
                  <span className="font-display text-2xl">{standing.score}</span>
                </li>
              );
            })}
          </ol>
        )}

        {results.awards.length > 0 && (
          <section aria-labelledby="awards-heading">
            <h2 id="awards-heading" className="mb-3 text-3xl">
              Awards
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {results.awards.map((award, i) => {
                const player = room.players.find((p) => p.id === award.playerId);
                return (
                  <motion.li
                    key={award.id}
                    className="card-sketch relative flex items-center gap-3 p-3"
                    style={{ borderColor: player ? colorOf(player.colorIndex).hex : undefined }}
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: i % 2 === 0 ? -2 : 2 }}
                    transition={{ delay: 1.4 + i * 0.2, type: 'spring', stiffness: 260, damping: 14 }}
                  >
                    <span className="text-5xl" aria-hidden>
                      {award.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-2xl leading-none">{award.title}</p>
                      <p className="flex items-center gap-1 truncate font-hand text-xl">
                        {player && <PlayerBadge colorIndex={player.colorIndex} size={18} />}
                        {player?.name ?? 'A departed player'}
                      </p>
                      <p className="text-sm text-muted">
                        {award.description} · {award.detail}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          {room.you.isHost ? (
            <button type="button" className="btn btn-primary flex-1 !text-2xl" onClick={playAgain}>
              🔁 Play again
            </button>
          ) : (
            <p className="flex-1 self-center font-hand text-xl text-muted">Waiting for the host to start a new game…</p>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => void share()} disabled={sharing}>
            📸 {sharing ? 'Drawing…' : 'Share result'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={leaveRoom}>
            Leave
          </button>
        </div>
      </div>
      <Chat enabled={room.chatEnabled} className="h-96 lg:h-auto" />
    </div>
  );
}
