/**
 * Normalized input event shape emitted by every input source (gamepad,
 * touch overlay, future keyboard/mouse) and consumed by anything reading
 * player intent.
 *
 * PLACEHOLDER: this shape is not final. The real event schema (move vector
 * representation, action button set, contextual button semantics) is an
 * open question tracked in docs/research/known-gaps.md under
 * "Input Event Schema". Do not treat `actions` keys as a stable contract.
 */
export interface InputState {
  /** Normalized movement vector, each axis in [-1, 1]. */
  move: { x: number; y: number };
  /** Generic action-button bag; key set is a placeholder, not final. */
  actions: Record<string, boolean>;
}

/** Returns a fresh InputState with no movement and no actions active. */
export function createEmptyInputState(): InputState {
  return { move: { x: 0, y: 0 }, actions: {} };
}
