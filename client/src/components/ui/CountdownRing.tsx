import { cn } from '../../lib/cn';
import { useCountdown } from '../../hooks/useCountdown';

interface CountdownRingProps {
  endsAt: number | null;
  totalMs: number;
  size?: number;
  className?: string;
  label?: string;
}

/** Circular timer. Turns red and wiggles in the final five seconds. */
export function CountdownRing({ endsAt, totalMs, size = 64, className, label = 'Time left' }: CountdownRingProps) {
  const left = useCountdown(endsAt);
  const seconds = Math.ceil(left / 1000);
  const fraction = totalMs > 0 ? Math.min(1, left / totalMs) : 0;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  // Short phases (role reveal) would be "urgent" the whole time, so only flag long ones.
  const urgent = seconds <= 5 && left > 0 && totalMs > 10_000;

  return (
    <div
      className={cn('relative shrink-0', urgent && 'animate-wiggle', className)}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={`${label}: ${seconds} seconds`}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={radius} fill="rgb(var(--card))" stroke="rgb(var(--ink))" strokeWidth="4" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={urgent ? 'rgb(var(--danger))' : 'rgb(var(--mint))'}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center font-display',
          urgent ? 'text-danger' : 'text-ink',
        )}
        style={{ fontSize: size * 0.4 }}
        aria-hidden
      >
        {seconds}
      </span>
    </div>
  );
}
