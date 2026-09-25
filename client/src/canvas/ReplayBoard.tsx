import { useEffect, useRef } from 'react';
import type { Stroke } from '@bluffsketch/shared';
import { cn } from '../lib/cn';
import { LayerCompositor } from './LayerCompositor';
import { visibleCount, type ReplayTimeline } from './replayTimeline';
import { useElementSize } from './useCanvasSize';

interface ReplayBoardProps {
  strokes: readonly Stroke[];
  timeline: ReplayTimeline;
  time: number;
  order: string[];
  isVisible: (playerId: string) => boolean;
  className?: string;
}

/**
 * Replays strokes up to `time`. Moving forward only draws the new points;
 * moving backwards (scrubbing) rebuilds from scratch.
 */
export function ReplayBoard({ strokes, timeline, time, order, isVisible, className }: ReplayBoardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compositorRef = useRef<LayerCompositor | null>(null);
  const drawn = useRef(new Map<string, number>());
  const lastTime = useRef(-1);
  const size = useElementSize(wrapRef);

  const countAt = (stroke: Stroke, t: number) => visibleCount(timeline.pointTimes.get(stroke.id) ?? [], t);

  const rebuildAt = (t: number) => {
    const compositor = compositorRef.current;
    if (!compositor) return;
    drawn.current = new Map(strokes.map((s) => [s.id, countAt(s, t)]));
    compositor.rebuild(strokes, (s) => drawn.current.get(s.id) ?? 0);
    lastTime.current = t;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const compositor = new LayerCompositor(canvas);
    compositorRef.current = compositor;
    return () => {
      compositor.dispose();
      compositorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const compositor = compositorRef.current;
    if (!compositor || size.width === 0) return;
    compositor.resize(size.width, size.height);
    rebuildAt(time);
  }, [size.width, size.height, strokes, timeline]);

  useEffect(() => {
    const compositor = compositorRef.current;
    if (!compositor || size.width === 0) return;
    if (time < lastTime.current) {
      rebuildAt(time);
      return;
    }
    for (const stroke of strokes) {
      const previous = drawn.current.get(stroke.id) ?? 0;
      const next = countAt(stroke, time);
      if (next > previous) {
        compositor.drawRange(stroke, previous, next);
        drawn.current.set(stroke.id, next);
      }
    }
    lastTime.current = time;
  }, [time]);

  useEffect(() => {
    compositorRef.current?.setVisibility(isVisible);
  }, [isVisible]);

  const orderKey = order.join(',');
  useEffect(() => {
    compositorRef.current?.setOrder(orderKey ? orderKey.split(',') : []);
  }, [orderKey]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative aspect-[3/2] w-full overflow-hidden rounded-2xl border-[3px] border-ink bg-[var(--canvas-paper)] shadow-sketch',
        className,
      )}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label="Replay of the round's drawing" />
    </div>
  );
}
