import { BUTTON_BITS, type ButtonSlot } from '../buttons.js';
import { createEmptyInputState, type InputState } from '../types.js';

export interface TouchSource {
  getState(): InputState;
  dispose(): void;
}

const MOVE_BASE_SIZE = 96;
const MOVE_KNOB_SIZE = 40;
const MOVE_MAX_RADIUS = (MOVE_BASE_SIZE - MOVE_KNOB_SIZE) / 2;

const LOOK_MAX_RADIUS = 60;
// Consumed-once per-frame swipe deltas are tiny in raw pixels compared to a
// held stick's continuous -1..1 range, so boost sensitivity to feel
// comparable in the shared `look` field's consumer (examples/demo's
// LOOK_SPEED * dt integration).
const TOUCH_LOOK_SENSITIVITY = 300;

interface ButtonConfig {
  slot: ButtonSlot;
  label: string;
  className: string;
}

const BUTTON_CONFIGS: ButtonConfig[] = [
  // Face buttons
  { slot: 'face1', label: 'F1', className: 'retro-input-btn-face1' },
  { slot: 'face2', label: 'F2', className: 'retro-input-btn-face2' },
  { slot: 'face3', label: 'F3', className: 'retro-input-btn-face3' },
  { slot: 'face4', label: 'F4', className: 'retro-input-btn-face4' },
  // D-Pad buttons
  { slot: 'dpadUp', label: 'D-Up', className: 'retro-input-btn-dpad-up' },
  { slot: 'dpadDown', label: 'D-Down', className: 'retro-input-btn-dpad-down' },
  { slot: 'dpadLeft', label: 'D-Left', className: 'retro-input-btn-dpad-left' },
  { slot: 'dpadRight', label: 'D-Right', className: 'retro-input-btn-dpad-right' },
  // Triggers
  { slot: 'trigger1', label: 'T1', className: 'retro-input-btn-trigger1' },
  { slot: 'trigger2', label: 'T2', className: 'retro-input-btn-trigger2' },
  { slot: 'trigger3', label: 'T3', className: 'retro-input-btn-trigger3' },
  { slot: 'trigger4', label: 'T4', className: 'retro-input-btn-trigger4' },
];

