// Targeting, melee and ranged attacks, projectiles, damage, and the buildings' own arrows.
import { STATS, enemyOf } from './factions.js';

export const ATTACK_ANIM = 0.6; // seconds a swing or throw takes to play
export const HIT_AT = 0.3; // seconds into the swing when the blow lands or the missile leaves
export const KEEP_RANGE = 360;
export const KEEP_DAMAGE = 16;
export const KEEP_COOLDOWN = 1.1;
// Siege: from SIEGE_START the walls crack and buildings take ever more damage, so long stalemates end.
export const SIEGE_START = 480;
export const SIEGE_RAMP = 120; // seconds for each extra +100% damage to buildings

export function siegeMul(world) {
  return world.t < SIEGE_START ? 1 : 1 + (world.t - SIEGE_START) / SIEGE_RAMP;
}

/** Per faction, the units that can be hit (alive, outside), sorted by x. */
export function buildIndex(world) {
  const k = world.index.kingdom;
  const h = world.index.horde;
  k.length = 0;
  h.length = 0;
  for (const u of world.units) {
    if (u.state === 'dead' || u.inside) continue;
    (u.faction === 'kingdom' ? k : h).push(u);
  }
  k.sort(byX);
  h.sort(byX);
}
function byX(a, b) { return a.x - b.x; }

/** Nearest unit of `faction` to x within maxDist, or null. Binary search on the sorted index. */
export function nearestOf(world, faction, x, maxDist) {
  const arr = world.index[faction];
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].x < x) lo = mid + 1; else hi = mid;
  }
  let best = null;
  let bd = maxDist;
  for (const i of [lo - 1, lo]) {
    const u = arr[i];
    if (!u) continue;
    const d = Math.abs(u.x - x);
    if (d <= bd) { bd = d; best = u; }
  }
  return best;
}

export function nearestEnemy(world, u, maxDist) {
  return nearestOf(world, enemyOf(u.faction), u.x, maxDist);
}

/** All units of `faction` with |x - cx| <= r. */
export function unitsNear(world, faction, cx, r) {
  const out = [];
  for (const u of world.index[faction]) {
    if (u.x < cx - r) continue;
    if (u.x > cx + r) break;
    out.push(u);
  }
  return out;
}

export function damageUnit(world, target, amount, byFaction, ignoreArmor = false) {
  if (target.state === 'dead') return;
  const armor = ignoreArmor ? 0 : STATS[target.type].armor;
  const dmg = Math.max(1, amount - armor);
  target.hp -= dmg;
  target.hitT = 0.15;
  if (target.hp <= 0) {
    target.hp = 0;
    target.state = 'dead';
    target.deadT = 0;
    target.atkT = -1;
    world.factions[target.faction].stats.lost++;
    if (byFaction) world.factions[byFaction].stats.kills++;
    world.events.push({ type: 'death', faction: target.faction, unit: target.type, x: target.x, z: target.z });
  }
}

export function damageBuilding(world, b, amount) {
  if (b.hp <= 0) return;
  b.hp = Math.max(0, b.hp - amount * siegeMul(world));
  b.hitT = 0.2;
  world.events.push({ type: 'buildingHit', faction: b.faction, x: b.x });
}

/** Face of the building that attackers reach first. */
export function buildingFace(b, dir) {
  return b.x + dir * b.halfW;
}

/** Start a swing at a unit (or the building if target is null) when off cooldown. */
export function startAttack(u, target) {
  if (u.atkT >= 0 || u.cd > 0) return false;
  u.atkT = 0;
  u.hitDone = false;
  u.cd = STATS[u.type].cooldown;
  u.targetId = target ? target.id : 0;
  u.targetBuilding = !target;
  u.state = 'attack';
  return true;
}

/** Advance a swing in progress. Returns true while the unit is busy swinging. */
export function advanceAttack(world, u, dt) {
  if (u.atkT < 0) return false;
  u.atkT += dt;
  u.state = 'attack';
  if (!u.hitDone && u.atkT >= HIT_AT) {
    u.hitDone = true;
    resolveHit(world, u);
  }
  if (u.atkT >= ATTACK_ANIM) { u.atkT = -1; u.state = 'idle'; }
  return u.atkT >= 0;
}

function resolveHit(world, u) {
  const s = STATS[u.type];
  const foe = enemyOf(u.faction);
  if (u.targetBuilding) {
    const b = world.buildings[foe];
    if (s.projectile) fire(world, u.faction, u.x, -34, null, b, s.damage, missileKind(s), u.type);
    else damageBuilding(world, b, s.damage);
    if (!s.projectile) world.events.push({ type: 'hit', faction: u.faction, unit: u.type, x: buildingFace(b, world.factions[foe].dir), z: u.z, building: true });
    return;
  }
  const t = world.unitById.get(u.targetId);
  if (!t || t.state === 'dead' || t.inside) return;
  if (s.projectile) {
    fire(world, u.faction, u.x, -34, t, null, s.damage, missileKind(s), u.type);
  } else if (Math.abs(t.x - u.x) <= s.range + 24) {
    damageUnit(world, t, s.damage, u.faction);
    world.events.push({ type: 'hit', faction: u.faction, unit: u.type, x: (t.x + u.x) / 2, z: t.z });
    if (s.splash) {
      for (const v of unitsNear(world, foe, t.x, s.splash)) {
        if (v !== t && v.state !== 'dead') damageUnit(world, v, s.damage * s.splashMul, u.faction);
      }
      world.events.push({ type: 'stomp', faction: u.faction, x: t.x });
    }
  }
}

