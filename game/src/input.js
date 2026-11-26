// input.js — keyboard, mouse and touch, reduced to one small state object.
// Steering: Arrow keys / A D (or mouse move / touch drag).
// Pitch: Arrow Up/Down / W S. Throttle: Shift up, Control down, or hold mouse.
// Enter/Space starts, P pauses, R restarts, M mutes.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set(); // edge-triggered keys, consumed by the game
  const pointer = { active: false, x: 0, y: 0, down: false };

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }
  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 };
  }
  function onPointerMove(e) {
    const p = pointerPos(e);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.active = true;
  }
  function onPointerDown(e) {
    const p = pointerPos(e);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.active = true;
    pointer.down = true;
    pressed.add('PointerDown');
  }
  function onPointerUp() {
    pointer.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

  function axis() {
    let steer = 0;
    let pitch = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) steer -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) steer += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) pitch += 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) pitch -= 1;
    // Mouse / touch steering: offset from centre, with a dead zone.
    if (pointer.active && steer === 0 && pitch === 0) {
      const sx = pointer.x * 2.4;
      const sy = pointer.y * 2.4;
      if (Math.abs(sx) > 0.12) steer = Math.max(-1, Math.min(1, sx));
      if (Math.abs(sy) > 0.12) pitch = Math.max(-1, Math.min(1, -sy));
    }
    let throttle = 0;
    if (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Equal') || keys.has('NumpadAdd')) throttle += 1;
    if (keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('Minus') || keys.has('NumpadSubtract')) throttle -= 1;
    if (pointer.down) throttle += 1;
    return { steer, pitch, throttle };
  }

  return {
    axis,
    // True once when the key/button goes down; the game consumes it.
    wasPressed(code) {
      if (pressed.has(code)) {
        pressed.delete(code);
        return true;
      }
      return false;
    },
    clearPressed() {
      pressed.clear();
    },
    get pointerDown() {
      return pointer.down;
    },
  };
}
