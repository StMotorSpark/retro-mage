---
task: "56"
slug: wasm-world-transport
status: pending
depends-on: ["54", "55"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Add JS/WASM World Transport

Expose a deliberate browser-consumable transport for authoritative global world content and lifecycle state.

## Desired Changes

- Define JS-usable APIs or typed buffers for definitions/instances/resident global content.
- Transport global tiles, actors, lights, camera, and relevant instance state.
- Keep Rust-only internal types behind the boundary.
- Define capacity, count, memory-growth, and overflow behavior.
- Add Rust and TypeScript boundary tests.

## Definition of Done

- [ ] Browser app can register/resolve required world data without Rust-only struct arguments.
- [ ] Render reader receives transformed global content.
- [ ] Collision activation and residency state are observable where required.
- [ ] Schema fields match the level content contract.
- [ ] Boundary tests detect field/order/type drift.

## Out of Scope

- Rendering scene composition.
- Demo migration.
- WebGPU.
- Network transport.

## Implementation Steps

1. Read WASM bridge and world runtime docs.
2. Choose function/serialized/buffer transport based on payload shape.
3. Implement Rust writer and TS reader together.
4. Add memory-growth and overflow tests.

## Context

- Read: `docs/architecture/wasm-bridge.md`
- Read: `docs/architecture/world-runtime.md`
- Depends on tasks 54 and 55.
