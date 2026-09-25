import { useEffect, useState } from 'react';
import { serverNow } from '../lib/clock';

const msUntil = (endsAt: number | null) => (endsAt === null ? 0 : Math.max(0, endsAt - serverNow()));

/** Milliseconds left until a server timestamp, refreshed every `intervalMs`. */
export function useCountdown(endsAt: number | null, intervalMs = 100): number {
  const [left, setLeft] = useState(() => msUntil(endsAt));

  useEffect(() => {
    setLeft(msUntil(endsAt));
    if (endsAt === null) return undefined;
    const id = window.setInterval(() => setLeft(msUntil(endsAt)), intervalMs);
    return () => window.clearInterval(id);
  }, [endsAt, intervalMs]);

  return left;
}

/** Milliseconds elapsed since a server timestamp. */
export function useElapsed(since: number, intervalMs = 100): number {
  const [elapsed, setElapsed] = useState(() => Math.max(0, serverNow() - since));
  useEffect(() => {
    setElapsed(Math.max(0, serverNow() - since));
    const id = window.setInterval(() => setElapsed(Math.max(0, serverNow() - since)), intervalMs);
    return () => window.clearInterval(id);
  }, [since, intervalMs]);
  return elapsed;
}
