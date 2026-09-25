import { useEffect, useState } from 'react';
import { strokeModel } from '../store/strokeModel';

/** Ids of players who drew in the last moment, for the "drawing…" pulse. */
export function useDrawingActivity(enabled: boolean): Set<string> {
  const [active, setActive] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!enabled) {
      setActive(new Set());
      return undefined;
    }
    const id = window.setInterval(() => {
      const next = strokeModel.activePlayers();
      setActive((prev) => (prev.size === next.size && [...next].every((p) => prev.has(p)) ? prev : next));
    }, 250);
    return () => window.clearInterval(id);
  }, [enabled]);
  return active;
}
