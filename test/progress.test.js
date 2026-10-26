import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, STEP } from '../src/sim/world.js';
import { spawnUnit } from '../src/sim/economy.js';
import { castSpell } from '../src/sim/spells.js';
import { setStance } from '../src/sim/orders.js';
import { SPELLS, STATS } from '../src/sim/factions.js';
import { BUILDING_HP } from '../src/sim/world.js';
import {
  pickDaily, refreshDaily, applyGame, checkAchievements, summarize, dailyQuests, buyUpgrade, upgradePrice, chooseBanner,
  boonsFor, streakBonus, GAME_REWARD, DAILY, UPGRADES,
} from '../src/progress.js';
import { loadSave } from '../src/ui/store.js';

function run(world, seconds) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n && !world.over; i++) step(world);
}

// A fresh save, through the real loader, with a stand-in for localStorage.
function freshSave(stored = null) {
  globalThis.localStorage = { getItem: () => (stored ? JSON.stringify(stored) : null), setItem() {} };
  return loadSave();
}

const day = (d) => new Date(2026, 9, d, 15);
const summary = (o = {}) => ({ won: false, difficulty: 'normal', seconds: 900, kills: 0, gold: 0, byType: {}, spellKills: 0, keepPct: 0.5, ...o });

test('daily quests: three different ones, the same all day, new ones the next day', () => {
  const a = pickDaily('2026-10-26');
  assert.equal(new Set(a).size, 3);
  assert.deepEqual(pickDaily('2026-10-26'), a);
  for (const id of a) assert.ok(DAILY.some((q) => q.id === id));
  const s = freshSave();
  assert.ok(refreshDaily(s, day(26)));
  assert.equal(refreshDaily(s, new Date(2026, 9, 26, 23)), false);
  assert.ok(refreshDaily(s, day(27)));
  assert.equal(s.daily.day, '2026-10-27');
});

test('a battle pays crowns, the first one of a day pays the streak bonus, and quests pay once', () => {
  const s = freshSave();
  refreshDaily(s, day(26));
  s.daily = { day: '2026-10-26', ids: ['kills60', 'play3', 'wins2'], progress: [0, 0, 0], done: [false, false, false] };
  const first = applyGame(s, summary({ kills: 40 }), day(26));
  assert.equal(s.crowns, GAME_REWARD.normal.loss + streakBonus(1));
  assert.deepEqual(first.map((l) => l.kind), ['game', 'bonus']);
  const second = applyGame(s, summary({ kills: 30, won: true }), day(26));
  // 70 kills finishes the quest; the second battle of the day pays no bonus; first victory is an achievement.
  assert.ok(second.some((l) => l.kind === 'quest' && l.text.includes('Slay 60')));
  assert.ok(!second.some((l) => l.kind === 'bonus'));
  assert.equal(dailyQuests(s)[0].done, true);
  const third = applyGame(s, summary({ kills: 100 }), day(26));
  assert.ok(!third.some((l) => l.text.includes('Slay 60')), 'paid once');
  assert.ok(third.some((l) => l.text.includes('Fight 3')));
  assert.equal(s.totals.quests, 2);
});

test('the streak grows on days in a row and starts again after a gap', () => {
  const s = freshSave();
  applyGame(s, summary(), day(1));
  applyGame(s, summary(), day(2));
  const l = applyGame(s, summary(), day(3));
  assert.equal(s.streak.days, 3);
  assert.equal(l.find((x) => x.kind === 'bonus').crowns, streakBonus(3));
  applyGame(s, summary(), day(5));
  assert.equal(s.streak.days, 1);
  assert.equal(s.streak.best, 3);
});

test('achievements unlock once, from the record and the totals', () => {
  const s = freshSave();
  s.record.normal.won = 1; // as recordResult would have done
  const l = applyGame(s, summary({ won: true }), day(26));
  const got = l.filter((x) => x.kind === 'achievement').map((x) => x.text);
  assert.ok(got.includes('Achievement: First victory'));
  assert.ok(got.includes('Achievement: Win on Normal'));
  assert.ok(!got.includes('Achievement: Win on Hard'));
  const again = applyGame(s, summary({ won: true }), day(26));
  assert.ok(!again.some((x) => x.text === 'Achievement: First victory'));
});

