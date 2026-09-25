import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DRAW,
  pathLength,
  type Stroke,
  type StrokeBatchPayload,
  type StrokeBroadcast,
  type StrokePoint,
} from '@bluffsketch/shared';

export type BatchResult =
  | { ok: true; broadcast: StrokeBroadcast }
  | { ok: false; isNewStroke: boolean; reason: string };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

/** Authoritative per-round stroke log, in start order, with anti-cheat limits. */
export class StrokeStore {
  private readonly strokes = new Map<string, Stroke>();
  private readonly pointsByPlayer = new Map<string, number>();
  private readonly strokesByPlayer = new Map<string, number>();
  /** Ink is spent for good: undo/clear do not refund it. */
  private readonly inkByPlayer = new Map<string, number>();

  constructor(
    private readonly inkLimit: number | null,
    private readonly maxStrokeDurationMs: number,
  ) {}

  addBatch(playerId: string, colorIndex: number, batch: StrokeBatchPayload, startedAt: number): BatchResult {
    const existing = this.strokes.get(batch.strokeId);
    const isNewStroke = !existing;
    const reject = (reason: string): BatchResult => ({ ok: false, isNewStroke, reason });

    if (!batch.strokeId.startsWith(`${playerId}:`)) return reject('foreign stroke id');

    let stroke: Stroke;
    if (existing) {
      if (existing.playerId !== playerId) return reject('not your stroke');
      if (existing.done) return reject('stroke already finished');
      stroke = existing;
    } else {
      if (batch.points.length === 0) return reject('empty stroke');
      if ((this.strokesByPlayer.get(playerId) ?? 0) >= DRAW.maxStrokesPerPlayer) return reject('too many strokes');
      if (batch.tool === 'brush' && this.inkLimit !== null && this.inkUsed(playerId) >= this.inkLimit) {
        return reject('out of ink');
      }
      stroke = {
        id: batch.strokeId,
        playerId,
        colorIndex,
        tool: batch.tool,
        sizeIndex: batch.sizeIndex,
        startedAt,
        points: [],
        done: false,
      };
    }

    let budget = Math.min(
      DRAW.maxPointsPerStroke - stroke.points.length,
      DRAW.maxPointsPerPlayerRound - (this.pointsByPlayer.get(playerId) ?? 0),
    );
    let forceDone = false;
    const accepted: StrokePoint[] = [];
    let previous = stroke.points[stroke.points.length - 1];
    let ink = this.inkUsed(playerId);

    for (const raw of batch.points) {
      if (budget <= 0) {
        forceDone = true;
        break;
      }
      const point: StrokePoint = [
        round1(clamp(raw[0], 0, CANVAS_WIDTH)),
        round1(clamp(raw[1], 0, CANVAS_HEIGHT)),
        Math.round(clamp(raw[2], 0, 1) * 100) / 100,
        // Timestamps must be monotonic and cannot outlast the drawing phase.
        Math.round(clamp(raw[3], previous ? previous[3] : 0, this.maxStrokeDurationMs)),
      ];
      if (stroke.tool === 'brush') {
        const cost = pathLength([point], previous);
        if (this.inkLimit !== null && ink + cost > this.inkLimit) {
          forceDone = true;
          break;
        }
        ink += cost;
      }
      accepted.push(point);
      previous = point;
      budget--;
    }

    if (isNewStroke) {
      if (accepted.length === 0) return reject('no ink left');
      this.strokes.set(stroke.id, stroke);
      this.strokesByPlayer.set(playerId, (this.strokesByPlayer.get(playerId) ?? 0) + 1);
    }
    stroke.points.push(...accepted);
    stroke.done = batch.done || forceDone;
    this.pointsByPlayer.set(playerId, (this.pointsByPlayer.get(playerId) ?? 0) + accepted.length);
    if (stroke.tool === 'brush') this.inkByPlayer.set(playerId, ink);

    return {
      ok: true,
      broadcast: {
        strokeId: stroke.id,
        tool: stroke.tool,
        sizeIndex: stroke.sizeIndex,
        points: accepted,
        done: stroke.done,
        playerId,
        colorIndex,
        startedAt: stroke.startedAt,
      },
    };
  }

  removeLast(playerId: string): string | null {
    const own = [...this.strokes.values()].filter((stroke) => stroke.playerId === playerId);
    const last = own[own.length - 1];
    if (!last) return null;
    this.strokes.delete(last.id);
    return last.id;
  }

  clear(playerId: string): string[] {
    const ids = [...this.strokes.values()].filter((s) => s.playerId === playerId).map((s) => s.id);
    for (const id of ids) this.strokes.delete(id);
    return ids;
  }

  finishAll(): void {
    for (const stroke of this.strokes.values()) stroke.done = true;
  }

  inkUsed(playerId: string): number {
    return this.inkByPlayer.get(playerId) ?? 0;
  }

  all(): Stroke[] {
    return [...this.strokes.values()];
  }

  get size(): number {
    return this.strokes.size;
  }
}
