import type { InstrumentId } from './instruments';

export type TrackId = 'lobby' | 'tension' | 'drawing' | 'gallery' | 'voting' | 'results' | 'finale';
export type Intensity = 'normal' | 'urgent';

/**
 * A pattern is bars separated by "|", each bar exactly 16 space-separated
 * sixteenth-note steps:
 *   "."        rest            "-"   hold the previous note one more step
 *   notes mode: "C5", "Bb4", "F#3"
 *   chord mode: "0".."7" = chord tone (0 root, 1 third, 2 fifth, …, wrapping up an octave), "c" = whole chord
 *   drum mode:  "x" hit, "X" accent, "g" ghost
 * A part with fewer bars than the track repeats its bars.
 */
export interface Part {
  instrument: InstrumentId;
  mode: 'notes' | 'chord' | 'drum';
  pattern: string;
  gain: number;
  octave?: number;
  /** Default note length in steps when a note has no "-" holds. */
  steps?: number;
  /** Only play at this intensity (e.g. extra hats when time is running out). */
  when?: Intensity;
  /** Loop passes this part plays on, cycling (e.g. [true, false] = every other loop). */
  passes?: boolean[];
}

export interface Track {
  id: TrackId;
  title: string;
  bpm: number;
  /** Delay of off-beat eighths, as a fraction of a sixteenth (0 = straight). */
  swing: number;
  /** One chord per bar; the loop is this many bars long. */
  chords: string[];
  parts: Part[];
}

const FOUR_ON_FLOOR = 'X . . . x . . . X . . . x . . .';
const BACKBEAT = '. . . . x . . . . . . . x . . .';
const OFFBEATS = '. . x . . . x . . . x . . . x .';
const SIXTEENTHS = 'x g x g x g x g x g x g x g x g';

