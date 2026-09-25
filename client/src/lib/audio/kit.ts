/**
 * Everything a voice or sound effect needs to make noise. `ctx` is a
 * BaseAudioContext so the same code renders live or into an
 * OfflineAudioContext (used to export WAV previews).
 */
export interface AudioKit {
  ctx: BaseAudioContext;
  out: AudioNode;
  noise: AudioBuffer;
}

export function createNoiseBuffer(ctx: BaseAudioContext, seconds = 2): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Graphite-on-paper texture: noise with a wandering level and sparse grainy spikes. */
export function createScratchBuffer(ctx: BaseAudioContext, seconds = 2): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let level = 0.5;
  let target = 0.5;
  for (let i = 0; i < data.length; i++) {
    if (i % 96 === 0) target = 0.25 + Math.random() * 0.75;
    level += (target - level) * 0.02;
    const grain = Math.random() < 0.003 ? 2.5 : 1;
    data[i] = (Math.random() * 2 - 1) * level * grain * 0.5;
  }
  return buffer;
}

const FLOOR = 0.0001;

/** Percussive envelope: fast attack, exponential decay. */
export function percEnv(ctx: BaseAudioContext, t: number, peak: number, attack: number, decay: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(FLOOR, t);
  g.gain.exponentialRampToValueAtTime(Math.max(FLOOR * 2, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(FLOOR, t + attack + decay);
  return g;
}

/** Held envelope: attack, hold at `peak`, then release. */
export function holdEnv(ctx: BaseAudioContext, t: number, peak: number, attack: number, hold: number, release: number): GainNode {
  const g = ctx.createGain();
  const top = Math.max(FLOOR * 2, peak);
  g.gain.setValueAtTime(FLOOR, t);
  g.gain.linearRampToValueAtTime(top, t + attack);
  g.gain.setValueAtTime(top, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(FLOOR, t + attack + hold + release);
  return g;
}

export function oscAt(ctx: BaseAudioContext, type: OscillatorType, freq: number, t: number, stopAt: number): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.start(t);
  o.stop(stopAt);
  return o;
}

/** A slice of the shared noise buffer, starting at a random offset so hits differ. */
export function noiseAt(kit: AudioKit, t: number, duration: number): AudioBufferSourceNode {
  const source = kit.ctx.createBufferSource();
  source.buffer = kit.noise;
  const offset = Math.random() * Math.max(0, kit.noise.duration - duration - 0.05);
  source.start(t, offset, duration + 0.02);
  return source;
}

export function filter(ctx: BaseAudioContext, type: BiquadFilterType, freq: number, q = 1): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

/** Connects nodes in order and returns the last one. */
export function chain(...nodes: AudioNode[]): AudioNode {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}
