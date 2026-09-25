import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { PLAYER_LIMITS, type PublicPlayer } from '@bluffsketch/shared';
import { Avatar } from '../components/Avatar';
import { Chat } from '../components/Chat';
import { HowToPlay } from '../components/HowToPlay';
import { PlayerBadge } from '../components/PlayerBadge';
import { SettingsPanel } from '../components/SettingsPanel';
import { cn } from '../lib/cn';
import { kickPlayer, setReady, shareLinkFor, startGame } from '../lib/net';
import { useGame, useRoom } from '../store/gameStore';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function PlayerCard({ player, isYou, canKick, index }: { player: PublicPlayer; isYou: boolean; canKick: boolean; index: number }) {
  return (
    <motion.li
      layout
      initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: player.connected ? 1 : 0.5, rotate: index % 2 === 0 ? -1.5 : 1.5 }}
      exit={{ scale: 0.6, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn('card-sketch relative flex flex-col items-center gap-1 p-3 text-center', isYou && 'ring-4 ring-sun')}
    >
      {player.isHost && (
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-3xl" role="img" aria-label="Host">
          👑
        </span>
      )}
      <Avatar id={player.avatar} size={64} />
      <span className="flex max-w-full items-center gap-1">
        <span className="truncate font-hand text-xl">{player.name}</span>
        <PlayerBadge colorIndex={player.colorIndex} size={22} />
      </span>
      <span
        className={cn(
          'rounded-full border-2 border-ink px-2 text-sm font-bold',
          !player.connected ? 'bg-card text-muted' : player.isReady || player.isHost ? 'bg-mint text-[#12352a]' : 'bg-card text-muted',
        )}
      >
        {!player.connected ? 'reconnecting…' : player.isHost ? 'host' : player.isReady ? '✓ ready' : 'not ready'}
      </span>
      {canKick && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Remove ${player.name} from the room?`)) kickPlayer(player.id);
          }}
          className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-accent/20 hover:text-danger"
          aria-label={`Kick ${player.name}`}
        >
          ✕
        </button>
      )}
    </motion.li>
  );
}

export function LobbyScreen() {
  const room = useRoom();
  const chatEnabled = useGame((s) => s.room?.chatEnabled ?? false);
  const toast = useGame((s) => s.toast);
  const [howOpen, setHowOpen] = useState(false);
  const me = room.players.find((p) => p.id === room.you.playerId);
  const connected = room.players.filter((p) => p.connected).length;
  const missing = Math.max(0, PLAYER_LIMITS.minToStart - connected);
  const notReady = room.players.filter((p) => !p.isReady && !p.isHost).length;
  const link = shareLinkFor(room.code);

  const copy = async (text: string, what: string) => {
    if (await copyText(text)) toast(`${what} copied!`, 'success');
    else toast(`Could not copy. ${what}: ${text}`, 'warn');
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Bluff Sketch', text: `Join my Bluff Sketch room: ${room.code}`, url: link });
        return;
      } catch {
        // Cancelled share sheet: fall through to copy.
      }
    }
    await copy(link, 'Invite link');
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 pb-16 pt-2 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-5">
        <section className="card-sketch flex flex-wrap items-center justify-between gap-3 p-4" aria-label="Room code">
          <div>
            <p className="label-hand">Room code</p>
            <p className="font-display text-5xl tracking-[0.2em] sm:text-6xl" aria-label={`Room code ${room.code.split('').join(' ')}`}>
              {room.code}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => void copy(room.code, 'Room code')}>
              📋 Code
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => void share()}>
              🔗 Invite link
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setHowOpen(true)} aria-label="How to play">
              ❓
            </button>
          </div>
        </section>

        <section aria-labelledby="players-heading">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="players-heading" className="text-3xl">
              Players {room.players.length}/{room.settings.maxPlayers}
            </h2>
            {missing > 0 && <span className="label-hand">Need {missing} more to start</span>}
          </div>
          <ul className="grid grid-cols-2 gap-4 pt-3 sm:grid-cols-3 md:grid-cols-4">
            <AnimatePresence>
              {room.players.map((player, index) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  index={index}
                  isYou={player.id === room.you.playerId}
                  canKick={room.you.isHost && player.id !== room.you.playerId}
                />
              ))}
            </AnimatePresence>
          </ul>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          {me && !me.isHost && (
            <button
              type="button"
              className={cn('btn flex-1 !text-2xl', me.isReady ? 'btn-ghost' : 'btn-mint')}
              onClick={() => setReady(!me.isReady)}
              aria-pressed={me.isReady}
            >
              {me.isReady ? 'Not ready after all' : "✋ I'm ready!"}
            </button>
          )}
          {room.you.isHost ? (
            <div className="flex flex-1 flex-col gap-1">
              <button type="button" className="btn btn-primary w-full !text-2xl" onClick={() => void startGame()} disabled={missing > 0}>
                🎨 Start game
              </button>
              <p className="text-center text-sm text-muted">
                {missing > 0
                  ? `At least ${PLAYER_LIMITS.minToStart} players needed.`
                  : notReady > 0
                    ? `${notReady} player${notReady === 1 ? ' is' : 's are'} not ready yet, but you can start anyway.`
                    : 'Everyone is ready!'}
              </p>
            </div>
          ) : (
            <p className="flex-1 text-center font-hand text-xl text-muted">Waiting for the host to start…</p>
          )}
        </div>

        {/* Under the start button: fills the left column on desktop and stays near the players on mobile. */}
        <Chat enabled={chatEnabled} className="h-80" />
      </div>

      {/* Wrapper keeps the card at its natural height instead of stretching to the grid row. */}
      <div>
        <SettingsPanel
          settings={room.settings}
          customPairCount={room.customPairCount}
          isHost={room.you.isHost}
          playerCount={room.players.length}
        />
      </div>
      <HowToPlay open={howOpen} onClose={() => setHowOpen(false)} />
    </div>
  );
}
