// The scene: dusk sky, parallax mountains, ground, keep, dark tower, mines, crystals, units and missiles.
import { FACTIONS, SPELLS } from '../sim/factions.js';
import { poseFor } from './rig.js';
import { drawFigure, LOOKS } from './parts.js';
import { sx } from './camera.js';

const TAU = Math.PI * 2;
let skyCache = { h: 0, grad: null };

function ridge(x, seed, amp) {
  return (
    Math.sin(x * 0.0021 + seed) * amp +
    Math.sin(x * 0.0057 + seed * 2.3) * amp * 0.45 +
    Math.sin(x * 0.013 + seed * 5.1) * amp * 0.18
  );
}

const LAYERS = [
  { f: 0.1, seed: 1.7, base: 150, amp: 70, color: '#4b3463' },
  { f: 0.25, seed: 4.2, base: 95, amp: 50, color: '#36264a' },
  { f: 0.5, seed: 8.9, base: 42, amp: 22, color: '#241c30', trees: true },
];

function drawSky(ctx, cam, t) {
  const { w, h } = cam;
  if (skyCache.h !== h) {
    const g = ctx.createLinearGradient(0, 0, 0, cam.groundY);
    g.addColorStop(0, '#1c1736');
    g.addColorStop(0.45, '#5a3463');
    g.addColorStop(0.78, '#c4626a');
    g.addColorStop(1, '#f3a65a');
    skyCache = { h, grad: g };
  }
  ctx.fillStyle = skyCache.grad;
  ctx.fillRect(0, 0, w, cam.groundY + 2);
  // stars in the upper sky
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 26; i++) {
    const x = ((i * 137.5 + 40) % 1000) / 1000 * w - (cam.x * 0.02) % w;
    const y = ((i * 71.3) % 100) / 100 * cam.groundY * 0.35;
    ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(t * 0.7 + i));
    ctx.fillRect((x + w) % w, y, 1.3, 1.3);
  }
  ctx.globalAlpha = 1;
  // setting sun, low over the far end of the lane
  const sunX = w * 0.66 - cam.x * cam.scale * 0.04;
  const sunY = cam.groundY - 95 * cam.scale;
  const r = 46 * cam.scale;
  if (!Number.isFinite(sunX + sunY + r)) return; // a zero-sized frame while the window is resizing
  const sg = ctx.createRadialGradient(sunX, sunY, r * 0.2, sunX, sunY, r * 3);
  sg.addColorStop(0, 'rgba(255,214,140,0.9)');
  sg.addColorStop(0.3, 'rgba(255,170,100,0.35)');
  sg.addColorStop(1, 'rgba(255,140,90,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sunX - r * 3, sunY - r * 3, r * 6, r * 6);
  ctx.fillStyle = '#ffd890';
  ctx.beginPath(); ctx.arc(sunX, sunY, r * 0.75, 0, TAU); ctx.fill();
}

function drawLayers(ctx, cam) {
  const s = cam.scale;
  const step = 10;
  for (const L of LAYERS) {
    ctx.fillStyle = L.color;
    ctx.beginPath();
    ctx.moveTo(0, cam.groundY + 2);
    const trees = [];
    for (let x = 0; x <= cam.w + step; x += step) {
      const lx = x / s + cam.x * L.f;
      const y = cam.groundY - (L.base + ridge(lx, L.seed, L.amp)) * s;
      ctx.lineTo(x, y);
      if (L.trees && Math.floor(lx / 23) !== Math.floor((lx - step / s) / 23)) trees.push(x, y);
    }
    ctx.lineTo(cam.w, cam.groundY + 2);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < trees.length; i += 2) {
      const tx = trees[i], ty = trees[i + 1];
      const th = (12 + ((tx * 7) % 9)) * s;
      ctx.beginPath(); ctx.moveTo(tx - th * 0.32, ty + 2); ctx.lineTo(tx, ty - th); ctx.lineTo(tx + th * 0.32, ty + 2); ctx.fill();
    }
  }
}

