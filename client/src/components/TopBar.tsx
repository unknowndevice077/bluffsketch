import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { leaveRoom } from '../lib/net';
import { sound } from '../lib/sound';
import { useGame } from '../store/gameStore';
import { usePrefs, type MotionPref, type ThemePref } from '../store/prefsStore';
import { Logo } from './Logo';
import { Segmented } from './ui/Controls';

function VolumeSlider({
  id,
  label,
  value,
  onChange,
  onRelease,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  onRelease?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="font-hand text-lg">
          {label}
        </label>
        <span className="text-sm text-muted">{Math.round(value * 100)}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onRelease}
        className="h-11 w-full"
      />
    </div>
  );
}

function PrefsPanel({ onClose }: { onClose: () => void }) {
  const { theme, motion: motionPref, muted, sfxVolume, musicVolume, setTheme, setMotion, setMuted, setSfxVolume, setMusicVolume } =
    usePrefs();
  return (
    <motion.div
      role="dialog"
      aria-label="Settings"
      className="card-sketch absolute right-0 top-14 z-40 w-[min(20rem,calc(100vw-2rem))] space-y-4 p-4"
      initial={{ opacity: 0, y: -8, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <div className="flex items-center justify-between">
        <span className="font-hand text-xl">Sound</span>
        <button type="button" className="btn btn-ghost !px-3 !text-lg" onClick={() => setMuted(!muted)} aria-pressed={muted}>
          {muted ? '🔇 Muted' : '🔊 On'}
        </button>
      </div>
      <VolumeSlider
        id="music-volume"
        label="🎵 Music"
        value={muted ? 0 : musicVolume}
        onChange={(v) => {
          setMusicVolume(v);
          if (v > 0) setMuted(false);
        }}
      />
      <VolumeSlider
        id="sfx-volume"
        label="🔔 Effects"
        value={muted ? 0 : sfxVolume}
        onChange={(v) => {
          setSfxVolume(v);
          if (v > 0) setMuted(false);
        }}
        onRelease={() => sound.play('pop')}
      />
      <Segmented<ThemePref>
        label="Theme"
        value={theme}
        onChange={setTheme}
        options={[
          { value: 'light', label: '☀️ Day' },
          { value: 'dark', label: '🌙 Night' },
          { value: 'system', label: 'Auto' },
        ]}
      />
      <Segmented<MotionPref>
        label="Motion"
        value={motionPref}
        onChange={setMotion}
        options={[
          { value: 'full', label: 'Full' },
          { value: 'reduced', label: 'Reduced' },
          { value: 'system', label: 'Auto' },
        ]}
      />
      <button type="button" className="btn btn-ghost w-full" onClick={onClose}>
        Done
      </button>
    </motion.div>
  );
}

export function TopBar() {
  const [open, setOpen] = useState(false);
  const inRoom = useGame((s) => s.room !== null);
  const muted = usePrefs((s) => s.muted);
  const setMuted = usePrefs((s) => s.setMuted);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const confirmLeave = () => {
    if (window.confirm('Leave this room? You can rejoin within 60 seconds with the same link.')) leaveRoom();
  };

  return (
    <header className="relative z-30 mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 pt-3">
      {inRoom ? <Logo size="sm" /> : <span />}
      <div ref={wrapRef} className="relative flex items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost !px-2"
          onClick={() => setMuted(!muted)}
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          aria-pressed={muted}
        >
          <span aria-hidden>{muted ? '🔇' : '🔊'}</span>
        </button>
        <button
          type="button"
          className="btn btn-ghost !px-2"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Sound, theme and motion settings"
        >
          <span aria-hidden>⚙️</span>
        </button>
        {inRoom && (
          <button type="button" className="btn btn-ghost !px-3 !text-lg" onClick={confirmLeave}>
            Leave
          </button>
        )}
        <AnimatePresence>{open && <PrefsPanel onClose={() => setOpen(false)} />}</AnimatePresence>
      </div>
    </header>
  );
}
