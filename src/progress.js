// Crowns, daily quests, achievements, the play streak and the shop. Pure: works on the save object,
// takes the date as an argument, and never touches the DOM or storage (store.js saves).
import { mulberry32 } from './sim/world.js';

// Crowns for finishing a battle.
export const GAME_REWARD = {
  easy: { win: 10, loss: 3 },
  normal: { win: 20, loss: 5 },
  hard: { win: 35, loss: 8 },
};
export const DAILY_COUNT = 3;
// The first battle of each day pays a bonus that grows with the streak of days played in a row.
export function streakBonus(days) { return 10 + 5 * Math.min(6, Math.max(0, days - 1)); }

// Daily quests. count(s) is what one finished battle adds; progress adds up over the day.
export const DAILY = [
  { id: 'wins2', text: 'Win 2 battles', goal: 2, reward: 30, count: (s) => (s.won ? 1 : 0) },
  { id: 'play3', text: 'Fight 3 battles', goal: 3, reward: 20, count: () => 1 },
  { id: 'winNormal', text: 'Win on Normal or Hard', goal: 1, reward: 40, count: (s) => (s.won && s.difficulty !== 'easy' ? 1 : 0) },
  { id: 'kills60', text: 'Slay 60 foes', goal: 60, reward: 25, count: (s) => s.kills },
  { id: 'gold3k', text: 'Mine 3,000 gold', goal: 3000, reward: 25, count: (s) => s.gold },
  { id: 'footmen12', text: 'Train 12 Footmen', goal: 12, reward: 20, count: (s) => s.byType.melee || 0 },
  { id: 'archers10', text: 'Train 10 Elf Archers', goal: 10, reward: 20, count: (s) => s.byType.ranged || 0 },
  { id: 'knights4', text: 'Train 4 Shield Knights', goal: 4, reward: 25, count: (s) => s.byType.tank || 0 },
  { id: 'wizards4', text: 'Train 4 Battle Wizards', goal: 4, reward: 25, count: (s) => s.byType.mage || 0 },
  { id: 'golems2', text: 'Train 2 Stone Golems', goal: 2, reward: 35, count: (s) => s.byType.giant || 0 },
  { id: 'zap12', text: 'Slay 12 foes with lightning', goal: 12, reward: 30, count: (s) => s.spellKills },
  { id: 'quick', text: 'Win in under 8 minutes', goal: 1, reward: 35, count: (s) => (s.won && s.seconds < 480 ? 1 : 0) },
  { id: 'walls', text: 'Win with the keep above 75% health', goal: 1, reward: 35, count: (s) => (s.won && s.keepPct > 0.75 ? 1 : 0) },
];

// One-time achievements. value(save) is the progress toward goal, read from the saved totals and record.
export const ACHIEVEMENTS = [
  { id: 'first', text: 'First victory', goal: 1, reward: 50, value: (v) => v.totals.wins },
  { id: 'easy', text: 'Win on Easy', goal: 1, reward: 30, value: (v) => v.record.easy.won },
  { id: 'normal', text: 'Win on Normal', goal: 1, reward: 80, value: (v) => v.record.normal.won },
  { id: 'hard', text: 'Win on Hard', goal: 1, reward: 150, value: (v) => v.record.hard.won },
  { id: 'blitz', text: 'Win on Normal in under 6 minutes', goal: 1, reward: 100, value: (v) => (v.record.normal.best !== null && v.record.normal.best < 360 ? 1 : 0) },
  { id: 'veteran', text: 'Win 25 battles', goal: 25, reward: 150, value: (v) => v.totals.wins },
  { id: 'slayer', text: 'Slay 1,000 foes', goal: 1000, reward: 100, value: (v) => v.totals.kills },
  { id: 'storm', text: 'Slay 100 foes with lightning', goal: 100, reward: 100, value: (v) => v.totals.spellKills },
  { id: 'golems', text: 'Train 20 Stone Golems', goal: 20, reward: 80, value: (v) => v.totals.giants },
  { id: 'devoted', text: 'Complete 15 daily quests', goal: 15, reward: 120, value: (v) => v.totals.quests },
  { id: 'streak7', text: 'Play 7 days in a row', goal: 7, reward: 150, value: (v) => v.streak.best },
];

// Upgrades: each tier costs the next price and adds `per` to its boon (see boonsFor).
export const UPGRADES = [
  { id: 'treasury', name: 'Royal Treasury', text: '+40 starting gold', prices: [60, 120, 200] },
  { id: 'veins', name: 'Deep Veins', text: '+5% gold and mana from miners', prices: [80, 160, 260] },
  { id: 'walls', name: 'Stout Walls', text: '+8% keep health', prices: [70, 140, 220] },
  { id: 'storm', name: 'Storm Lore', text: 'Lightning recharges 10% sooner', prices: [90, 180, 280] },
];

// Banner colours for the Kingdom's cloth (capes, tabards, flags). Looks only.
export const BANNERS = [
  { id: 'royal', name: 'Royal blue', price: 0, colors: { cloth: '#3567bf', clothDark: '#24498c' } },
  { id: 'crimson', name: 'Crimson', price: 150, colors: { cloth: '#b8323a', clothDark: '#7e1f26' } },
  { id: 'violet', name: 'Violet', price: 150, colors: { cloth: '#7a45c2', clothDark: '#532d8a' } },
  { id: 'ivory', name: 'Ivory', price: 150, colors: { cloth: '#d9d2bd', clothDark: '#a29a82' } },
];