function drawGround(ctx, cam) {
  const s = cam.scale;
  const top = cam.groundY - 12 * s;
  const g = ctx.createLinearGradient(0, top, 0, cam.h);
  g.addColorStop(0, '#3b4527');
  g.addColorStop(0.12, '#2e3220');
  g.addColorStop(1, '#15130e');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, cam.w, cam.h - top);
  // worn path along the lane
  ctx.fillStyle = 'rgba(160,130,90,0.13)';
  ctx.fillRect(0, cam.groundY - 7 * s, cam.w, 14 * s);
  // pebbles that scroll with the world
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  const start = Math.floor(cam.x / 37) * 37;
  for (let x = start; x < cam.x + cam.viewW + 40; x += 37) {
    const k = (x * 9301 + 49297) % 233280 / 233280;
    ctx.fillRect(sx(cam, x + k * 20), cam.groundY + (12 + k * 40) * s, (2 + k * 4) * s, 1.5 * s);
  }
}

function inWorld(ctx, cam, x) {
  ctx.save();
  ctx.translate(sx(cam, x), cam.groundY + cam.shakeY);
  ctx.scale(cam.scale, cam.scale);
}

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function tri(ctx, a, b, c2, d, e, f, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c2, d); ctx.lineTo(e, f); ctx.closePath(); ctx.fill(); }

function drawBanner(ctx, x, y, len, cloth, emblem, t, dir) {
  rect(ctx, x - 1, y - 34, 2, 36, '#3a2c20');
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(x, y - 34);
  for (let i = 0; i <= 6; i++) {
    const k = i / 6;
    ctx.lineTo(x + dir * len * k, y - 34 + Math.sin(t * 4 + k * 4) * 2.2 * k);
  }
  for (let i = 6; i >= 0; i--) {
    const k = i / 6;
    ctx.lineTo(x + dir * len * k, y - 20 + Math.sin(t * 4 + k * 4) * 2.2 * k);
  }
  ctx.fill();
  ctx.fillStyle = emblem;
  ctx.beginPath(); ctx.arc(x + dir * len * 0.45, y - 27 + Math.sin(t * 4 + 1.8) * 1, 3, 0, TAU); ctx.fill();
}

function drawKeep(ctx, b, c, t) {
  const stone = '#5f687b', light = '#7c879c', dark = '#3f4656';
  rect(ctx, -62, -132, 124, 132, stone);
  rect(ctx, -62, -132, 10, 132, light);
  for (let i = 0; i < 6; i++) rect(ctx, -62 + i * 22, -144, 14, 13, stone);
  for (const tx of [-80, 46]) {
    rect(ctx, tx, -172, 34, 172, light);
    rect(ctx, tx + 24, -172, 10, 172, dark);
    tri(ctx, tx - 5, -172, tx + 17, -222, tx + 39, -172, c.cloth);
    tri(ctx, tx + 17, -222, tx + 39, -172, tx + 24, -172, c.clothDark);
    rect(ctx, tx + 15, -232, 4, 11, c.gold);
    rect(ctx, tx + 12, -140, 9, 14, '#ffcf6a');
  }
  // gate
  ctx.fillStyle = '#1b1712';
  ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-20, -36); ctx.arc(0, -36, 20, Math.PI, 0); ctx.lineTo(20, 0); ctx.fill();
  ctx.strokeStyle = '#4a3a28'; ctx.lineWidth = 2;
  for (let i = -14; i <= 14; i += 7) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, -48); ctx.stroke(); }
  for (const wy of [-100, -70]) for (const wx of [-36, 24]) rect(ctx, wx, wy, 10, 15, '#ffcf6a');
  // crown emblem over the gate
  ctx.fillStyle = c.gold;
  ctx.beginPath(); ctx.moveTo(-12, -88); ctx.lineTo(-12, -100); ctx.lineTo(-6, -94); ctx.lineTo(0, -104); ctx.lineTo(6, -94); ctx.lineTo(12, -100); ctx.lineTo(12, -88); ctx.fill();
  drawBanner(ctx, 0, -144, 30, c.cloth, c.gold, t, 1);
  drawDamage(ctx, b, 120, 130);
}

