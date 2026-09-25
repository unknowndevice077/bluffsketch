import { TIMINGS, type Stroke } from '@bluffsketch/shared';

export interface ReplayTimeline {
  /** Total replay length in ms at x1 speed. */
  duration: number;
  /** Per stroke, the replay time at which each point appears (ascending). */
  pointTimes: Map<string, number[]>;
}

/**
 * Maps real drawing time onto replay time. Everyone's strokes play back
 * exactly as they happened, simultaneously and in order, but idle gaps longer
 * than TIMINGS.replayMaxGapMs are squeezed so nobody watches a blank page.
 */
export function buildTimeline(strokes: readonly Stroke[]): ReplayTimeline {
  const absolute = new Set<number>();
  for (const stroke of strokes) for (const point of stroke.points) absolute.add(stroke.startedAt + point[3]);
  const sorted = [...absolute].sort((a, b) => a - b);

  const compressed = new Map<number, number>();
  let clock = 0;
  sorted.forEach((time, i) => {
    if (i > 0) clock += Math.min(time - sorted[i - 1], TIMINGS.replayMaxGapMs);
    compressed.set(time, clock);
  });

  const pointTimes = new Map<string, number[]>();
  for (const stroke of strokes) {
    pointTimes.set(
      stroke.id,
      stroke.points.map((point) => compressed.get(stroke.startedAt + point[3]) ?? 0),
    );
  }
  return { duration: clock, pointTimes };
}

/** Number of points of `times` visible at replay time `t` (binary search). */
export function visibleCount(times: readonly number[], t: number): number {
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const midIndex = (lo + hi) >> 1;
    if (times[midIndex] <= t) lo = midIndex + 1;
    else hi = midIndex;
  }
  return lo;
}
