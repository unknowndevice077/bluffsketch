import { useEffect, useRef } from 'react';
import { cn } from '../lib/cn';
import { strokeModel } from '../store/strokeModel';
import { LayerCompositor } from './LayerCompositor';
import { useElementSize } from './useCanvasSize';
import { useStrokeInput, type StrokeInputOptions } from './useStrokeInput';

interface DrawingBoardProps extends StrokeInputOptions {
  /** Layer stacking order (player ids). */
  order: string[];
  /** Blind draw: show only your own strokes. */
  blind: boolean;
  className?: string;
}

/** The live shared canvas: renders everyone's strokes and captures yours. */
export function DrawingBoard({ order, blind, className, ...input }: DrawingBoardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compositorRef = useRef<LayerCompositor | null>(null);
  const size = useElementSize(wrapRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const compositor = new LayerCompositor(canvas);
    compositorRef.current = compositor;
    const unsubscribe = strokeModel.subscribe((event) => {
      if (event.type === 'append') compositor.drawRange(event.stroke, event.from);
      else if (event.type === 'reset') compositor.rebuild(strokeModel.all());
      else compositor.rebuild(strokeModel.all(), undefined, new Set(event.playerIds));
    });
    return () => {
      unsubscribe();
      compositor.dispose();
      compositorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const compositor = compositorRef.current;
    if (!compositor || size.width === 0) return;
    if (compositor.resize(size.width, size.height)) compositor.rebuild(strokeModel.all());
  }, [size.width, size.height]);

  const { playerId } = input;
  useEffect(() => {
    compositorRef.current?.setVisibility(blind ? (id) => id === playerId : () => true);
  }, [blind, playerId]);

  const orderKey = order.join(',');
  useEffect(() => {
    compositorRef.current?.setOrder(orderKey ? orderKey.split(',') : []);
  }, [orderKey]);

  useStrokeInput(canvasRef, input);

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative aspect-[3/2] w-full overflow-hidden rounded-2xl border-[3px] border-ink bg-[var(--canvas-paper)] shadow-sketch',
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        className={cn('absolute inset-0 h-full w-full touch-none', input.enabled ? 'cursor-crosshair' : 'cursor-not-allowed')}
        role="img"
        aria-label={input.enabled ? 'Shared drawing canvas. Draw with mouse, finger or stylus.' : 'Shared drawing canvas'}
      />
    </div>
  );
}
