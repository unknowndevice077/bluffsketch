import { useGame } from '../store/gameStore';

/** Screen-reader only live region for phase changes and notices. */
export function LiveAnnouncer() {
  const announcement = useGame((s) => s.announcement);
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  );
}
