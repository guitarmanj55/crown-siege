// Shape parts attached to the rig (helmets, shields, weapons, capes) and the look of each unit.
// Silhouettes first: a dark body in the faction tone, a few bright accent shapes on top.
import { bodyFor, solve, strokeLimb } from './rig.js';

export const LOOKS = {
  dwarf: { size: 0.86, build: { legs: 0.68, arms: 0.9, torso: 0.95, trunk: 1.45, head: 1.1, limb: 1.15 }, lean: 0.08,
    head: 'skin', back: ['sack'], torso: [], helm: ['beard', 'dwarfHelm'], hand: 'pickaxe', attack: 'swing' },
  goblinDigger: { size: 0.8, build: { legs: 0.85, trunk: 0.95, head: 1.3, limb: 0.95 }, lean: 0.28,
    head: 'skin', back: ['sack'], torso: [], helm: ['goblinEars', 'eyes'], hand: 'pickaxe', attack: 'swing' },
  footman: { size: 1, build: {}, lean: 0.04,
    head: 'skin', back: [], torso: ['tabard'], helm: ['kettleHelm'], hand: 'sword', off: 'roundShield', attack: 'swing' },
  grunt: { size: 1.08, build: { trunk: 1.3, head: 1.12, limb: 1.15, arms: 1.08 }, lean: 0.14,
    head: 'skin', back: [], torso: ['loincloth', 'pauldron'], helm: ['orcFace', 'eyes'], hand: 'club', attack: 'swing' },
  elf: { size: 1.06, build: { legs: 1.15, torso: 1.05, trunk: 0.85, limb: 0.85 }, lean: 0,
    head: 'skin', back: ['cape', 'quiver'], torso: [], helm: ['hood'], hand: 'bow', attack: 'bow' },
  goblinSpear: { size: 0.84, build: { legs: 0.9, trunk: 0.95, head: 1.3, limb: 0.95 }, lean: 0.22,
    head: 'skin', back: ['spearBundle'], torso: ['loincloth'], helm: ['goblinEars', 'eyes'], hand: 'spear', attack: 'throw' },
  knight: { size: 1.24, build: { trunk: 1.3, limb: 1.2, head: 1.05 }, lean: 0.02,
    head: 'body', back: ['cape'], torso: ['plate'], helm: ['greatHelm'], hand: 'sword', off: 'towerShield', attack: 'swing' },
  wizard: { size: 1.04, build: { trunk: 1.15, limb: 0.9, head: 1.0 }, lean: 0.02,
    head: 'skin', back: ['cape'], torso: ['robe'], helm: ['wizardHat', 'beard'], hand: 'staff', attack: 'cast' },
  shaman: { size: 1.0, build: { trunk: 1.0, head: 1.15, limb: 0.95 }, lean: 0.18,
    head: 'skin', back: ['bones'], torso: ['loincloth', 'robe'], helm: ['skullMask', 'eyes'], hand: 'totem', attack: 'cast' },
  brute: { size: 1.4, build: { trunk: 1.5, limb: 1.35, arms: 1.1, head: 0.95, legs: 0.95 }, lean: 0.16,
    head: 'skin', back: [], torso: ['spikedPlate'], helm: ['hornHelm', 'eyes'], hand: 'bigAxe', attack: 'swing' },
};

// Body dimensions are fixed per look; work them out once.
const BODY = {};
for (const k in LOOKS) BODY[k] = bodyFor(LOOKS[k]);

const TAU = Math.PI * 2;

function poly(ctx, pts, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}

