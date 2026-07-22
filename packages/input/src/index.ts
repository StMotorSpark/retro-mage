import { createGamepadSource } from './gamepad/index.js';
import { createTouchSource, type TouchSourceOptions } from './touch/index.js';
import { createEmptyInputState, type InputState } from './types.js';

export { BUTTON_BITS, type ButtonSlot, FACE1, FACE2, FACE3, FACE4, DPAD_UP, DPAD_DOWN, DPAD_LEFT, DPAD_RIGHT, TRIGGER1, TRIGGER2, TRIGGER3, TRIGGER4 } from './buttons.js';
export { createEmptyInputState, type InputState } from './types.js';
export type { TouchSourceOptions } from './touch/index.js';

export interface InputSource {
  getState(): InputState;
  dispose(): void;
}

export interface InputSourceOptions {
  touch?: TouchSourceOptions;
}

/**
 * Unified input source: merges whichever device is active into a single
 * InputState. Gamepad takes precedence if connected; otherwise falls back
 * to the touch overlay rendered into `container`.
 *
 * This package only produces InputState — it does not consume or
 * integrate with engine-core or render.
 */
export function createInputSource(container: HTMLElement, options: InputSourceOptions = {}): InputSource {
  const gamepad = createGamepadSource();
  const touch = createTouchSource(container, options.touch);

  return {
    getState(): InputState {
      if (gamepad.isConnected()) {
        return gamepad.getState();
      }
      const touchState = touch.getState();
      return touchState ?? createEmptyInputState();
    },

    dispose(): void {
      gamepad.dispose();
      touch.dispose();
    },
  };
}
