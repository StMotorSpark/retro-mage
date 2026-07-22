/**
 * Normalized input event shape emitted by every input source (gamepad,
 * touch overlay, future keyboard/mouse) and consumed by engine-core / game logic.
 *
 * Locked schema per docs/architecture/input-schema.md.
 */
export interface InputState {
  /** Ground-plane movement vector, each axis normalized in [-1, 1]. */
  move: { x: number; y: number };
  /** Camera look vector, each axis normalized in [-1, 1], separate from move. */
  look: { x: number; y: number };
  /** Reserved vertical axis (-1..1, default 0), not consumed by anything yet. */
  vertical: number;
  /** u32 bitmask of current held buttons across 12 generic slots. */
  buttons: number;
  /** u32 bitmask of edge-triggered pressed buttons (set only on initial press frame). */
  buttonsPressed: number;
}

/** Returns a fresh InputState with zeroed movement, look, vertical, and buttons. */
export function createEmptyInputState(): InputState {
  return {
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    vertical: 0,
    buttons: 0,
    buttonsPressed: 0,
  };
}