function circle(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

// ---- head parts: centre (hx, hy), radius r ----
const HEAD = {
  kettleHelm(ctx, j, c) {
    const { headX: x, headY: y, headR: r } = j;
    ctx.fillStyle = c.steel;
    ctx.beginPath(); ctx.arc(x, y - 0.6, r * 1.12, Math.PI, 0); ctx.fill();
    ctx.fillStyle = c.steelDark; ctx.fillRect(x - r * 1.6, y - 1.4, r * 3.2, 2.4);
    ctx.fillStyle = c.gold; ctx.fillRect(x - 1, y - r * 1.7, 2, r * 0.9);
  },
  greatHelm(ctx, j, c, t) {
    const { headX: x, headY: y, headR: r } = j;
    ctx.fillStyle = c.steel;
    ctx.beginPath(); ctx.roundRect(x - r * 1.15, y - r * 1.25, r * 2.3, r * 2.5, [r, r, 2, 2]); ctx.fill();
    ctx.fillStyle = '#10151f'; ctx.fillRect(x + r * 0.05, y - r * 0.25, r * 1.1, 1.6);
    ctx.fillStyle = c.gold; ctx.fillRect(x - 0.8, y - r * 1.25, 1.6, r * 2.5);
    // plume
    const sway = Math.sin(t * 3) * 1.5;
    ctx.strokeStyle = c.cloth; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.2); ctx.quadraticCurveTo(x - r * 1.2, y - r * 2.6, x - r * 2.6 + sway, y - r * 1.2); ctx.stroke();
  },
  hood(ctx, j, c) {
    const { headX: x, headY: y, headR: r } = j;
    poly(ctx, [x + r * 0.9, y - r * 0.9, x - r * 0.4, y - r * 1.5, x - r * 2.4, y - r * 0.3, x - r * 1.1, y + r * 0.9, x - r * 0.2, y + r * 0.2], c.cloth);
    ctx.fillStyle = c.cloth; ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.15, r * 1.08, Math.PI * 0.95, Math.PI * 1.9); ctx.fill();
  },
  dwarfHelm(ctx, j, c) {
    const { headX: x, headY: y, headR: r } = j;
    ctx.fillStyle = c.steelDark; ctx.beginPath(); ctx.arc(x, y - 0.8, r * 1.1, Math.PI, 0); ctx.fill();
    circle(ctx, x + r * 0.95, y - r * 0.55, 1.8, c.gold); // miner's lamp
  },
  beard(ctx, j, c) {
    const { headX: x, headY: y, headR: r } = j;
    poly(ctx, [x + r * 1.05, y - r * 0.05, x + r * 0.9, y + r * 1.9, x - r * 0.2, y + r * 1.2, x - r * 0.4, y + r * 0.3], '#d9822b');
  },
  goblinEars(ctx, j, c) {
    const { headX: x, headY: y, headR: r } = j;
    poly(ctx, [x - r * 0.3, y - r * 0.5, x - r * 2.5, y - r * 1.2, x - r * 0.6, y + r * 0.25], c.skin);
    poly(ctx, [x + r * 0.8, y - r * 0.1, x + r * 1.8, y + r * 0.35, x + r * 0.7, y + r * 0.5], c.skin); // nose
  },
  orcFace(ctx, j, c) {
    const { headX: x, headY: y, headR: r } = j;
    ctx.fillStyle = c.bodyBack; ctx.fillRect(x - r * 0.2, y - r * 0.55, r * 1.25, 1.6); // brow
    poly(ctx, [x + r * 0.55, y + r * 0.55, x + r * 0.85, y - r * 0.15, x + r * 0.95, y + r * 0.6], '#efe6c8'); // tusk
  },
  hornHelm(ctx, j, c) {
    const { headX: x, headY: y, headR: r } = j;
    ctx.fillStyle = c.steelDark; ctx.beginPath(); ctx.arc(x, y - 0.4, r * 1.15, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#e6dcc0'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.9); ctx.quadraticCurveTo(x - r * 1.9, y - r * 1.6, x - r * 1.2, y - r * 2.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.5, y - r * 0.95); ctx.quadraticCurveTo(x + r * 1.6, y - r * 1.9, x + r * 0.9, y - r * 2.7); ctx.stroke();
  },
  wizardHat(ctx, j, c) {
    const { headX: x, headY: y, headR: r } = j;
    poly(ctx, [x - r * 1.5, y - r * 0.6, x + r * 1.4, y - r * 0.7, x + r * 0.2, y - r * 3.1, x - r * 0.6, y - r * 2.3], c.clothDark);
    ctx.fillStyle = c.gold; ctx.fillRect(x - r * 1.35, y - r * 0.85, r * 2.6, 1.8);
  },
  skullMask(ctx, j, c) {
    const { headX: x, headY: y, headR: r } = j;
    ctx.fillStyle = '#e6dcc0'; ctx.beginPath(); ctx.roundRect(x + r * 0.1, y - r * 0.9, r * 1.1, r * 1.5, 2); ctx.fill();
    ctx.fillStyle = '#10151f'; ctx.fillRect(x + r * 0.35, y - r * 0.4, 1.4, 1.6); ctx.fillRect(x + r * 0.8, y - r * 0.4, 1.4, 1.6);
    poly(ctx, [x - r * 0.5, y - r * 0.8, x - r * 0.1, y - r * 2.2, x + r * 0.3, y - r * 0.9], c.cloth);
  },
  eyes(ctx, j, c) {
    circle(ctx, j.headX + j.headR * 0.5, j.headY - j.headR * 0.15, 1.15, '#ffd23a');
  },
};

