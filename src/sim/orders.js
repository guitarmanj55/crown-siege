// Army commands: garrison (shelter in the keep), defend (hold a line in front of the base), attack (march).
// Workers ignore these and keep mining.
import { STATS, enemyOf } from './factions.js';
import { moveToward } from './economy.js';
import { nearestEnemy, startAttack, advanceAttack, buildingFace } from './combat.js';

export const STANCES = ['garrison', 'defend', 'attack'];
export const LEASH = 260; // how far past the defend line defenders will chase
export const HEAL_INSIDE = 12; // hp/s while garrisoned

// Formation depth per type, relative to the line: tanks in front, archers behind.
const SLOT = { tank: 34, melee: 6, ranged: -90 };

export function setStance(world, faction, stance) {
  if (!STANCES.includes(stance)) return false;
  world.factions[faction].stance = stance;
  return true;
}

export function stepSoldier(world, u, dt) {
  const f = world.factions[u.faction];
  const s = STATS[u.type];
  const home = world.buildings[u.faction];
  const dir = f.dir;

  if (advanceAttack(world, u, dt)) return;

  if (f.stance === 'garrison') {
    if (u.inside) {
      u.hp = Math.min(u.maxHp, u.hp + HEAL_INSIDE * dt);
      return;
    }
    if (moveToward(u, home.x, s.speed * 1.15, dt)) { u.inside = true; u.state = 'idle'; }
    return;
  }

  if (u.inside) {
    u.inside = false;
    u.x = home.x + dir * (home.halfW * 0.5);
  }

  let enemy = nearestEnemy(world, u, s.aggro);
  if (enemy && f.stance === 'defend' && (enemy.x - f.defendX) * dir > LEASH) enemy = null;

  if (enemy) {
    const reach = s.range + (s.projectile ? -u.jitter * 40 : u.jitter * 6);
    const dx = enemy.x - u.x;
    if (Math.abs(dx) <= reach) {
      u.facing = dx >= 0 ? 1 : -1;
      if (!startAttack(u, enemy)) u.state = 'idle';
    } else {
      moveToward(u, enemy.x - Math.sign(dx) * reach * 0.8, s.speed, dt);
    }
    return;
  }

  if (f.stance === 'attack') {
    const eb = world.buildings[enemyOf(u.faction)];
    const face = buildingFace(eb, world.factions[eb.faction].dir);
    const reach = s.range + (s.projectile ? -u.jitter * 60 : u.jitter * 4) - 2;
    const dist = (face - u.x) * dir;
    if (dist <= reach) {
      u.facing = dir;
      if (!startAttack(u, null)) u.state = 'idle';
    } else {
      moveToward(u, face - dir * reach, s.speed, dt);
    }
    return;
  }

  // Defend: take up a slot on the line.
  const tx = f.defendX + dir * (SLOT[u.type] + (u.jitter - 0.5) * 110);
  if (moveToward(u, tx, s.speed, dt)) {
    u.state = 'idle';
    u.facing = dir;
  }
}
