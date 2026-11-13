import { S } from './state.js';

// Everything is synthesised, no audio files. Starts only after a user gesture.
let ctx = null, master = null, ambBus = null, sfxBus = null;
const beds = {};
let current = null;

function noiseBuffer(sec = 2, color = 'white') {
  const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
  const d = b.getChannelData(0);
  let last = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (color === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else if (color === 'pink') { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.0186) * 0.6; }
    else d[i] = w;
  }
  return b;
}
function loopNoise(color, gain, filterType, freq, q = 0.7) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(3, color);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = filterType; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g);
  src.start();
  return { out: g, filter: f, gain: g };
}
function hum(freq, gain) {
  const o = ctx.createOscillator();
  o.type = 'sine'; o.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = gain;
  o.connect(g); o.start();
  return g;
}

function makeBed(id) {
  const bus = ctx.createGain();
  bus.gain.value = 0;
  bus.connect(ambBus);
  const add = (n) => n.connect(bus);
  const timers = [];
  if (id === 'study') {
    add(loopNoise('brown', 0.05, 'lowpass', 300).out);
    // a clock
    timers.push(setInterval(() => { if (current === 'study') tick(0.02, 2400); }, 1000));
  } else if (id === 'trading') {
    const rain = loopNoise('pink', 0.12, 'bandpass', 2400, 0.4);
    add(rain.out);
    add(loopNoise('brown', 0.06, 'lowpass', 180).out);
    add(hum(60, 0.008));
    timers.push(setInterval(() => { if (current === 'trading' && Math.random() < 0.5) tick(0.015, 1800 + Math.random() * 1500, bus); }, 140));
  } else if (id === 'lab') {
    const fans = loopNoise('pink', 0.12, 'lowpass', 900);
    add(fans.out);
    add(hum(120, 0.012));
    add(hum(181, 0.004));
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.15;
    const lg = ctx.createGain(); lg.gain.value = 200;
    lfo.connect(lg).connect(fans.filter.frequency); lfo.start();
  } else if (id === 'court') {
    add(loopNoise('brown', 0.08, 'lowpass', 220).out);
    add(hum(100, 0.006));
    timers.push(setInterval(() => { if (current === 'court' && Math.random() < 0.12) thock(bus); }, 1300));
  } else if (id === 'kitchen') {
    add(loopNoise('brown', 0.05, 'lowpass', 400).out);
    add(loopNoise('white', 0.012, 'bandpass', 4000, 1.5).out); // fridge / hiss
    timers.push(setInterval(() => { if (current === 'kitchen') for (let i = 0; i < 3; i++) if (Math.random() < 0.5) blip(bus, 300 + Math.random() * 500, 0.012); }, 220));
  } else if (id === 'wild' || id === 'clearing') {
    const wind = loopNoise('pink', 0.09, 'lowpass', 500);
    add(wind.out);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 0.05;
    lfo.connect(lg).connect(wind.gain.gain); lfo.start();
    add(loopNoise('brown', 0.05, 'lowpass', 160).out); // water
    timers.push(setInterval(() => { if (current === id) cricket(bus); }, 900 + Math.random() * 600));
  }
  return { bus, timers };
}

function tick(v, f, dest = sfxBus) {
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
  const g = ctx.createGain(); const t = ctx.currentTime;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  o.connect(g).connect(dest); o.start(t); o.stop(t + 0.04);
}
function thock(dest) {
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.08);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  o.connect(g).connect(dest); o.start(t); o.stop(t + 0.2);
}
function blip(dest, f, v) {
  const t = ctx.currentTime + Math.random() * 0.2;
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.05);
  const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(g).connect(dest); o.start(t); o.stop(t + 0.08);
}
function cricket(dest) {
  const t0 = ctx.currentTime;
  const f = 4200 + Math.random() * 600;
  for (let i = 0; i < 3; i++) {
    const t = t0 + i * 0.06;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.012, t + 0.01); g.gain.linearRampToValueAtTime(0, t + 0.04);
    o.connect(g).connect(dest); o.start(t); o.stop(t + 0.05);
  }
}

function env(node, t, a, peak, d) {
  node.gain.setValueAtTime(0.0001, t);
  node.gain.exponentialRampToValueAtTime(peak, t + a);
  node.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function tone(f, type, peak, a, d, when = 0, dest = sfxBus) {
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
  const g = ctx.createGain();
  env(g, t, a, peak, d);
  o.connect(g).connect(dest); o.start(t); o.stop(t + a + d + 0.05);
  return o;
}
function burst(dur, peak, type, freq, when = 0, q = 1) {
  const t = ctx.currentTime + when;
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(Math.max(0.1, dur + 0.05));
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); env(g, t, 0.005, peak, dur);
  src.connect(f).connect(g).connect(sfxBus); src.start(t); src.stop(t + dur + 0.05);
  return f;
}