function drawTower(ctx, b, c, t) {
  const dark = '#2b2831', darker = '#1d1b22', edge = '#45404c';
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-66, 0); ctx.lineTo(66, 0); ctx.lineTo(44, -150); ctx.lineTo(30, -150); ctx.lineTo(24, -218); ctx.lineTo(0, -272); ctx.lineTo(-24, -218); ctx.lineTo(-30, -150); ctx.lineTo(-44, -150);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = edge;
  ctx.beginPath(); ctx.moveTo(66, 0); ctx.lineTo(44, -150); ctx.lineTo(30, -150); ctx.lineTo(50, 0); ctx.fill();
  ctx.fillStyle = darker;
  ctx.beginPath(); ctx.moveTo(-66, 0); ctx.lineTo(-44, -150); ctx.lineTo(-34, -150); ctx.lineTo(-52, 0); ctx.fill();
  // rusted spikes
  for (const [y, w] of [[-40, 68], [-100, 56], [-150, 46], [-200, 30]]) {
    tri(ctx, -w + 6, y, -w - 12, y - 10, -w + 8, y - 12, c.cloth);
    tri(ctx, w - 6, y, w + 12, y - 10, w - 8, y - 12, c.clothDark);
  }
  // gate with teeth
  ctx.fillStyle = '#0e0c10';
  ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-22, -34); ctx.arc(0, -34, 22, Math.PI, 0); ctx.lineTo(22, 0); ctx.fill();
  for (let i = -18; i <= 14; i += 8) tri(ctx, i, -40, i + 4, -28, i + 8, -40, '#cfc5a5');
  // glowing slits and the eye
  const pulse = 0.7 + 0.3 * Math.sin(t * 2.4);
  ctx.globalAlpha = pulse;
  for (const [x, y] of [[-26, -90], [18, -90], [-14, -130], [8, -170]]) rect(ctx, x, y, 6, 16, c.crystal);
  const g = ctx.createRadialGradient(0, -232, 2, 0, -232, 34);
  g.addColorStop(0, 'rgba(190,255,140,0.9)');
  g.addColorStop(1, 'rgba(120,255,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-34, -266, 68, 68);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#efffd0';
  ctx.beginPath(); ctx.ellipse(0, -232, 8, 4.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1a2a0c'; ctx.fillRect(-1.5, -236, 3, 8);
  drawBanner(ctx, -30, -150, 26, c.cloth, c.gold, t + 1, -1);
  drawBanner(ctx, 30, -150, 26, c.cloth, c.gold, t + 2, 1);
  drawDamage(ctx, b, 110, 150);
}

function drawDamage(ctx, b, w, h) {
  const k = b.hp / b.maxHp;
  ctx.strokeStyle = 'rgba(10,8,8,0.7)';
  ctx.lineWidth = 2;
  if (k < 0.7) { ctx.beginPath(); ctx.moveTo(-w * 0.3, -h * 0.9); ctx.lineTo(-w * 0.2, -h * 0.7); ctx.lineTo(-w * 0.32, -h * 0.55); ctx.stroke(); }
  if (k < 0.45) { ctx.beginPath(); ctx.moveTo(w * 0.25, -h * 0.4); ctx.lineTo(w * 0.15, -h * 0.25); ctx.lineTo(w * 0.28, -h * 0.1); ctx.stroke(); }
  if (b.hitT > 0) { ctx.fillStyle = 'rgba(255,240,220,0.18)'; ctx.fillRect(-w / 2, -h, w, h); }
}

function drawMine(ctx, t, seed) {
  ctx.fillStyle = '#4b4034';
  ctx.beginPath(); ctx.moveTo(-44, 2); ctx.quadraticCurveTo(-34, -44, 0, -48); ctx.quadraticCurveTo(36, -46, 46, 2); ctx.fill();
  ctx.fillStyle = '#5f5242';
  ctx.beginPath(); ctx.moveTo(-30, 2); ctx.quadraticCurveTo(-22, -34, 4, -38); ctx.quadraticCurveTo(-4, -18, 6, 2); ctx.fill();
  rect(ctx, -10, -26, 20, 28, '#120f0c');
  rect(ctx, -13, -29, 4, 31, '#6e4c2c'); rect(ctx, 9, -29, 4, 31, '#6e4c2c'); rect(ctx, -14, -31, 28, 4, '#6e4c2c');
  for (let i = 0; i < 6; i++) {
    const gx = -34 + ((i * 53 + seed * 17) % 66);
    const gy = -8 - ((i * 29 + seed * 11) % 30);
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.7 + seed);
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath(); ctx.moveTo(gx, gy - 3); ctx.lineTo(gx + 2.5, gy); ctx.lineTo(gx, gy + 3); ctx.lineTo(gx - 2.5, gy); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCrystal(ctx, c, t) {
  const pulse = 0.75 + 0.25 * Math.sin(t * 2);
  const g = ctx.createRadialGradient(0, -30, 3, 0, -30, 60);
  g.addColorStop(0, c.glow);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.45 * pulse;
  ctx.fillStyle = g;
  ctx.fillRect(-60, -90, 120, 120);
  ctx.globalAlpha = 1;
  rect(ctx, -22, -6, 44, 8, '#3a3440');
  const shard = (x, h, w, a) => {
    ctx.save(); ctx.translate(x, -2); ctx.rotate(a);
    ctx.fillStyle = c.crystal;
    ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(w, -h * 0.75); ctx.lineTo(w, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(0, 0); ctx.fill();
    ctx.restore();
  };
  shard(-12, 30, 6, -0.3);
  shard(12, 26, 5.5, 0.32);
  shard(0, 48, 8, 0);
}

function drawBuildingBar(ctx, b, top) {
  const k = b.hp / b.maxHp;
  rect(ctx, -40, top, 80, 6, 'rgba(0,0,0,0.6)');
  rect(ctx, -39, top + 1, 78 * k, 4, k > 0.5 ? '#7fdc6a' : k > 0.25 ? '#ffc94a' : '#ff5a3a');
}

/** Draw a unit's figure; also used for the HUD icons. */
export function drawUnitFigure(ctx, u, x, y, scale, t) {
  const fdef = FACTIONS[u.faction];
  const lookId = fdef.units[u.type].look;
  const pose = poseFor(u, LOOKS[lookId], t);
  drawFigure(ctx, x, y, scale, u.facing, pose, lookId, fdef.colors, t, { walking: u.state === 'walk', carry: u.carry > 0 });
}

function drawUnits(ctx, world, cam, t) {
  const s = cam.scale;
  const list = [];
  const left = cam.x - 60, right = cam.x + cam.viewW + 60;
  for (const u of world.units) if (!u.inside && u.x > left && u.x < right) list.push(u);
  list.sort((a, b) => a.z - b.z);
  const gy = cam.groundY + cam.shakeY;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  for (const u of list) {
    if (u.state === 'dead') continue;
    ctx.beginPath(); ctx.ellipse(sx(cam, u.x), gy + u.z * 0.55 * s, 9 * s, 2.6 * s, 0, 0, TAU); ctx.fill();
  }
  for (const u of list) drawUnitFigure(ctx, u, sx(cam, u.x), gy + u.z * 0.55 * s, s, t);
  for (const u of list) {
    if (u.state === 'dead' || u.hp >= u.maxHp) continue;
    const x = sx(cam, u.x), y = gy + (u.z * 0.55 - (u.type === 'tank' ? 70 : 54)) * s;
    const k = u.hp / u.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 9 * s, y, 18 * s, 3 * s);
    ctx.fillStyle = u.faction === 'kingdom' ? '#6fb2ff' : '#ff7a4a';
    ctx.fillRect(x - 9 * s, y, 18 * s * k, 3 * s);
  }
}

function drawProjectiles(ctx, world, cam) {
  const s = cam.scale;
  const gy = cam.groundY + cam.shakeY;
  ctx.lineCap = 'round';
  for (const p of world.projectiles) {
    const x = sx(cam, p.x), y = gy + p.y * s;
    if (x < -30 || x > cam.w + 30) continue;
    if (p.kind === 'orb') {
      const c = FACTIONS[p.faction].colors;
      ctx.globalAlpha = 0.4; ctx.fillStyle = c.glow;
      ctx.beginPath(); ctx.arc(x, y, 7 * s, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = c.crystal;
      ctx.beginPath(); ctx.arc(x, y, 3.6 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x - s, y - s, 1.4 * s, 0, TAU); ctx.fill();
      continue;
    }
    const spear = p.from === 'ranged' && p.faction === 'horde';
    const len = (spear ? 16 : 10) * s;
    const dx = Math.cos(p.angle) * len, dy = Math.sin(p.angle) * len;
    ctx.strokeStyle = spear ? '#6b4a2a' : '#e9dcb8';
    ctx.lineWidth = (spear ? 2 : 1.4) * s;
    ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = spear ? '#9a9a90' : '#cfd8e6';
    ctx.beginPath(); ctx.arc(x, y, 1.4 * s, 0, TAU); ctx.fill();
  }
}

function drawSpellMarks(ctx, world, cam, aim, t) {
  const s = cam.scale;
  const gy = cam.groundY + cam.shakeY;
  const r = SPELLS.lightning.radius * s;
  for (const p of world.pendingSpells) {
    ctx.strokeStyle = p.faction === 'kingdom' ? 'rgba(190,232,255,0.9)' : 'rgba(214,255,176,0.9)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.ellipse(sx(cam, p.x), gy, r, r * 0.22, 0, 0, TAU); ctx.stroke();
  }
  if (aim && aim.x !== null) {
    const x = sx(cam, aim.x);
    ctx.strokeStyle = `rgba(190,232,255,${0.6 + 0.3 * Math.sin(t * 8)})`;
    ctx.lineWidth = 2 * s;
    ctx.setLineDash([6 * s, 5 * s]);
    ctx.beginPath(); ctx.ellipse(x, gy, r, r * 0.22, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x, gy - 120 * s); ctx.lineTo(x, gy - 10 * s); ctx.stroke();
  }
}

/** Draw everything except particles (fx draws on top). */
export function drawScene(ctx, world, cam, t, aim) {
  drawSky(ctx, cam, t);
  drawLayers(ctx, cam);
  drawGround(ctx, cam);
  for (const id of ['kingdom', 'horde']) {
    const f = world.factions[id];
    const c = FACTIONS[id].colors;
    inWorld(ctx, cam, f.crystalX); drawCrystal(ctx, c, t + (id === 'horde' ? 1 : 0)); ctx.restore();
    f.mines.forEach((mx, i) => { inWorld(ctx, cam, mx); drawMine(ctx, t, i + (id === 'horde' ? 3 : 0)); ctx.restore(); });
  }
  for (const id of ['kingdom', 'horde']) {
    const b = world.buildings[id];
    const x = sx(cam, b.x);
    if (x < -200 || x > cam.w + 200) continue;
    inWorld(ctx, cam, b.x);
    if (id === 'kingdom') { drawKeep(ctx, b, FACTIONS.kingdom.colors, t); drawBuildingBar(ctx, b, -250); }
    else { drawTower(ctx, b, FACTIONS.horde.colors, t); drawBuildingBar(ctx, b, -292); }
    ctx.restore();
  }
  drawUnits(ctx, world, cam, t);
  drawProjectiles(ctx, world, cam);
  drawSpellMarks(ctx, world, cam, aim, t);
}
