import { INSTRUMENTS } from './instruments';
import { createNoiseBuffer, type AudioKit } from './kit';
import { chordToneMidi, midiToFreq, noteToMidi, parseChord, type Chord } from './notes';
import { TRACKS, type Intensity, type Part, type Track, type TrackId } from './tracks';

const STEPS_PER_BAR = 16;
const LOOKAHEAD_SEC = 0.15;
const PUMP_MS = 25;

interface ParsedPart {
  part: Part;
  bars: string[][];
}

export function parsePattern(pattern: string): string[][] {
  return pattern.split('|').map((bar) => bar.trim().split(/\s+/));
}

const parsedCache = new Map<TrackId, { parts: ParsedPart[]; chords: Chord[] }>();

function parsed(track: Track) {
  let entry = parsedCache.get(track.id);
  if (!entry) {
    entry = {
      parts: track.parts.map((part) => ({ part, bars: parsePattern(part.pattern) })),
      chords: track.chords.map(parseChord),
    };
    parsedCache.set(track.id, entry);
  }
  return entry;
}

export const stepSeconds = (track: Track) => 60 / track.bpm / 4;

/** Schedules every note that starts on `step` (counted from the track's start). */
export function scheduleStep(kit: AudioKit, track: Track, step: number, time: number, intensity: Intensity): void {
  const { parts, chords } = parsed(track);
  const barCount = track.chords.length;
  const bar = Math.floor(step / STEPS_PER_BAR) % barCount;
  const pos = step % STEPS_PER_BAR;
  const pass = Math.floor(step / (STEPS_PER_BAR * barCount));
  const chord = chords[bar];
  const sixteenth = stepSeconds(track);
  const at = pos % 4 === 2 ? time + track.swing * sixteenth : time;

  for (const { part, bars } of parts) {
    if (part.when && part.when !== intensity) continue;
    if (part.passes && !part.passes[pass % part.passes.length]) continue;
    const tokens = bars[bar % bars.length];
    const token = tokens[pos];
    if (!token || token === '.' || token === '-') continue;

    let holds = 0;
    while (tokens[pos + 1 + holds] === '-') holds++;
    const lengthSteps = holds > 0 ? holds + 1 : (part.steps ?? 2);
    const duration = lengthSteps * sixteenth;
    const voice = INSTRUMENTS[part.instrument];
    const humanize = 0.9 + Math.random() * 0.2;

    if (part.mode === 'drum') {
      const accent = token === 'X' ? 1 : token === 'g' ? 0.35 : 0.75;
      voice(kit, at, 0, duration, part.gain * accent * humanize);
    } else if (part.mode === 'notes') {
      const midi = noteToMidi(token);
      if (midi !== null) voice(kit, at, midiToFreq(midi), duration, part.gain * humanize);
    } else if (token === 'c') {
      // Gentle strum: each chord tone slightly after the last.
      chord.intervals.forEach((_, i) => {
        const midi = chordToneMidi(chord, i, part.octave ?? 4);
        voice(kit, at + i * 0.012, midiToFreq(midi), duration, part.gain * 0.7 * humanize);
      });
    } else {
      const degree = Number(token);
      if (Number.isInteger(degree)) {
        voice(kit, at, midiToFreq(chordToneMidi(chord, degree, part.octave ?? 4)), duration, part.gain * humanize);
      }
    }
  }
}

/** Plays one track in real time with a lookahead scheduler ("a tale of two clocks"). */
class TrackPlayer {
  private readonly gain: GainNode;
  private step = 0;
  private nextTime: number;
  private timer = 0;

  constructor(
    private readonly kit: AudioKit,
    readonly track: Track,
    private readonly intensity: () => Intensity,
    fadeInSec: number,
  ) {
    const { ctx } = kit;
    this.gain = ctx.createGain();
    this.gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeInSec);
    this.gain.connect(kit.out);
    this.nextTime = ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.pump(), PUMP_MS);
    this.pump();
  }

  private pump(): void {
    const voiceKit: AudioKit = { ...this.kit, out: this.gain };
    const horizon = this.kit.ctx.currentTime + LOOKAHEAD_SEC;
    while (this.nextTime < horizon) {
      scheduleStep(voiceKit, this.track, this.step, this.nextTime, this.intensity());
      this.nextTime += stepSeconds(this.track);
      this.step++;
    }
  }

  stop(fadeOutSec: number): void {
    window.clearInterval(this.timer);
    const now = this.kit.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0.0001, now + fadeOutSec);
    window.setTimeout(() => this.gain.disconnect(), fadeOutSec * 1000 + 1200);
  }
}

/** Picks and crossfades the background track. Only plays while the audio context runs. */
export class MusicEngine {
  private player: TrackPlayer | null = null;
  private desired: TrackId | null = null;
  private intensity: Intensity = 'normal';

  constructor(private readonly getKit: () => AudioKit | null) {}

  setTrack(id: TrackId | null): void {
    this.desired = id;
    this.sync();
  }

  setIntensity(intensity: Intensity): void {
    this.intensity = intensity;
  }

  /** Starts, switches or stops playback to match the desired track. */
  sync(): void {
    const kit = this.getKit();
    const ctxRunning = kit !== null && (kit.ctx as AudioContext).state === 'running';
    const wanted = ctxRunning && !document.hidden ? this.desired : null;
    if (this.player?.track.id === wanted) return;
    this.player?.stop(0.8);
    this.player = wanted && kit ? new TrackPlayer(kit, TRACKS[wanted], () => this.intensity, 0.8) : null;
  }
}

/** Renders `bars` of a track into an AudioBuffer (used to export WAV previews). */
export async function renderTrack(track: Track, bars: number, intensity: Intensity = 'normal', sampleRate = 44_100): Promise<AudioBuffer> {
  const seconds = bars * STEPS_PER_BAR * stepSeconds(track) + 2;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  const kit: AudioKit = { ctx, out: master, noise: createNoiseBuffer(ctx) };
  for (let step = 0; step < bars * STEPS_PER_BAR; step++) {
    scheduleStep(kit, track, step, step * stepSeconds(track), intensity);
  }
  return ctx.startRendering();
}
