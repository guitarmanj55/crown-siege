// Computer opponent: build order, composition, when to attack, when to fall back, and lightning.
import { STATS, SPELLS, enemyOf } from './factions.js';
import { train, trainBlock, popUsed, POP_CAP } from './economy.js';
import { setStance } from './orders.js';
import { castSpell } from './spells.js';
import { unitsNear } from './combat.js';

export const DIFFICULTY = {
  easy: { think: 1.6, workers: 4, income: 0.8, attackRatio: 1.7, minAttack: 8, retreatRatio: 0.7, spellCluster: 0, firstAttack: 210 },
  normal: { think: 0.8, workers: 6, income: 1.0, attackRatio: 1.25, minAttack: 6, retreatRatio: 0.55, spellCluster: 6, firstAttack: 150 },
  hard: { think: 0.4, workers: 8, income: 1.2, attackRatio: 1.0, minAttack: 6, retreatRatio: 0.45, spellCluster: 4, firstAttack: 100 },
};

const MIX = { melee: 0.36, ranged: 0.28, tank: 0.14, mage: 0.12, giant: 0.1 };

export function createAI(world, faction, difficulty) {
  const d = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  world.factions[faction].incomeMul = d.income;
  return { difficulty, d, timer: 0 };
}

/** Rough fighting strength: cost-weighted, scaled by remaining health. */
export function armyValue(world, faction) {
  let v = 0;
  for (const u of world.units) {
    if (u.faction !== faction || u.type === 'worker' || u.state === 'dead') continue;
    const s = STATS[u.type];
    v += (s.cost.gold + s.cost.mana * 1.5) * (0.4 + 0.6 * (u.hp / u.maxHp));
  }
  return v;
}

function counts(world, faction) {
  const c = { worker: 0, melee: 0, ranged: 0, tank: 0, mage: 0, giant: 0 };
  for (const u of world.units) if (u.faction === faction && u.state !== 'dead') c[u.type]++;
  for (const q of world.factions[faction].queue) c[q.type]++;
  return c;
}

function chooseBuild(world, faction, ai) {
  const f = world.factions[faction];
  if (f.queue.length >= 2) return;
  const c = counts(world, faction);
  if (c.worker < ai.d.workers) {
    if (!trainBlock(world, faction, 'worker')) train(world, faction, 'worker');
    return;
  }
  const army = c.melee + c.ranged + c.tank + c.mage + c.giant;
  // Pick the type furthest below its share; save up for it rather than spending on something else.
  let pick = 'melee';
  let worst = Infinity;
  for (const t of ['melee', 'ranged', 'tank', 'mage', 'giant']) {
    const share = army ? c[t] / army : 0;
    const gap = share - MIX[t];
    if (gap < worst) { worst = gap; pick = t; }
  }
  // Cheap opener: get a few grunts out before saving for brutes.
  if (army < 3) pick = 'melee';
  if ((pick === 'tank' || pick === 'mage' || pick === 'giant') && STATS[pick].cost.mana > f.mana && f.gold > 250) pick = 'ranged';
  if (!trainBlock(world, faction, pick)) train(world, faction, pick);
}

function chooseStance(world, faction, ai) {
  const f = world.factions[faction];
  const foe = enemyOf(faction);
  const mine = armyValue(world, faction);
  const theirs = armyValue(world, foe);
  const b = world.buildings[faction];
  // Enemies close to home?
  const near = unitsNear(world, foe, b.x, 950).filter((u) => u.type !== 'worker').length;
  let armyCount = 0;
  for (const u of world.units) if (u.faction === faction && u.type !== 'worker' && u.state !== 'dead') armyCount++;
  const maxed = popUsed(world, faction) >= POP_CAP - 2;

  if (f.stance === 'attack') {
    if (mine < theirs * ai.d.retreatRatio && !maxed) setStance(world, faction, 'defend');
    return;
  }
  if (near > 0 && ai.difficulty === 'hard' && mine < theirs * 0.35 && armyCount < 4) {
    setStance(world, faction, 'garrison');
    return;
  }
  if (f.stance === 'garrison' && (near === 0 || mine >= theirs * 0.6)) setStance(world, faction, 'defend');
  if (near > 0) return; // deal with raiders at home first
  const ready = world.t >= ai.d.firstAttack && armyCount >= ai.d.minAttack && mine >= theirs * ai.d.attackRatio;
  if (ready || (maxed && armyCount > 0)) setStance(world, faction, 'attack');
}

function chooseSpell(world, faction, ai) {
  const need = ai.d.spellCluster;
  if (!need) return;
  const f = world.factions[faction];
  if (f.spellCd.lightning > 0 || f.mana < SPELLS.lightning.mana) return;
  // Keep mana for brutes unless the shot is worth it.
  const foe = enemyOf(faction);
  const r = SPELLS.lightning.radius;
  let bestX = 0;
  let best = 0;
  // Aim at soldiers only: zapping miners is cheap and feels unfair.
  for (const u of world.index[foe]) {
    if (u.type === 'worker') continue;
    let n = 0;
    for (const v of unitsNear(world, foe, u.x, r)) if (v.type !== 'worker') n++;
    if (n > best) { best = n; bestX = u.x; }
  }
  if (best >= need) castSpell(world, faction, 'lightning', bestX);
}

export function stepAI(world, faction, dt) {
  const ai = world.factions[faction].ai;
  ai.timer -= dt;
  if (ai.timer > 0) return;
  ai.timer = ai.d.think;
  chooseBuild(world, faction, ai);
  chooseStance(world, faction, ai);
  chooseSpell(world, faction, ai);
}
