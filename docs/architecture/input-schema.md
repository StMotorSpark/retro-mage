---
feature: input-schema
tags: [architecture, input, wasm, gamepad, touch]
summary: Retro Mage normalizes gamepad and touch input into one fixed-shape event struct — two analog vectors, a reserved vertical axis, and a 12-slot button bitmask — that the input package produces and engine-core consumes identically regardless of source device.
relates-to:
  - "[Tech Stack](./tech-stack.md)"
  - "[Repo Structure](./repo-structure.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# Input Event Schema

The `input` package abstracts over physical gamepads and touch overlays behind one normalized event shape. `engine-core` only ever consumes this shape — it has no knowledge of which physical device produced it.

## Overview

Two input methods exist today: a physical gamepad (two analog sticks, four face buttons, a d-pad, four triggers) and a touch overlay (a virtual analog stick, a swipe-based look zone, and a configurable set of on-screen buttons). Both normalize down to the same fixed struct so `engine-core` and any app built on the engine write against one contract, never a per-device one.

The schema draws a hard line at device abstraction: `input` normalizes raw device signals into generic move/look/button slots. It does not assign meaning to any button — what "action1" does in a given game (attack, open door, cast spell) is an app-level concern, resolved by the consuming game, not by the engine.

## Schema

| Field | Type | Notes |
|-------|------|-------|
| `move_x`, `move_y` | `f32` | Ground-plane movement vector. Left stick / on-screen virtual thumbstick. Normalized -1..1 per axis. |
| `look_x`, `look_y` | `f32` | Camera look vector, separate from movement. Right stick / touch swipe over the look zone. Normalized -1..1 per axis. |
| `vertical` | `f32` | Reserved axis for non-ground movement intent (flight, levitation). Unused by any current actor behavior — `engine-core` actor state decides whether this axis means anything; a grounded actor ignores it, a flying actor consumes it. Carrying this field now avoids a bridge-shape change once flight/levitation exists. |
| `buttons` | `u32` bitmask | Current held state of all 12 generic button slots (see Button Slots below). |
| `buttons_pressed` | `u32` bitmask | Edge-triggered — bits set only on the frame a button transitions from unheld to held. Cleared the following frame. |

All fields update every frame, matching the update cadence of the Actors/Lights/Camera buffers in [WASM Bridge](./wasm-bridge.md).

## Button Slots (12 total, packed into one `u32`)

| Bit range | Slots | Source |
|-----------|-------|--------|
| 0–3 | `face1`–`face4` | Gamepad face buttons (A/B/X/Y-equivalent) / on-screen action buttons |
| 4–7 | `dpad_up`, `dpad_down`, `dpad_left`, `dpad_right` | Gamepad d-pad / on-screen d-pad overlay, if the app's control set includes one |
| 8–11 | `trigger1`–`trigger4` | Gamepad's four triggers (two shoulder, two analog trigger), treated as digital press/release. Analog trigger pressure is not carried in this schema — a future reserved analog-trigger field is added if a use case needs it, without displacing this bitmask. |

12 of 32 available bits are used, leaving room to add slots without changing the field's type or wire position.

## Device Normalization

- **Gamepad**: `input` polls the Gamepad API, maps physical stick axes directly to `move_x/y` and `look_x/y`, and maps physical buttons to the fixed slot layout above.
- **Touch overlay**: `input` renders a default on-screen control overlay — a virtual analog stick (left, mapped to `move_x/y`), a swipe zone (center/right, mapped to `look_x/y`), and a configurable set of on-screen buttons mapped to the `face`/`dpad`/`trigger` slots. This default overlay is provided so `examples/demo` and any consuming game are playable on touch devices without building input UI from scratch, but it is swappable and skinnable — a consuming game can replace the overlay's visuals, layout, and active button set while still emitting the same normalized slot bitmask.

Both device paths converge on the exact same struct before it crosses into `engine-core` — `engine-core` has no device-specific code paths.

## Out of Scope

- **Button semantics**: which slot maps to "attack," "interact," "block," etc. is decided by the consuming game, not this schema or `engine-core`.
- **Contextual button display**: showing different icons/labels on the on-screen overlay depending on game context (e.g., a door icon near a door) is an app-level concern layered on top of the default overlay, not an engine behavior.
- **Analog trigger pressure and any further vertical-axis semantics (flight, levitation)**: reserved fields exist to avoid a future schema change, but no behavior consuming them is defined yet.
- **The exact transport mechanism carrying this struct across the WASM boundary** (a dedicated writable buffer vs. a per-frame function call) is undecided — see [Known Gaps](../research/known-gaps.md).

## Related Docs

- [Tech Stack](./tech-stack.md) — the input layer's role in the overall stack
- [Repo Structure](./repo-structure.md) — the `input` package's boundaries and responsibilities
- [WASM Bridge](./wasm-bridge.md) — the read-only `engine-core` → `render` bridge this schema's write-direction counterpart is undecided against
- [Known Gaps](../research/known-gaps.md) — remaining open questions, including the input transport mechanism
