import type { StrokePoint } from './types.js';

/** Path length in logical pixels, used for the ink limit on client and server. */
export function pathLength(points: readonly StrokePoint[], previous?: StrokePoint): number {
  let length = 0;
  let last = previous;
  for (const point of points) {
    if (last) length += Math.hypot(point[0] - last[0], point[1] - last[1]);
    last = point;
  }
  return length;
}
