const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const CHORD_QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  '6': [0, 4, 7, 9],
  dim: [0, 3, 6],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

export const midiToFreq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** "C#5" -> 73. Returns null for anything that is not a note name. */
export function noteToMidi(name: string): number | null {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!match) return null;
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return 12 * (Number(match[3]) + 1) + PITCH_CLASS[match[1]] + accidental;
}

export interface Chord {
  root: number;
  intervals: number[];
}

/** "F#m7" -> { root: 6, intervals: [0, 3, 7, 10] } */
export function parseChord(symbol: string): Chord {
  const match = /^([A-G])([#b]?)(.*)$/.exec(symbol);
  if (!match) throw new Error(`Bad chord symbol: ${symbol}`);
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  const intervals = CHORD_QUALITIES[match[3]];
  if (!intervals) throw new Error(`Unknown chord quality: ${symbol}`);
  return { root: (PITCH_CLASS[match[1]] + accidental + 12) % 12, intervals };
}

/** Chord tone `degree` (0 = root, 1 = next tone, …; wraps up an octave) in `octave`. */
export function chordToneMidi(chord: Chord, degree: number, octave: number): number {
  const n = chord.intervals.length;
  return 12 * (octave + 1) + chord.root + chord.intervals[degree % n] + 12 * Math.floor(degree / n);
}
