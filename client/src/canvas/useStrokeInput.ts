import { useEffect, useRef, type RefObject } from 'react';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DRAW,
  TIMINGS,
  type StrokePoint,
  type StrokeTool,
} from '@bluffsketch/shared';
import { serverNow } from '../lib/clock';
import { sendStrokeBatch } from '../lib/net';
import { sound } from '../lib/sound';
import { useDraw } from '../store/drawStore';
import { useGame } from '../store/gameStore';
import { strokeModel } from '../store/strokeModel';

export interface StrokeInputOptions {
  enabled: boolean;
  playerId: string;
  colorIndex: number;
  /** Server timestamp when DRAWING began, for stroke start times. */
  drawingStartedAt: number;
  inkLimit: number | null;
}

interface ActiveStroke {
  id: string;
  tool: StrokeTool;
  sizeIndex: number;
  pointerId: number;
  startStamp: number;
  pending: StrokePoint[];
  last: StrokePoint | null;
  flushTimer: number;
}

// Time-based prefix keeps ids unique across page reloads within a round.
let sequence = 0;
const nextStrokeId = (playerId: string) => `${playerId}:${Date.now().toString(36)}${(sequence++).toString(36)}`;

/**
 * Pointer Events handle mouse, touch and pen uniformly. Coalesced events
 * recover the samples browsers merge between frames, so fast strokes stay
 * smooth. Points go to the local model immediately and are streamed to the
 * server in ~30 ms batches.
 */
export function useStrokeInput(canvasRef: RefObject<HTMLCanvasElement>, options: StrokeInputOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const finishRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let active: ActiveStroke | null = null;

    const toPoint = (event: PointerEvent, startStamp: number): StrokePoint => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
      const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
      const pressure = event.pointerType === 'pen' && event.pressure > 0 ? event.pressure : 0.5;
      return [
        Math.round(Math.min(CANVAS_WIDTH, Math.max(0, x)) * 10) / 10,
        Math.round(Math.min(CANVAS_HEIGHT, Math.max(0, y)) * 10) / 10,
        Math.round(pressure * 100) / 100,
        Math.max(0, Math.round(event.timeStamp - startStamp)),
      ];
    };

    const flush = (done: boolean) => {
      if (!active) return;
      const batch = active.pending.splice(0);
      for (let i = 0; i < batch.length || (done && i === 0); i += DRAW.maxPointsPerBatch) {
        const chunk = batch.slice(i, i + DRAW.maxPointsPerBatch);
        const isLast = i + DRAW.maxPointsPerBatch >= batch.length;
        if (chunk.length === 0 && !done) break;
        sendStrokeBatch({ strokeId: active.id, tool: active.tool, sizeIndex: active.sizeIndex, points: chunk, done: done && isLast });
      }
    };

    /** Returns false when the ink ran out. */
    const addPoint = (point: StrokePoint): boolean => {
      if (!active) return false;
      const last = active.last;
      const distance = last ? Math.hypot(point[0] - last[0], point[1] - last[1]) : 0;
      if (last && distance < DRAW.minPointDistance) return true;
      const { inkLimit } = optionsRef.current;
      if (active.tool === 'brush') {
        if (inkLimit !== null && useDraw.getState().inkSpent + distance > inkLimit) return false;
        useDraw.getState().spendInk(distance);
      }
      if (last) sound.updateScratch(distance / Math.max(1, point[3] - last[3]));
      active.pending.push(point);
      active.last = point;
      strokeModel.appendLocal(active.id, [point]);
      return true;
    };

    const finish = () => {
      if (!active) return;
      window.clearInterval(active.flushTimer);
      sound.stopScratch();
      flush(true);
      strokeModel.appendLocal(active.id, [], true);
      if (canvas.hasPointerCapture(active.pointerId)) canvas.releasePointerCapture(active.pointerId);
      active = null;
    };
    finishRef.current = finish;

    const onDown = (event: PointerEvent) => {
      const opts = optionsRef.current;
      if (!opts.enabled || active) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      const { tool, sizeIndex, inkSpent } = useDraw.getState();
      if (tool === 'brush' && opts.inkLimit !== null && inkSpent >= opts.inkLimit) {
        useGame.getState().toast('Out of ink! Your masterpiece is complete.', 'warn');
        return;
      }
      canvas.setPointerCapture(event.pointerId);
      const id = nextStrokeId(opts.playerId);
      strokeModel.beginLocal({
        id,
        playerId: opts.playerId,
        colorIndex: opts.colorIndex,
        tool,
        sizeIndex,
        startedAt: Math.max(0, Math.round(serverNow() - opts.drawingStartedAt)),
        points: [],
        done: false,
      });
      active = {
        id,
        tool,
        sizeIndex,
        pointerId: event.pointerId,
        startStamp: event.timeStamp,
        pending: [],
        last: null,
        flushTimer: window.setInterval(() => flush(false), TIMINGS.strokeBatchMs),
      };
      sound.startScratch(tool);
      addPoint(toPoint(event, event.timeStamp));
    };

    const onMove = (event: PointerEvent) => {
      if (!active || event.pointerId !== active.pointerId) return;
      const samples = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
      for (const sample of samples.length > 0 ? samples : [event]) {
        if (!addPoint(toPoint(sample, active.startStamp))) {
          finish();
          useGame.getState().toast('Out of ink!', 'warn');
          return;
        }
      }
    };

    const onUp = (event: PointerEvent) => {
      if (active && event.pointerId === active.pointerId) finish();
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('lostpointercapture', onUp);
    return () => {
      finish();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('lostpointercapture', onUp);
    };
  }, [canvasRef]);

  // The timer can end mid-stroke: close it off cleanly.
  useEffect(() => {
    if (!options.enabled) finishRef.current();
  }, [options.enabled]);
}
