import { useReducedMotion as useSystemReducedMotion } from 'framer-motion';
import { usePrefs } from '../store/prefsStore';

/** Combines the in-app motion setting with the OS preference. */
export function useReducedMotion(): boolean {
  const pref = usePrefs((s) => s.motion);
  const system = useSystemReducedMotion() ?? false;
  if (pref === 'reduced') return true;
  if (pref === 'full') return false;
  return system;
}
