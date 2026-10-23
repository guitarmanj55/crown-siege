// Skeleton rig: pose keyframes (idle, walk, attack, mine, die) and forward kinematics.
// Angles are radians from straight down; positive swings toward the way the figure faces.
// Figures are drawn facing right in local space and mirrored for facing left.
import { ATTACK_ANIM, HIT_AT } from '../sim/combat.js';

export const BASE = { thigh: 9.5, shin: 9.5, torso: 14, upperArm: 8, foreArm: 8, head: 5.6, neck: 1.6, limb: 5.2, trunk: 9.5 };

/** Body dimensions for a look (multipliers on BASE). */
export function bodyFor(look) {
  const m = look.build || {};
  const legs = m.legs ?? 1;
  const arms = m.arms ?? 1;
  return {
    thigh: BASE.thigh * legs, shin: BASE.shin * legs,
    torso: BASE.torso * (m.torso ?? 1),
    upperArm: BASE.upperArm * arms, foreArm: BASE.foreArm * arms,
    head: BASE.head * (m.head ?? 1), neck: BASE.neck,
    limb: BASE.limb * (m.limb ?? 1), trunk: BASE.trunk * (m.trunk ?? 1),
  };
}

const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => k * k * (3 - 2 * k);

function idle(t, look) {
  const br = Math.sin(t * 2.2) * 0.04;
  return {
    bob: Math.sin(t * 2.2) * 0.5, lean: (look.lean ?? 0) + br, head: -br,
    armF: [0.25, 0.55], armB: [-0.15, 0.45], legF: [0.14, -0.06], legB: [-0.14, -0.06],
  };
}

function walk(phase, look) {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  return {
    bob: -Math.abs(c) * 1.6, lean: (look.lean ?? 0) + 0.1, head: -0.05,
    armF: [0.15 - 0.45 * s, 0.55], armB: [0.45 * s - 0.05, 0.5],
    legF: [0.55 * s, -0.35 * (1 + c)], legB: [-0.55 * s, -0.35 * (1 - c)],
  };
}

// Overhead chop: wind up, strike at HIT_AT, recover.
function swing(p, look) {
  const hit = HIT_AT / ATTACK_ANIM;
  let sh, el, lean;
  if (p < hit * 0.8) {
    const k = ease(p / (hit * 0.8));
    sh = lerp(0.25, -2.5, k); el = lerp(0.5, 0.9, k); lean = lerp(0, -0.12, k);
  } else if (p < hit + 0.12) {
    const k = ease((p - hit * 0.8) / (hit * 0.2 + 0.12));
    sh = lerp(-2.5, 1.35, k); el = lerp(0.9, 0.15, k); lean = lerp(-0.12, 0.28, k);
  } else {
    const k = ease((p - hit - 0.12) / (1 - hit - 0.12));
    sh = lerp(1.35, 0.25, k); el = lerp(0.15, 0.55, k); lean = lerp(0.28, 0, k);
  }
  return {
    bob: -1, lean: (look.lean ?? 0) + lean, head: -lean * 0.5,
    armF: [sh, el], armB: [0.5 + lean, 0.9], legF: [0.42, -0.15], legB: [-0.38, -0.12],
  };
}

// Bow: arm out, string drawn to the cheek, loose at HIT_AT.
function bow(p, look) {
  const hit = HIT_AT / ATTACK_ANIM;
  const draw = p < hit ? ease(p / hit) : Math.max(0, 1 - (p - hit) * 4);
  return {
    bob: 0, lean: (look.lean ?? 0) - 0.05, head: 0.05,
    armF: [1.5, 0.05], armB: [lerp(1.3, 1.65, draw), lerp(1.1, 2.6, draw)],
    legF: [0.3, -0.05], legB: [-0.3, -0.05], draw,
  };
}

