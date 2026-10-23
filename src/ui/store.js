// Settings and progress in localStorage. Every access is wrapped: private mode or blocked storage must not break the game.

const KEY = 'crownsiege_v1';

function defaults() {
  const rec = () => ({ won: 0, lost: 0, best: null });
  return { schema: 1, difficulty: 'normal', sound: true, record: { easy: rec(), normal: rec(), hard: rec() } };
}

export function loadSave() {
  const d = defaults();
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!s || typeof s !== 'object') return d;
    const out = { ...d, ...s, record: { ...d.record } };
    for (const k of Object.keys(d.record)) out.record[k] = { ...d.record[k], ...(s.record && s.record[k]) };
    if (!['easy', 'normal', 'hard'].includes(out.difficulty)) out.difficulty = 'normal';
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