const SFX = {
  bell() { [1, 2.76, 5.4, 8.93].forEach((m, i) => tone(1320 * m, 'sine', 0.16 / (i + 1), 0.002, 2.2 / (i * 0.6 + 1))); },
  printer() { for (let i = 0; i < 14; i++) burst(0.04, 0.05, 'bandpass', 2500 + (i % 3) * 400, i * 0.07, 3); burst(0.3, 0.03, 'lowpass', 600, 1.0); },
  pickup() { tone(880, 'triangle', 0.08, 0.005, 0.18); tone(1318, 'triangle', 0.07, 0.005, 0.3, 0.08); },
  token() { [1, 2.4, 3.9].forEach((m, i) => tone(1046 * m, 'sine', 0.09 / (i + 1), 0.002, 1.2)); tone(784, 'triangle', 0.05, 0.01, 0.6, 0.1); },
  beep() { tone(1500, 'square', 0.03, 0.003, 0.08); tone(2000, 'square', 0.03, 0.003, 0.1, 0.1); },
  deny() { tone(220, 'square', 0.04, 0.003, 0.12); tone(180, 'square', 0.04, 0.003, 0.18, 0.13); },
  door() { const f = burst(1.1, 0.07, 'lowpass', 400); f.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 1); tone(70, 'sine', 0.05, 0.05, 0.9); },
  fold() { burst(0.5, 0.06, 'lowpass', 700); tone(140, 'sine', 0.06, 0.01, 0.2, 0.45); burst(0.08, 0.08, 'bandpass', 1500, 0.5, 2); },
  paper() { burst(0.18, 0.05, 'highpass', 2500); burst(0.12, 0.035, 'highpass', 3500, 0.12); },
  tear() { burst(0.35, 0.05, 'bandpass', 3000, 0, 0.8); },
  static() { burst(0.12, 0.03, 'bandpass', 1800 + Math.random() * 2000, 0, 1.2); },
  click() { tone(1200, 'square', 0.02, 0.002, 0.03); },
  good() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 'triangle', 0.06, 0.01, 0.6, i * 0.09)); },
  bad() { tone(196, 'triangle', 0.08, 0.01, 0.35); tone(185, 'triangle', 0.06, 0.01, 0.4, 0.12); },
  chime() { [1568, 2093, 2637].forEach((f, i) => tone(f, 'sine', 0.05, 0.005, 1.6, i * 0.12)); },
  step(run) { burst(0.05, run ? 0.05 : 0.032, 'lowpass', current === 'wild' || current === 'clearing' ? 900 : current === 'court' ? 500 : 1300); },
  thock() { thock(sfxBus); },
  servo() { const t = ctx.currentTime; const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.linearRampToValueAtTime(260, t + 0.18); const g = ctx.createGain(); env(g, t, 0.01, 0.025, 0.18); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; o.connect(f).connect(g).connect(sfxBus); o.start(t); o.stop(t + 0.25); },
  crash() { burst(0.2, 0.09, 'lowpass', 500); tone(90, 'sine', 0.08, 0.005, 0.25); },
  sizzle() { burst(1.4, 0.04, 'highpass', 3000); },
  passbell() { [1, 2.76, 5.4].forEach((m, i) => tone(1760 * m, 'sine', 0.12 / (i + 1), 0.002, 1.6)); setTimeout(() => SFX.bell(), 200); },
  lens() { tone(392, 'sine', 0.06, 0.2, 1.8); tone(587, 'sine', 0.05, 0.3, 2.2, 0.15); tone(784, 'sine', 0.04, 0.4, 2.6, 0.3); },
  lanterns() { [392, 494, 587, 784, 988].forEach((f, i) => tone(f, 'sine', 0.04, 0.02, 1.2, i * 0.35)); },
  birthday() {
    // two voices singing it through once, slowly
    const n = [[392, 0.3], [392, 0.15], [440, 0.45], [392, 0.45], [523, 0.45], [494, 0.9], [392, 0.3], [392, 0.15], [440, 0.45], [392, 0.45], [587, 0.45], [523, 0.9], [392, 0.3], [392, 0.15], [784, 0.45], [659, 0.45], [523, 0.45], [494, 0.45], [440, 0.9], [698, 0.3], [698, 0.15], [659, 0.45], [523, 0.45], [587, 0.45], [523, 1.2]];
    let t = 0.05;
    for (const [f, d] of n) {
      const len = d * 1.3;
      tone(f, 'triangle', 0.1, 0.04, len * 0.92, t);
      tone(f * 1.004, 'sine', 0.06, 0.06, len * 0.9, t);
      tone(f / 2, 'sine', 0.03, 0.05, len * 0.9, t);
      t += len;
    }
  },
};

export const Audio = {
  start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    master = ctx.createGain();
    master.connect(ctx.destination);
    ambBus = ctx.createGain(); ambBus.gain.value = 0.9; ambBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    this.applySettings();
    if (current) { const c = current; current = null; this.area(c); }
  },
  applySettings() {
    if (!master) return;
    master.gain.setTargetAtTime(S.settings.sound ? S.settings.volume : 0, ctx.currentTime, 0.1);
  },
  area(id) {
    if (!ctx) { current = id; return; }
    if (id === current) return;
    current = id;
    if (!beds[id]) beds[id] = makeBed(id);
    for (const [k, b] of Object.entries(beds)) b.bus.gain.setTargetAtTime(k === id ? 1 : 0, ctx.currentTime, 0.8);
  },
  sfx(name, ...a) {
    if (!ctx || !S.settings.sound) return;
    try { SFX[name]?.(...a); } catch { /* ignore */ }
  },
};
