import { createEmptyInputState, type InputState } from '../types.js';

/**
 * Renders a minimal virtual thumbstick overlay (plain DOM/CSS, not
 * canvas-drawn) into a provided container element and maps touch drag
 * into the placeholder InputState shape. Functional only — no visual
 * polish.
 */
export interface TouchSource {
  getState(): InputState;
  dispose(): void;
}

const BASE_SIZE = 96;
const KNOB_SIZE = 40;
const MAX_RADIUS = (BASE_SIZE - KNOB_SIZE) / 2;

export function createTouchSource(container: HTMLElement): TouchSource {
  const state = createEmptyInputState();

  const base = document.createElement('div');
  base.style.position = 'absolute';
  base.style.left = '24px';
  base.style.bottom = '24px';
  base.style.width = `${BASE_SIZE}px`;
  base.style.height = `${BASE_SIZE}px`;
  base.style.borderRadius = '50%';
  base.style.background = 'rgba(255, 255, 255, 0.15)';
  base.style.touchAction = 'none';

  const knob = document.createElement('div');
  knob.style.position = 'absolute';
  knob.style.left = `${(BASE_SIZE - KNOB_SIZE) / 2}px`;
  knob.style.top = `${(BASE_SIZE - KNOB_SIZE) / 2}px`;
  knob.style.width = `${KNOB_SIZE}px`;
  knob.style.height = `${KNOB_SIZE}px`;
  knob.style.borderRadius = '50%';
  knob.style.background = 'rgba(255, 255, 255, 0.4)';

  base.appendChild(knob);
  container.appendChild(base);

  let activeTouchId: number | null = null;
  let originX = 0;
  let originY = 0;

  function setKnobOffset(dx: number, dy: number): void {
    knob.style.left = `${(BASE_SIZE - KNOB_SIZE) / 2 + dx}px`;
    knob.style.top = `${(BASE_SIZE - KNOB_SIZE) / 2 + dy}px`;
  }

  function resetKnob(): void {
    setKnobOffset(0, 0);
    state.move.x = 0;
    state.move.y = 0;
  }

  function handleTouchStart(event: TouchEvent): void {
    if (activeTouchId !== null) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    activeTouchId = touch.identifier;
    originX = touch.clientX;
    originY = touch.clientY;
  }

  function handleTouchMove(event: TouchEvent): void {
    if (activeTouchId === null) return;
    const touch = Array.from(event.changedTouches).find(
      (t) => t.identifier === activeTouchId
    );
    if (!touch) return;

    let dx = touch.clientX - originX;
    let dy = touch.clientY - originY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > MAX_RADIUS) {
      const scale = MAX_RADIUS / distance;
      dx *= scale;
      dy *= scale;
    }

    setKnobOffset(dx, dy);
    state.move.x = dx / MAX_RADIUS;
    state.move.y = dy / MAX_RADIUS;
  }

  function handleTouchEnd(event: TouchEvent): void {
    const touch = Array.from(event.changedTouches).find(
      (t) => t.identifier === activeTouchId
    );
    if (!touch) return;
    activeTouchId = null;
    resetKnob();
  }

  base.addEventListener('touchstart', handleTouchStart);
  base.addEventListener('touchmove', handleTouchMove);
  base.addEventListener('touchend', handleTouchEnd);
  base.addEventListener('touchcancel', handleTouchEnd);

  return {
    getState(): InputState {
      return state;
    },

    dispose(): void {
      base.removeEventListener('touchstart', handleTouchStart);
      base.removeEventListener('touchmove', handleTouchMove);
      base.removeEventListener('touchend', handleTouchEnd);
      base.removeEventListener('touchcancel', handleTouchEnd);
      base.remove();
    },
  };
}