test('the shop sells upgrade tiers and banners for crowns, and upgrades become boons', () => {
  const s = freshSave();
  assert.equal(buyUpgrade(s, 'treasury'), false, 'no crowns yet');
  s.crowns = 1000;
  const p = upgradePrice(s, 'treasury');
  assert.ok(buyUpgrade(s, 'treasury'));
  assert.equal(s.crowns, 1000 - p);
  assert.equal(s.upgrades.treasury, 1);
  s.crowns = 10000;
  while (buyUpgrade(s, 'walls'));
  assert.equal(s.upgrades.walls, UPGRADES.find((u) => u.id === 'walls').prices.length);
  assert.equal(upgradePrice(s, 'walls'), null);
  assert.deepEqual(boonsFor(s), { startGold: 40, income: 1, buildingHp: 1 + 0.08 * 3, spellCd: 1 });
  s.useUpgrades = false;
  assert.deepEqual(boonsFor(s), { startGold: 0, income: 1, buildingHp: 1, spellCd: 1 });

  s.crowns = 100;
  assert.equal(chooseBanner(s, 'crimson'), false);
  s.crowns = 150;
  assert.ok(chooseBanner(s, 'crimson'));
  assert.equal(s.crowns, 0);
  assert.ok(chooseBanner(s, 'royal') && chooseBanner(s, 'crimson'), 'owned banners switch for free');
});

test('boons reach the sim: starting gold, keep health, mining income and lightning recharge', () => {
  const boons = { kingdom: { startGold: 80, income: 1.1, buildingHp: 1.16, spellCd: 0.8 } };
  const w = createWorld({ boons, mana: 100, workers: 0 });
  assert.equal(w.factions.kingdom.gold, 150 + 80);
  assert.equal(w.factions.horde.gold, 150);
  assert.equal(w.buildings.kingdom.maxHp, Math.round(BUILDING_HP * 1.16));
  assert.equal(w.buildings.horde.maxHp, BUILDING_HP);
  assert.ok(castSpell(w, 'kingdom', 'lightning', 2000));
  assert.ok(Math.abs(w.factions.kingdom.spellCd.lightning - SPELLS.lightning.cooldown * 0.8) < 1e-9);
  // The Horde AI's own income multiplier stacks on top of 1 and is untouched by the player's boons.
  const a = createWorld({ boons, ai: { horde: 'hard' } });
  assert.equal(a.factions.horde.incomeMul, 1.2);
  assert.equal(a.factions.kingdom.incomeMul, 1.1);
});

test('battle stats feed the quests: units trained by type and lightning kills', () => {
  const w = createWorld({ workers: 0, gold: 1000, mana: 200 });
  w.factions.kingdom.queue.push({ type: 'melee', t: 0 }, { type: 'melee', t: 0 });
  run(w, STATS.melee.trainTime * 2 + 0.2);
  const weak = spawnUnit(w, 'horde', 'melee', 2000);
  weak.hp = 10;
  setStance(w, 'horde', 'garrison');
  castSpell(w, 'kingdom', 'lightning', 2000);
  run(w, 0.5);
  const s = summarize(w, 'kingdom', 'easy');
  assert.equal(s.byType.melee, 2);
  assert.equal(s.spellKills, 1);
  assert.equal(s.kills, 1);
});

test('a schema 1 save loads with its record kept and wins counted toward achievements', () => {
  const old = { schema: 1, difficulty: 'hard', sound: false, record: { easy: { won: 3, lost: 1, best: 200 }, normal: { won: 2, lost: 4, best: 500 }, hard: { won: 0, lost: 2, best: null } } };
  const s = freshSave(old);
  assert.equal(s.schema, 2);
  assert.equal(s.difficulty, 'hard');
  assert.equal(s.sound, false);
  assert.equal(s.record.easy.won, 3);
  assert.equal(s.crowns, 0);
  assert.equal(s.totals.wins, 5);
  assert.equal(s.totals.games, 12);
  assert.deepEqual(s.upgrades, { treasury: 0, veins: 0, walls: 0, storm: 0 });
  assert.equal(s.banner, 'royal');
  // Broken fields fall back rather than break the game.
  const bad = freshSave({ ...old, schema: 2, crowns: -5, upgrades: { walls: 99 }, banners: ['nope'], banner: 'nope', daily: { day: 3 } });
  assert.equal(bad.crowns, 0);
  assert.equal(bad.upgrades.walls, 3);
  assert.equal(bad.banner, 'royal');
  assert.equal(bad.daily.day, '');
  // Wins from before quests existed pay their achievements on the menu.
  const paid = checkAchievements(s).map((l) => l.text);
  assert.deepEqual(paid, ['Achievement: First victory', 'Achievement: Win on Easy', 'Achievement: Win on Normal']);
  assert.equal(s.crowns, 50 + 30 + 80);
  assert.equal(checkAchievements(s).length, 0);
});