export const TRACKS: Record<TrackId, Track> = {
  lobby: {
    id: 'lobby',
    title: 'Doodle Lounge',
    bpm: 96,
    swing: 0.35,
    chords: ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G7'],
    parts: [
      { instrument: 'marimba', mode: 'chord', octave: 4, gain: 0.36, pattern: '0 . 2 . 1 . 3 . 2 . 1 . 2 . 3 .' },
      { instrument: 'bass', mode: 'chord', octave: 2, gain: 0.65, steps: 3, pattern: '0 . . . . . 0 . 2 . . . . . . .' },
      { instrument: 'shaker', mode: 'drum', gain: 0.8, pattern: '. . x . . . x . . . x . . . x x' },
      { instrument: 'snap', mode: 'drum', gain: 0.45, pattern: BACKBEAT },
      { instrument: 'kick', mode: 'drum', gain: 0.45, pattern: 'x . . . . . . . x . . x . . . .' },
      {
        instrument: 'pluck',
        mode: 'notes',
        gain: 0.55,
        passes: [true, false],
        pattern: [
          'E5 . . . G5 . . . A5 . G5 . E5 . . .',
          'C5 . . . . . A4 . C5 . . . . . . .',
          'A4 . C5 . F5 . . . E5 . . . C5 . . .',
          'D5 . . . . . . . B4 . . . . . . .',
          'E5 . . . G5 . . . C6 . . . B5 . . .',
          'G5 . . . . . E5 . . . . . . . . .',
          'F5 . E5 . D5 . C5 . . . A4 . C5 . . .',
          'D5 . . . B4 . . . G4 . . . . . . .',
        ].join(' | '),
      },
      {
        instrument: 'vibes',
        mode: 'chord',
        octave: 5,
        gain: 0.35,
        passes: [false, true],
        pattern: '2 . . . . . . . 1 . . . 0 . . .',
      },
    ],
  },

  tension: {
    id: 'tension',
    title: 'Hold Your Card',
    bpm: 72,
    swing: 0,
    chords: ['Am', 'F', 'Dm', 'E7'],
    parts: [
      { instrument: 'pad', mode: 'chord', octave: 3, gain: 2.4, steps: 16, pattern: 'c . . . . . . . . . . . . . . .' },
      { instrument: 'kick', mode: 'drum', gain: 0.9, pattern: 'x . . x . . . . x . . x . . . .' },
      { instrument: 'marimba', mode: 'chord', octave: 5, gain: 0.5, pattern: '. . . . . . 2 . . . . . . . 4 .' },
      { instrument: 'pencil', mode: 'drum', gain: 0.35, pattern: OFFBEATS },
    ],
  },

  drawing: {
    id: 'drawing',
    title: 'Scribble Rush',
    bpm: 128,
    swing: 0,
    chords: ['F', 'Dm', 'Bb', 'C'],
    parts: [
      { instrument: 'pluck', mode: 'chord', octave: 4, gain: 0.3, pattern: '0 1 2 1 0 1 2 1 0 1 2 1 3 2 1 2' },
      { instrument: 'bass', mode: 'chord', octave: 2, gain: 0.8, steps: 2, pattern: '0 . . 0 . . 0 . 0 . . 0 . . 2 .' },
      { instrument: 'kick', mode: 'drum', gain: 0.6, pattern: FOUR_ON_FLOOR },
      { instrument: 'snap', mode: 'drum', gain: 0.5, pattern: BACKBEAT },
      { instrument: 'pencil', mode: 'drum', gain: 0.7, pattern: OFFBEATS },
      { instrument: 'pencil', mode: 'drum', gain: 0.5, when: 'urgent', pattern: SIXTEENTHS },
      { instrument: 'woodblock', mode: 'chord', octave: 5, gain: 0.35, when: 'urgent', pattern: '4 . . . 4 . . . 4 . . . 4 . 4 .' },
      {
        instrument: 'marimba',
        mode: 'notes',
        gain: 0.6,
        passes: [true, true, false, true],
        pattern: [
          'C5 . A4 . C5 . F5 . . . E5 . F5 . . .',
          'D5 . . . A4 . . . D5 . E5 . F5 . . .',
          'D5 . . . Bb4 . D5 . F5 . . . D5 . . .',
          'E5 . . . C5 . . . G4 . A4 . Bb4 . C5 .',
        ].join(' | '),
      },
    ],
  },

  gallery: {
    id: 'gallery',
    title: 'Gallery Stroll',
    bpm: 88,
    swing: 0.45,
    chords: ['Cmaj7', 'Am7', 'Dm7', 'G7'],
    parts: [
      { instrument: 'vibes', mode: 'chord', octave: 4, gain: 0.35, pattern: 'c . . . . . c . . . . . . . . .' },
      { instrument: 'bass', mode: 'chord', octave: 2, gain: 0.75, steps: 4, pattern: '0 . . . 1 . . . 2 . . . 1 . . .' },
      { instrument: 'shaker', mode: 'drum', gain: 0.7, pattern: OFFBEATS },
      { instrument: 'snap', mode: 'drum', gain: 0.3, pattern: BACKBEAT },
      {
        instrument: 'vibes',
        mode: 'notes',
        gain: 0.5,
        pattern: [
          'E5 . . . . . D5 . C5 . . . . . . .',
          'C5 . . . . . . . A4 . . . . . . .',
          'F5 . . . E5 . . . D5 . . . C5 . . .',
          'B4 . . . . . . . D5 . . . . . . .',
        ].join(' | '),
      },
    ],
  },

  voting: {
    id: 'voting',
    title: 'Who Dunnit?',
    bpm: 100,
    swing: 0.3,
    chords: ['Am', 'Am', 'Dm', 'E7'],
    parts: [
      {
        instrument: 'bass',
        mode: 'notes',
        gain: 0.85,
        steps: 2,
        pattern: [
          'A2 . . . C3 . . . E3 . . . C3 . . .',
          'A2 . . . C3 . . . E3 . . . F3 . E3 .',
          'D3 . . . F3 . . . A3 . . . F3 . . .',
          'E3 . . . G#3 . . . B3 . . . G#3 . F3 .',
        ].join(' | '),
      },
      {
        instrument: 'pluck',
        mode: 'notes',
        gain: 0.6,
        pattern: [
          'A4 . . E5 . . . . D5 . C5 . B4 . . .',
          '. . A4 . . . . . . . . . . . . .',
          'D5 . . F5 . . . . E5 . D5 . C5 . . .',
          'B4 . . . G#4 . . . E4 . . . . . . .',
        ].join(' | '),
      },
      { instrument: 'pad', mode: 'chord', octave: 3, gain: 0.5, steps: 16, pattern: 'c . . . . . . . . . . . . . . .' },
      { instrument: 'snap', mode: 'drum', gain: 0.4, pattern: BACKBEAT },
      { instrument: 'shaker', mode: 'drum', gain: 0.6, pattern: OFFBEATS },
      { instrument: 'kick', mode: 'drum', gain: 0.4, pattern: 'x . . . . . . . x . . . . . . .' },
      { instrument: 'pencil', mode: 'drum', gain: 0.5, when: 'urgent', pattern: SIXTEENTHS },
    ],
  },

  results: {
    id: 'results',
    title: 'Hooray!',
    bpm: 116,
    swing: 0.2,
    chords: ['G', 'Em', 'C', 'D'],
    parts: [
      { instrument: 'marimba', mode: 'chord', octave: 4, gain: 0.4, pattern: '0 . 2 . 1 . 2 . 3 . 2 . 1 . 2 .' },
      { instrument: 'bass', mode: 'chord', octave: 2, gain: 0.8, steps: 2, pattern: '0 . . . 2 . . . 0 . 0 . 2 . . .' },
      { instrument: 'kick', mode: 'drum', gain: 0.55, pattern: FOUR_ON_FLOOR },
      { instrument: 'snap', mode: 'drum', gain: 0.5, pattern: BACKBEAT },
      { instrument: 'shaker', mode: 'drum', gain: 0.7, pattern: SIXTEENTHS },
      {
        instrument: 'whistle',
        mode: 'notes',
        gain: 0.75,
        pattern: [
          'B4 . D5 . G5 - - . F#5 . E5 . D5 - - .',
          'E5 - - . B4 - - . G4 - - - - . . .',
          'C5 . E5 . G5 - - . E5 . C5 . E5 - - .',
          'D5 - - . F#5 - - . A5 - - - - . . .',
        ].join(' | '),
      },
    ],
  },

  finale: {
    id: 'finale',
    title: 'Victory Lap',
    bpm: 132,
    swing: 0,
    chords: ['C', 'F', 'G', 'C'],
    parts: [
      { instrument: 'pluck', mode: 'chord', octave: 4, gain: 0.3, pattern: '0 2 1 2 0 2 1 2 0 2 1 2 0 2 1 2' },
      { instrument: 'bass', mode: 'chord', octave: 2, gain: 0.8, steps: 2, pattern: '0 . 0 . 2 . 0 . 0 . 0 . 2 . 3 .' },
      { instrument: 'kick', mode: 'drum', gain: 0.6, pattern: FOUR_ON_FLOOR },
      { instrument: 'snap', mode: 'drum', gain: 0.55, pattern: '. . . . x . . . . . . . x . x x' },
      { instrument: 'hat', mode: 'drum', gain: 0.8, pattern: OFFBEATS },
      {
        instrument: 'brass',
        mode: 'notes',
        gain: 0.8,
        pattern: [
          'C5 - - . E5 . G5 . C6 - - - - . G5 .',
          'A5 - - . F5 - - . C6 - - - A5 - - .',
          'B5 - - . G5 - - . D6 - - - B5 - - .',
          'C6 - - . G5 . E5 . C5 - - - - . . .',
        ].join(' | '),
      },
    ],
  },
};
