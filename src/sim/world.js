// The world: map, factions, units, and the fixed-step update. Pure: no DOM, no timers.
import { FACTIONS, UNIT_TYPES } from './factions.js';
import { stepEconomy, spawnUnit, stepWorker } from './economy.js';
import { stepCombat, buildIndex } from './combat.js';
import { stepSoldier } from './orders.js';
import { stepSpells } from './spells.js';
import { stepAI, createAI } from './ai.js';

export { POP_CAP, QUEUE_MAX, MANA_CAP } from './economy.js';

export const STEP = 1 / 60;
export const BUILDING_HP = 2400;

const WIDTH = 3200;

// One lane. Kingdom on the left; the Horde's map is the mirror image.
function sideMap(dir) {
  const m = (x) => (dir > 0 ? x : WIDTH - x);
  return {
    buildingX: m(220),
    crystalX: m(370),
    mines: [m(540), m(700)],
    defendX: m(880),
  };
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createFaction(id, opts) {
  const def = FACTIONS[id];
  const side = sideMap(def.dir);
  const boons = (opts.boons && opts.boons[id]) || {};
  return {
    id,
    dir: def.dir,
    gold: (opts.gold ?? 150) + (boons.startGold || 0),
    mana: opts.mana ?? 30,
    stance: 'defend',
    queue: [],
    spellCd: { lightning: 0 },
    incomeMul: boons.income ?? 1,
    spellCdMul: boons.spellCd ?? 1,
    buildingHpMul: boons.buildingHp ?? 1,
    ...side,
    stats: { trained: 0, kills: 0, lost: 0, gold: 0, byType: {}, spellKills: 0, casts: 0 },
    ai: null,
  };
}

/**
 * opts: { seed, ai: { kingdom?: 'easy'|'normal'|'hard', horde?: ... }, workers, gold, mana,
 *   boons: { kingdom?: { startGold, income, spellCd, buildingHp } } } (boons: the player's shop upgrades, as multipliers)
 */
export function createWorld(opts = {}) {
  const world = {
    t: 0,
    width: WIDTH,
    rng: mulberry32(opts.seed ?? 1),
    nextId: 1,
    units: [],
    unitById: new Map(),
    projectiles: [],
    pendingSpells: [],
    events: [],
    index: { kingdom: [], horde: [] },
    factions: {
      kingdom: createFaction('kingdom', opts),
      horde: createFaction('horde', opts),
    },
    buildings: {},
    winner: null,
    over: false,
    siege: false,
  };
  for (const id of ['kingdom', 'horde']) {
    const f = world.factions[id];
    const hp = Math.round(BUILDING_HP * f.buildingHpMul);
    world.buildings[id] = { faction: id, x: f.buildingX, halfW: 70, hp, maxHp: hp, cd: 0, hitT: 0 };
    const diff = opts.ai && opts.ai[id];
    if (diff) f.ai = createAI(world, id, diff);
    const workers = opts.workers ?? 3;
    for (let i = 0; i < workers; i++) spawnUnit(world, id, 'worker');
  }
  world.events.length = 0;
  return world;
}

export function step(world, dt = STEP) {
  world.events.length = 0;
  if (world.over) {
    // Let corpses finish falling; nothing else moves.
    for (const u of world.units) if (u.state === 'dead') u.deadT += dt;
    world.t += dt;
    return;
  }
  world.t += dt;
  stepEconomy(world, dt);
  buildIndex(world);
  for (const u of world.units) {
    if (u.state === 'dead') { u.deadT += dt; continue; }
    if (u.cd > 0) u.cd -= dt;
    if (u.hitT > 0) u.hitT -= dt;
    if (u.type === 'worker') stepWorker(world, u, dt);
    else stepSoldier(world, u, dt);
  }
  stepCombat(world, dt);
  stepSpells(world, dt);
  for (const id of ['kingdom', 'horde']) {
    const f = world.factions[id];
    if (f.ai) stepAI(world, id, dt);
  }
  // Remove corpses once their fall has played, and miners who have gone home.
  if (world.units.some((u) => u.gone || (u.state === 'dead' && u.deadT > 2.5))) {
    world.units = world.units.filter((u) => {
      if (u.gone || (u.state === 'dead' && u.deadT > 2.5)) { world.unitById.delete(u.id); return false; }
      return true;
    });
  }
  for (const id of ['kingdom', 'horde']) {
    const b = world.buildings[id];
    if (b.hp <= 0 && !world.over) {
      b.hp = 0;
      world.over = true;
      world.winner = id === 'kingdom' ? 'horde' : 'kingdom';
      world.events.push({ type: 'win', faction: world.winner, x: b.x });
    }
  }
}

export function countUnits(world, faction, type) {
  let n = 0;
  for (const u of world.units) if (u.faction === faction && u.state !== 'dead' && (!type || u.type === type)) n++;
  return n;
}

export { UNIT_TYPES };
