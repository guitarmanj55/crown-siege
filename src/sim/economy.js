// Gold, mana, population, the training queue and the mining loop.
import { STATS } from './factions.js';

export const POP_CAP = 40;
export const QUEUE_MAX = 5;
export const MANA_CAP = 200;
export const GOLD_PER_TRIP = 20;
export const MINE_TIME = 2.4;
export const MANA_PASSIVE = 0.5; // per second, from the crystal on its own
export const MANA_PER_WORKER = 0.9; // per second, per worker tending the crystal
export const CRYSTAL_CAP = 2;
export const GOLD_PASSIVE = 1.5; // per second, the treasury's trickle, so a side whose miners all die can still rebuild
export const DISMISS_REFUND = 0.5; // share of a miner's cost given back when sent home

export function popUsed(world, faction) {
  let n = 0;
  for (const u of world.units) if (u.faction === faction && u.state !== 'dead' && !u.leaving) n += STATS[u.type].pop;
  for (const q of world.factions[faction].queue) n += STATS[q.type].pop;
  return n;
}

/** Returns '' if the faction can queue this unit now, else a short reason. */
export function trainBlock(world, faction, type) {
  const f = world.factions[faction];
  const s = STATS[type];
  if (!s) return 'unknown';
  if (f.queue.length >= QUEUE_MAX) return 'queue';
  if (popUsed(world, faction) + s.pop > POP_CAP) return 'pop';
  if (f.gold < s.cost.gold) return 'gold';
  if (f.mana < s.cost.mana) return 'mana';
  return '';
}

export function train(world, faction, type) {
  if (trainBlock(world, faction, type)) return false;
  const f = world.factions[faction];
  const s = STATS[type];
  f.gold -= s.cost.gold;
  f.mana -= s.cost.mana;
  f.queue.push({ type, t: 0 });
  return true;
}

/** Miners that could be sent home: alive, not already leaving. */
export function workerCount(world, faction) {
  let n = 0;
  for (const u of world.units) if (u.faction === faction && u.type === 'worker' && u.state !== 'dead' && !u.leaving) n++;
  return n;
}

/**
 * Send one miner home to free its population place. A queued miner is cancelled first (full refund);
 * otherwise the miner nearest the keep walks back, drops what it carries, and leaves (half refund now).
 */
export function dismissWorker(world, faction) {
  const f = world.factions[faction];
  const cost = STATS.worker.cost.gold;
  for (let i = f.queue.length - 1; i >= 0; i--) {
    if (f.queue[i].type !== 'worker') continue;
    f.queue.splice(i, 1);
    f.gold += cost;
    return true;
  }
  let pick = null;
  let best = Infinity;
  for (const u of world.units) {
    if (u.faction !== faction || u.type !== 'worker' || u.state === 'dead' || u.leaving) continue;
    const d = Math.abs(u.x - f.buildingX) + (u.carry ? 2000 : 0);
    if (d < best) { best = d; pick = u; }
  }
  if (!pick) return false;
  pick.leaving = true;
  pick.job = null;
  const refund = cost * DISMISS_REFUND;
  f.gold += refund;
  world.events.push({ type: 'coin', faction, x: f.buildingX, amount: refund });
  return true;
}

export function spawnUnit(world, faction, type, x) {
  const f = world.factions[faction];
  const b = world.buildings[faction];
  const s = STATS[type];
  const u = {
    id: world.nextId++,
    faction,
    type,
    x: x ?? (b ? b.x + f.dir * (b.halfW * 0.4) : f.buildingX),
    z: (world.rng() - 0.5) * 28,
    hp: s.hp,
    maxHp: s.hp,
    state: 'idle',
    facing: f.dir,
    cd: 0,
    atkT: -1,
    hitDone: false,
    hitT: 0,
    targetId: 0,
    targetBuilding: false,
    inside: false,
    jitter: world.rng(),
    walk: world.rng() * 6,
    deadT: 0,
    job: null,
    phase: 'go',
    carry: 0,
    workT: 0,
  };
  world.units.push(u);
  world.unitById.set(u.id, u);
  world.events.push({ type: 'spawn', faction, unit: type, x: u.x });
  return u;
}

