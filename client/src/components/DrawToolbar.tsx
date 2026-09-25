import type { ReactNode } from 'react';
import { DRAW, type StrokeTool } from '@bluffsketch/shared';
import { cn } from '../lib/cn';
import { clearOwnStrokes, undoStroke } from '../lib/net';
import { useDraw } from '../store/drawStore';

interface DrawToolbarProps {
  orientation: 'vertical' | 'horizontal';
  color: string;
  undosLeft: number;
  inkLimit: number | null;
  disabled: boolean;
  className?: string;
}

const SIZE_LABELS = ['Small', 'Medium', 'Large'];

function ToolButton({
  active,
  label,
  onClick,
  disabled,
  children,
  shortcut,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      aria-keyshortcuts={shortcut}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={cn('btn relative h-11 w-11 !min-w-0 shrink-0 !p-0 !text-2xl sm:h-12 sm:w-12', active ? 'btn-secondary' : 'btn-ghost')}
    >
      {children}
    </button>
  );
}

export function InkMeter({ inkLimit, compact = false }: { inkLimit: number; compact?: boolean }) {
  const spent = useDraw((s) => s.inkSpent);
  const left = Math.max(0, 1 - spent / inkLimit);
  return (
    <div
      className={cn('flex items-center gap-2', compact ? 'w-24' : 'w-full')}
      role="meter"
      aria-label="Ink left"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(left * 100)}
    >
      <span aria-hidden>🖋️</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-ink bg-card">
        <div className={cn('h-full transition-all', left < 0.2 ? 'bg-danger' : 'bg-sky')} style={{ width: `${left * 100}%` }} />
      </div>
    </div>
  );
}

export function DrawToolbar({ orientation, color, undosLeft, inkLimit, disabled, className }: DrawToolbarProps) {
  const { tool, sizeIndex, setTool, setSizeIndex } = useDraw();
  const vertical = orientation === 'vertical';
  const pick = (next: StrokeTool) => setTool(next);
  // Horizontal (mobile) stays one row: 7 x 44px + gaps fits a 360px screen; the ink meter sits above it.

  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      aria-orientation={orientation}
      className={cn('flex items-center', vertical ? 'flex-col gap-2' : 'flex-row justify-center gap-1', className)}
    >
      <ToolButton active={tool === 'brush'} label="Brush" shortcut="B" onClick={() => pick('brush')} disabled={disabled}>
        <span aria-hidden>🖍️</span>
        <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border border-ink" style={{ backgroundColor: color }} />
      </ToolButton>
      <ToolButton active={tool === 'eraser'} label="Eraser (only your own lines)" shortcut="E" onClick={() => pick('eraser')} disabled={disabled}>
        <span aria-hidden>🧽</span>
      </ToolButton>
      <div className={cn('flex gap-0.5', vertical ? 'flex-col' : 'flex-row')} role="radiogroup" aria-label="Brush size">
        {DRAW.brushSizes.map((size, index) => (
          <button
            key={size}
            type="button"
            role="radio"
            aria-checked={sizeIndex === index}
            aria-label={`${SIZE_LABELS[index]} brush`}
            aria-keyshortcuts={String(index + 1)}
            disabled={disabled}
            onClick={() => setSizeIndex(index)}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[3px] sm:h-12 sm:w-12',
              sizeIndex === index ? 'border-ink bg-sun' : 'border-transparent hover:border-ink/40',
            )}
          >
            <span className="block rounded-full bg-ink" style={{ width: 6 + index * 7, height: 6 + index * 7 }} />
          </button>
        ))}
      </div>
      <ToolButton label={`Undo (${undosLeft} left)`} shortcut="Control+Z" onClick={undoStroke} disabled={disabled || undosLeft <= 0}>
        <span aria-hidden>↶</span>
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink bg-card text-xs font-bold">
          {undosLeft}
        </span>
      </ToolButton>
      <ToolButton
        label="Clear your lines"
        onClick={() => {
          if (window.confirm('Clear all of your lines?')) clearOwnStrokes();
        }}
        disabled={disabled}
      >
        <span aria-hidden>🗑️</span>
      </ToolButton>
      {vertical && inkLimit !== null && <InkMeter inkLimit={inkLimit} />}
    </div>
  );
}
