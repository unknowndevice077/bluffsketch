import { INSTRUMENTS } from './instruments';
import { chain, filter, noiseAt, oscAt, percEnv, type AudioKit } from './kit';
import { midiToFreq, noteToMidi } from './notes';

export type SoundName =
  | 'tap'
  | 'pop'
  | 'join'
  | 'chat'
  | 'squeak'
  | 'pageFlip'
  | 'tick'
  | 'tickUrgent'
  | 'timeUp'
  | 'undo'
  | 'crumple'
  | 'reaction'
  | 'stamp'
  | 'drumroll'
  | 'flip'
  | 'caught'
  | 'escape'
  | 'steal'
  | 'sadTrombone'
  | 'chime';

type Sfx = (kit: AudioKit, t: number) => void;

const hz = (note: string) => midiToFreq(noteToMidi(note) ?? 69);
const { marimba, pluck, brass, kick, pencil, woodblock, whistle } = INSTRUMENTS;

/** Plays a short melody on one instrument: [note, startOffsetSec, durationSec]. */
function phrase(kit: AudioKit, t: number, voice: (typeof INSTRUMENTS)[keyof typeof INSTRUMENTS], notes: [string, number, number][], vel = 0.8) {
  for (const [note, offset, dur] of notes) voice(kit, t + offset, hz(note), dur, vel);
}

/** A whooshing slide from one pitch to another (slide whistle). */
function slide(kit: AudioKit, t: number, from: number, to: number, dur: number, peak: number) {
  const o = oscAt(kit.ctx, 'sine', from, t, t + dur + 0.05);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  chain(o, percEnv(kit.ctx, t, peak, 0.02, dur), kit.out);
}

