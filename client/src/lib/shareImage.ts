import { CANVAS_HEIGHT, CANVAS_WIDTH, type Award, type BestDrawing, type PublicPlayer, type Standing } from '@bluffsketch/shared';
import { renderDrawing } from '../canvas/renderStroke';

const WIDTH = 1200;
const PAD = 48;
const INK = '#2d2a26';

interface ShareInput {
  drawing: BestDrawing | null;
  standings: Standing[];
  players: PublicPlayer[];
  awards: Award[];
}

function nameOf(input: ShareInput, playerId: string): string {
  return (
    input.players.find((p) => p.id === playerId)?.name ??
    input.drawing?.players.find((p) => p.id === playerId)?.name ??
    'Someone'
  );
}

/** Renders the results card (best drawing + podium + awards) to a PNG. */
export async function buildShareImage(input: ShareInput): Promise<Blob | null> {
  await document.fonts?.ready;
  const drawingWidth = WIDTH - PAD * 2;
  const drawingHeight = (drawingWidth * CANVAS_HEIGHT) / CANVAS_WIDTH;
  const podium = input.standings.slice(0, 3);
  const height = 190 + drawingHeight + 60 + podium.length * 56 + 40 + Math.ceil(input.awards.length / 2) * 48 + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#fdf8ec';
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.strokeStyle = 'rgba(120, 160, 210, 0.35)';
  ctx.lineWidth = 2;
  for (let y = 40; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#ff5a5f';
  ctx.font = '96px "Caveat Brush", cursive';
  ctx.textAlign = 'center';
  ctx.fillText('Bluff Sketch', WIDTH / 2, 110);
  ctx.fillStyle = INK;
  ctx.font = '38px "Patrick Hand", cursive';
  ctx.fillText(
    input.drawing ? `Best drawing: round ${input.drawing.round}, "${input.drawing.realWord}"` : 'Final results',
    WIDTH / 2,
    165,
  );

  const top = 190;
  if (input.drawing) {
    ctx.save();
    ctx.translate(PAD, top);
    renderDrawing(ctx, input.drawing.strokes, drawingWidth / CANVAS_WIDTH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#fffdf6';
    ctx.fillRect(PAD, top, drawingWidth, drawingHeight);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.strokeRect(PAD, top, drawingWidth, drawingHeight);

  let y = top + drawingHeight + 70;
  ctx.textAlign = 'left';
  const medals = ['🥇', '🥈', '🥉'];
  podium.forEach((standing, i) => {
    ctx.font = '44px "Patrick Hand", cursive';
    ctx.fillStyle = INK;
    ctx.fillText(`${medals[i] ?? ''} ${nameOf(input, standing.playerId)}: ${standing.score} pts`, PAD, y);
    y += 56;
  });

  y += 20;
  ctx.font = '32px "Patrick Hand", cursive';
  input.awards.forEach((award, i) => {
    const x = i % 2 === 0 ? PAD : WIDTH / 2;
    ctx.fillText(`${award.emoji} ${award.title}: ${nameOf(input, award.playerId)}`, x, y);
    if (i % 2 === 1) y += 48;
  });

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Phones get the native share sheet; desktops (where it is clunky) get a download. */
export async function shareOrDownload(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });
  const touchDevice = window.matchMedia('(pointer: coarse)').matches;
  if (touchDevice && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Bluff Sketch results' });
      return 'shared';
    } catch {
      // Cancelled: fall back to a download so the user still gets the image.
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
  return 'downloaded';
}
