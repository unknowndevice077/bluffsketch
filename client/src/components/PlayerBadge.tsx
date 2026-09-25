import { useId, type ReactElement } from 'react';
import { colorOf, type PlayerPattern } from '@bluffsketch/shared';
import { cn } from '../lib/cn';

const MARK = 'rgba(255,255,255,0.85)';

/** Pattern tiles on a 6x6 grid: a second, non-colour cue for each player. */
const PATTERNS: Record<PlayerPattern, ReactElement | null> = {
  solid: null,
  dots: <circle cx="3" cy="3" r="1.2" fill={MARK} />,
  stripes: <path d="M-1 7 L7 -1" stroke={MARK} strokeWidth="1.4" />,
  checks: <rect width="3" height="3" fill={MARK} />,
  zigzag: <path d="M0 4 L1.5 2 L3 4 L4.5 2 L6 4" fill="none" stroke={MARK} strokeWidth="1" />,
  cross: <path d="M3 1 L3 5 M1 3 L5 3" stroke={MARK} strokeWidth="1.1" />,
  rings: <circle cx="3" cy="3" r="1.8" fill="none" stroke={MARK} strokeWidth="0.9" />,
  triangles: <path d="M3 1 L5 5 L1 5 Z" fill={MARK} />,
  waves: <path d="M0 3 Q1.5 1 3 3 T6 3" fill="none" stroke={MARK} strokeWidth="1" />,
  grid: <path d="M0 0 L6 0 M0 0 L0 6" stroke={MARK} strokeWidth="1" />,
};

interface PlayerBadgeProps {
  colorIndex: number;
  size?: number;
  className?: string;
  /** Hide the number (e.g. inside tiny dots). */
  plain?: boolean;
}

/** Colour swatch + pattern + player number, so colour is never the only cue. */
export function PlayerBadge({ colorIndex, size = 28, className, plain = false }: PlayerBadgeProps) {
  // React ids contain ':' which some browsers reject inside url(#...).
  const patternId = `pb${useId().replace(/:/g, '')}`;
  const color = colorOf(colorIndex);
  const pattern = PATTERNS[color.pattern];
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      role="img"
      aria-label={`${color.name} ${color.pattern} badge, player ${colorIndex + 1}`}
    >
      {pattern && (
        <defs>
          <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse">
            {pattern}
          </pattern>
        </defs>
      )}
      <circle cx="16" cy="16" r="14" fill={color.hex} stroke="#2d2a26" strokeWidth="2.5" />
      {pattern && <circle cx="16" cy="16" r="12.5" fill={`url(#${patternId})`} />}
      {!plain && (
        <text
          x="16"
          y="21"
          textAnchor="middle"
          fontFamily="Nunito, sans-serif"
          fontWeight="900"
          fontSize="14"
          fill="#fff"
          stroke="#2d2a26"
          strokeWidth="3"
          paintOrder="stroke"
        >
          {colorIndex + 1}
        </text>
      )}
    </svg>
  );
}