// Overarm throw: arm back, whip forward at HIT_AT.
function toss(p, look) {
  const hit = HIT_AT / ATTACK_ANIM;
  let sh, lean;
  if (p < hit) { const k = ease(p / hit); sh = lerp(0.3, -2.2, k); lean = lerp(0, -0.2, k); }
  else if (p < hit + 0.15) { const k = ease((p - hit) / 0.15); sh = lerp(-2.2, 2.0, k); lean = lerp(-0.2, 0.3, k); }
  else { const k = ease((p - hit - 0.15) / (1 - hit - 0.15)); sh = lerp(2.0, 0.3, k); lean = lerp(0.3, 0, k); }
  return {
    bob: -1, lean: (look.lean ?? 0) + lean, head: -lean * 0.4,
    armF: [sh, 0.3], armB: [1.2 - lean, 0.4], legF: [0.45, -0.1], legB: [-0.4, -0.15],
    thrown: p >= hit && p < 0.95,
  };
}

/** Pose for a unit at time t (seconds, render clock). */
export function poseFor(u, look, t) {
  let pose;
  if (u.state === 'attack' && u.atkT >= 0) {
    const p = Math.min(1, u.atkT / ATTACK_ANIM);
    pose = look.attack === 'bow' ? bow(p, look) : look.attack === 'throw' ? toss(p, look) : swing(p, look);
  } else if (u.state === 'mine') {
    pose = swing(((u.workT + u.jitter) % 1.0) / 1.0, look);
  } else if (u.state === 'walk') {
    pose = walk(u.walk, look);
  } else {
    pose = idle(t + u.jitter * 7, look);
  }
  if (u.hitT > 0) pose.lean -= 0.18;
  if (u.state === 'dead') {
    const k = ease(Math.min(1, u.deadT / 0.55));
    pose = idle(0, look);
    pose.rot = -1.45 * k;
    pose.armF = [lerp(0.25, 2.6, k), 0.2];
    pose.armB = [lerp(-0.15, 2.2, k), 0.3];
    pose.legF = [lerp(0.14, 0.5, k), -0.1];
    pose.alpha = u.deadT > 1.6 ? Math.max(0, 1 - (u.deadT - 1.6) / 0.9) : 1;
  }
  return pose;
}

function limb(sx, sy, a1, l1, a2, l2) {
  const mx = sx + Math.sin(a1) * l1;
  const my = sy + Math.cos(a1) * l1;
  const b = a1 + a2;
  return { sx, sy, mx, my, ex: mx + Math.sin(b) * l2, ey: my + Math.cos(b) * l2, a1, a2: b };
}

/** Joint positions in local space (feet at the origin, y up is negative). */
export function solve(pose, b) {
  const hipY = -(b.thigh + b.shin) * 0.97 + (pose.bob || 0);
  const lean = pose.lean || 0;
  const neckX = Math.sin(lean) * b.torso;
  const neckY = hipY - Math.cos(lean) * b.torso;
  const ha = lean + (pose.head || 0);
  const hd = b.head + b.neck;
  const shX = neckX - Math.sin(lean) * 2;
  const shY = neckY + Math.cos(lean) * 2;
  return {
    hipX: 0, hipY, neckX, neckY, lean,
    headX: neckX + Math.sin(ha) * hd, headY: neckY - Math.cos(ha) * hd, headR: b.head, headA: ha,
    armF: limb(shX, shY, pose.armF[0], b.upperArm, pose.armF[1], b.foreArm),
    armB: limb(shX, shY, pose.armB[0], b.upperArm, pose.armB[1], b.foreArm),
    legF: limb(0, hipY, pose.legF[0], b.thigh, pose.legF[1], b.shin),
    legB: limb(0, hipY, pose.legB[0], b.thigh, pose.legB[1], b.shin),
    pose,
  };
}

export function strokeLimb(ctx, L, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(L.sx, L.sy);
  ctx.lineTo(L.mx, L.my);
  ctx.lineTo(L.ex, L.ey);
  ctx.stroke();
}
