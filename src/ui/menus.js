// Title, help, pause and end screens.
const $ = (s) => document.querySelector(s);
const SCREENS = ['title', 'help', 'pause', 'end'];

export function showScreen(name) {
  for (const s of SCREENS) $('#' + s).hidden = s !== name;
  $('#hud').hidden = !(name === null || name === 'pause');
}

export function fmtTime(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function renderTitle(save) {
  for (const b of document.querySelectorAll('[data-diff]')) {
    const on = b.dataset.diff === save.difficulty;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
    b.setAttribute('role', 'radio');
  }
  const r = save.record[save.difficulty];
  const parts = [`${cap(save.difficulty)}: ${r.won} won, ${r.lost} lost`];
  if (r.best !== null) parts.push(`fastest win ${fmtTime(r.best)}`);
  $('#record').textContent = parts.join(' · ');
  renderSound(save.sound);
}

export function renderSound(on) {
  for (const id of ['#soundBtn', '#soundBtn2']) $(id).textContent = `Sound: ${on ? 'on' : 'off'}`;
}

export function renderEnd(won, difficulty, world, player) {
  const f = world.factions[player];
  $('#endTitle').textContent = won ? 'Victory!' : 'Defeat';
  $('#endText').textContent = won
    ? `The dark tower falls. (${cap(difficulty)})`
    : `The keep has fallen. (${cap(difficulty)})`;
  const rows = [
    ['Time', fmtTime(world.t)],
    ['Units trained', f.stats.trained],
    ['Foes slain', f.stats.kills],
    ['Units lost', f.stats.lost],
    ['Gold mined', Math.round(f.stats.gold)],
  ];
  const dl = $('#endStats');
  dl.textContent = '';
  for (const [k, v] of rows) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = String(v);
    dl.append(dt, dd);
  }
}

function cap(s) { return s[0].toUpperCase() + s.slice(1); }
