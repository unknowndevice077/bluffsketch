import type { Stroke, StrokeBroadcast, StrokePoint } from '@bluffsketch/shared';

export type StrokeEvent =
  | { type: 'append'; stroke: Stroke; from: number }
  | { type: 'reset' }
  | { type: 'remove'; playerIds: string[] };

type Listener = (event: StrokeEvent) => void;

/**
 * Mutable stroke log for the current round. Kept outside React state because
 * it changes at pointer-event frequency; canvases subscribe and draw
 * incrementally instead of re-rendering.
 */
class StrokeModel {
  round = 0;
  version = 0;
  private strokes = new Map<string, Stroke>();
  private readonly listeners = new Set<Listener>();
  private readonly versionListeners = new Set<() => void>();
  private readonly lastActive = new Map<string, number>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** For useSyncExternalStore: fires on any change. */
  subscribeVersion = (listener: () => void): (() => void) => {
    this.versionListeners.add(listener);
    return () => this.versionListeners.delete(listener);
  };

  getVersion = (): number => this.version;

  sync(round: number, strokes: Stroke[]): void {
    this.round = round;
    this.strokes = new Map(strokes.map((s) => [s.id, { ...s, points: [...s.points] }]));
    this.emit({ type: 'reset' });
  }

  applyRemote(batch: StrokeBroadcast): void {
    let stroke = this.strokes.get(batch.strokeId);
    if (!stroke) {
      stroke = {
        id: batch.strokeId,
        playerId: batch.playerId,
        colorIndex: batch.colorIndex,
        tool: batch.tool,
        sizeIndex: batch.sizeIndex,
        startedAt: batch.startedAt,
        points: [],
        done: false,
      };
      this.strokes.set(stroke.id, stroke);
    }
    this.append(stroke, batch.points, batch.done);
  }

  beginLocal(stroke: Stroke): void {
    this.strokes.set(stroke.id, stroke);
  }

  appendLocal(strokeId: string, points: StrokePoint[], done = false): void {
    const stroke = this.strokes.get(strokeId);
    if (stroke) this.append(stroke, points, done);
  }

  remove(strokeIds: string[]): void {
    const playerIds = new Set<string>();
    for (const id of strokeIds) {
      const stroke = this.strokes.get(id);
      if (stroke) {
        playerIds.add(stroke.playerId);
        this.strokes.delete(id);
      }
    }
    if (playerIds.size > 0) this.emit({ type: 'remove', playerIds: [...playerIds] });
  }

  all(): Stroke[] {
    return [...this.strokes.values()];
  }

  forPlayer(playerId: string): Stroke[] {
    return this.all().filter((s) => s.playerId === playerId);
  }

  /** Players who sent ink within the last `windowMs`. */
  activePlayers(windowMs = 700): Set<string> {
    const now = performance.now();
    return new Set([...this.lastActive].filter(([, at]) => now - at < windowMs).map(([id]) => id));
  }

  private append(stroke: Stroke, points: StrokePoint[], done: boolean): void {
    const from = stroke.points.length;
    stroke.points.push(...points);
    stroke.done = stroke.done || done;
    if (points.length > 0) this.lastActive.set(stroke.playerId, performance.now());
    this.emit({ type: 'append', stroke, from });
  }

  private emit(event: StrokeEvent): void {
    this.version++;
    for (const listener of this.listeners) listener(event);
    for (const listener of this.versionListeners) listener();
  }
}

export const strokeModel = new StrokeModel();