export function defaultProgress() {
  return {
    crowns: 0,
    upgrades: { treasury: 0, veins: 0, walls: 0, storm: 0 },
    useUpgrades: true,
    banners: ['royal'],
    banner: 'royal',
    daily: { day: '', ids: [], progress: [], done: [] },
    streak: { last: '', days: 0, best: 0 },
    totals: { games: 0, wins: 0, kills: 0, spellKills: 0, giants: 0, quests: 0 },
    achieved: [],
  };
}

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function prevDay(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1, 12);
  return dayKey(d);
}

/** The day's quests: the same three for everyone on that day, picked from the date. */
export function pickDaily(day) {
  let h = 2166136261;
  for (const ch of day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rng = mulberry32(h);
  const pool = DAILY.map((q) => q.id);
  const out = [];
  while (out.length < DAILY_COUNT) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

/** Roll the daily quests over when the day has changed. Returns true if it did. */
export function refreshDaily(save, now) {
  const day = dayKey(now);
  if (save.daily.day === day) return false;
  const ids = pickDaily(day);
  save.daily = { day, ids, progress: ids.map(() => 0), done: ids.map(() => false) };
  return true;
}

export function dailyQuests(save) {
  return save.daily.ids.map((id, i) => {
    const q = DAILY.find((d) => d.id === id);
    return q && { ...q, progress: Math.min(q.goal, save.daily.progress[i]), done: save.daily.done[i] };
  }).filter(Boolean);
}

export function achievementList(save) {
  return ACHIEVEMENTS.map((a) => ({ ...a, progress: Math.min(a.goal, a.value(save)), done: save.achieved.includes(a.id) }));
}

/** What a finished battle tells the quests. */
export function summarize(world, player, difficulty) {
  const f = world.factions[player];
  const b = world.buildings[player];
  return {
    won: world.winner === player,
    difficulty,
    seconds: world.t,
    kills: f.stats.kills,
    gold: f.stats.gold,
    byType: { ...f.stats.byType },
    spellKills: f.stats.spellKills,
    keepPct: b.hp / b.maxHp,
  };
}

/**
 * Pay out a finished battle: the battle's crowns, the daily bonus, daily quests and achievements.
 * Call after recordResult (achievements read the win record). Returns the lines for the end screen.
 */
export function applyGame(save, s, now) {
  refreshDaily(save, now);
  const lines = [];
  const pay = (text, crowns, kind) => { save.crowns += crowns; lines.push({ text, crowns, kind }); };
  const r = GAME_REWARD[s.difficulty] || GAME_REWARD.normal;
  pay(s.won ? 'Victory' : 'Battle fought', s.won ? r.win : r.loss, 'game');

  // Streak: the first battle of a day keeps it going (or starts again) and pays the bonus.
  const day = dayKey(now);
  const st = save.streak;
  if (st.last !== day) {
    st.days = st.last === prevDay(now) ? st.days + 1 : 1;
    st.last = day;
    st.best = Math.max(st.best, st.days);
    pay(st.days > 1 ? `Daily bonus · ${st.days} days in a row` : 'Daily bonus', streakBonus(st.days), 'bonus');
  }

  const t = save.totals;
  t.games++;
  if (s.won) t.wins++;
  t.kills += s.kills;
  t.spellKills += s.spellKills;
  t.giants += s.byType.giant || 0;

  save.daily.ids.forEach((id, i) => {
    const q = DAILY.find((d) => d.id === id);
    if (!q || save.daily.done[i]) return;
    save.daily.progress[i] += q.count(s);
    if (save.daily.progress[i] >= q.goal) {
      save.daily.done[i] = true;
      t.quests++;
      pay(`Quest: ${q.text}`, q.reward, 'quest');
    }
  });

  lines.push(...checkAchievements(save));
  return lines;
}

/** Pay any achievement the save has reached but not yet been paid for (also run on the menu, for older saves). */
export function checkAchievements(save) {
  const lines = [];
  for (const a of ACHIEVEMENTS) {
    if (save.achieved.includes(a.id) || a.value(save) < a.goal) continue;
    save.achieved.push(a.id);
    save.crowns += a.reward;
    lines.push({ text: `Achievement: ${a.text}`, crowns: a.reward, kind: 'achievement' });
  }
  return lines;
}

/** The next tier's price, or null when the upgrade is maxed. */
export function upgradePrice(save, id) {
  const u = UPGRADES.find((x) => x.id === id);
  const tier = save.upgrades[id] || 0;
  return u && tier < u.prices.length ? u.prices[tier] : null;
}

export function buyUpgrade(save, id) {
  const price = upgradePrice(save, id);
  if (price === null || save.crowns < price) return false;
  save.crowns -= price;
  save.upgrades[id] = (save.upgrades[id] || 0) + 1;
  return true;
}

/** Buy a banner if needed, then fly it. */
export function chooseBanner(save, id) {
  const b = BANNERS.find((x) => x.id === id);
  if (!b) return false;
  if (!save.banners.includes(id)) {
    if (save.crowns < b.price) return false;
    save.crowns -= b.price;
    save.banners.push(id);
  }
  save.banner = id;
  return true;
}

export function bannerColors(save) {
  return (BANNERS.find((b) => b.id === save.banner) || BANNERS[0]).colors;
}

/** The player's upgrades as createWorld boons (none when switched off in the shop). */
export function boonsFor(save) {
  const u = save.useUpgrades ? save.upgrades : {};
  const n = (id) => u[id] || 0;
  return {
    startGold: 40 * n('treasury'),
    income: 1 + 0.05 * n('veins'),
    buildingHp: 1 + 0.08 * n('walls'),
    spellCd: 1 - 0.1 * n('storm'),
  };
}
