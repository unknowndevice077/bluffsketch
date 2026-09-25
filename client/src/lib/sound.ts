import type { StrokeTool } from '@bluffsketch/shared';
import { createNoiseBuffer, createScratchBuffer, filter, type AudioKit } from './audio/kit';
import { MusicEngine } from './audio/music';
import { playSfx, type SoundName } from './audio/sfx';

export type { SoundName } from './audio/sfx';
export type { Intensity, TrackId } from './audio/tracks';

/** Sliders feel linear to the ear when the gain is squared. */
const curve = (v: number) => Math.min(1, Math.max(0, v)) ** 2;

/**
 * The single audio graph:  sfx bus ─┐
 *                          music bus ┴─ master ─ compressor ─ speakers
 * Everything is synthesised, so there are no files to load.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private scratchBuffer: AudioBuffer | null = null;
  private muted = false;
  private sfxVolume = 0.8;
  private musicVolume = 0.5;
  private scratchNodes: { source: AudioBufferSourceNode; band: BiquadFilterNode; gain: GainNode; tool: StrokeTool } | null = null;

  readonly music = new MusicEngine(() => this.kit('music'));

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => this.music.sync());
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyLevels();
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = volume;
    this.applyLevels();
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = volume;
    this.applyLevels();
  }

  /** Browsers only allow audio after a user gesture; call from one. */
  unlock(): void {
    const ctx = this.context();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  play(name: SoundName): void {
    if (this.muted || this.sfxVolume === 0) return;
    const kit = this.kit('sfx');
    if (kit) playSfx(kit, name);
  }

  // ------------------------------------------------ pencil scratch (drawing)

  startScratch(tool: StrokeTool): void {
    this.stopScratch();
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.sfxBus || this.muted) return;
    this.scratchBuffer ??= createScratchBuffer(ctx);
    const source = ctx.createBufferSource();
    source.buffer = this.scratchBuffer;
    source.loop = true;
    // Graphite is bright and papery; the eraser is a duller rub.
    const band = filter(ctx, 'bandpass', tool === 'brush' ? 3600 : 1100, tool === 'brush' ? 0.9 : 0.7);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(band).connect(filter(ctx, 'highpass', 350)).connect(gain).connect(this.sfxBus);
    source.start(ctx.currentTime, Math.random() * this.scratchBuffer.duration);
    this.scratchNodes = { source, band, gain, tool };
  }

  /** `speed` in logical canvas px per ms: louder and brighter when you draw faster. */
  updateScratch(speed: number): void {
    const nodes = this.scratchNodes;
    if (!nodes || !this.ctx) return;
    const amount = Math.min(1, speed / 1.5);
    const now = this.ctx.currentTime;
    nodes.gain.gain.cancelScheduledValues(now);
    nodes.gain.gain.setTargetAtTime(amount * (nodes.tool === 'brush' ? 0.35 : 0.5), now, 0.03);
    // Fades out by itself if the pen stops moving; the next update cancels this.
    nodes.gain.gain.setTargetAtTime(0, now + 0.08, 0.05);
    const base = nodes.tool === 'brush' ? 3600 : 1100;
    nodes.band.frequency.setTargetAtTime(base * (0.8 + amount * 0.5), now, 0.05);
  }

  stopScratch(): void {
    const nodes = this.scratchNodes;
    if (!nodes || !this.ctx) return;
    const now = this.ctx.currentTime;
    nodes.gain.gain.setTargetAtTime(0, now, 0.03);
    nodes.source.stop(now + 0.25);
    this.scratchNodes = null;
  }

  // ---------------------------------------------------------------- plumbing

  private kit(bus: 'sfx' | 'music'): AudioKit | null {
    const ctx = this.ctx;
    const out = bus === 'sfx' ? this.sfxBus : this.musicBus;
    if (!ctx || !out || !this.noise || ctx.state !== 'running') return null;
    return { ctx, out, noise: this.noise };
  }

  private applyLevels(): void {
    const now = this.ctx?.currentTime ?? 0;
    this.sfxBus?.gain.setTargetAtTime(this.muted ? 0 : curve(this.sfxVolume), now, 0.05);
    this.musicBus?.gain.setTargetAtTime(this.muted ? 0 : curve(this.musicVolume) * 0.55, now, 0.1);
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.ratio.value = 4;
    compressor.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.connect(compressor);
    this.sfxBus = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.noise = createNoiseBuffer(ctx);
    this.ctx = ctx;
    this.applyLevels();
    // Music starts as soon as the browser lets the context run.
    ctx.addEventListener('statechange', () => this.music.sync());
    return ctx;
  }
}

export const sound = new SoundEngine();
