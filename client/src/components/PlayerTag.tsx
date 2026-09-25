import type { PublicPlayer } from '@bluffsketch/shared';
import { cn } from '../lib/cn';
import { Avatar } from './Avatar';
import { PlayerBadge } from './PlayerBadge';

interface PlayerTagProps {
  player: PublicPlayer;
  size?: 'sm' | 'md';
  isYou?: boolean;
  className?: string;
}

/** Avatar + name + badge, the standard way a player is shown inline. */
export function PlayerTag({ player, size = 'md', isYou = false, className }: PlayerTagProps) {
  const avatarSize = size === 'sm' ? 28 : 40;
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <Avatar id={player.avatar} size={avatarSize} />
      <span className={cn('truncate font-hand', size === 'sm' ? 'text-lg' : 'text-xl')}>
        {player.name}
        {isYou && <span className="ml-1 text-muted">(you)</span>}
      </span>
      <PlayerBadge colorIndex={player.colorIndex} size={size === 'sm' ? 20 : 24} />
    </span>
  );
}