// ---- back parts, drawn behind the torso ----
const BACK = {
  cape(ctx, j, c, t, walking) {
    const flow = walking ? 4 + Math.sin(t * 9) * 2 : 1 + Math.sin(t * 2) * 0.8;
    poly(ctx, [j.neckX + 1, j.neckY, j.neckX - 3, j.neckY, j.hipX - 6 - flow, j.hipY + 9, j.hipX + 1, j.hipY + 6], c.clothDark);
  },
  quiver(ctx, j, c) {
    ctx.save();
    ctx.translate(j.neckX - 3.5, j.neckY + 3);
    ctx.rotate(-0.5);
    ctx.fillStyle = c.wood; ctx.fillRect(-2.2, 0, 4.4, 11);
    ctx.fillStyle = c.gold; ctx.fillRect(-2.2, -3, 1.2, 3); ctx.fillRect(0.8, -4, 1.2, 4);
    ctx.restore();
  },
  sack(ctx, j, c) {
    circle(ctx, j.neckX - 5, j.neckY + 6, 5.5, '#8a6a3f');
  },
  bones(ctx, j, c) {
    ctx.strokeStyle = '#e6dcc0'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(j.neckX - 7, j.neckY + 1); ctx.lineTo(j.neckX - 2, j.neckY + 9); ctx.stroke();
    circle(ctx, j.neckX - 7, j.neckY + 1, 2, '#e6dcc0');
  },
  spearBundle(ctx, j, c) {
    ctx.strokeStyle = c.wood; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(j.neckX - 8 + i, j.neckY - 7 - i); ctx.lineTo(j.hipX + 2 + i, j.hipY + 3); ctx.stroke();
    }
  },
};

// ---- torso overlays ----
function torsoPath(ctx, j, w) {
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(j.hipX, j.hipY);
  ctx.lineTo(j.neckX, j.neckY + 1);
  ctx.stroke();
}
const TORSO = {
  tabard(ctx, j, c, b) { ctx.strokeStyle = c.cloth; torsoPath(ctx, j, b.trunk * 0.62); },
  plate(ctx, j, c, b) {
    ctx.strokeStyle = c.steel; torsoPath(ctx, j, b.trunk * 0.78);
    circle(ctx, j.neckX - 1, j.neckY + 2.5, b.trunk * 0.45, c.steelDark); // pauldron
  },
  robe(ctx, j, c, b) {
    ctx.strokeStyle = c.cloth; torsoPath(ctx, j, b.trunk * 0.7);
    poly(ctx, [j.hipX - 5, j.hipY - 3, j.hipX + 5, j.hipY - 3, j.hipX + 7, j.hipY + 11, j.hipX - 7, j.hipY + 11], c.cloth);
  },
  pauldron(ctx, j, c, b) { circle(ctx, j.neckX - 0.5, j.neckY + 2, b.trunk * 0.48, c.cloth); },
  loincloth(ctx, j, c, b) { poly(ctx, [j.hipX - 4, j.hipY - 2, j.hipX + 4, j.hipY - 2, j.hipX + 3, j.hipY + 6, j.hipX - 3, j.hipY + 5], c.clothDark); },
  spikedPlate(ctx, j, c, b) {
    ctx.strokeStyle = c.cloth; torsoPath(ctx, j, b.trunk * 0.72);
    const sx = j.neckX - 1, sy = j.neckY + 2;
    circle(ctx, sx, sy, b.trunk * 0.5, c.steelDark);
    poly(ctx, [sx - 3, sy - 3, sx - 1, sy - 9, sx + 1, sy - 3], '#e6dcc0');
    poly(ctx, [sx - 6, sy, sx - 10, sy - 5, sx - 3, sy - 3], '#e6dcc0');
  },
};

