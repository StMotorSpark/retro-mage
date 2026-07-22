---
feature: test-driven-development
tags: [principles, testing, agent-first, quality]
summary: Every slice and every boundary — especially loosely-coupled connector points like WASM buffer schemas — carries unit tests written alongside the code, because agents need fast, automated ground truth rather than manual verification.
relates-to:
  - "[Agent Development Principles](./agent-dev-principles.md)"
  - "[WASM Bridge](../architecture/wasm-bridge.md)"
  - "[Repo Structure](../architecture/repo-structure.md)"
---

# Test-Driven Development

Retro Mage is built primarily by AI coding agents, and agents cannot rely on the same manual verification loop a human developer would use — running the app and eyeballing the screen doesn't catch a shifted buffer offset, a mismatched stride, or a schema drift between `engine-core` and `render`. Automated unit tests are the ground truth agents check against, not an optional layer added after a feature "works."

## Overview

Every vertical slice — in `engine-core`, `render`, `input`, and `examples/demo` — carries unit tests colocated with its code, written as part of implementing the slice, not after. Tests are the fastest and most reliable feedback an agent has that a change is correct, especially at connector points where two sides of a boundary must agree on a contract neither side can see the other's code for at a glance.

## Why This Matters More at Connector Points

Loosely-coupled boundaries — the [WASM Bridge](../architecture/wasm-bridge.md)'s buffer layout is the primary example — are hand-maintained contracts with no compiler or runtime check tying the two sides together. A `stride`, field order, or type mismatch between the Rust struct writing a buffer and the TypeScript code reading it fails silently: no crash, just visually wrong or garbage output, discovered late and hard to trace back to its source. Unit tests at these boundaries — verifying buffer layout, stride math, pointer/count contracts, and round-trip values — are the mechanism that catches drift immediately, at the point it's introduced, rather than downstream in a render frame that looks subtly broken.

## Core Rule: Tests Land With the Code, Not After

A slice is not complete when its logic is written — it is complete when its logic and its tests are written together, in the same change. Tests are not a follow-up task filed for later.

- `engine-core` (Rust): unit tests live in the same module as the code they test (`#[cfg(test)] mod tests` at the bottom of the file, per Rust convention), covering world-state math, fixed-point calculations, buffer-writing logic, and buffer layout invariants (stride, max entry counts, active-flag handling).
- `render` and `input` (TypeScript): tests live colocated in the slice folder (e.g. `world-tiles/index.test.ts` next to `world-tiles/index.ts`), covering per-slice logic and, critically, the reader side of any WASM buffer contract — that a given byte layout is interpreted into the expected values.
- `examples/demo`: carries lighter integration-style coverage proving packages wire together correctly, not exhaustive unit coverage of engine internals.

## What Gets Tested First

When a slice involves a connector point (WASM buffer schema, normalized input event shape, LUT lookup format), the test for that boundary is written before or alongside the first implementation, not deferred until "the feature is done." A schema is not considered implemented until a test exists that would fail if the schema silently drifted — e.g. a test asserting `ACTOR_STRIDE` matches the field count and order documented in [WASM Bridge](../architecture/wasm-bridge.md), or a test writing a known actor buffer in Rust and asserting the exact expected values are read back in TypeScript.

## Coverage Expectations

- Pure logic (fixed-point math, buffer packing/unpacking, visibility culling, input normalization) is fully unit tested — this code is deterministic and cheap to test exhaustively.
- GPU-facing code (shader compilation, draw calls) is tested at the level of "what data and state gets fed to the GPU," not by asserting on rendered pixels — pixel-level visual testing is out of scope unless a specific regression demands it.
- Placeholder/skeleton code (like the current `EngineState` tick counter or the clear-color render loop) is exempt until it becomes real logic — tests are not required for scaffolding proven to work by running it once, only for logic with actual behavior to verify.

## Test Runners

- `engine-core`: Rust's built-in `cargo test`, run via `wasm-pack test` where WASM-specific behavior needs browser/Node WASM runtime coverage, plain `cargo test` for pure Rust logic.
- `render` and `input`: Vitest runs unit tests colocated with each package's code in `.test.ts` files.

## Related Docs

- [Agent Development Principles](./agent-dev-principles.md) — the vertical-slice organization this principle's colocation rule follows
- [WASM Bridge](../architecture/wasm-bridge.md) — the primary connector point this principle calls out as needing boundary-first tests
- [Repo Structure](../architecture/repo-structure.md) — the package/slice layout tests are colocated within
