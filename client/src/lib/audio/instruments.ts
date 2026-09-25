import { chain, filter, holdEnv, noiseAt, oscAt, percEnv, type AudioKit } from './kit';

export type InstrumentId =
  | 'marimba'
  | 'pluck'
  | 'bass'
  | 'vibes'
  | 'pad'
  | 'whistle'
  | 'brass'
  | 'kick'
  | 'snap'
  | 'hat'
  | 'shaker'
  | 'pencil'
  | 'woodblock';

/** freq is ignored by drums; dur is the note length in seconds; vel is 0..1. */
export type Voice = (kit: AudioKit, t: number, freq: number, dur: number, vel: number) => void;

/** Small, bright and woody: the "sketchbook" lead. */
const marimba: Voice = ({ ctx, out }, t, f, _dur, v) => {
  const body = percEnv(ctx, t, 0.5 * v, 0.004, 0.5);
  chain(oscAt(ctx, 'sine', f, t, t + 0.6), body, out);
  const knock = percEnv(ctx, t, 0.16 * v, 0.002, 0.05);
  chain(oscAt(ctx, 'sine', f * 4, t, t + 0.1), knock, out);
};

/** Ukulele / pizzicato-ish pluck. */
const pluck: Voice = ({ ctx, out }, t, f, _dur, v) => {
  const lp = filter(ctx, 'lowpass', Math.min(9000, f * 8), 2);
  lp.frequency.setValueAtTime(Math.min(9000, f * 8), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(250, f * 1.5), t + 0.25);
  const env = percEnv(ctx, t, 0.42 * v, 0.003, 0.32);
  chain(oscAt(ctx, 'triangle', f, t, t + 0.4), lp);
  const edge = ctx.createGain();
  edge.gain.value = 0.18;
  chain(oscAt(ctx, 'square', f, t, t + 0.4), edge, lp);
  chain(lp, env, out);
};

/** Round, bouncy bass. */
const bass: Voice = ({ ctx, out }, t, f, dur, v) => {
  const lp = filter(ctx, 'lowpass', 750, 1);
  const env = holdEnv(ctx, t, 0.5 * v, 0.01, Math.max(0.04, dur * 0.6), 0.12);
  chain(oscAt(ctx, 'triangle', f, t, t + dur + 0.25), lp);
  const sub = ctx.createGain();
  sub.gain.value = 0.6;
  chain(oscAt(ctx, 'sine', f, t, t + dur + 0.25), sub, lp);
  chain(lp, env, out);
};

/** Vibraphone with a gentle tremolo. */
const vibes: Voice = ({ ctx, out }, t, f, _dur, v) => {
  const env = percEnv(ctx, t, 0.3 * v, 0.006, 1.6);
  const tremolo = ctx.createGain();
  tremolo.gain.value = 0.8;
  const lfo = oscAt(ctx, 'sine', 5.5, t, t + 1.8);
  const depth = ctx.createGain();
  depth.gain.value = 0.2;
  chain(lfo, depth);
  depth.connect(tremolo.gain);
  chain(oscAt(ctx, 'sine', f, t, t + 1.8), tremolo, env, out);
  const mallet = percEnv(ctx, t, 0.06 * v, 0.002, 0.04);
  chain(oscAt(ctx, 'sine', f * 4, t, t + 0.08), mallet, out);
};

/** Soft detuned-saw pad for suspense. */
const pad: Voice = ({ ctx, out }, t, f, dur, v) => {
  const lp = filter(ctx, 'lowpass', 1000, 0.7);
  const env = holdEnv(ctx, t, 0.07 * v, 0.35, Math.max(0.1, dur - 0.35), 0.8);
  for (const cents of [-8, 8]) {
    const o = oscAt(ctx, 'sawtooth', f, t, t + dur + 1);
    o.detune.value = cents;
    o.connect(lp);
  }
  chain(lp, env, out);
};

