/**
 * Button slot bitmasks matching docs/architecture/input-schema.md.
 *
 * 12 generic button slots packed into a u32 bitmask:
 * - bits 0–3: face1–face4 (face buttons / main action buttons)
 * - bits 4–7: dpadUp, dpadDown, dpadLeft, dpadRight (d-pad direction buttons)
 * - bits 8–11: trigger1–trigger4 (shoulder / trigger buttons, digital press)
 */
export const BUTTON_BITS = {
  face1: 1 << 0,
  face2: 1 << 1,
  face3: 1 << 2,
  face4: 1 << 3,
  dpadUp: 1 << 4,
  dpadDown: 1 << 5,
  dpadLeft: 1 << 6,
  dpadRight: 1 << 7,
  trigger1: 1 << 8,
  trigger2: 1 << 9,
  trigger3: 1 << 10,
  trigger4: 1 << 11,
} as const;

export type ButtonSlot = keyof typeof BUTTON_BITS;

export const FACE1 = BUTTON_BITS.face1;
export const FACE2 = BUTTON_BITS.face2;
export const FACE3 = BUTTON_BITS.face3;
export const FACE4 = BUTTON_BITS.face4;

export const DPAD_UP = BUTTON_BITS.dpadUp;
export const DPAD_DOWN = BUTTON_BITS.dpadDown;
export const DPAD_LEFT = BUTTON_BITS.dpadLeft;
export const DPAD_RIGHT = BUTTON_BITS.dpadRight;

export const TRIGGER1 = BUTTON_BITS.trigger1;
export const TRIGGER2 = BUTTON_BITS.trigger2;
export const TRIGGER3 = BUTTON_BITS.trigger3;
export const TRIGGER4 = BUTTON_BITS.trigger4;
