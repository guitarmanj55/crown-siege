import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, countUnits, STEP } from '../src/sim/world.js';
import { train, trainBlock, popUsed, spawnUnit, dismissWorker, workerCount, POP_CAP } from '../src/sim/economy.js';
import { setStance } from '../src/sim/orders.js';
import { castSpell, spellBlock } from '../src/sim/spells.js';
import { SPELLS, STATS } from '../src/sim/factions.js';

function run(world, seconds) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n && !world.over; i++) step(world);
}

test('workers mine gold and tend the crystal for mana', () => {
  const w = createWorld({ gold: 0, mana: 0 });
  run(w, 60);
  const k = w.factions.kingdom;
  const jobs = w.units.filter((u) => u.faction === 'kingdom').map((u) => u.job).sort();
  assert.deepEqual(jobs, ['crystal', 'mine0', 'mine1']);
  assert.ok(k.gold >= 100 && k.gold <= 300, `gold after a minute: ${k.gold}`);
  // passive 0.5/s plus one worker at 0.9/s, less the walk there
  assert.ok(k.mana > 60 && k.mana < 90, `mana after a minute: ${k.mana}`);
});

test('training costs gold (and mana for tanks), takes time, and respects population', () => {
  const w = createWorld({ gold: 1000, mana: 0, workers: 0 });
  assert.equal(trainBlock(w, 'kingdom', 'tank'), 'mana');
  assert.ok(train(w, 'kingdom', 'melee'));
  assert.equal(w.factions.kingdom.gold, 1000 - STATS.melee.cost.gold);
  assert.equal(countUnits(w, 'kingdom', 'melee'), 0);
  run(w, STATS.melee.trainTime + 0.1);
  assert.equal(countUnits(w, 'kingdom', 'melee'), 1);

  w.factions.kingdom.mana = 100;
  assert.ok(train(w, 'kingdom', 'tank'));
  assert.equal(w.factions.kingdom.mana, 100 - STATS.tank.cost.mana);

  const p = createWorld({ gold: 100000, workers: 0 });
  for (let i = 0; i < POP_CAP; i++) spawnUnit(p, 'kingdom', 'melee');
  assert.equal(popUsed(p, 'kingdom'), POP_CAP);
  assert.equal(trainBlock(p, 'kingdom', 'melee'), 'pop');
});

test('sending a miner home frees its population place and refunds gold', () => {
  const w = createWorld({ gold: 0, workers: 3 });
  // A queued miner is cancelled first, with a full refund.
  w.factions.kingdom.gold = STATS.worker.cost.gold;
  assert.ok(train(w, 'kingdom', 'worker'));
  assert.equal(popUsed(w, 'kingdom'), 4);
  assert.ok(dismissWorker(w, 'kingdom'));
  assert.equal(w.factions.kingdom.queue.length, 0);
  assert.equal(w.factions.kingdom.gold, STATS.worker.cost.gold);
  // Then a living miner walks home: its place is free at once, and it leaves the world at the keep.
  w.factions.kingdom.gold = 0;
  run(w, 5);
  const before = w.factions.kingdom.gold;
  assert.ok(dismissWorker(w, 'kingdom'));
  assert.equal(workerCount(w, 'kingdom'), 2);
  assert.equal(popUsed(w, 'kingdom'), 2);
  assert.equal(w.factions.kingdom.gold, before + STATS.worker.cost.gold / 2);
  run(w, 20);
  assert.equal(countUnits(w, 'kingdom', 'worker'), 2);
  assert.ok(dismissWorker(w, 'kingdom') && dismissWorker(w, 'kingdom'));
  assert.equal(dismissWorker(w, 'kingdom'), false);
});

test('garrison hides the army in the keep while workers keep mining; defend holds the line; attack marches', () => {
  const w = createWorld({ workers: 1 });
  const k = w.factions.kingdom;
  const soldiers = [spawnUnit(w, 'kingdom', 'melee'), spawnUnit(w, 'kingdom', 'ranged'), spawnUnit(w, 'kingdom', 'tank')];
  run(w, 20);
  for (const u of soldiers) assert.ok(Math.abs(u.x - k.defendX) < 130, `${u.type} at ${u.x} holds near ${k.defendX}`);

  setStance(w, 'kingdom', 'garrison');
  run(w, 20);
  for (const u of soldiers) assert.ok(u.inside, `${u.type} inside`);
  const goldBefore = k.gold;
  run(w, 15);
  assert.ok(k.gold > goldBefore, 'mining continues while garrisoned');

  setStance(w, 'kingdom', 'attack');
  run(w, 20);
  for (const u of soldiers) assert.ok(!u.inside && u.x > k.defendX, `${u.type} marching at ${u.x}`);
});

test('ranged units shoot at melee closing in, and melee trade blows', () => {
  const w = createWorld({ workers: 0 });
  const a = spawnUnit(w, 'kingdom', 'ranged', 1500);
  const b = spawnUnit(w, 'horde', 'melee', 1700);
  setStance(w, 'kingdom', 'attack');
  setStance(w, 'horde', 'attack');
  run(w, 3);
  assert.ok(b.hp < b.maxHp, 'grunt took arrows before reaching the archer');
  run(w, 30);
  assert.ok(a.state === 'dead' || b.state === 'dead', 'one of them fell');
  assert.ok(w.factions.kingdom.stats.kills + w.factions.horde.stats.kills >= 1);
});

