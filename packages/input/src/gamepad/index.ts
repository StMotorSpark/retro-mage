import { createEmptyInputState, type InputState } from '../types.js';

/**
 * Detects a connected gamepad and maps left-stick + primary buttons into
 * the placeholder InputState shape. Polls navigator.getGamepads() on each
 * getState() call — no internal rAF loop, callers drive the poll rate.
 */
export interface GamepadSource {
  isConnected(): boolean;
  getState(): InputState;
  dispose(): void;
}

const STICK_DEADZONE = 0.15;

function applyDeadzone(value: number): number {
  return Math.abs(value) < STICK_DEADZONE ? 0 : value;
}

export function createGamepadSource(): GamepadSource {
  let disposed = false;

  function getActivePad(): Gamepad | null {
    if (disposed) return null;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (pad) return pad;
    }
    return null;
  }

  return {
    isConnected(): boolean {
      return getActivePad() !== null;
    },

    getState(): InputState {
      const pad = getActivePad();
      const state = createEmptyInputState();
      if (!pad) return state;

      state.move.x = applyDeadzone(pad.axes[0] ?? 0);
      state.move.y = applyDeadzone(pad.axes[1] ?? 0);

      pad.buttons.forEach((button, index) => {
        state.actions[`button${index}`] = button.pressed;
      });

      return state;
    },

    dispose(): void {
      disposed = true;
    },
  };
}
