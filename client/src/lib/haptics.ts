export type HapticPattern = 'lock' | 'reveal' | 'success' | 'fail';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  lock: 40,
  reveal: [30, 60, 30, 60, 120],
  success: [20, 40, 20],
  fail: [120],
};

export function vibrate(pattern: HapticPattern): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Unsupported or blocked: haptics are a nice-to-have.
  }
}
