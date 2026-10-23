// Player-cast spells on cooldown. Release 1: lightning strike.
import { SPELLS, enemyOf } from './factions.js';
import { unitsNear, damageUnit } from './combat.js';

/** Returns '' if `faction` can cast `spell` now, else a short reason. */
export function spellBlock(world, faction, spell) {
  const def = SPELLS[spell];
  const f = world.factions[faction];
  if (!def) return 'unknown';
  if (world.over) return 'over';
  if (f.spellCd[spell] > 0) return 'cooldown';
  if (f.mana < def.mana) return 'mana';
  return '';
}

export function castSpell(world, faction, spell, x) {
  if (spellBlock(world, faction, spell)) return false;
  const def = SPELLS[spell];
  const f = world.factions[faction];
  f.mana -= def.mana;
  f.spellCd[spell] = def.cooldown;
  const cx = Math.max(0, Math.min(world.width, x));
  world.pendingSpells.push({ spell, faction, x: cx, t: def.delay });
  world.events.push({ type: 'spellCast', spell, faction, x: cx });
  return true;
}

export function stepSpells(world, dt) {
  if (!world.pendingSpells.length) return;
  const keep = [];
  for (const p of world.pendingSpells) {
    p.t -= dt;
    if (p.t > 0) { keep.push(p); continue; }
    const def = SPELLS[p.spell];
    const hit = unitsNear(world, enemyOf(p.faction), p.x, def.radius);
    for (const u of hit) damageUnit(world, u, def.damage, p.faction, true);
    world.events.push({ type: 'lightning', faction: p.faction, x: p.x, hits: hit.length });
  }
  world.pendingSpells = keep;
}