/** Cheerful whistled melody with delayed vibrato. */
const whistle: Voice = ({ ctx, out }, t, f, dur, v) => {
  const o = oscAt(ctx, 'sine', f, t, t + dur + 0.2);
  const lfo = oscAt(ctx, 'sine', 6, t, t + dur + 0.2);
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(0.25, dur));
  chain(lfo, depth);
  depth.connect(o.frequency);
  chain(o, holdEnv(ctx, t, 0.22 * v, 0.03, Math.max(0.03, dur * 0.85), 0.08), out);
};

/** Toy-brass fanfare: a filter "bwah" on stacked saw + square. */
const brass: Voice = ({ ctx, out }, t, f, dur, v) => {
  const lp = filter(ctx, 'lowpass', 300, 1.5);
  lp.frequency.setValueAtTime(300, t);
  lp.frequency.exponentialRampToValueAtTime(2600, t + 0.05);
  lp.frequency.exponentialRampToValueAtTime(1300, t + 0.2);
  oscAt(ctx, 'sawtooth', f, t, t + dur + 0.2).connect(lp);
  const sq = ctx.createGain();
  sq.gain.value = 0.5;
  chain(oscAt(ctx, 'square', f * 1.002, t, t + dur + 0.2), sq, lp);
  chain(lp, holdEnv(ctx, t, 0.13 * v, 0.02, Math.max(0.03, dur * 0.8), 0.09), out);
};

const kick: Voice = ({ ctx, out }, t, _f, _dur, v) => {
  const o = oscAt(ctx, 'sine', 160, t, t + 0.3);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  chain(o, percEnv(ctx, t, 0.85 * v, 0.002, 0.26), out);
};

/** Finger snap / clap. */
const snap: Voice = (kit, t, _f, _dur, v) => {
  chain(noiseAt(kit, t, 0.12), filter(kit.ctx, 'bandpass', 1800, 1.5), percEnv(kit.ctx, t, 0.5 * v, 0.001, 0.09), kit.out);
  chain(noiseAt(kit, t, 0.04), filter(kit.ctx, 'highpass', 5000), percEnv(kit.ctx, t, 0.18 * v, 0.001, 0.03), kit.out);
};

const hat: Voice = (kit, t, _f, _dur, v) => {
  chain(noiseAt(kit, t, 0.05), filter(kit.ctx, 'highpass', 7500), percEnv(kit.ctx, t, 0.18 * v, 0.001, 0.035), kit.out);
};

const shaker: Voice = (kit, t, _f, _dur, v) => {
  const g = kit.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.1 * v, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  chain(noiseAt(kit, t, 0.1), filter(kit.ctx, 'bandpass', 6500, 0.8), g, kit.out);
};

/** A pencil tapped on the desk: the drawing track's hi-hat. */
const pencil: Voice = (kit, t, _f, _dur, v) => {
  chain(noiseAt(kit, t, 0.03), filter(kit.ctx, 'bandpass', 3200, 3), percEnv(kit.ctx, t, 0.35 * v, 0.001, 0.025), kit.out);
  chain(oscAt(kit.ctx, 'sine', 1500, t, t + 0.04), percEnv(kit.ctx, t, 0.1 * v, 0.001, 0.02), kit.out);
};

const woodblock: Voice = ({ ctx, out }, t, f, _dur, v) => {
  const pitch = f > 0 ? f : 900;
  chain(oscAt(ctx, 'sine', pitch, t, t + 0.12), percEnv(ctx, t, 0.5 * v, 0.001, 0.08), out);
  chain(oscAt(ctx, 'triangle', pitch * 2.7, t, t + 0.04), percEnv(ctx, t, 0.12 * v, 0.001, 0.02), out);
};

export const INSTRUMENTS: Record<InstrumentId, Voice> = {
  marimba,
  pluck,
  bass,
  vibes,
  pad,
  whistle,
  brass,
  kick,
  snap,
  hat,
  shaker,
  pencil,
  woodblock,
};
