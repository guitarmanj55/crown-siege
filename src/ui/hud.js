// In-game HUD: resources, train buttons with queue badges, army commands and the lightning button.
import { STATS, FACTIONS, SPELLS, UNIT_TYPES } from '../sim/factions.js';
import { trainBlock, popUsed, POP_CAP, workerCount } from '../sim/economy.js';
import { spellBlock } from '../sim/spells.js';
import { drawUnitFigure } from '../render/draw.js';
import { LOOKS } from '../render/parts.js';

const $ = (s) => document.querySelector(s);

function iconUnit(type) {
  return { faction: 'kingdom', type, facing: 1, state: 'idle', atkT: -1, jitter: 0, walk: 0, hitT: 0, hp: 1, maxHp: 1, carry: 0, workT: 0, z: 0 };
}

export function drawIcon(canvas, type) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = 50, h = 42;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const look = LOOKS[FACTIONS.kingdom.units[type].look];
  drawUnitFigure(c, iconUnit(type), 25, 40, 0.68 / Math.sqrt(look.size), 0.6);
}

export function createHud(player, handlers) {
  const train = $('#train');
  const buttons = {};
  const icons = [];
  const icon = (canvas, type) => { icons.push([canvas, type]); drawIcon(canvas, type); };
  // Send a miner home, to free its population place for a soldier.
  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'unitBtn dismiss';
  dismissBtn.setAttribute('aria-label', `Send a ${FACTIONS[player].units.worker.name} home`);
  dismissBtn.innerHTML = '<canvas></canvas><i class="minus"></i><span class="cost"></span>';
  dismissBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); handlers.onDismiss(); });
  const dismissCount = dismissBtn.querySelector('.cost');
  icon(dismissBtn.querySelector('canvas'), 'worker');
  for (const type of UNIT_TYPES) {
    const s = STATS[type];
    const b = document.createElement('button');
    b.className = 'unitBtn';
    b.setAttribute('aria-label', `Train ${FACTIONS[player].units[type].name}`);
    b.innerHTML = `<canvas></canvas><span class="cost">${s.cost.gold}${s.cost.mana ? `<s>${s.cost.mana}</s>` : ''}</span><span class="q" hidden></span><span class="bar"></span>`;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); handlers.onTrain(type); });
    train.appendChild(b);
    icon(b.querySelector('canvas'), type);
    buttons[type] = { el: b, q: b.querySelector('.q'), bar: b.querySelector('.bar'), state: {} };
    if (type === 'worker') train.appendChild(dismissBtn);
  }
  const cmds = [...document.querySelectorAll('#cmds [data-stance]')];
  for (const c of cmds) c.addEventListener('pointerdown', (e) => { e.preventDefault(); handlers.onStance(c.dataset.stance); });
  const spellBtn = $('#spellBtn');
  spellBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); handlers.onSpell(); });
  $('#pauseBtn').addEventListener('click', () => handlers.onPause());

  const el = { gold: $('#gold'), mana: $('#mana'), pop: $('#pop'), inside: $('#insideCount'), hint: $('#aimHint') };
  const last = {};
  const set = (key, node, val) => { if (last[key] !== val) { last[key] = val; node.textContent = val; } };
  const cls = (key, node, name, on) => { const k = key + name; if (last[k] !== on) { last[k] = on; node.classList.toggle(name, on); } };

  function update(world, aiming) {
    const f = world.factions[player];
    set('gold', el.gold, String(Math.floor(f.gold)));
    set('mana', el.mana, String(Math.floor(f.mana)));
    set('pop', el.pop, `${popUsed(world, player)}/${POP_CAP}`);
    const counts = {};
    for (const q of f.queue) counts[q.type] = (counts[q.type] || 0) + 1;
    for (const type of UNIT_TYPES) {
      const b = buttons[type];
      const n = counts[type] || 0;
      set('q' + type, b.q, n ? String(n) : '');
      if (b.q.hidden !== !n) b.q.hidden = !n;
      const block = trainBlock(world, player, type);
      cls('b' + type, b.el, 'off', !!block && block !== 'queue');
      const head = f.queue[0];
      const k = head && head.type === type ? Math.min(1, head.t / STATS[type].trainTime) : 0;
      const w = Math.round(k * 100) + '%';
      if (b.state.w !== w) { b.state.w = w; b.bar.style.width = w; }
    }
    const miners = workerCount(world, player) + (counts.worker || 0);
    set('miners', dismissCount, `${miners} ⛏`);
    cls('dismiss', dismissBtn, 'off', miners === 0);
    for (const c of cmds) cls('s' + c.dataset.stance, c, 'on', f.stance === c.dataset.stance);
    let inside = 0;
    for (const u of world.units) if (u.inside && u.faction === player) inside++;
    set('inside', el.inside, inside ? String(inside) : '');
    const cd = f.spellCd.lightning / (SPELLS.lightning.cooldown * f.spellCdMul);
    const cdv = cd.toFixed(2);
    if (last.cd !== cdv) { last.cd = cdv; spellBtn.style.setProperty('--cd', cdv); }
    cls('spell', spellBtn, 'off', !!spellBlock(world, player, 'lightning'));
    cls('spell', spellBtn, 'aiming', aiming);
    if (el.hint.hidden !== !aiming) el.hint.hidden = !aiming;
  }

  // Redraw the unit icons, after the banner colours change.
  function redrawIcons() { for (const [c, type] of icons) drawIcon(c, type); }

  return { update, redrawIcons };
}
