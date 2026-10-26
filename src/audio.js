// Synth sound effects with WebAudio. iOS only allows audio after a tap, so unlockAudio() runs on the first pointerdown.

let ac = null;
let master = null;
let noiseBuf = null;
let on = true;
const last = {};

const GAP = { clang: 60, thud: 70, twang: 70, whoosh: 80, coin: 90, death: 70, buildingHit: 160, spawn: 120 };

export function unlockAudio() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = on ? 0.55 : 0;
    master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // A silent blip finishes the unlock on older iOS.
    const s = ac.createBufferSource();
    s.buffer = ac.createBuffer(1, 1, 22050);
    s.connect(ac.destination);
    s.start(0);
  }
  if (ac.state === 'suspended') ac.resume();
}

export function setSound(enabled) {
  on = enabled;
  if (master) master.gain.value = on ? 0.55 : 0;
}

export function suspendAudio() { if (ac && ac.state === 'running') ac.suspend(); }
export function resumeAudio() { if (ac && ac.state === 'suspended') ac.resume(); }

function env(g, t, a, d, vol) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function tone(freq, dur, type, vol, slide, delay = 0) {
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  env(g, t, 0.005, dur, vol);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur, vol, freq, type = 'bandpass', q = 1, delay = 0, sweep) {
  const t = ac.currentTime + delay;
  const s = ac.createBufferSource();
  s.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  f.Q.value = q;
  const g = ac.createGain();
  env(g, t, 0.004, dur, vol);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}

/** Play a named effect. vol scales it (e.g. quieter when off screen). */
export function sfx(name, vol = 1) {
  if (!ac || !on || ac.state !== 'running' || vol <= 0.02) return;
  const now = performance.now();
  if (GAP[name] && now - (last[name] || 0) < GAP[name]) return;
  last[name] = now;
  const v = vol;
  switch (name) {
    case 'clang':
      tone(1400 + Math.random() * 500, 0.12, 'square', 0.05 * v, 900);
      noise(0.08, 0.12 * v, 3000, 'highpass');
      break;
    case 'thud':
      tone(140, 0.14, 'sine', 0.25 * v, 60);
      noise(0.08, 0.1 * v, 600);
      break;
    case 'twang':
      tone(520, 0.12, 'triangle', 0.08 * v, 300);
      noise(0.12, 0.05 * v, 2500, 'bandpass', 2, 0, 900);
      break;
    case 'whoosh':
      noise(0.2, 0.09 * v, 500, 'bandpass', 1.5, 0, 2200);
      break;
    case 'death':
      tone(220, 0.25, 'sawtooth', 0.04 * v, 90);
      noise(0.18, 0.06 * v, 400, 'lowpass');
      break;
    case 'coin':
      tone(1320, 0.07, 'square', 0.035 * v);
      tone(1760, 0.12, 'square', 0.035 * v, null, 0.06);
      break;
    case 'spawn':
      tone(660, 0.1, 'triangle', 0.08 * v);
      tone(990, 0.16, 'triangle', 0.07 * v, null, 0.08);
      break;
    case 'buildingHit':
      noise(0.22, 0.16 * v, 260, 'lowpass');
      tone(90, 0.2, 'sine', 0.18 * v, 50);
      break;
    case 'blast':
      noise(0.25, 0.14 * v, 700, 'lowpass', 0.8, 0, 200);
      tone(200, 0.2, 'sine', 0.14 * v, 70);
      break;
    case 'orb':
      tone(420, 0.3, 'sine', 0.07 * v, 900);
      noise(0.2, 0.04 * v, 1500, 'bandpass', 2, 0, 3000);
      break;
    case 'cast':
      tone(300, 0.35, 'sine', 0.08 * v, 1200);
      break;
    case 'lightning':
      noise(0.08, 0.5 * v, 4000, 'highpass');
      noise(1.1, 0.4 * v, 900, 'lowpass', 0.7, 0.03, 80);
      tone(70, 0.9, 'sawtooth', 0.12 * v, 35, 0.02);
      break;
    case 'click':
      tone(880, 0.05, 'triangle', 0.06 * v);
      break;
    case 'denied':
      tone(180, 0.12, 'square', 0.05 * v, 140);
      break;
    case 'horn':
      tone(196, 0.5, 'sawtooth', 0.06 * v, 220);
      tone(294, 0.5, 'sawtooth', 0.04 * v, 330, 0.05);
      break;
    case 'victory':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.8 : 0.22, 'triangle', 0.12, null, i * 0.18));
      break;
    case 'defeat':
      [392, 330, 262, 196].forEach((f, i) => tone(f, i === 3 ? 0.9 : 0.3, 'sawtooth', 0.05, null, i * 0.28));
      break;
  }
}
