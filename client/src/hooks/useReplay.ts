import { useEffect, useMemo, useRef, useState } from 'react';
import type { Stroke } from '@bluffsketch/shared';
import { buildTimeline, visibleCount, type ReplayTimeline } from '../canvas/replayTimeline';

export const REPLAY_SPEEDS = [1, 2, 4] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

export interface ReplayControls {
  timeline: ReplayTimeline;
  time: number;
  playing: boolean;
  speed: ReplaySpeed;
  /** Players whose ink is appearing right now. */
  drawingNow: Set<string>;
  togglePlay: () => void;
  setSpeed: (speed: ReplaySpeed) => void;
  seek: (time: number) => void;
}

/** Local replay clock. Each viewer controls their own playback. */
export function useReplay(strokes: readonly Stroke[], reduced: boolean): ReplayControls {
  const timeline = useMemo(() => buildTimeline(strokes), [strokes]);
  // Reduced motion: show the finished drawing immediately instead of animating it.
  const [time, setTime] = useState(() => (reduced ? timeline.duration : 0));
  const [playing, setPlaying] = useState(!reduced);
  const [speed, setSpeed] = useState<ReplaySpeed>(2);
  const timeRef = useRef(time);
  timeRef.current = time;

  useEffect(() => {
    if (!playing) return undefined;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(timeline.duration, timeRef.current + (now - last) * speed);
      last = now;
      setTime(next);
      if (next >= timeline.duration) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, timeline.duration]);

  const drawingNow = useMemo(() => {
    const ids = new Set<string>();
    if (!playing) return ids;
    for (const stroke of strokes) {
      const times = timeline.pointTimes.get(stroke.id) ?? [];
      const count = visibleCount(times, time);
      if (count > 0 && count < times.length) ids.add(stroke.playerId);
      else if (count > 0 && time - times[count - 1] < 250) ids.add(stroke.playerId);
    }
    return ids;
  }, [strokes, timeline, time, playing]);

  return {
    timeline,
    time,
    playing,
    speed,
    drawingNow,
    togglePlay: () => {
      if (!playing && timeRef.current >= timeline.duration) setTime(0);
      setPlaying(!playing);
    },
    setSpeed,
    seek: (next) => setTime(Math.min(timeline.duration, Math.max(0, next))),
  };
}
