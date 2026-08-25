---
task: "131"
slug: dynamic-content-core
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-08-25
outcome: "Implemented validated authored slots and per-instance variant selection with atomic transformed render/collision recomposition and stable mutation outcomes. Added isolation, lifecycle, revision, visible/solid, visible/non-solid, empty, and no-partial-change coverage; engine-core tests pass."
---

# Implement Runtime Dynamic-Content Core

Add immutable authored dynamic-content slots and independent per-instance effective-variant state to engine-core.

## Desired Changes

- Add validated named dynamic-content slots and finite authored variants to level definitions.
- Add per-instance variant overrides, revisions, lifecycle validation, and structured mutation outcomes.
- Compose selected slot contributions into transformed render and collision content without mutating definitions or sibling instances.
- Preserve existing lifecycle, transform, link, capacity, and collision ownership.

## Definition of Done

- [ ] A slot and variant ID are unique and validated within the definition contract.
- [ ] Reused definitions support independent variant selection for each resident instance.
- [ ] Valid selections on resident and active instances update only the addressed slot contribution.
- [ ] Unavailable lifecycle states and invalid instance/content/variant IDs return stable actionable failures without mutation.
- [ ] Core tests cover visible/solid, visible/non-solid, and empty variant contributions; independent instances; deterministic revisions; and no-partial-change failure safety.
- [ ] Relevant engine-core tests pass.

## Out of Scope

- WASM/TypeScript transport exposure.
- Frame-boundary scene publication integration.
- Browser/demo proof.
- Game-specific door rules, persistence formats, or UI.

## Implementation Steps

1. Read `docs/architecture/runtime-dynamic-content.md` and trace definition, instance runtime, transformed global content, and collision-index ownership.
2. Add the authored slot/variant model and definition validation while preserving immutable finalized definitions.
3. Add per-instance effective-variant state and structured result/diagnostic types using `(instance_id, content_id, variant_id)` identity.
4. Compose variant contributions through the existing transformed-content and collision paths without exposing collision internals.
5. Add focused Rust tests for all stated result, lifecycle, identity, and isolation contracts.

## Context

- Read: `docs/architecture/runtime-dynamic-content.md` — source of truth.
- Read: `docs/features/world-model.md` — immutable definitions and instance identity.
- Read: `docs/architecture/world-runtime.md` and `docs/architecture/collision-bridge.md` — lifecycle and collision authority.
- Key files: `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/residency.rs`, `packages/engine-core/src/global_collision.rs`.
