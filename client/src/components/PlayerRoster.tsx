import type { PublicPlayer } from '@bluffsketch/shared';
import { cn } from '../lib/cn';
import { Avatar } from './Avatar';
import { PlayerBadge } from './PlayerBadge';

interface PlayerRosterProps {
  players: PublicPlayer[];
  youId: string;
  active: Set<string>;
  layout: 'column' | 'row';
  className?: string;
}

/** Player list with colour badges and a pulse while each person is drawing. */
export function PlayerRoster({ players, youId, active, layout, className }: PlayerRosterProps) {
  return (
    <ul
      aria-label="Players"
      className={cn(
        layout === 'column' ? 'flex flex-col gap-2' : 'scrollbar-thin flex gap-2 overflow-x-auto pb-1',
        className,
      )}
    >
      {players.map((player) => {
        const drawing = active.has(player.id);
        return (
          <li
            key={player.id}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl border-2 border-ink/30 bg-card/80 px-2 py-1',
              !player.connected && 'opacity-50',
              player.id === youId && 'border-ink',
            )}
          >
            <div className="relative">
              <Avatar id={player.avatar} size={32} />
              {drawing && (
                <span className="absolute -right-1 -top-1 h-3.5 w-3.5 animate-drawing rounded-full border-2 border-ink bg-mint" aria-hidden />
              )}
            </div>
            <PlayerBadge colorIndex={player.colorIndex} size={20} />
            <span className={cn('truncate font-hand text-lg', layout === 'column' ? 'max-w-[7.5rem]' : 'max-w-[6rem]')}>
              {player.name}
            </span>
            <span className="sr-only">{drawing ? 'is drawing' : player.connected ? '' : 'disconnected'}</span>
            {layout === 'column' && drawing && <span className="ml-auto text-xs text-muted" aria-hidden>drawing…</span>}
          </li>
        );
      })}
    </ul>
  );
}
