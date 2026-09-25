import { useEffect, useRef, useSyncExternalStore } from 'react';
import { CANVAS_WIDTH } from '@bluffsketch/shared';
import { cn } from '../lib/cn';
import { strokeModel } from '../store/strokeModel';
import { renderDrawing } from './renderStroke';

interface StrokeThumbnailProps {
  playerId: string;
  className?: string;
  label: string;
}

/** Mini canvas with one player's strokes only (voting cards). */
export function StrokeThumbnail({ playerId, className, label }: StrokeThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const version = useSyncExternalStore(strokeModel.subscribeVersion, strokeModel.getVersion);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cssWidth = canvas.clientWidth || 240;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round((cssWidth * 2 * dpr) / 3);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderDrawing(ctx, strokeModel.forPlayer(playerId), canvas.width / CANVAS_WIDTH);
  }, [playerId, version]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('aspect-[3/2] w-full rounded-lg border-2 border-ink/70 bg-[var(--canvas-paper)]', className)}
      role="img"
      aria-label={label}
    />
  );
}
