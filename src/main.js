// Crown Siege: wires the simulation, renderer, HUD, input and audio together.
// The simulation runs at a fixed 60 Hz; the screen is redrawn every animation frame.
import { createWorld, step, STEP } from './sim/world.js';
import { train, dismissWorker } from './sim/economy.js';
import { setStance } from './sim/orders.js';
import { castSpell, spellBlock } from './sim/spells.js';
import { UNIT_TYPES } from './sim/factions.js';
import { drawScene } from './render/draw.js';
import { createFx, fxEvent, updateFx, drawFx, drawFlash, burst } from './render/fx.js';
import { createCamera, resizeCamera, updateCamera, centerOn, drawMinimap, sx } from './render/camera.js';
import { createHud } from './ui/hud.js';
import { attachInput } from './ui/input.js';
import { showScreen, renderTitle, renderEnd, renderSound } from './ui/menus.js';
import { loadSave, writeSave, recordResult } from './ui/store.js';
import { unlockAudio, sfx, setSound, suspendAudio, resumeAudio } from './audio.js';
import { FACTIONS } from './sim/factions.js';

const PLAYER = 'kingdom';
const $ = (s) => document.querySelector(s);
const canvas = $('#view');
const ctx = canvas.getContext('2d', { alpha: false });
const mini = $('#minimap');
const mctx = mini.getContext('2d');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const save = loadSave();
setSound(save.sound);
const cam = createCamera();
let fx = createFx();
const aim = { active: false, x: null };

// mode: 'title' (attract battle behind the menu) | 'playing' | 'paused' | 'ended'
let mode = 'title';
let world = null;
let difficulty = save.difficulty;
let acc = 0;
let lastFrame = performance.now();
let clock = 0;
let endTimer = 0;
let dpr = 1;
let mmW = 0, mmH = 0;

function newAttract() {
  world = createWorld({ ai: { kingdom: 'normal', horde: 'normal' }, seed: (Math.random() * 1e9) | 0 });
  fx = createFx();
  centerOn(cam, 1600, world.width);
}

function startGame() {
  difficulty = save.difficulty;
  world = createWorld({ ai: { horde: difficulty }, seed: (Math.random() * 1e9) | 0 });
  fx = createFx();
  aim.active = false;
  acc = 0;
  endTimer = 0;
  centerOn(cam, world.buildings[PLAYER].x + 330, world.width);
  mode = 'playing';
  showScreen(null);
  resize(); // the minimap has a size only once the HUD is showing
  sfx('horn');
}

function pause() {
  if (mode !== 'playing') return;
  mode = 'paused';
  aim.active = false;
  showScreen('pause');
}

function resume() {
  if (mode !== 'paused') return;
  mode = 'playing';
  lastFrame = performance.now();
  showScreen(null);
  resumeAudio();
}

function toTitle() {
  mode = 'title';
  newAttract();
  renderTitle(save);
  showScreen('title');
}

function finish() {
  const won = world.winner === PLAYER;
  recordResult(save, difficulty, won, world.t);
  renderEnd(won, difficulty, world, PLAYER);
  showScreen('end');
  sfx(won ? 'victory' : 'defeat');
}

// ---------- sizing ----------
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  resizeCamera(cam, w, h);
  const r = mini.getBoundingClientRect();
  mmW = r.width || 240; mmH = r.height || 30;
  mini.width = Math.round(mmW * dpr);
  mini.height = Math.round(mmH * dpr);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ---------- events from the sim -> effects and sound ----------
function volAt(x) {
  const c = cam.x + cam.viewW / 2;
  const d = Math.abs(x - c) - cam.viewW / 2;
  return d <= 0 ? 1 : Math.max(0, 1 - d / 500);
}

function handleEvents() {
  for (const ev of world.events) {
    fxEvent(fx, ev, cam, { player: PLAYER });
    if (mode !== 'playing') continue;
    const v = volAt(ev.x);
    switch (ev.type) {
      case 'hit':
        if (!ev.missile) sfx(ev.unit === 'tank' || ev.unit === 'giant' || ev.faction === 'horde' ? 'thud' : 'clang', v * 0.8);
        break;
      case 'shoot':
        sfx(ev.unit === 'mage' ? 'orb' : ev.faction === 'horde' && ev.unit === 'ranged' ? 'whoosh' : 'twang', v * 0.6);
        break;
      case 'death': sfx('death', v * 0.7); break;
      case 'coin': if (ev.faction === PLAYER) sfx('coin', v * 0.4); break;
      case 'spawn': if (ev.faction === PLAYER) sfx('spawn', 0.6); break;
      case 'buildingHit': sfx('buildingHit', v * 0.7); break;
      case 'stomp': sfx('stomp', v * 0.9); break;
      case 'blast': sfx('blast', v * 0.8); break;
      case 'spellCast': sfx('cast', v); break;
      case 'lightning': sfx('lightning', Math.max(0.4, v)); break;
    }
  }
}

// Smoke and embers from a badly damaged building.
function ambient(dt) {
  for (const id of ['kingdom', 'horde']) {
    const b = world.buildings[id];
    const k = b.hp / b.maxHp;
    if (k > 0.5) continue;
    if (Math.random() < dt * (k < 0.25 ? 14 : 6)) {
      const x = b.x + (Math.random() - 0.5) * 90;
      const y = -80 - Math.random() * 90;
      burst(fx, x, y, 1, { color: 'rgba(60,55,60,0.55)', speed: 18, life: 1.8, size: 6, g: -25, kind: 'dust', angle: -Math.PI / 2, spread: 0.6 });
      if (k < 0.25) burst(fx, x, y, 2, { color: '#ff8a2a', speed: 40, life: 0.7, size: 1.8, g: -60, kind: 'ember' });
    }
  }
}