export function createTouchSource(container: HTMLElement): TouchSource {
  const state = createEmptyInputState();
  let prevButtons = 0;
  let activeButtonsMask = 0;

  // Root wrapper
  const rootElement = document.createElement('div');
  rootElement.className = 'retro-input-overlay';
  rootElement.style.position = 'absolute';
  rootElement.style.top = '0';
  rootElement.style.left = '0';
  rootElement.style.width = '100%';
  rootElement.style.height = '100%';
  rootElement.style.pointerEvents = 'none';
  rootElement.style.userSelect = 'none';

  // --- Move Zone (Virtual Thumbstick, Left Side) ---
  const moveZone = document.createElement('div');
  moveZone.className = 'retro-input-move-zone';
  moveZone.style.position = 'absolute';
  moveZone.style.left = '24px';
  moveZone.style.bottom = '24px';
  moveZone.style.width = `${MOVE_BASE_SIZE}px`;
  moveZone.style.height = `${MOVE_BASE_SIZE}px`;
  moveZone.style.borderRadius = '50%';
  moveZone.style.background = 'rgba(255, 255, 255, 0.15)';
  moveZone.style.touchAction = 'none';
  moveZone.style.pointerEvents = 'auto';

  const moveKnob = document.createElement('div');
  moveKnob.className = 'retro-input-move-knob';
  moveKnob.style.position = 'absolute';
  moveKnob.style.left = `${(MOVE_BASE_SIZE - MOVE_KNOB_SIZE) / 2}px`;
  moveKnob.style.top = `${(MOVE_BASE_SIZE - MOVE_KNOB_SIZE) / 2}px`;
  moveKnob.style.width = `${MOVE_KNOB_SIZE}px`;
  moveKnob.style.height = `${MOVE_KNOB_SIZE}px`;
  moveKnob.style.borderRadius = '50%';
  moveKnob.style.background = 'rgba(255, 255, 255, 0.4)';

  moveZone.appendChild(moveKnob);
  rootElement.appendChild(moveZone);

  let activeMoveTouchId: number | null = null;
  let moveOriginX = 0;
  let moveOriginY = 0;

  function setMoveKnobOffset(dx: number, dy: number): void {
    moveKnob.style.left = `${(MOVE_BASE_SIZE - MOVE_KNOB_SIZE) / 2 + dx}px`;
    moveKnob.style.top = `${(MOVE_BASE_SIZE - MOVE_KNOB_SIZE) / 2 + dy}px`;
  }

  function resetMove(): void {
    setMoveKnobOffset(0, 0);
    state.move.x = 0;
    state.move.y = 0;
  }

  function handleMoveTouchStart(event: TouchEvent): void {
    if (activeMoveTouchId !== null) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    activeMoveTouchId = touch.identifier;
    moveOriginX = touch.clientX;
    moveOriginY = touch.clientY;
  }

  function handleMoveTouchMove(event: TouchEvent): void {
    if (activeMoveTouchId === null) return;
    const touch = Array.from(event.changedTouches).find((t) => t.identifier === activeMoveTouchId);
    if (!touch) return;

    let dx = touch.clientX - moveOriginX;
    let dy = touch.clientY - moveOriginY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > MOVE_MAX_RADIUS) {
      const scale = MOVE_MAX_RADIUS / distance;
      dx *= scale;
      dy *= scale;
    }

    setMoveKnobOffset(dx, dy);
    state.move.x = dx / MOVE_MAX_RADIUS;
    state.move.y = dy / MOVE_MAX_RADIUS;
  }

  function handleMoveTouchEnd(event: TouchEvent): void {
    const touch = Array.from(event.changedTouches).find((t) => t.identifier === activeMoveTouchId);
    if (!touch) return;
    activeMoveTouchId = null;
    resetMove();
  }

  moveZone.addEventListener('touchstart', handleMoveTouchStart);
  moveZone.addEventListener('touchmove', handleMoveTouchMove);
  moveZone.addEventListener('touchend', handleMoveTouchEnd);
  moveZone.addEventListener('touchcancel', handleMoveTouchEnd);

  // --- Look Zone (Swipe Area, Center/Right Side) ---
  const lookZone = document.createElement('div');
  lookZone.className = 'retro-input-look-zone';
  lookZone.style.position = 'absolute';
  lookZone.style.top = '0';
  lookZone.style.right = '0';
  lookZone.style.width = '60%';
  lookZone.style.height = '60%';
  lookZone.style.touchAction = 'none';
  lookZone.style.pointerEvents = 'auto';

  rootElement.appendChild(lookZone);

  let activeLookTouchId: number | null = null;
  let lookLastX = 0;
  let lookLastY = 0;
  let pendingLookDx = 0;
  let pendingLookDy = 0;

  function handleLookTouchStart(event: TouchEvent): void {
    if (activeLookTouchId !== null) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    activeLookTouchId = touch.identifier;
    lookLastX = touch.clientX;
    lookLastY = touch.clientY;
  }

  function handleLookTouchMove(event: TouchEvent): void {
    if (activeLookTouchId === null) return;
    const touch = Array.from(event.changedTouches).find((t) => t.identifier === activeLookTouchId);
    if (!touch) return;

    let dx = touch.clientX - lookLastX;
    let dy = touch.clientY - lookLastY;
    lookLastX = touch.clientX;
    lookLastY = touch.clientY;

    // Cap a single event's delta so a fast flick can't spike the look value.
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > LOOK_MAX_RADIUS) {
      const scale = LOOK_MAX_RADIUS / distance;
      dx *= scale;
      dy *= scale;
    }

    pendingLookDx += dx;
    pendingLookDy += dy;
  }

  function handleLookTouchEnd(event: TouchEvent): void {
    const touch = Array.from(event.changedTouches).find((t) => t.identifier === activeLookTouchId);
    if (!touch) return;
    activeLookTouchId = null;
  }

  lookZone.addEventListener('touchstart', handleLookTouchStart);
  lookZone.addEventListener('touchmove', handleLookTouchMove);
  lookZone.addEventListener('touchend', handleLookTouchEnd);
  lookZone.addEventListener('touchcancel', handleLookTouchEnd);

  // --- Buttons Overlay (12 buttons) ---
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'retro-input-buttons-container';
  buttonsContainer.style.position = 'absolute';
  buttonsContainer.style.right = '24px';
  buttonsContainer.style.bottom = '24px';
  buttonsContainer.style.display = 'grid';
  buttonsContainer.style.gridTemplateColumns = 'repeat(4, 40px)';
  buttonsContainer.style.gap = '8px';
  buttonsContainer.style.pointerEvents = 'auto';

  BUTTON_CONFIGS.forEach((config) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `retro-input-btn ${config.className}`;
    btn.dataset.slot = config.slot;
    btn.textContent = config.label;
    btn.style.width = '40px';
    btn.style.height = '40px';
    btn.style.borderRadius = '6px';
    btn.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    btn.style.background = 'rgba(0, 0, 0, 0.4)';
    btn.style.color = '#fff';
    btn.style.fontSize = '11px';
    btn.style.fontWeight = 'bold';
    btn.style.touchAction = 'none';

    const bit = BUTTON_BITS[config.slot];

    const pressHandler = (e: Event): void => {
      e.preventDefault();
      activeButtonsMask |= bit;
    };

    const releaseHandler = (e: Event): void => {
      e.preventDefault();
      activeButtonsMask &= ~bit;
    };

    btn.addEventListener('pointerdown', pressHandler);
    btn.addEventListener('pointerup', releaseHandler);
    btn.addEventListener('pointercancel', releaseHandler);

    btn.addEventListener('touchstart', pressHandler);
    btn.addEventListener('touchend', releaseHandler);
    btn.addEventListener('touchcancel', releaseHandler);

    buttonsContainer.appendChild(btn);
  });

  rootElement.appendChild(buttonsContainer);
  container.appendChild(rootElement);

  return {
    getState(): InputState {
      state.buttons = activeButtonsMask;
      state.buttonsPressed = activeButtonsMask & ~prevButtons;
      prevButtons = activeButtonsMask;

      // Drain this frame's accumulated look delta — consumed-once so the
      // camera stops turning the instant the finger stops moving, even if
      // still held down (drag-delta feel, not a persistent stick offset).
      // Y is inverted relative to raw swipe direction: swiping up should
      // look down (natural drag-to-look), not up.
      const lookX = (pendingLookDx / LOOK_MAX_RADIUS) * TOUCH_LOOK_SENSITIVITY;
      const lookY = -(pendingLookDy / LOOK_MAX_RADIUS) * TOUCH_LOOK_SENSITIVITY;
      pendingLookDx = 0;
      pendingLookDy = 0;

      return {
        move: { ...state.move },
        look: { x: lookX, y: lookY },
        vertical: 0,
        buttons: state.buttons,
        buttonsPressed: state.buttonsPressed,
      };
    },

    dispose(): void {
      moveZone.removeEventListener('touchstart', handleMoveTouchStart);
      moveZone.removeEventListener('touchmove', handleMoveTouchMove);
      moveZone.removeEventListener('touchend', handleMoveTouchEnd);
      moveZone.removeEventListener('touchcancel', handleMoveTouchEnd);

      lookZone.removeEventListener('touchstart', handleLookTouchStart);
      lookZone.removeEventListener('touchmove', handleLookTouchMove);
      lookZone.removeEventListener('touchend', handleLookTouchEnd);
      lookZone.removeEventListener('touchcancel', handleLookTouchEnd);

      rootElement.remove();
      prevButtons = 0;
      activeButtonsMask = 0;
      pendingLookDx = 0;
      pendingLookDy = 0;
    },
  };
}