// ---- things held in the weapon hand: local frame has +y running along the forearm ----
const HAND = {
  sword(ctx, c) {
    ctx.rotate(1.3);
    ctx.fillStyle = c.steel; ctx.fillRect(-1.3, -15, 2.6, 15);
    ctx.fillStyle = c.gold; ctx.fillRect(-3.2, -1, 6.4, 2); ctx.fillRect(-1, 0, 2, 3);
  },
  club(ctx, c) {
    ctx.rotate(1.3);
    poly(ctx, [-1.4, 2, 1.4, 2, 3.6, -15, -3.6, -15], c.wood);
    circle(ctx, 0, -15, 3.6, c.wood);
    ctx.fillStyle = '#d8ccb0'; ctx.fillRect(2.2, -13, 2.4, 1.4); ctx.fillRect(-4.6, -10, 2.4, 1.4);
  },
  bigAxe(ctx, c) {
    ctx.rotate(1.3);
    ctx.fillStyle = c.wood; ctx.fillRect(-1.4, -22, 2.8, 26);
    poly(ctx, [1, -22, 9, -26, 11, -16, 1, -15], c.steel);
    poly(ctx, [-1, -21, -5, -23, -5, -16, -1, -17], c.steelDark);
  },
  pickaxe(ctx, c) {
    ctx.rotate(1.3);
    ctx.fillStyle = c.wood; ctx.fillRect(-1, -13, 2, 15);
    ctx.strokeStyle = c.steel; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-7, -9); ctx.quadraticCurveTo(0, -16, 7, -9); ctx.stroke();
  },
  staff(ctx, c, j) {
    ctx.rotate(1.5);
    ctx.fillStyle = c.wood; ctx.fillRect(-1, -22, 2, 28);
    const glow = 0.6 + (j.pose.charge || 0) * 0.4;
    ctx.globalAlpha = 0.35 * glow; circle(ctx, 0, -25, 6, c.crystal); ctx.globalAlpha = 1;
    circle(ctx, 0, -25, 3.2, c.crystal);
  },
  totem(ctx, c, j) {
    ctx.rotate(1.5);
    ctx.fillStyle = c.wood; ctx.fillRect(-1, -19, 2, 25);
    circle(ctx, 0, -21, 3.4, '#e6dcc0');
    const glow = 0.6 + (j.pose.charge || 0) * 0.4;
    ctx.globalAlpha = 0.35 * glow; circle(ctx, 0, -24, 6, c.crystal); ctx.globalAlpha = 1;
    circle(ctx, 0, -24, 2.6, c.crystal);
  },
  spear(ctx, c, j) {
    if (j.pose.thrown) return;
    ctx.rotate(1.5);
    ctx.fillStyle = c.wood; ctx.fillRect(-0.9, -18, 1.8, 26);
    poly(ctx, [-2, -18, 0, -24, 2, -18], c.steel);
  },
  bow(ctx, c, j) {
    // Bow stands across the arm; the string runs to the back hand.
    // Belly at the hand (+y is forward along the arm), tips curving back toward the archer.
    const a = Math.PI / 2 - 1.1;
    ctx.strokeStyle = c.wood; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -12, 12, a, Math.PI - a); ctx.stroke();
    const tx = Math.cos(a) * 12, ty = -12 + Math.sin(a) * 12;
    const pull = (j.pose.draw || 0) * 9;
    ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(0, ty - pull); ctx.lineTo(-tx, ty); ctx.stroke();
    if (j.pose.draw > 0.2) { ctx.fillStyle = c.gold; ctx.fillRect(-0.5, ty - pull, 1, pull + 9); }
  },
};

// ---- off hand ----
const OFF = {
  roundShield(ctx, x, y, c) {
    circle(ctx, x + 2, y - 1, 6.4, c.steelDark);
    circle(ctx, x + 2, y - 1, 5, c.cloth);
    circle(ctx, x + 2, y - 1, 1.8, c.gold);
  },
  towerShield(ctx, x, y, c) {
    ctx.fillStyle = c.steel;
    ctx.beginPath(); ctx.roundRect(x - 3, y - 15, 13, 26, [2, 2, 6, 6]); ctx.fill();
    ctx.fillStyle = c.gold; ctx.fillRect(x + 2.6, y - 13, 1.8, 22); ctx.fillRect(x - 1, y - 6, 9.6, 1.8);
  },
};

/** Draw a whole figure. x, y = feet on screen; scale = screen px per world unit. */
export function drawFigure(ctx, x, y, scale, facing, pose, lookId, c, t, extra) {
  const look = LOOKS[lookId];
  const b = BODY[lookId];
  const j = solve(pose, b);
  const walking = extra && extra.walking;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * look.size * facing, scale * look.size);
  if (pose.rot) {
    // Fall backwards about the heels.
    ctx.translate(-3, 0);
    ctx.rotate(pose.rot);
    ctx.translate(3, 0);
  }
  if (pose.alpha !== undefined && pose.alpha < 1) ctx.globalAlpha *= pose.alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  strokeLimb(ctx, j.legB, b.limb, c.bodyBack);
  strokeLimb(ctx, j.armB, b.limb * 0.92, c.bodyBack);
  for (const p of look.back) BACK[p](ctx, j, c, t, walking);
  ctx.strokeStyle = c.body;
  torsoPath(ctx, j, b.trunk);
  strokeLimb(ctx, j.legF, b.limb, c.body);
  for (const p of look.torso) TORSO[p](ctx, j, c, b);
  circle(ctx, j.headX, j.headY, j.headR, look.head === 'skin' ? c.skin : c.body);
  for (const p of look.helm) HEAD[p](ctx, j, c, t);
  if (look.off) OFF[look.off](ctx, j.armB.ex, j.armB.ey, c);
  if (extra && extra.carry) circle(ctx, j.armB.ex + 1, j.armB.ey, 3.4, '#ffd34d');
  strokeLimb(ctx, j.armF, b.limb * 0.92, c.body);
  if (look.hand) {
    ctx.save();
    ctx.translate(j.armF.ex, j.armF.ey);
    ctx.rotate(-j.armF.a2);
    HAND[look.hand](ctx, c, j);
    ctx.restore();
  }
  ctx.restore();
}
