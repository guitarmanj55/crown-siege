// Title, help, quests, shop, pause and end screens.
import { dailyQuests, achievementList, streakBonus, dayKey, UPGRADES, BANNERS, upgradePrice } from '../progress.js';

const $ = (s) => document.querySelector(s);
const SCREENS = ['title', 'help', 'quests', 'shop', 'pause', 'end'];

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
  renderCrowns(save);
  const left = dailyQuests(save).filter((q) => !q.done).length;
  const badge = $('#questBadge');
  badge.hidden = !left;
  badge.textContent = String(left);
  $('#questsBtn').setAttribute('aria-label', left ? `Quests, ${left} to do today` : 'Quests');
}

function renderCrowns(save) {
  $('#crowns').textContent = String(save.crowns);
  for (const n of document.querySelectorAll('.crownCount')) n.textContent = String(save.crowns);
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function questRow(q, short) {
  const li = el('li', q.done ? 'done' : '');
  const top = el('div', 'qtop');
  top.append(el('span', 'qtext', q.text), el('span', 'qreward', q.done ? '✓' : `+${q.reward}`));
  const bar = el('div', 'qbar');
  const fill = el('i');
  fill.style.width = `${Math.round((q.progress / q.goal) * 100)}%`;
  bar.append(fill);
  li.append(top);
  if (!short || q.goal > 1) {
    const fmt = (v) => Math.floor(v).toLocaleString('en-GB');
    li.append(bar, el('span', 'qnum', `${fmt(q.progress)} / ${fmt(q.goal)}`));
  }
  return li;
}

export function renderQuests(save, now) {
  renderCrowns(save);
  const daily = $('#dailyList');
  daily.textContent = '';
  for (const q of dailyQuests(save)) daily.append(questRow(q, false));
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const hours = Math.max(1, Math.ceil((midnight - now) / 3600000));
  $('#questReset').textContent = `· new in ${hours}h`;
  const st = save.streak;
  const today = st.last === dayKey(now);
  $('#streakText').textContent = today
    ? `Played today · ${st.days} day${st.days === 1 ? '' : 's'} in a row. Come back tomorrow for +${streakBonus(st.days + 1)}.`
    : `First battle today pays +${streakBonus(st.days + 1)} crowns${st.days ? ' if your streak holds' : ''}.`;
  const list = achievementList(save);
  const ach = $('#achList');
  ach.textContent = '';
  // Unfinished first, nearest to done at the top; finished ones after.
  list.sort((a, b) => (a.done - b.done) || (b.progress / b.goal - a.progress / a.goal));
  for (const a of list) ach.append(questRow(a, true));
  $('#achCount').textContent = `· ${list.filter((a) => a.done).length}/${list.length}`;
}

/** handlers: { onUpgrade(id), onBanner(id), onToggle() } */
export function renderShop(save, handlers) {
  renderCrowns(save);
  const cards = $('#upgradeList');
  cards.textContent = '';
  for (const u of UPGRADES) {
    const tier = save.upgrades[u.id];
    const price = upgradePrice(save, u.id);
    const card = el('div', 'card');
    const pips = el('span', 'pips');
    for (let i = 0; i < u.prices.length; i++) pips.append(el('i', i < tier ? 'on' : ''));
    const info = el('div', 'cinfo');
    info.append(el('b', '', u.name), el('span', '', u.text), pips);
    const buy = el('button', 'buy');
    if (price === null) { buy.textContent = 'Max'; buy.disabled = true; }
    else {
      buy.innerHTML = `<i class="ico crown"></i>${price}`;
      buy.classList.toggle('poor', save.crowns < price);
      buy.setAttribute('aria-label', `Buy ${u.name} level ${tier + 1} for ${price} crowns`);
      buy.addEventListener('click', () => handlers.onUpgrade(u.id));
    }
    card.append(info, buy);
    cards.append(card);
  }
  const banners = $('#bannerList');
  banners.textContent = '';
  for (const b of BANNERS) {
    const owned = save.banners.includes(b.id);
    const on = save.banner === b.id;
    const btn = el('button', 'banner' + (on ? ' on' : ''));
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(on));
    btn.setAttribute('aria-label', owned ? `${b.name} banners` : `${b.name} banners, ${b.price} crowns`);
    const sw = el('i', 'swatch');
    sw.style.background = `linear-gradient(180deg, ${b.colors.cloth}, ${b.colors.clothDark})`;
    btn.append(sw);
    if (!owned) {
      const tag = el('span', 'price' + (save.crowns < b.price ? ' poor' : ''));
      tag.innerHTML = `<i class="ico crown"></i>${b.price}`;
      btn.append(tag);
    }
    btn.addEventListener('click', () => handlers.onBanner(b.id));
    banners.append(btn);
  }
  const t = $('#upgradesToggle');
  t.textContent = `Upgrades: ${save.useUpgrades ? 'on' : 'off'}`;
  t.setAttribute('aria-checked', String(save.useUpgrades));
}

export function renderSound(on) {
  for (const id of ['#soundBtn', '#soundBtn2']) $(id).textContent = `Sound: ${on ? 'on' : 'off'}`;
}

export function renderEnd(won, difficulty, world, player, rewards = []) {
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
  const ul = $('#endRewards');
  ul.textContent = '';
  ul.hidden = !rewards.length;
  let total = 0;
  for (const r of rewards) {
    total += r.crowns;
    const li = el('li', r.kind);
    li.append(el('span', '', r.text), el('b', '', `+${r.crowns}`));
    ul.append(li);
  }
  if (rewards.length) {
    const li = el('li', 'total');
    li.innerHTML = '<span>Crowns earned</span>';
    const b = el('b');
    b.innerHTML = `<i class="ico crown"></i>${total}`;
    li.append(b);
    ul.append(li);
  }
}

function cap(s) { return s[0].toUpperCase() + s.slice(1); }