const SFX: Record<SoundName, Sfx> = {
  /** Every button press: a soft pencil tap. */
  tap: (kit, t) => pencil(kit, t, 0, 0.03, 0.6),

  pop: ({ ctx, out }, t) => {
    const o = oscAt(ctx, 'sine', 520, t, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(1100, t + 0.08);
    chain(o, percEnv(ctx, t, 0.45, 0.005, 0.1), out);
  },

  join: (kit, t) => phrase(kit, t, pluck, [['G5', 0, 0.2], ['C6', 0.09, 0.3]], 0.9),

  chat: (kit, t) => phrase(kit, t, marimba, [['A5', 0, 0.1], ['E6', 0.06, 0.1]], 0.35),

  /** A marker squeaking across paper: drawing starts. */
  squeak: ({ ctx, out }, t) => {
    const o = oscAt(ctx, 'triangle', 1900, t, t + 0.22);
    const lfo = oscAt(ctx, 'square', 38, t, t + 0.22);
    const depth = ctx.createGain();
    depth.gain.value = 180;
    chain(lfo, depth);
    depth.connect(o.frequency);
    chain(o, filter(ctx, 'bandpass', 2200, 2), percEnv(ctx, t, 0.28, 0.01, 0.2), out);
  },

  /** Notebook page turning: filtered noise with a flutter, then a soft slap. */
  pageFlip: (kit, t) => {
    const { ctx, out } = kit;
    const bp = filter(ctx, 'bandpass', 900, 0.9);
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.exponentialRampToValueAtTime(4200, t + 0.28);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 7; i++) g.gain.linearRampToValueAtTime(i % 2 === 0 ? 0.35 : 0.12, t + 0.03 + i * 0.035);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    chain(noiseAt(kit, t, 0.36), bp, g, out);
    chain(noiseAt(kit, t + 0.3, 0.08), filter(ctx, 'lowpass', 900), percEnv(ctx, t + 0.3, 0.3, 0.003, 0.07), out);
  },

  tick: (kit, t) => woodblock(kit, t, 880, 0.1, 0.7),
  tickUrgent: (kit, t) => {
    woodblock(kit, t, 1320, 0.1, 0.9);
    pencil(kit, t, 0, 0.03, 0.6);
  },

  /** Pencils down! A desk bell. */
  timeUp: ({ ctx, out }, t) => {
    for (const [ratio, peak, decay] of [[1, 0.3, 1.4], [2.76, 0.12, 0.8], [5.4, 0.06, 0.4]] as const) {
      chain(oscAt(ctx, 'sine', 1320 * ratio, t, t + decay + 0.1), percEnv(ctx, t, peak, 0.002, decay), out);
    }
  },

  /** Tape rewinding. */
  undo: ({ ctx, out }, t) => {
    const o = oscAt(ctx, 'triangle', 900, t, t + 0.16);
    o.frequency.exponentialRampToValueAtTime(320, t + 0.14);
    chain(o, percEnv(ctx, t, 0.25, 0.005, 0.14), out);
  },

  /** Balling up a sheet of paper: a cluster of random crackles. */
  crumple: (kit, t) => {
    for (let i = 0; i < 16; i++) {
      const at = t + Math.random() * 0.4;
      const bp = filter(kit.ctx, 'bandpass', 1500 + Math.random() * 3500, 2);
      chain(noiseAt(kit, at, 0.05), bp, percEnv(kit.ctx, at, 0.6 * (1 - i / 20), 0.001, 0.03 + Math.random() * 0.04), kit.out);
    }
  },

  reaction: (kit, t) => {
    const base = 700 + Math.random() * 300;
    const o = oscAt(kit.ctx, 'sine', base, t, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(base * 2, t + 0.08);
    chain(o, percEnv(kit.ctx, t, 0.22, 0.004, 0.09), kit.out);
  },

  /** Rubber stamp on paper: vote locked. */
  stamp: (kit, t) => {
    kick(kit, t, 0, 0.2, 0.7);
    chain(noiseAt(kit, t, 0.1), filter(kit.ctx, 'lowpass', 1400), percEnv(kit.ctx, t, 0.45, 0.001, 0.08), kit.out);
    woodblock(kit, t + 0.005, 2100, 0.05, 0.25);
  },

  drumroll: (kit, t) => {
    const { ctx, out } = kit;
    const hits = 30;
    for (let i = 0; i < hits; i++) {
      const at = t + i * 0.05;
      chain(noiseAt(kit, at, 0.06), filter(ctx, 'bandpass', 1100, 0.9), percEnv(ctx, at, 0.08 + (i / hits) * 0.32, 0.001, 0.05), out);
    }
    const end = t + hits * 0.05;
    chain(noiseAt(kit, end, 1.2), filter(ctx, 'highpass', 4500), percEnv(ctx, end, 0.35, 0.002, 1.1), out);
    kick(kit, end, 0, 0.3, 1);
  },

  /** A vote card flipping over. */
  flip: (kit, t) => {
    chain(noiseAt(kit, t, 0.06), filter(kit.ctx, 'highpass', 2500), percEnv(kit.ctx, t, 0.25, 0.001, 0.05), kit.out);
    pluck(kit, t + 0.02, hz('A5'), 0.1, 0.5);
  },

  /** Faker caught: party popper + toy-brass fanfare. */
  caught: (kit, t) => {
    chain(noiseAt(kit, t, 0.25), filter(kit.ctx, 'highpass', 2000), percEnv(kit.ctx, t, 0.5, 0.001, 0.2), kit.out);
    kick(kit, t, 0, 0.2, 0.6);
    phrase(kit, t + 0.08, brass, [['G4', 0, 0.12], ['C5', 0.13, 0.12], ['E5', 0.26, 0.12], ['G5', 0.39, 0.6]], 0.9);
    phrase(kit, t + 0.47, marimba, [['C6', 0, 0.3], ['E6', 0.08, 0.3], ['G6', 0.16, 0.4]], 0.5);
  },

  /** Faker escaped: sneaky tiptoe down the chromatic scale, then a giggle. */
  escape: (kit, t) => {
    phrase(kit, t, pluck, [['E5', 0, 0.1], ['Eb5', 0.18, 0.1], ['D5', 0.36, 0.1], ['Db5', 0.54, 0.1], ['C5', 0.8, 0.2]], 0.8);
    phrase(kit, t + 1.1, whistle, [['A6', 0, 0.07], ['F6', 0.1, 0.09]], 0.6);
  },

  /** Faker guessed the word: sneaky run plus a triumphant slide whistle. */
  steal: (kit, t) => {
    phrase(kit, t, pluck, [['C5', 0, 0.08], ['E5', 0.1, 0.08], ['G5', 0.2, 0.08], ['Bb5', 0.3, 0.1]], 0.8);
    slide(kit, t + 0.45, 500, 1500, 0.45, 0.3);
    phrase(kit, t + 0.95, marimba, [['C6', 0, 0.3], ['G6', 0.1, 0.4]], 0.6);
  },

  /** Faker guessed wrong: wah, wah, wah, waaah. */
  sadTrombone: (kit, t) => {
    const { ctx, out } = kit;
    const notes: [string, number, number][] = [['G3', 0, 0.38], ['F#3', 0.42, 0.38], ['F3', 0.84, 0.38], ['E3', 1.26, 1.1]];
    for (const [note, offset, dur] of notes) {
      const at = t + offset;
      const o = oscAt(ctx, 'sawtooth', hz(note), at, at + dur + 0.1);
      if (dur > 1) {
        const lfo = oscAt(ctx, 'sine', 5, at, at + dur + 0.1);
        const depth = ctx.createGain();
        depth.gain.value = hz(note) * 0.02;
        chain(lfo, depth);
        depth.connect(o.frequency);
      }
      const wah = filter(ctx, 'lowpass', 400, 4);
      wah.frequency.setValueAtTime(400, at);
      wah.frequency.linearRampToValueAtTime(1300, at + 0.12);
      wah.frequency.linearRampToValueAtTime(600, at + dur);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, at);
      env.gain.linearRampToValueAtTime(0.22, at + 0.05);
      env.gain.setValueAtTime(0.22, at + dur - 0.06);
      env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      chain(o, wah, env, out);
    }
  },

  chime: (kit, t) => phrase(kit, t, marimba, [['C5', 0, 0.4], ['E5', 0.09, 0.4], ['G5', 0.18, 0.4], ['C6', 0.27, 0.6]], 0.7),
};

export function playSfx(kit: AudioKit, name: SoundName, at?: number): void {
  SFX[name](kit, at ?? kit.ctx.currentTime + 0.01);
}

export const SOUND_NAMES = Object.keys(SFX) as SoundName[];
