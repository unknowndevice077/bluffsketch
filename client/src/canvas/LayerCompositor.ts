import { CANVAS_HEIGHT, CANVAS_WIDTH, type Stroke } from '@bluffsketch/shared';
import { CANVAS_PAPER, createLayer, drawStrokeRange } from './renderStroke';

/**
 * Owns one on-screen canvas and an off-screen layer per player. Strokes are
 * drawn incrementally into layers; the visible canvas is recomposited at
 * most once per animation frame. Hiding a player is just skipping a layer.
 */
export class LayerCompositor {
  private readonly layers = new Map<string, HTMLCanvasElement>();
  private order: string[] = [];
  private scale = 1;
  private frame = 0;
  private isVisible: (playerId: string) => boolean = () => true;

  constructor(private readonly target: HTMLCanvasElement) {}

  /** Returns true when layer resolution changed and strokes must be redrawn. */
  resize(cssWidth: number, cssHeight: number): boolean {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.target.width = Math.max(1, Math.round(cssWidth * dpr));
    this.target.height = Math.max(1, Math.round(cssHeight * dpr));
    // Layers only need the on-screen resolution, capped so 10 layers stay cheap.
    const nextScale = Math.min(2, Math.max(0.5, this.target.width / CANVAS_WIDTH));
    const changed = Math.abs(nextScale - this.scale) > 0.05 || this.layers.size === 0;
    if (changed) {
      this.scale = nextScale;
      this.layers.clear();
    }
    this.schedule();
    return changed;
  }

  setOrder(playerIds: string[]): void {
    this.order = playerIds;
    this.schedule();
  }

  setVisibility(isVisible: (playerId: string) => boolean): void {
    this.isVisible = isVisible;
    this.schedule();
  }

  drawRange(stroke: Stroke, from: number, to?: number): void {
    const ctx = this.layerFor(stroke.playerId).getContext('2d');
    if (!ctx) return;
    drawStrokeRange(ctx, stroke, from, to);
    this.schedule();
  }

  clearPlayer(playerId: string): void {
    this.layers.delete(playerId);
    this.schedule();
  }

  /** Redraw from scratch. `countFor` limits how many points of each stroke to show (replay). */
  rebuild(strokes: readonly Stroke[], countFor?: (stroke: Stroke) => number, onlyPlayers?: ReadonlySet<string>): void {
    if (onlyPlayers) for (const id of onlyPlayers) this.layers.delete(id);
    else this.layers.clear();
    for (const stroke of strokes) {
      if (onlyPlayers && !onlyPlayers.has(stroke.playerId)) continue;
      const count = countFor ? countFor(stroke) : stroke.points.length;
      if (count > 0) this.drawRange(stroke, 0, count);
    }
    this.schedule();
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.layers.clear();
  }

  private layerFor(playerId: string): HTMLCanvasElement {
    let layer = this.layers.get(playerId);
    if (!layer) {
      layer = createLayer(this.scale);
      this.layers.set(playerId, layer);
    }
    return layer;
  }

  private schedule(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.compose();
    });
  }

  private compose(): void {
    const ctx = this.target.getContext('2d');
    if (!ctx) return;
    const { width, height } = this.target;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = CANVAS_PAPER;
    ctx.fillRect(0, 0, width, height);
    this.drawDotGrid(ctx, width, height);
    const ordered = [...this.order, ...[...this.layers.keys()].filter((id) => !this.order.includes(id))];
    for (const playerId of ordered) {
      const layer = this.layers.get(playerId);
      if (layer && this.isVisible(playerId)) ctx.drawImage(layer, 0, 0, width, height);
    }
  }

  /** Faint sketchbook dot grid (every 50 logical px), drawn under the ink. */
  private drawDotGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const stepX = (50 / CANVAS_WIDTH) * width;
    const stepY = (50 / CANVAS_HEIGHT) * height;
    const r = Math.max(1, width / CANVAS_WIDTH) * 1.5;
    ctx.fillStyle = 'rgba(45, 42, 38, 0.1)';
    for (let x = stepX; x < width; x += stepX) {
      for (let y = stepY; y < height; y += stepY) ctx.fillRect(x - r / 2, y - r / 2, r, r);
    }
  }
}
