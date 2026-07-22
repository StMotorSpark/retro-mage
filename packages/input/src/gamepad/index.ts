import { BUTTON_BITS } from '../buttons.js';
import { createEmptyInputState, type InputState } from '../types.js';

/**
 * Detects a connected gamepad and maps left-stick (move), right-stick (look),
 * and standard Gamepad API buttons into the normalized InputState shape.
 * Polls navigator.getGamepads() on each getState() call.
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

const GAMEPAD_BUTTON_MAP: Record<number, number> = {
  // Face buttons (0-3)
  0: BUTTON_BITS.face1,
  1: BUTTON_BITS.face2,
  2: BUTTON_BITS.face3,
  3: BUTTON_BITS.face4,
  // Triggers / shoulder buttons (4-7: LB, RB, LT, RT)
  4: BUTTON_BITS.trigger1,
  5: BUTTON_BITS.trigger2,
  6: BUTTON_BITS.trigger3,
  7: BUTTON_BITS.trigger4,
  // D-pad (12-15: Up, Down, Left, Right)
  12: BUTTON_BITS.dpadUp,
  13: BUTTON_BITS.dpadDown,
  14: BUTTON_BITS.dpadLeft,
  15: BUTTON_BITS.dpadRight,
};

export function createGamepadSource(): GamepadSource {
  let disposed = false;
  let prevButtons = 0;

  function getActivePad(): Gamepad | null {
    if (disposed) return null;
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
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
      if (!pad) {
        prevButtons = 0;
        return state;
      }

      state.move.x = applyDeadzone(pad.axes[0] ?? 0);
      state.move.y = applyDeadzone(pad.axes[1] ?? 0);

      // Right stick X is inverted relative to expected turn direction on
      // standard gamepads — negate so pushing right turns the camera right.
      state.look.x = -applyDeadzone(pad.axes[2] ?? 0);
      state.look.y = applyDeadzone(pad.axes[3] ?? 0);

      let currentButtons = 0;
      pad.buttons.forEach((button, index) => {
        const bit = GAMEPAD_BUTTON_MAP[index];
        if (bit !== undefined && (button.pressed || button.value > 0.5)) {
          currentButtons |= bit;
        }
      });

      state.buttons = currentButtons;
      state.buttonsPressed = currentButtons & ~prevButtons;
      prevButtons = currentButtons;

      return state;
    },

    dispose(): void {
      disposed = true;
      prevButtons = 0;
    },
  };
}