function missileKind(s) { return s.magic ? 'orb' : 'missile'; }

function fire(world, faction, x, y, target, building, dmg, kind, from) {
  const tx = target ? target.x : buildingFace(building, world.factions[enemyOf(faction)].dir);
  const dist = Math.abs(tx - x);
  const s = STATS[from];
  const orb = kind === 'orb';
  world.projectiles.push({
    faction, kind, from, sx: x, sy: y, x, y, angle: 0,
    targetId: target ? target.id : 0, building: !!building, lastX: tx,
    dmg, t: 0, dur: Math.max(0.25, dist / ((s && s.projSpeed) || 440)), arc: Math.min(orb ? 30 : 90, dist * (orb ? 0.08 : 0.22)),
  });
  world.events.push({ type: 'shoot', faction, unit: from, x });
}

function stepProjectiles(world, dt) {
  const keep = [];
  for (const p of world.projectiles) {
    p.t += dt;
    const foe = enemyOf(p.faction);
    let tgt = null;
    if (p.building) p.lastX = buildingFace(world.buildings[foe], world.factions[foe].dir);
    else {
      tgt = world.unitById.get(p.targetId);
      if (tgt && tgt.state !== 'dead' && !tgt.inside) p.lastX = tgt.x;
      else tgt = null;
    }
    const k = Math.min(1, p.t / p.dur);
    const ty = p.building ? -60 : -24;
    const nx = p.sx + (p.lastX - p.sx) * k;
    const ny = p.sy + (ty - p.sy) * k - Math.sin(Math.PI * k) * p.arc;
    p.angle = Math.atan2(ny - p.y, nx - p.x);
    p.x = nx;
    p.y = ny;
    if (k >= 1) {
      if (p.building) damageBuilding(world, world.buildings[foe], p.dmg);
      else if (p.kind === 'orb') blast(world, p, tgt);
      else if (tgt) {
        damageUnit(world, tgt, p.dmg, p.faction);
        world.events.push({ type: 'hit', faction: p.faction, unit: p.from, x: tgt.x, z: tgt.z, missile: true });
      }
      if (p.kind === 'orb' && p.building) world.events.push({ type: 'blast', faction: p.faction, x: p.lastX, y: -60, hits: 0 });
      continue;
    }
    keep.push(p);
  }
  world.projectiles = keep;
}

/** A mage's orb bursts where it lands: full damage to its target, splash to the foes around it. Ignores armour. */
function blast(world, p, tgt) {
  const s = STATS[p.from];
  const foe = enemyOf(p.faction);
  const x = p.lastX;
  let hits = 0;
  if (tgt) { damageUnit(world, tgt, p.dmg, p.faction, true); hits++; }
  for (const u of unitsNear(world, foe, x, s.splash)) {
    if (u === tgt || u.state === 'dead') continue;
    damageUnit(world, u, p.dmg * s.splashMul, p.faction, true);
    hits++;
  }
  world.events.push({ type: 'blast', faction: p.faction, x, y: -10, hits });
}

/** Each building shoots arrows at the nearest enemy in range; garrisoned units add arrows. */
function stepBuildings(world, dt) {
  for (const id of ['kingdom', 'horde']) {
    const b = world.buildings[id];
    if (b.hitT > 0) b.hitT -= dt;
    if (b.cd > 0) { b.cd -= dt; continue; }
    const foe = enemyOf(id);
    const t = nearestOf(world, foe, b.x, KEEP_RANGE + b.halfW);
    if (!t) continue;
    let inside = 0;
    for (const u of world.units) if (u.inside && u.faction === id) inside++;
    const shots = 1 + Math.min(4, Math.floor(inside / 2));
    const targets = unitsNear(world, foe, b.x, KEEP_RANGE + b.halfW);
    for (let i = 0; i < shots; i++) {
      const tt = targets.length ? targets[(i * 7 + Math.floor(world.t)) % targets.length] : t;
      fire(world, id, b.x + world.factions[id].dir * 20, -150, tt, null, KEEP_DAMAGE, 'arrow', 'keep');
    }
    b.cd = KEEP_COOLDOWN;
  }
}

export function stepCombat(world, dt) {
  if (!world.siege && world.t >= SIEGE_START) {
    world.siege = true;
    world.events.push({ type: 'siege', x: world.width / 2 });
  }
  stepProjectiles(world, dt);
  stepBuildings(world, dt);
}
