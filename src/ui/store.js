// Settings and progress in localStorage. Every access is wrapped: private mode or blocked storage must not break the game.
import { defaultProgress, UPGRADES, BANNERS } from '../progress.js';

const KEY = 'crownsiege_v1';

function defaults() {
  const rec = () => ({ won: 0, lost: 0, best: null });
  return { schema: 2, difficulty: 'normal', sound: true, record: { easy: rec(), normal: rec(), hard: rec() }, ...defaultProgress() };
}

const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
const arr = (v) => (Array.isArray(v) ? v : []);

export function loadSave() {
  const d = defaults();
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!s || typeof s !== 'object') return d;
    const out = { ...d, ...s, schema: 2, record: { ...d.record } };
    for (const k of Object.keys(d.record)) out.record[k] = { ...d.record[k], ...(s.record && s.record[k]) };
    if (!['easy', 'normal', 'hard'].includes(out.difficulty)) out.difficulty = 'normal';
    // Schema 1 -> 2: crowns, quests and the shop. Missing or broken fields fall back to the defaults;
    // a schema 1 save starts its win total from the record, so its achievements count.
    const from1 = !(s.schema >= 2);
    out.crowns = num(s.crowns);
    out.upgrades = {};
    for (const u of UPGRADES) out.upgrades[u.id] = Math.min(u.prices.length, Math.floor(num(s.upgrades && s.upgrades[u.id])));
    out.useUpgrades = s.useUpgrades !== false;
    out.banners = ['royal', ...arr(s.banners).filter((b) => b !== 'royal' && BANNERS.some((x) => x.id === b))];
    if (!out.banners.includes(out.banner)) out.banner = 'royal';
    const dl = s.daily || {};
    out.daily = typeof dl.day === 'string' && arr(dl.ids).length === arr(dl.progress).length && arr(dl.ids).length === arr(dl.done).length
      ? { day: dl.day, ids: dl.ids, progress: dl.progress.map((v) => num(v)), done: dl.done.map(Boolean) }
      : d.daily;
    const st = s.streak || {};
    out.streak = { last: typeof st.last === 'string' ? st.last : '', days: num(st.days), best: num(st.best) };
    out.totals = {};
    for (const k of Object.keys(d.totals)) out.totals[k] = num(s.totals && s.totals[k]);
    if (from1) {
      for (const r of Object.values(out.record)) {
        out.totals.wins += num(r.won);
        out.totals.games += num(r.won) + num(r.lost);
      }
    }
    out.achieved = arr(s.achieved).filter((a) => typeof a === 'string');
    return out;
  } catch {
    return d;
  }
}

export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable: play on without saving */ }
}

/** Record a finished game; best is the fastest win in seconds. */
export function recordResult(s, difficulty, won, seconds) {
  const r = s.record[difficulty];
  if (won) {
    r.won++;
    if (r.best === null || seconds < r.best) r.best = Math.round(seconds);
  } else {
    r.lost++;
  }
  writeSave(s);
}
