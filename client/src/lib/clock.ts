import { socket } from './socket';

let offsetMs = 0;
let bestRoundTrip = Number.POSITIVE_INFINITY;

/** Current time on the server's clock. All countdowns are derived from this. */
export function serverNow(): number {
  return Date.now() + offsetMs;
}

/**
 * NTP-style sync: keep the sample with the shortest round trip, since it has
 * the least asymmetric latency baked in.
 */
export async function syncClock(samples = 5): Promise<void> {
  bestRoundTrip = Number.POSITIVE_INFINITY;
  for (let i = 0; i < samples; i++) {
    try {
      const sentAt = Date.now();
      const { serverNow: remote } = await socket.timeout(3_000).emitWithAck('time:sync');
      const receivedAt = Date.now();
      const roundTrip = receivedAt - sentAt;
      if (roundTrip < bestRoundTrip) {
        bestRoundTrip = roundTrip;
        offsetMs = remote + roundTrip / 2 - receivedAt;
      }
    } catch {
      // A lost sample is fine; we keep whatever we have.
    }
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
}

/** Rough fallback from a state snapshot, used only before the first proper sync. */
export function hintServerTime(remoteNow: number): void {
  if (bestRoundTrip === Number.POSITIVE_INFINITY) offsetMs = remoteNow - Date.now();
}
