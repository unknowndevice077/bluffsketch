import { CANVAS_HEIGHT, CANVAS_WIDTH, DRAW, colorOf, type Stroke, type StrokePoint } from '@bluffsketch/shared';

export const CANVAS_PAPER = '#fffdf6';

export function strokeWidth(stroke: Pick<Stroke, 'sizeIndex' | 'tool'>, pressure: number): number {
  const base = DRAW.brushSizes[stroke.sizeIndex] ?? DRAW.brushSizes[1];
  const scaled = stroke.tool === 'eraser' ? base * DRAW.eraserSizeMultiplier : base;
  // Mouse and touch report 0.5, which maps to exactly the nominal size.
  return scaled * (0.45 + pressure * 1.1);
}

const mid = (a: StrokePoint, b: StrokePoint): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/**
 * Draws points [from, to) of a stroke, plus whatever joins them to what was
 * drawn before. Segments are quadratic curves through the midpoints of
 * consecutive points, with each point as the control point: the classic
 * smoothing trick that makes jittery pointer input look like a marker line.
 * Colours are opaque, so overdrawing the join is invisible.
 */
export function drawStrokeRange(ctx: CanvasRenderingContext2D, stroke: Stroke, from: number, to = stroke.points.length): void {
  const pts = stroke.points;
  const end = Math.min(to, pts.length);
  if (end === 0 || from >= end) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
  const color = stroke.tool === 'eraser' ? '#000' : colorOf(stroke.colorIndex).hex;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  if (from === 0) {
    // A tap with no movement still leaves a dot.
    const [x, y, p] = pts[0];
    ctx.beginPath();
    ctx.arc(x, y, strokeWidth(stroke, p) / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = Math.max(1, from - 1); i < end; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const start = i === 1 ? [prev[0], prev[1]] : mid(pts[i - 2], prev);
    const stop = mid(prev, cur);
    ctx.lineWidth = strokeWidth(stroke, (prev[2] + cur[2]) / 2);
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.quadraticCurveTo(prev[0], prev[1], stop[0], stop[1]);
    ctx.stroke();
  }

  // Straight tail to the very last point so the line reaches the pen.
  if (end >= 2) {
    const a = pts[end - 2];
    const b = pts[end - 1];
    const tailStart = mid(a, b);
    ctx.lineWidth = strokeWidth(stroke, b[2]);
    ctx.beginPath();
    ctx.moveTo(tailStart[0], tailStart[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.restore();
}

export function createLayer(scale: number): HTMLCanvasElement {
  const layer = document.createElement('canvas');
  layer.width = Math.max(1, Math.round(CANVAS_WIDTH * scale));
  layer.height = Math.max(1, Math.round(CANVAS_HEIGHT * scale));
  const ctx = layer.getContext('2d');
  ctx?.setTransform(scale, 0, 0, scale, 0, 0);
  return layer;
}

/**
 * Renders a whole drawing onto `ctx` at `scale`. Each player gets their own
 * layer so an eraser only removes its owner's ink.
 */
export function renderDrawing(
  ctx: CanvasRenderingContext2D,
  strokes: readonly Stroke[],
  scale: number,
  options: { background?: string | null; offsetX?: number; offsetY?: number } = {},
): void {
  const { background = CANVAS_PAPER, offsetX = 0, offsetY = 0 } = options;
  const width = CANVAS_WIDTH * scale;
  const height = CANVAS_HEIGHT * scale;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(offsetX, offsetY, width, height);
  }
  const layers = new Map<string, HTMLCanvasElement>();
  for (const stroke of strokes) {
    let layer = layers.get(stroke.playerId);
    if (!layer) {
      layer = createLayer(scale);
      layers.set(stroke.playerId, layer);
    }
    const layerCtx = layer.getContext('2d');
    if (layerCtx) drawStrokeRange(layerCtx, stroke, 0);
  }
  for (const layer of layers.values()) ctx.drawImage(layer, offsetX, offsetY, width, height);
}
