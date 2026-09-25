import type { ReactElement } from 'react';
import type { AvatarId } from '@bluffsketch/shared';
import { cn } from '../lib/cn';

const INK = '#2d2a26';
const line = { stroke: INK, strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const Eyes = ({ y = 30, gap = 9, r = 2.6 }: { y?: number; gap?: number; r?: number }) => (
  <>
    <circle cx={32 - gap} cy={y} r={r} fill={INK} />
    <circle cx={32 + gap} cy={y} r={r} fill={INK} />
  </>
);

/** Twelve hand-drawn doodles on a 64x64 grid. */
const DOODLES: Record<AvatarId, { bg: string; art: ReactElement }> = {
  cat: {
    bg: '#ffd7a8',
    art: (
      <>
        <path d="M14 26 L16 10 L27 19 M50 26 L48 10 L37 19" fill="#f4a261" {...line} />
        <ellipse cx="32" cy="36" rx="19" ry="16" fill="#f4a261" {...line} />
        <Eyes y={33} />
        <path d="M29 39 L32 41 L35 39 M32 41 L32 44" fill="none" {...line} />
        <path d="M12 38 L22 40 M12 44 L22 43 M52 38 L42 40 M52 44 L42 43" {...line} strokeWidth={2} />
      </>
    ),
  },
  dog: {
    bg: '#cde7ff',
    art: (
      <>
        <ellipse cx="32" cy="35" rx="17" ry="17" fill="#d9a066" {...line} />
        <path d="M16 22 C8 26 9 42 15 44 C19 40 19 30 18 24 Z M48 22 C56 26 55 42 49 44 C45 40 45 30 46 24 Z" fill="#8c5a2b" {...line} />
        <Eyes y={31} gap={7} />
        <ellipse cx="32" cy="40" rx="4.5" ry="3.2" fill={INK} />
        <path d="M32 43 C32 47 28 48 27 46 M32 43 C32 47 36 48 37 46" fill="none" {...line} strokeWidth={2} />
      </>
    ),
  },
  fox: {
    bg: '#ffe9a8',
    art: (
      <>
        <path d="M13 14 L22 24 M51 14 L42 24" {...line} />
        <path d="M12 14 L32 50 L52 14 L40 22 L24 22 Z" fill="#f07b3f" {...line} />
        <path d="M20 32 L32 50 L44 32 C38 36 26 36 20 32 Z" fill="#fff6e8" {...line} strokeWidth={2.5} />
        <Eyes y={28} gap={8} r={2.4} />
        <circle cx="32" cy="47" r="2.6" fill={INK} />
      </>
    ),
  },
  owl: {
    bg: '#e3d7ff',
    art: (
      <>
        <path d="M14 18 L22 22 M50 18 L42 22" {...line} />
        <ellipse cx="32" cy="36" rx="18" ry="19" fill="#9c7a5b" {...line} />
        <circle cx="24" cy="31" r="7" fill="#fff" {...line} />
        <circle cx="40" cy="31" r="7" fill="#fff" {...line} />
        <circle cx="24" cy="31" r="3" fill={INK} />
        <circle cx="40" cy="31" r="3" fill={INK} />
        <path d="M29 38 L32 44 L35 38 Z" fill="#ffc93c" {...line} strokeWidth={2} />
        <path d="M24 49 L27 47 L30 49 M34 49 L37 47 L40 49" fill="none" {...line} strokeWidth={2} />
      </>
    ),
  },
  frog: {
    bg: '#d6f5c9',
    art: (
      <>
        <circle cx="21" cy="21" r="7" fill="#6cc24a" {...line} />
        <circle cx="43" cy="21" r="7" fill="#6cc24a" {...line} />
        <ellipse cx="32" cy="38" rx="21" ry="14" fill="#6cc24a" {...line} />
        <circle cx="21" cy="21" r="2.8" fill={INK} />
        <circle cx="43" cy="21" r="2.8" fill={INK} />
        <path d="M20 40 C26 46 38 46 44 40" fill="none" {...line} />
        <circle cx="18" cy="36" r="2" fill="#ff8fa3" />
        <circle cx="46" cy="36" r="2" fill="#ff8fa3" />
      </>
    ),
  },
  bear: {
    bg: '#ffd9d0',
    art: (
      <>
        <circle cx="17" cy="19" r="7" fill="#a0673f" {...line} />
        <circle cx="47" cy="19" r="7" fill="#a0673f" {...line} />
        <circle cx="32" cy="35" r="18" fill="#a0673f" {...line} />
        <ellipse cx="32" cy="41" rx="8" ry="6" fill="#e8c39e" {...line} strokeWidth={2.5} />
        <Eyes y={31} gap={8} />
        <ellipse cx="32" cy="38.5" rx="3" ry="2.2" fill={INK} />
        <path d="M29 43 C31 45 33 45 35 43" fill="none" {...line} strokeWidth={2} />
      </>
    ),
  },
  robot: {
    bg: '#d4f1f4',
    art: (
      <>
        <path d="M32 8 L32 16" {...line} />
        <circle cx="32" cy="8" r="3" fill="#ff5a5f" {...line} strokeWidth={2} />
        <rect x="14" y="16" width="36" height="32" rx="7" fill="#b8c4cc" {...line} />
        <rect x="20" y="24" width="9" height="8" rx="2" fill="#48b0f7" {...line} strokeWidth={2.5} />
        <rect x="35" y="24" width="9" height="8" rx="2" fill="#48b0f7" {...line} strokeWidth={2.5} />
        <path d="M22 40 L26 40 M29 40 L35 40 M38 40 L42 40" {...line} />
        <path d="M10 28 L14 28 M50 28 L54 28" {...line} />
      </>
    ),
  },
  ghost: {
    bg: '#e8e3f7',
    art: (
      <>
        <path
          d="M15 50 L15 30 C15 18 22 12 32 12 C42 12 49 18 49 30 L49 50 L43 45 L38 50 L32 45 L26 50 L21 45 Z"
          fill="#ffffff"
          {...line}
        />
        <ellipse cx="25" cy="29" rx="3" ry="4.5" fill={INK} />
        <ellipse cx="39" cy="29" rx="3" ry="4.5" fill={INK} />
        <ellipse cx="32" cy="38" rx="3.5" ry="4" fill={INK} />
      </>
    ),
  },
  alien: {
    bg: '#fff3b0',
    art: (
      <>
        <path d="M24 16 L19 7 M40 16 L45 7" {...line} />
        <circle cx="19" cy="7" r="2.6" fill="#8ce26a" {...line} strokeWidth={2} />
        <circle cx="45" cy="7" r="2.6" fill="#8ce26a" {...line} strokeWidth={2} />
        <path d="M32 14 C46 14 52 24 50 34 C48 44 40 52 32 52 C24 52 16 44 14 34 C12 24 18 14 32 14 Z" fill="#8ce26a" {...line} />
        <ellipse cx="23" cy="32" rx="6" ry="4" transform="rotate(25 23 32)" fill={INK} />
        <ellipse cx="41" cy="32" rx="6" ry="4" transform="rotate(-25 41 32)" fill={INK} />
        <path d="M28 44 C30 45.5 34 45.5 36 44" fill="none" {...line} strokeWidth={2} />
      </>
    ),
  },
  penguin: {
    bg: '#cfe8ff',
    art: (
      <>
        <ellipse cx="32" cy="35" rx="18" ry="19" fill="#34363f" {...line} />
        <path d="M32 22 C42 22 45 32 43 40 C41 48 36 52 32 52 C28 52 23 48 21 40 C19 32 22 22 32 22 Z" fill="#ffffff" {...line} strokeWidth={2.5} />
        <circle cx="27" cy="31" r="2.4" fill={INK} />
        <circle cx="37" cy="31" r="2.4" fill={INK} />
        <path d="M28 36 L32 40 L36 36 Z" fill="#ffb347" {...line} strokeWidth={2} />
      </>
    ),
  },
  cactus: {
    bg: '#ffe0ec',
    art: (
      <>
        <path d="M20 46 L44 46 L41 56 L23 56 Z" fill="#d9774b" {...line} />
        <path d="M25 46 L25 20 C25 12 39 12 39 20 L39 46" fill="#5bbf73" {...line} />
        <path d="M25 34 L18 34 C14 34 14 24 18 24 M39 30 L46 30 C50 30 50 20 46 20" fill="none" {...line} />
        <Eyes y={27} gap={4} r={2} />
        <path d="M29.5 32 C31 33.5 33 33.5 34.5 32" fill="none" {...line} strokeWidth={2} />
        <path d="M28 40 L29 39 M35 38 L36 37 M30 18 L31 17" {...line} strokeWidth={2} />
      </>
    ),
  },
  octopus: {
    bg: '#d2f4ea',
    art: (
      <>
        <path
          d="M14 44 C16 38 18 36 20 36 M50 44 C48 38 46 36 44 36 M22 50 C24 44 25 40 26 38 M42 50 C40 44 39 40 38 38 M32 52 L32 40"
          fill="none"
          {...line}
          stroke="#8e6cef"
          strokeWidth={5}
        />
        <path d="M32 10 C45 10 50 20 49 30 C48 38 41 40 32 40 C23 40 16 38 15 30 C14 20 19 10 32 10 Z" fill="#8e6cef" {...line} />
        <Eyes y={26} gap={7} r={3} />
        <path d="M28 33 C30 35 34 35 36 33" fill="none" {...line} strokeWidth={2} />
      </>
    ),
  },
};

interface AvatarProps {
  id: AvatarId;
  size?: number;
  className?: string;
  title?: string;
}

export function Avatar({ id, size = 48, className, title }: AvatarProps) {
  const doodle = DOODLES[id];
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx="32" cy="32" r="30" fill={doodle.bg} stroke={INK} strokeWidth={3} />
      {doodle.art}
    </svg>
  );
}
