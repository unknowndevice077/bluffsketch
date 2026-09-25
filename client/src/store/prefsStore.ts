import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePref = 'system' | 'light' | 'dark';
export type MotionPref = 'system' | 'reduced' | 'full';

interface PrefsState {
  theme: ThemePref;
  motion: MotionPref;
  muted: boolean;
  sfxVolume: number;
  musicVolume: number;
  setTheme: (theme: ThemePref) => void;
  setMotion: (motion: MotionPref) => void;
  setMuted: (muted: boolean) => void;
  setSfxVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
}

type Persisted = Pick<PrefsState, 'theme' | 'motion' | 'muted' | 'sfxVolume' | 'musicVolume'>;

/** Per-device preferences. Storage failures fall back to defaults silently. */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: 'system',
      motion: 'system',
      muted: false,
      sfxVolume: 0.8,
      musicVolume: 0.5,
      setTheme: (theme) => set({ theme }),
      setMotion: (motion) => set({ motion }),
      setMuted: (muted) => set({ muted }),
      setSfxVolume: (sfxVolume) => set({ sfxVolume }),
      setMusicVolume: (musicVolume) => set({ musicVolume }),
    }),
    {
      name: 'bluffsketch:prefs',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, motion, muted, sfxVolume, musicVolume }): Persisted => ({ theme, motion, muted, sfxVolume, musicVolume }),
      // v0 had a single "volume"; it becomes the effects volume.
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Partial<Persisted> & { volume?: number };
        if (version === 0) return { ...old, sfxVolume: old.volume ?? 0.8, musicVolume: 0.5 } as Persisted;
        return old as Persisted;
      },
    },
  ),
);