export function stepEconomy(world, dt) {
  for (const id of ['kingdom', 'horde']) {
    const f = world.factions[id];
    f.mana = Math.min(MANA_CAP, f.mana + MANA_PASSIVE * dt);
    f.gold += GOLD_PASSIVE * f.incomeMul * dt;
    for (const k in f.spellCd) if (f.spellCd[k] > 0) f.spellCd[k] = Math.max(0, f.spellCd[k] - dt);
    const q = f.queue[0];
    if (q) {
      q.t += dt;
      if (q.t >= STATS[q.type].trainTime) {
        f.queue.shift();
        spawnUnit(world, id, q.type);
        f.stats.trained++;
      }
    }
  }
}

function pickJob(world, faction) {
  const counts = { mine0: 0, mine1: 0, crystal: 0 };
  let n = 1;
  for (const u of world.units) {
    if (u.faction !== faction || u.type !== 'worker' || u.state === 'dead' || !u.job) continue;
    counts[u.job]++;
    n++;
  }
  const crystalWant = Math.min(CRYSTAL_CAP, Math.floor((n + 1) / 3));
  if (counts.crystal < crystalWant) return 'crystal';
  return counts.mine1 < counts.mine0 ? 'mine1' : 'mine0';
}

/** Move u toward x; returns true once there. */
export function moveToward(u, x, speed, dt) {
  const dx = x - u.x;
  if (Math.abs(dx) <= 3) { u.x = x; return true; }
  u.facing = dx > 0 ? 1 : -1;
  const d = Math.min(Math.abs(dx), speed * dt);
  u.x += u.facing * d;
  u.walk += d * 0.09;
  u.state = 'walk';
  return false;
}

export function stepWorker(world, u, dt) {
  const f = world.factions[u.faction];
  const speed = STATS.worker.speed;
  if (u.leaving) {
    if (moveToward(u, f.buildingX, speed * 1.2, dt)) {
      if (u.carry) {
        const g = u.carry * f.incomeMul;
        f.gold += g;
        f.stats.gold += g;
        world.events.push({ type: 'coin', faction: u.faction, x: u.x, amount: Math.round(g) });
      }
      u.gone = true;
    }
    return;
  }
  if (!u.job) u.job = pickJob(world, u.faction);
  if (u.job === 'crystal') {
    const tx = f.crystalX + (u.jitter - 0.5) * 30;
    if (u.phase === 'work' || moveToward(u, tx, speed, dt)) {
      u.phase = 'work';
      u.state = 'mine';
      u.facing = f.crystalX > u.x ? 1 : -1;
      u.workT += dt;
      f.mana = Math.min(MANA_CAP, f.mana + MANA_PER_WORKER * f.incomeMul * dt);
    }
    return;
  }
  const mineX = f.mines[u.job === 'mine1' ? 1 : 0];
  if (u.phase === 'go') {
    // Stand on the near side of the mine, spread a little.
    const tx = mineX - f.dir * (14 + u.jitter * 20);
    if (moveToward(u, tx, speed, dt)) { u.phase = 'work'; u.workT = 0; }
  } else if (u.phase === 'work') {
    u.state = 'mine';
    u.facing = mineX > u.x ? 1 : -1;
    u.workT += dt;
    if (u.workT >= MINE_TIME) { u.carry = GOLD_PER_TRIP; u.phase = 'back'; }
  } else {
    if (moveToward(u, f.buildingX, speed, dt)) {
      const g = u.carry * f.incomeMul;
      f.gold += g;
      f.stats.gold += g;
      world.events.push({ type: 'coin', faction: u.faction, x: u.x, amount: Math.round(g) });
      u.carry = 0;
      u.phase = 'go';
    }
  }
}
