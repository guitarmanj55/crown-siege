// Touch and mouse: drag to pan (with fling), tap the minimap to jump, and spell aiming
// (while aiming, the finger moves the strike marker and lifting it casts).
import { toWorldX, centerOn, minimapToWorld } from '../render/camera.js';

export function attachInput({ canvas, minimap, cam, getWorld, isActive, aim, onCast, onUnlock }) {
  let drag = null;

  canvas.addEventListener('pointerdown', (e) => {
    onUnlock();
    if (!isActive()) return;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, t: performance.now(), vx: 0, lastT: performance.now(), moved: 0 };
    cam.dragging = true;
    cam.vx = 0;
    if (aim.active) aim.x = toWorldX(cam, e.clientX);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (aim.active && e.pointerType === 'mouse' && !drag) aim.x = toWorldX(cam, e.clientX);
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    drag.moved += Math.abs(dx) + Math.abs(e.clientY - drag.y);
    const now = performance.now();
    if (aim.active) {
      aim.x = toWorldX(cam, e.clientX);
    } else {
      cam.x -= dx / cam.scale;
      const dt = Math.max(1, now - drag.lastT) / 1000;
      drag.vx = drag.vx * 0.6 + (-dx / cam.scale / dt) * 0.4;
    }
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.lastT = now;
  });

  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    cam.dragging = false;
    if (aim.active) {
      onCast(toWorldX(cam, e.clientX));
    } else if (performance.now() - drag.lastT < 80) {
      cam.vx = Math.max(-2500, Math.min(2500, drag.vx));
    }
    drag = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', (e) => { if (drag && e.pointerId === drag.id) { drag = null; cam.dragging = false; } });

  const jump = (e) => {
    const r = minimap.getBoundingClientRect();
    centerOn(cam, minimapToWorld(e.clientX - r.left, r.width, getWorld()), getWorld().width);
  };
  let mmDown = false;
  minimap.addEventListener('pointerdown', (e) => { onUnlock(); e.preventDefault(); mmDown = true; try { minimap.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ } jump(e); });
  minimap.addEventListener('pointermove', (e) => { if (mmDown) jump(e); });
  minimap.addEventListener('pointerup', () => { mmDown = false; });
  minimap.addEventListener('pointercancel', () => { mmDown = false; });

  // Stop iOS from turning a double tap or pinch into a zoom.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
}
