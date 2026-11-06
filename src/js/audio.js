import { store, emitter } from './util.js';

let ctx = null;
let master = null;
const buffers = {};

export function audioCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() {
  try {
    audioCtx();
  } catch { /* no Web Audio */ }
}

// Soft three-note bell. Ascending when a focus session ends, descending when a break ends.
export function chime(up = true) {
  const c = audioCtx();
  const notes = up ? [523.25, 659.25, 783.99] : [783.99, 659.25, 523.25];
  notes.forEach((f, i) => {
    const t = c.currentTime + i * 0.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    g.connect(master);
    for (const [mult, level] of [[1, 1], [2.01, 0.18], [3.02, 0.06]]) {
      const o = c.createOscillator();
      const og = c.createGain();
      o.frequency.value = f * mult;
      og.gain.value = level;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 1.7);
    }
  });
}

// ── Procedural ambience ──────────────────────────────────────────────

function noise(kind) {
  if (buffers[kind]) return buffers[kind];
  const len = ctx.sampleRate * 6;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w * 0.4;
      else if (kind === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    // Crossfade the tail into the head so the loop point doesn't click.
    const fade = 4096;
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      d[len - fade + i] = d[len - fade + i] * (1 - t) + d[i] * t;
    }
  }
  return (buffers[kind] = buf);
}

const loop = (kind) => {
  const s = ctx.createBufferSource();
  s.buffer = noise(kind);
  s.loop = true;
  s.start(0, Math.random() * 5);
  return s;
};
const filter = (type, frequency, Q = 0.7) => new BiquadFilterNode(ctx, { type, frequency, Q });
const gain = (value) => new GainNode(ctx, { gain: value });
const lfo = (frequency, depth, param) => {
  const o = new OscillatorNode(ctx, { frequency });
  o.connect(gain(depth)).connect(param);
  o.start();
  return o;
};

export const SOUNDS = [
  {
    id: 'pluie', label: 'Pluie', icon: 'rain', color: 'blue', level: 1.1,
    build(out) {
      const hiss = loop('pink');
      hiss.connect(filter('highpass', 450)).connect(filter('lowpass', 7500)).connect(out);
      const body = loop('brown');
      body.connect(filter('lowpass', 500)).connect(gain(0.35)).connect(out);
      return [hiss, body];
    },
  },
  {
    id: 'feu', label: 'Feu de cheminée', icon: 'flame', color: 'peach', level: 1,
    build(out) {
      const rumble = loop('brown');
      rumble.connect(filter('lowpass', 320)).connect(gain(0.8)).connect(out);
      let timer;
      const crackle = () => {
        const t = ctx.currentTime;
        const len = 0.004 + Math.random() * 0.025;
        const src = new AudioBufferSourceNode(ctx, { buffer: noise('white') });
        const g = gain(0.0001);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25 + Math.random() * 0.9, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        src.connect(filter('highpass', 1200 + Math.random() * 3000)).connect(g).connect(out);
        src.start(t, Math.random() * 4, len + 0.02);
        timer = setTimeout(crackle, 30 + Math.random() * Math.random() * 700);
      };
      crackle();
      return [rumble, { stop: () => clearTimeout(timer) }];
    },
  },
  {
    id: 'vagues', label: 'Vagues', icon: 'waves', color: 'teal', level: 1,
    build(out) {
      const swell = gain(0.5);
      const sea = loop('brown');
      sea.connect(filter('lowpass', 750)).connect(swell).connect(out);
      const foam = loop('pink');
      foam.connect(filter('highpass', 1800)).connect(gain(0.25)).connect(swell);
      return [sea, foam, lfo(0.085, 0.45, swell.gain)];
    },
  },
  {
    id: 'vent', label: 'Vent', icon: 'wind', color: 'lavender', level: 1.6,
    build(out) {
      const band = filter('bandpass', 520, 0.9);
      const gust = gain(0.6);
      const air = loop('pink');
      air.connect(band).connect(gust).connect(out);
      return [air, lfo(0.06, 300, band.frequency), lfo(0.13, 0.3, gust.gain)];
    },
  },
  {
    id: 'brun', label: 'Bruit brun', icon: 'noise', color: 'overlay2', level: 0.7,
    build(out) {
      const s = loop('brown');
      s.connect(filter('lowpass', 1800)).connect(out);
      return [s];
    },
  },
];

export const ambience = {
  events: emitter(),
  volumes: { pluie: 0.5, feu: 0.5, vagues: 0.5, vent: 0.4, brun: 0.4, ...store.get('ambience', {}) },
  playing: new Map(),

  isOn(id) {
    return this.playing.has(id);
  },
  any() {
    return this.playing.size > 0;
  },
  start(id) {
    if (this.isOn(id)) return;
    const sound = SOUNDS.find((s) => s.id === id);
    audioCtx();
    const out = gain(0);
    out.connect(master);
    const parts = sound.build(out);
    out.gain.setTargetAtTime(this.volumes[id] * sound.level, ctx.currentTime, 0.5);
    this.playing.set(id, { out, parts, sound });
    this.events.emit();
  },
  stop(id) {
    const p = this.playing.get(id);
    if (!p) return;
    this.playing.delete(id);
    p.out.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    setTimeout(() => {
      p.parts.forEach((n) => n.stop());
      p.out.disconnect();
    }, 1500);
    this.events.emit();
  },
  toggle(id) {
    if (this.isOn(id)) this.stop(id);
    else this.start(id);
  },
  stopAll() {
    [...this.playing.keys()].forEach((id) => this.stop(id));
  },
  setVolume(id, v) {
    this.volumes[id] = v;
    store.set('ambience', this.volumes);
    const p = this.playing.get(id);
    if (v <= 0.001) this.stop(id);
    else if (!p) this.start(id);
    else p.out.gain.setTargetAtTime(v * p.sound.level, ctx.currentTime, 0.1);
    this.events.emit();
  },
};
