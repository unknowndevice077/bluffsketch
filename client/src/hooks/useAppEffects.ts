import { useEffect } from 'react';
import type { Phase, RoomSnapshot } from '@bluffsketch/shared';
import { sound, type SoundName, type TrackId } from '../lib/sound';
import { useGame } from '../store/gameStore';
import { usePrefs } from '../store/prefsStore';
import { useCountdown } from './useCountdown';
import { useReducedMotion } from './useReducedMotion';

/** Mirrors theme, motion and sound preferences onto the document and audio engine. */
export function useApplyPrefs(): void {
  const theme = usePrefs((s) => s.theme);
  const muted = usePrefs((s) => s.muted);
  const sfxVolume = usePrefs((s) => s.sfxVolume);
  const musicVolume = usePrefs((s) => s.musicVolume);
  const motionPref = usePrefs((s) => s.motion);
  const reduced = useReducedMotion();

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduced);
    document.documentElement.classList.toggle('force-motion', motionPref === 'full');
  }, [reduced, motionPref]);

  useEffect(() => {
    sound.setSfxVolume(sfxVolume);
    sound.setMusicVolume(musicVolume);
    sound.setMuted(muted);
  }, [sfxVolume, musicVolume, muted]);

  useEffect(() => {
    // Every gesture may unlock audio (cheap after the first), and buttons get a soft pencil tap.
    const onPointerDown = (event: PointerEvent) => {
      sound.unlock();
      if (event.target instanceof Element && event.target.closest('button:not(:disabled)')) sound.play('tap');
    };
    const unlock = () => sound.unlock();
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
}

const PHASE_SOUNDS: Partial<Record<Phase, SoundName>> = {
  ROLE_REVEAL: 'pageFlip',
  DRAWING: 'squeak',
  GALLERY_REVIEW: 'timeUp',
  VOTING: 'pageFlip',
  ROUND_RESULTS: 'chime',
  FINAL_RESULTS: 'chime',
};

function describePhase(room: RoomSnapshot): string {
  const nameOf = (id: string | undefined) => room.players.find((p) => p.id === id)?.name ?? 'Someone';
  switch (room.phase) {
    case 'LOBBY':
      return `Lobby for room ${room.code}. ${room.players.length} players.`;
    case 'ROLE_REVEAL':
      return `Round ${room.round} of ${room.totalRounds}. Category ${room.categoryLabel ?? ''}. Press and hold the card to see your secret word.`;
    case 'DRAWING':
      return `Drawing time! You have ${room.settings.drawTimeSec} seconds.`;
    case 'GALLERY_REVIEW':
      return 'Gallery replay. Watch the drawing and react.';
    case 'VOTING':
      return `Voting time. Pick who you think the Faker is. ${room.settings.voteTimeSec} seconds.`;
    case 'REVEAL':
      return 'Revealing the votes.';
    case 'FAKER_LAST_CHANCE':
      return room.you.canGuess
        ? 'You were caught as the Faker. Type your guess of the real word.'
        : `${nameOf(room.reveal?.fakerId)} was caught and gets one guess at the real word.`;
    case 'ROUND_RESULTS': {
      const result = room.roundResult;
      if (!result) return 'Round results.';
      const outcome = result.voided ? 'The round was voided.' : result.stolen ? 'The Faker stole the win.' : result.caught ? 'The Faker was caught.' : 'The Faker got away.';
      return `Round results. The Faker was ${nameOf(result.fakerId)}. The real word was ${result.realWord}. ${outcome}`;
    }
    case 'FINAL_RESULTS':
      return `Final results. ${nameOf(room.finalResults?.standings[0]?.playerId)} wins!`;
  }
}

/** Sounds, ticks and screen-reader announcements driven by phase changes. */
export function usePhaseEffects(): void {
  const room = useGame((s) => s.room);
  const announce = useGame((s) => s.announce);
  const phase = room?.phase;
  const round = room?.round;

  useEffect(() => {
    const current = useGame.getState().room;
    if (!current) return;
    announce(describePhase(current));
    const cue = PHASE_SOUNDS[current.phase];
    if (cue) sound.play(cue);
  }, [phase, round, announce]);

  // Countdown ticks: last 5 s of drawing, last 3 s of voting; higher pitch for the final 3.
  const timed = phase === 'DRAWING' || phase === 'VOTING';
  const endsAt = timed ? (room?.phaseEndsAt ?? null) : null;
  const left = useCountdown(endsAt, 200);
  const seconds = Math.ceil(left / 1000);
  const tickFrom = phase === 'DRAWING' ? 5 : 3;
  useEffect(() => {
    if (endsAt === null || seconds <= 0 || seconds > tickFrom) return;
    sound.play(seconds <= 3 ? 'tickUrgent' : 'tick');
    if (seconds === 5) announce('5 seconds left!');
  }, [seconds, endsAt, tickFrom, announce]);
}

const PHASE_TRACKS: Record<Phase, TrackId | null> = {
  LOBBY: 'lobby',
  ROLE_REVEAL: 'tension',
  DRAWING: 'drawing',
  GALLERY_REVIEW: 'gallery',
  VOTING: 'voting',
  // Silence so the drum roll and vote flips carry the moment.
  REVEAL: null,
  FAKER_LAST_CHANCE: 'tension',
  ROUND_RESULTS: 'results',
  FINAL_RESULTS: 'finale',
};

/** Background music per phase; tracks speed up (extra percussion) when time runs low. */
export function useMusicDirector(): void {
  const phase = useGame((s) => s.room?.phase);
  const endsAt = useGame((s) => s.room?.phaseEndsAt ?? null);
  const urgentWindowMs = phase === 'DRAWING' ? 10_000 : phase === 'VOTING' ? 6_000 : 0;
  const left = useCountdown(urgentWindowMs > 0 ? endsAt : null, 250);
  const urgent = urgentWindowMs > 0 && left > 0 && left <= urgentWindowMs;

  useEffect(() => {
    sound.music.setTrack(phase ? PHASE_TRACKS[phase] : 'lobby');
  }, [phase]);

  useEffect(() => {
    sound.music.setIntensity(urgent ? 'urgent' : 'normal');
  }, [urgent]);
}
