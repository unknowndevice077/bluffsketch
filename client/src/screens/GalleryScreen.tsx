import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { REACTION_EMOJIS, TIMINGS, colorOf, type ReactionEmoji } from '@bluffsketch/shared';
import { ReplayBoard } from '../canvas/ReplayBoard';
import { Avatar } from '../components/Avatar';
import { PlayerBadge } from '../components/PlayerBadge';
import { ReactionLayer } from '../components/ReactionLayer';
import { CountdownRing } from '../components/ui/CountdownRing';
import { REPLAY_SPEEDS, useReplay } from '../hooks/useReplay';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { cn } from '../lib/cn';
import { react } from '../lib/net';
import { useRoom } from '../store/gameStore';
import { strokeModel } from '../store/strokeModel';

export function GalleryScreen() {
  const room = useRoom();
  const reduced = useReducedMotion();
  const version = useSyncExternalStore(strokeModel.subscribeVersion, strokeModel.getVersion);
  const [strokes, setStrokes] = useState(() => strokeModel.all());
  useEffect(() => setStrokes(strokeModel.all()), [version]);

  const replay = useReplay(strokes, reduced);
  const [isolated, setIsolated] = useState<string | null>(null);
  const isVisible = useCallback((playerId: string) => isolated === null || playerId === isolated, [isolated]);
  const order = room.players.map((p) => p.id);

  // Reactions go to whoever you're looking at: the isolated player, or whoever is drawing right now.
  const reactionTarget = isolated ?? [...replay.drawingNow][0] ?? null;
  const targetPlayer = room.players.find((p) => p.id === reactionTarget);
  const sendReaction = (emoji: ReactionEmoji) => react(emoji, reactionTarget);

  const progress = replay.timeline.duration > 0 ? replay.time / replay.timeline.duration : 1;

  return (
    <div className="mx-auto w-full max-w-5xl px-2 pb-16 pt-2 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <CountdownRing endsAt={room.phaseEndsAt} totalMs={TIMINGS.galleryMs} size={60} label="Voting starts in" />
        <div className="min-w-0 flex-1">
          <p className="label-hand leading-none">Round {room.round} · {room.categoryLabel}</p>
          <h1 className="text-3xl sm:text-4xl">Gallery replay</h1>
        </div>
      </div>

      <div className="relative">
        <ReplayBoard
          strokes={strokes}
          timeline={replay.timeline}
          time={replay.time}
          order={order}
          isVisible={isVisible}
        />
        <ReactionLayer />
      </div>

      <div className="card-sketch mt-3 flex flex-wrap items-center gap-3 p-3">
        <button
          type="button"
          className="btn btn-secondary w-14"
          onClick={replay.togglePlay}
          aria-label={replay.playing ? 'Pause replay' : 'Play replay'}
        >
          <span aria-hidden>{replay.playing ? '⏸' : '▶'}</span>
        </button>
        <div className="flex gap-1" role="radiogroup" aria-label="Replay speed">
          {REPLAY_SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              role="radio"
              aria-checked={replay.speed === speed}
              onClick={() => replay.setSpeed(speed)}
              className={cn('btn !px-3 !text-lg', replay.speed === speed ? 'btn-secondary' : 'btn-ghost')}
            >
              x{speed}
            </button>
          ))}
        </div>
        <label htmlFor="scrub" className="sr-only">
          Replay position
        </label>
        <input
          id="scrub"
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={(event) => replay.seek((Number(event.target.value) / 1000) * replay.timeline.duration)}
          className="h-11 min-w-[8rem] flex-1"
          aria-valuetext={`${Math.round(progress * 100)}%`}
        />
      </div>

      <div className="mt-3">
        <p className="label-hand mb-1">Tap a player to see only their lines</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show strokes by player">
          <button
            type="button"
            className={cn('chip', isolated === null ? 'bg-sun text-[#2d2a26]' : 'bg-card')}
            aria-pressed={isolated === null}
            onClick={() => setIsolated(null)}
          >
            Everyone
          </button>
          {room.players.map((player) => {
            const selected = isolated === player.id;
            const drawing = replay.drawingNow.has(player.id);
            return (
              <button
                key={player.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setIsolated(selected ? null : player.id)}
                className={cn('chip bg-card transition-transform', selected && 'scale-105', drawing && 'animate-wiggle')}
                style={selected || drawing ? { boxShadow: `0 0 0 4px ${colorOf(player.colorIndex).hex}` } : undefined}
              >
                <Avatar id={player.avatar} size={28} />
                <PlayerBadge colorIndex={player.colorIndex} size={20} />
                <span className="max-w-[6rem] truncate">{player.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <p className="label-hand mb-1">
          React{targetPlayer ? ` to ${targetPlayer.name}'s lines` : ''}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Reactions">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="btn btn-ghost h-12 w-12 !px-0 !text-2xl"
              onClick={() => sendReaction(emoji)}
              aria-label={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
