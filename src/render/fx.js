// Particles: sparks, dust, embers, coin pops, lightning bolts and the screen flash.
import { sx } from './camera.js';

const MAX = 500;

export function createFx() {
  return { parts: [], bolts: [], texts: [], flash: 0 };
}

function add(fx, p) {
  if (fx.parts.length >= MAX) fx.parts.shift();
  fx.parts.push(p);
}

export function burst(fx, x, y, n, opt) {
  for (let i = 0; i < n; i++) {
    const a = (opt.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (opt.spread ?? Math.PI);
    const sp = (opt.speed ?? 80) * (0.4 + Math.random() * 0.8);
    add(fx, {
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: opt.g ?? 220,
      life: 0, max: (opt.life ?? 0.5) * (0.6 + Math.random() * 0.6),
      size: (opt.size ?? 2) * (0.6 + Math.random() * 0.8), color: opt.color, kind: opt.kind || 'spark',
    });
  }
}

function boltPath(x, top, bottom) {
  const pts = [[x + (Math.random() - 0.5) * 60, top]];
  const n = 12;
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    pts.push([x + (Math.random() - 0.5) * 34 * (1 - k * 0.7), top + (bottom - top) * k]);
  }
  pts[n][0] = x;
  return pts;
}

/** Turn a sim event into effects. y values are world heights above the ground (negative is up). */
export function fxEvent(fx, ev, cam, opts) {
  switch (ev.type) {
    case 'hit':
      burst(fx, ev.x, -22 + (ev.z || 0) * 0.55, ev.building ? 6 : 4, { color: ev.building ? '#c8b89a' : '#ffe9a8', speed: 110, life: 0.3, size: 1.8 });
      break;
    case 'death':
      burst(fx, ev.x, -6 + (ev.z || 0) * 0.55, 8, { color: 'rgba(120,110,100,0.8)', speed: 40, life: 0.8, size: 4, g: -20, kind: 'dust' });
      break;
    case 'buildingHit':
      if (Math.random() < 0.35) burst(fx, ev.x + (Math.random() - 0.5) * 100, -60 - Math.random() * 90, 3, { color: '#8a8478', speed: 70, life: 0.6, size: 2.5 });
      break;
    case 'coin':
      if (ev.faction === opts.player) fx.texts.push({ x: ev.x, y: -60, life: 0, max: 1.1, text: '+' + ev.amount, color: '#ffd34d' });
      break;
    case 'spellCast':
      fx.texts.push({ x: ev.x, y: 0, life: 0, max: 0.4, ring: true, color: ev.faction === opts.player ? '#bfe8ff' : '#d6ffb0' });
      break;
    case 'lightning': {
      const color = ev.faction === opts.player ? '#cfeeff' : '#e2ffb8';
      for (let i = 0; i < 2; i++) fx.bolts.push({ pts: boltPath(ev.x, -440, 0), life: 0, max: 0.35 + i * 0.1, color });
      burst(fx, ev.x, -4, 26, { color, speed: 200, life: 0.6, size: 2.2 });
      burst(fx, ev.x, -4, 10, { color: 'rgba(90,80,90,0.7)', speed: 50, life: 1.0, size: 6, g: -30, kind: 'dust' });
      fx.flash = 0.45;
      cam.shake = Math.max(cam.shake, 7);
      break;
    }
    case 'blast': {
      const color = ev.faction === opts.player ? '#9fe0ff' : '#c6ff7a';
      burst(fx, ev.x, ev.y ?? -10, 16, { color, speed: 130, life: 0.5, size: 2.4 });
      burst(fx, ev.x, ev.y ?? -10, 4, { color: 'rgba(90,80,90,0.6)', speed: 40, life: 0.7, size: 5, g: -30, kind: 'dust' });
      fx.texts.push({ x: ev.x, y: 0, life: 0, max: 0.35, ring: true, color });
      cam.shake = Math.max(cam.shake, 1.5);
      break;
    }
    case 'siege':
      fx.texts.push({ x: ev.x, y: -120, life: 0, max: 3, text: 'The walls begin to crack…', color: '#ffb36a' });
      break;
    case 'win':
      for (let i = 0; i < 6; i++) burst(fx, ev.x + (Math.random() - 0.5) * 120, -40 - Math.random() * 120, 14, { color: i % 2 ? '#ff9a3a' : '#ffd34d', speed: 160, life: 1.2, size: 3, g: 60, kind: 'ember' });
      cam.shake = Math.max(cam.shake, 10);
      break;
  }
}

export function updateFx(fx, dt) {
  const keep = [];
  for (const p of fx.parts) {
    p.life += dt;
    if (p.life >= p.max) continue;
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'dust') p.size += dt * 6;
    keep.push(p);
  }
  fx.parts = keep;
  fx.bolts = fx.bolts.filter((b) => (b.life += dt) < b.max);
  fx.texts = fx.texts.filter((t) => (t.life += dt) < t.max);
  if (fx.flash > 0) fx.flash = Math.max(0, fx.flash - dt * 2.2);
}

export function drawFx(ctx, fx, cam) {
  const s = cam.scale;
  const gy = cam.groundY + cam.shakeY;
  for (const p of fx.parts) {
    const x = sx(cam, p.x);
    if (x < -20 || x > cam.w + 20) continue;
    const a = 1 - p.life / p.max;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    const r = p.size * s;
    if (p.kind === 'dust' || p.kind === 'ember') {
      ctx.beginPath(); ctx.arc(x, gy + p.y * s, r, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillRect(x - r / 2, gy + p.y * s - r / 2, r, r);
    }
  }
  ctx.globalAlpha = 1;
  for (const b of fx.bolts) {
    const a = 1 - b.life / b.max;
    ctx.strokeStyle = b.color;
    ctx.globalAlpha = a;
    for (const [w, al] of [[7, 0.25], [2.5, 1]]) {
      ctx.lineWidth = w * s;
      ctx.globalAlpha = a * al;
      ctx.beginPath();
      b.pts.forEach(([px, py], i) => (i ? ctx.lineTo(sx(cam, px), gy + py * s) : ctx.moveTo(sx(cam, px), gy + py * s)));
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  for (const t of fx.texts) {
    const k = t.life / t.max;
    const x = sx(cam, t.x);
    if (t.ring) {
      ctx.strokeStyle = t.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.ellipse(x, gy, (20 + 70 * k) * s, (6 + 14 * k) * s, 0, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = t.color;
      ctx.font = `700 ${Math.round(11 * s)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, x, gy + (t.y - k * 26) * s);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawFlash(ctx, fx, w, h) {
  if (fx.flash <= 0) return;
  ctx.fillStyle = `rgba(225,240,255,${fx.flash * 0.6})`;
  ctx.fillRect(0, 0, w, h);
}