test('lightning costs mana, has a cooldown, and only hurts enemies near the strike', () => {
  const w = createWorld({ workers: 0, mana: 100 });
  const near = spawnUnit(w, 'horde', 'melee', 2000);
  const far = spawnUnit(w, 'horde', 'melee', 2300);
  const friend = spawnUnit(w, 'kingdom', 'melee', 2010);
  for (const id of ['kingdom', 'horde']) setStance(w, id, 'garrison');
  assert.ok(castSpell(w, 'kingdom', 'lightning', 2000));
  assert.equal(w.factions.kingdom.mana, 100 - SPELLS.lightning.mana);
  assert.equal(spellBlock(w, 'kingdom', 'lightning'), 'cooldown');
  assert.equal(castSpell(w, 'kingdom', 'lightning', 2000), false);
  run(w, 0.5);
  assert.equal(near.hp, near.maxHp - SPELLS.lightning.damage);
  assert.equal(far.hp, far.maxHp);
  assert.equal(friend.hp, friend.maxHp);
  run(w, SPELLS.lightning.cooldown);
  w.factions.kingdom.mana = 0;
  assert.equal(spellBlock(w, 'kingdom', 'lightning'), 'mana');
});

test('destroying the dark tower wins the game', () => {
  const w = createWorld({ workers: 0 });
  w.buildings.horde.hp = 30;
  spawnUnit(w, 'kingdom', 'melee', 2900);
  setStance(w, 'kingdom', 'attack');
  run(w, 15);
  assert.equal(w.over, true);
  assert.equal(w.winner, 'kingdom');
});

test('the AI spends its gold on workers and an army', () => {
  for (const diff of ['easy', 'normal', 'hard']) {
    const w = createWorld({ ai: { horde: diff }, seed: 7 });
    run(w, 120);
    const h = w.factions.horde;
    assert.ok(countUnits(w, 'horde', 'worker') >= 4, `${diff}: workers`);
    const army = countUnits(w, 'horde') - countUnits(w, 'horde', 'worker');
    assert.ok(army >= 3, `${diff}: army ${army}`);
    assert.ok(h.gold < 400, `${diff}: banked ${h.gold}`);
  }
});

test('an idle player loses to the AI', () => {
  const w = createWorld({ ai: { horde: 'normal' }, seed: 3 });
  run(w, 900);
  assert.equal(w.winner, 'horde', `tower ${w.buildings.horde.hp}, keep ${w.buildings.kingdom.hp}, t=${w.t}`);
});

test('headless battle: hard beats easy, and the same seed gives the same game', () => {
  const play = () => {
    const w = createWorld({ ai: { kingdom: 'hard', horde: 'easy' }, seed: 11 });
    run(w, 1200);
    return w;
  };
  const a = play();
  assert.equal(a.winner, 'kingdom', `keep ${a.buildings.kingdom.hp}, tower ${a.buildings.horde.hp}, t=${a.t}`);
  const b = play();
  assert.equal(b.t, a.t);
  assert.equal(b.factions.kingdom.stats.trained, a.factions.kingdom.stats.trained);
});

test('a few hundred units step quickly', () => {
  const w = createWorld({ workers: 0, ai: {} });
  for (let i = 0; i < 150; i++) {
    spawnUnit(w, 'kingdom', ['melee', 'ranged', 'tank'][i % 3], 600 + i * 4);
    spawnUnit(w, 'horde', ['melee', 'ranged', 'tank'][i % 3], 2600 - i * 4);
  }
  setStance(w, 'kingdom', 'attack');
  setStance(w, 'horde', 'attack');
  const t0 = performance.now();
  for (let i = 0; i < 600; i++) step(w);
  const ms = (performance.now() - t0) / 600;
  assert.ok(ms < 2, `${ms.toFixed(3)} ms per step`);
});

// A plain, sensible player: eight miners, a mixed army, attack at 16, lightning on clumps.
function sensiblePlayer(w, s) {
  const k = w.factions.kingdom;
  if (s % 30) return;
  if (k.queue.length < 2) {
    const miners = countUnits(w, 'kingdom', 'worker') + k.queue.filter((q) => q.type === 'worker').length;
    const want = miners < 8 ? 'worker' : ['melee', 'melee', 'ranged', 'ranged', 'tank'][(s / 30) % 5 | 0];
    if (!trainBlock(w, 'kingdom', want)) train(w, 'kingdom', want);
  }
  const army = countUnits(w, 'kingdom') - countUnits(w, 'kingdom', 'worker');
  if (k.stance !== 'attack' && army >= 16) setStance(w, 'kingdom', 'attack');
  if (k.stance === 'attack' && army <= 5) setStance(w, 'kingdom', 'defend');
  if (!spellBlock(w, 'kingdom', 'lightning')) {
    let best = 0, bx = 0;
    for (const u of w.index.horde) {
      if (u.type === 'worker') continue;
      const n = w.index.horde.filter((v) => Math.abs(v.x - u.x) <= SPELLS.lightning.radius).length;
      if (n > best) { best = n; bx = u.x; }
    }
    if (best >= 4) castSpell(w, 'kingdom', 'lightning', bx);
  }
}

test('difficulty curve: a sensible player beats easy every time and normal more often than not', () => {
  const play = (diff, seed) => {
    const w = createWorld({ ai: { horde: diff }, seed });
    for (let s = 0; s < 60 * 1500 && !w.over; s++) { step(w); sensiblePlayer(w, s); }
    return w.winner;
  };
  for (let seed = 1; seed <= 4; seed++) assert.equal(play('easy', seed), 'kingdom', `easy seed ${seed}`);
  let wins = 0;
  for (let seed = 1; seed <= 6; seed++) if (play('normal', seed) === 'kingdom') wins++;
  assert.ok(wins >= 3, `normal: won ${wins}/6`);
});
