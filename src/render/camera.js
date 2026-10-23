// Side-on camera: horizontal pan with fling, world-to-screen mapping, screen shake, and the minimap.

export const VIEW_HEIGHT = 380; // world units visible top to bottom

export function createCamera() {
  return { x: 0, vx: 0, w: 1, h: 1, scale: 1, groundY: 0, viewW: 1, shake: 0, shakeX: 0, shakeY: 0, dragging: false };
}

export function resizeCamera(cam, w, h) {
  cam.w = w;
  cam.h = h;
  cam.scale = h / VIEW_HEIGHT;
  cam.groundY = Math.round(h * 0.72);
  cam.viewW = w / cam.scale;
}

export function clampCamera(cam, worldW) {
  const min = -30;
  const max = Math.max(min, worldW + 30 - cam.viewW);
  if (cam.x < min) { cam.x = min; cam.vx = 0; }
  if (cam.x > max) { cam.x = max; cam.vx = 0; }
}

export function centerOn(cam, x, worldW) {
  cam.x = x - cam.viewW / 2;
  cam.vx = 0;
  clampCamera(cam, worldW);
}

export function updateCamera(cam, dt, worldW, reducedMotion) {
  if (!cam.dragging && cam.vx) {
    cam.x += cam.vx * dt;
    cam.vx *= Math.exp(-4.5 * dt);
    if (Math.abs(cam.vx) < 5) cam.vx = 0;
  }
  clampCamera(cam, worldW);
  if (cam.shake > 0 && !reducedMotion) {
    cam.shake = Math.max(0, cam.shake - dt * 18);
    cam.shakeX = (Math.random() - 0.5) * cam.shake * 2;
    cam.shakeY = (Math.random() - 0.5) * cam.shake * 2;
  } else {
    cam.shake = 0;
    cam.shakeX = cam.shakeY = 0;
  }
}

export function sx(cam, wx) { return (wx - cam.x) * cam.scale + cam.shakeX; }
export function toWorldX(cam, screenX) { return screenX / cam.scale + cam.x; }

/** Minimap: the lane as a strip, both bases, every unit as a dot, and the view box. */
export function drawMinimap(ctx, w, h, world, cam, factions) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(12,10,24,0.72)';
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 6); ctx.fill();
  const k = (w - 8) / world.width;
  const mx = (x) => 4 + x * k;
  const mid = h * 0.55;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(4, mid - 1, w - 8, 2);
  for (const id of ['kingdom', 'horde']) {
    const b = world.buildings[id];
    ctx.fillStyle = factions[id].colors.dot;
    ctx.fillRect(mx(b.x) - 3, mid - 9, 6, 12);
  }
  for (const u of world.units) {
    if (u.state === 'dead' || u.inside) continue;
    ctx.fillStyle = factions[u.faction].colors.dot;
    const y = mid - 2 + (u.type === 'worker' ? 4 : 0) + u.z * 0.12;
    ctx.fillRect(mx(u.x) - 1, y, 2, 2);
  }
  ctx.strokeStyle = 'rgba(255,236,190,0.9)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mx(cam.x), 1.5, cam.viewW * k, h - 3);
}

export function minimapToWorld(px, w, world) {
  const k = (w - 8) / world.width;
  return (px - 4) / k;
}