// Title: the camera drifts along with the fighting.
function attractCamera(dt) {
  let sum = 0, n = 0;
  for (const u of world.units) if (u.type !== 'worker' && u.state !== 'dead' && !u.inside) { sum += u.x; n++; }
  const target = (n ? sum / n : 1600) - cam.viewW * 0.45;
  cam.x += (target - cam.x) * Math.min(1, dt * 0.4);
}

// ---------- the loop ----------
function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  const running = mode !== 'paused';
  if (running) {
    clock += dt;
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 6) {
      step(world);
      handleEvents();
      acc -= STEP;
      n++;
    }
    if (n === 6) acc = 0; // fell behind (tab switch, slow frame): drop the backlog rather than spiral
    updateFx(fx, dt);
    ambient(dt);
  }
  if (mode === 'title') {
    attractCamera(dt);
    if (world.t > 300) newAttract();
    if (world.over) { endTimer += dt; if (endTimer > 4) { endTimer = 0; newAttract(); } }
  }
  if (mode === 'playing' && world.over) {
    endTimer += dt;
    aim.active = false;
    if (endTimer > 2.2) { mode = 'ended'; finish(); }
  }
  updateCamera(cam, dt, world.width, reducedMotion.matches);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawScene(ctx, world, cam, clock, aim.active ? aim : null);
  drawFx(ctx, fx, cam);
  drawFlash(ctx, fx, cam.w, cam.h);

  if (mode === 'playing' || mode === 'paused') {
    hud.update(world, aim.active);
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMinimap(mctx, mmW, mmH, world, cam, FACTIONS);
  }
  requestAnimationFrame(frame);
}

// ---------- controls ----------
function doTrain(type) {
  unlockAudio();
  if (mode !== 'playing' || world.over) return;
  if (train(world, PLAYER, type)) sfx('click');
  else sfx('denied');
}
function doDismiss() {
  unlockAudio();
  if (mode !== 'playing' || world.over) return;
  sfx(dismissWorker(world, PLAYER) ? 'click' : 'denied');
}
function doStance(s) {
  unlockAudio();
  if (mode !== 'playing' || world.over) return;
  if (world.factions[PLAYER].stance !== s) sfx(s === 'attack' ? 'horn' : 'click');
  setStance(world, PLAYER, s);
}
function doSpell() {
  unlockAudio();
  if (mode !== 'playing' || world.over) return;
  if (aim.active) { aim.active = false; return; }
  if (spellBlock(world, PLAYER, 'lightning')) { sfx('denied'); return; }
  aim.active = true;
  aim.x = cam.x + cam.viewW * 0.6;
}
function doCast(x) {
  aim.active = false;
  if (!castSpell(world, PLAYER, 'lightning', x)) sfx('denied');
}

const hud = createHud(PLAYER, {
  onTrain: doTrain,
  onDismiss: doDismiss,
  onStance: doStance,
  onSpell: doSpell,
  onPause: () => { unlockAudio(); pause(); },
});

attachInput({
  canvas, minimap: mini, cam, aim,
  getWorld: () => world,
  isActive: () => mode === 'playing',
  onCast: doCast,
  onUnlock: unlockAudio,
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'p') { if (mode === 'playing') pause(); else if (mode === 'paused') resume(); return; }
  if (mode !== 'playing') return;
  const i = '123456'.indexOf(e.key);
  if (i >= 0) doTrain(UNIT_TYPES[i]);
  else if (e.key === 'g') doStance('garrison');
  else if (e.key === 'd') doStance('defend');
  else if (e.key === 'a') doStance('attack');
  else if (e.key === 'l' || e.key === ' ') doSpell();
  else if (e.key === 'ArrowLeft') cam.vx = -900;
  else if (e.key === 'ArrowRight') cam.vx = 900;
});

for (const b of document.querySelectorAll('[data-diff]')) {
  b.addEventListener('click', () => { unlockAudio(); save.difficulty = b.dataset.diff; writeSave(save); renderTitle(save); sfx('click'); });
}
const toggleSound = () => {
  unlockAudio();
  save.sound = !save.sound;
  setSound(save.sound);
  writeSave(save);
  renderSound(save.sound);
  sfx('click');
};
$('#soundBtn').addEventListener('click', toggleSound);
$('#soundBtn2').addEventListener('click', toggleSound);
$('#playBtn').addEventListener('click', () => { unlockAudio(); startGame(); });
$('#helpBtn').addEventListener('click', () => { unlockAudio(); showScreen('help'); });
$('#help .back').addEventListener('click', () => showScreen('title'));
$('#resumeBtn').addEventListener('click', resume);
$('#restartBtn').addEventListener('click', startGame);
$('#quitBtn').addEventListener('click', toTitle);
$('#againBtn').addEventListener('click', startGame);
$('#menuBtn').addEventListener('click', toTitle);
document.addEventListener('pointerdown', unlockAudio, { once: true });

// Going to the background pauses the game (and the audio).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pause(); suspendAudio(); }
  else if (mode !== 'paused') resumeAudio();
});
window.addEventListener('pagehide', pause);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Debug hook for checks in the browser (not used by the game itself).
window.__crown = { get world() { return world; }, get mode() { return mode; }, cam };

resize();
toTitle();
requestAnimationFrame(frame);
