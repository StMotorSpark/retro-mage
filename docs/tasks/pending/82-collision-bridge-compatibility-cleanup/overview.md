---
task: "82"
slug: collision-bridge-compatibility-cleanup
status: pending
depends-on: ["81"]
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: ""
---

# Complete Collision Bridge Compatibility Cleanup

Validate standalone movement compatibility and remove obsolete collision bridge paths after world-aware consumers migrate.

## Desired Changes

- Confirm standalone `EngineState.tick()` remains functional where supported.
- Identify remaining callers of explicit collision snapshot synchronization and legacy global collision APIs.
- Remove obsolete normal-flow bridge APIs when no active consumer requires them.
- Keep test adapters only when they document a valid isolated boundary.
- Update known-gap and compatibility documentation to match implementation.

## Definition of Done

- [ ] Standalone engine movement tests pass.
- [ ] No active world-runtime consumer depends on manual collision synchronization.
- [ ] Obsolete bridge APIs are removed or explicitly marked compatibility/test-only.
- [ ] `examples/bench` and other active consumers are accounted for.
- [ ] Rust, package, and browser verification passes.
- [ ] Known gaps accurately describe remaining legacy boundaries.

## Out of Scope

- New movement physics.
- New world topology features.
- Persistence or memory-budget policy.
- Renderer backend changes.

## Implementation Steps

1. Read collision bridge, repo structure, known gaps, and compatibility-related task outcomes.
2. Search all packages/examples for explicit collision sync and legacy world-path usage.
3. Migrate or remove obsolete callers according to the collision bridge contract.
4. Preserve standalone compatibility only where an active supported consumer needs it.
5. Run complete verification and update docs/task outcomes.

## Context

- Read: `docs/architecture/collision-bridge.md` — source of truth.
- Depends: task:81 (WASM/demo integration).
- Key files: `packages/engine-core/src/lib.rs`, `packages/engine-core/src/world_transport.rs`, `examples/demo/src/main.ts`, `examples/bench/`.
