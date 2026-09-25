import { useEffect } from 'react';
import { colorOf } from '@bluffsketch/shared';
import { DrawingBoard } from '../canvas/DrawingBoard';
import { DrawToolbar, InkMeter } from '../components/DrawToolbar';
import { PlayerRoster } from '../components/PlayerRoster';
import { CountdownRing } from '../components/ui/CountdownRing';
import { useCountdown } from '../hooks/useCountdown';
import { useDrawingActivity } from '../hooks/useDrawingActivity';
import { cn } from '../lib/cn';
import { undoStroke } from '../lib/net';
import { useDraw } from '../store/drawStore';
import { useRoom } from '../store/gameStore';

function WordReminder({ word, isFaker }: { word: string | null; isFaker: boolean | null }) {
  const showWord = useDraw((s) => s.showWord);
  const toggleWord = useDraw((s) => s.toggleWord);
  return (
    <button
      type="button"
      onClick={toggleWord}
      className={cn('chip max-w-[14rem] bg-card', isFaker && showWord && 'bg-accent/15')}
      aria-pressed={showWord}
      aria-label={showWord ? `Your word: ${word ?? ''}. Tap to hide` : 'Show your word'}
    >
      <span aria-hidden>{showWord ? '🙈' : '👁️'}</span>
      <span className="truncate">{showWord ? word : 'Show word'}</span>
      {isFaker && showWord && <span className="text-xs font-bold text-accent">FAKER</span>}
    </button>
  );
}

export function DrawingScreen() {
  const room = useRoom();
  const me = room.players.find((p) => p.id === room.you.playerId);
  const left = useCountdown(room.phaseEndsAt);
  const canDraw = left > 0 && me !== undefined;
  const active = useDrawingActivity(true);
  const setTool = useDraw((s) => s.setTool);
  const setSizeIndex = useDraw((s) => s.setSizeIndex);
  const color = colorOf(me?.colorIndex ?? 0).hex;
  const order = room.players.map((p) => p.id);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undoStroke();
      } else if (event.key === 'b') setTool('brush');
      else if (event.key === 'e') setTool('eraser');
      else if (['1', '2', '3'].includes(event.key)) setSizeIndex(Number(event.key) - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setTool, setSizeIndex]);

  const toolbarProps = {
    color,
    undosLeft: room.you.undosLeft,
    inkLimit: room.you.inkLimit,
    disabled: !canDraw,
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-2 pb-36 pt-2 sm:px-4 lg:pb-8">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <CountdownRing endsAt={room.phaseEndsAt} totalMs={room.settings.drawTimeSec * 1000} size={60} label="Drawing time left" />
        <div className="min-w-0 flex-1">
          <p className="label-hand truncate leading-none">
            Round {room.round}/{room.totalRounds} · {room.categoryLabel}
            {room.settings.blindDraw && ' · Blind draw'}
          </p>
          <h1 className="text-3xl sm:text-4xl">Draw it!</h1>
        </div>
        <WordReminder word={room.you.word} isFaker={room.you.isFaker} />
      </div>

      <PlayerRoster players={room.players} youId={room.you.playerId} active={active} layout="row" className="mb-2 lg:hidden" />

      <div className="lg:grid lg:grid-cols-[4rem_1fr_13rem] lg:gap-4">
        <DrawToolbar orientation="vertical" className="hidden lg:flex" {...toolbarProps} />
        <div>
          <DrawingBoard
            enabled={canDraw}
            playerId={room.you.playerId}
            colorIndex={me?.colorIndex ?? 0}
            drawingStartedAt={room.phaseStartedAt}
            inkLimit={room.you.inkLimit}
            order={order}
            blind={room.settings.blindDraw}
          />
          {room.settings.blindDraw && (
            <p className="mt-2 text-center font-hand text-lg text-muted">
              🙈 Blind draw: you only see your own lines until time is up.
            </p>
          )}
        </div>
        <aside className="hidden lg:block" aria-label="Players drawing">
          <PlayerRoster players={room.players} youId={room.you.playerId} active={active} layout="column" />
        </aside>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 space-y-1 border-t-[3px] border-ink bg-card/95 px-1 pt-2 backdrop-blur lg:hidden">
        {room.you.inkLimit !== null && (
          <div className="mx-auto max-w-xs px-2">
            <InkMeter inkLimit={room.you.inkLimit} />
          </div>
        )}
        <DrawToolbar orientation="horizontal" {...toolbarProps} />
      </div>
    </div>
  );
}
