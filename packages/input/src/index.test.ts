// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { BUTTON_BITS, createEmptyInputState, createInputSource } from './index.js';
import { createGamepadSource } from './gamepad/index.js';
import { createTouchSource } from './touch/index.js';

describe('input schema & constants', () => {
  it('exports bit constants matching docs/architecture/input-schema.md', () => {
    expect(BUTTON_BITS.face1).toBe(1 << 0);
    expect(BUTTON_BITS.face2).toBe(1 << 1);
    expect(BUTTON_BITS.face3).toBe(1 << 2);
    expect(BUTTON_BITS.face4).toBe(1 << 3);

    expect(BUTTON_BITS.dpadUp).toBe(1 << 4);
    expect(BUTTON_BITS.dpadDown).toBe(1 << 5);
    expect(BUTTON_BITS.dpadLeft).toBe(1 << 6);
    expect(BUTTON_BITS.dpadRight).toBe(1 << 7);

    expect(BUTTON_BITS.trigger1).toBe(1 << 8);
    expect(BUTTON_BITS.trigger2).toBe(1 << 9);
    expect(BUTTON_BITS.trigger3).toBe(1 << 10);
    expect(BUTTON_BITS.trigger4).toBe(1 << 11);
  });

  it('creates empty input state with correct shape and default values', () => {
    const state = createEmptyInputState();
    expect(state).toEqual({
      move: { x: 0, y: 0 },
      look: { x: 0, y: 0 },
      vertical: 0,
      buttons: 0,
      buttonsPressed: 0,
    });
  });
});

describe('touch source & buttonsPressed edge triggering', () => {
  it('renders 12 buttons and tracks edge-triggered buttonsPressed', () => {
    const container = document.createElement('div');
    const touch = createTouchSource(container);

    const initial = touch.getState();
    expect(initial.buttons).toBe(0);
    expect(initial.buttonsPressed).toBe(0);

    const btnFace1 = container.querySelector<HTMLButtonElement>('button[data-slot="face1"]');
    expect(btnFace1).not.toBeNull();
    expect(btnFace1?.textContent).toBe('F1');

    // Simulate pointerdown on face1 button
    btnFace1?.dispatchEvent(new Event('pointerdown'));

    // First frame after press: bit set in buttons AND buttonsPressed
    const frame1 = touch.getState();
    expect(frame1.buttons & BUTTON_BITS.face1).not.toBe(0);
    expect(frame1.buttonsPressed & BUTTON_BITS.face1).not.toBe(0);

    // Second consecutive held frame: bit set in buttons, BUT cleared in buttonsPressed
    const frame2 = touch.getState();
    expect(frame2.buttons & BUTTON_BITS.face1).not.toBe(0);
    expect(frame2.buttonsPressed & BUTTON_BITS.face1).toBe(0);

    // Release button
    btnFace1?.dispatchEvent(new Event('pointerup'));

    // Third frame after release: bit cleared in both
    const frame3 = touch.getState();
    expect(frame3.buttons & BUTTON_BITS.face1).toBe(0);
    expect(frame3.buttonsPressed & BUTTON_BITS.face1).toBe(0);

    touch.dispose();
  });

  it('renders all 12 button slots in touch overlay', () => {
    const container = document.createElement('div');
    const touch = createTouchSource(container);

    const slots = [
      'face1', 'face2', 'face3', 'face4',
      'dpadUp', 'dpadDown', 'dpadLeft', 'dpadRight',
      'trigger1', 'trigger2', 'trigger3', 'trigger4',
    ];

    for (const slot of slots) {
      const btn = container.querySelector(`button[data-slot="${slot}"]`);
      expect(btn).not.toBeNull();
    }

    touch.dispose();
  });
});

describe('gamepad source edge triggering', () => {
  it('computes buttonsPressed correctly on state polling', () => {
    const gamepadSource = createGamepadSource();

    // Mock no gamepad connected
    const state1 = gamepadSource.getState();
    expect(state1.buttons).toBe(0);
    expect(state1.buttonsPressed).toBe(0);

    gamepadSource.dispose();
  });
});

describe('unified input source', () => {
  it('returns valid state when instantiated', () => {
    const container = document.createElement('div');
    const input = createInputSource(container);

    const state = input.getState();
    expect(state).toHaveProperty('move');
    expect(state).toHaveProperty('look');
    expect(state).toHaveProperty('vertical');
    expect(state).toHaveProperty('buttons');
    expect(state).toHaveProperty('buttonsPressed');

    input.dispose();
  });
});
