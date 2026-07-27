---
task: "65"
slug: unify-transport-runtime
status: done
depends-on: ["54", "56", "57"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "WorldRuntime now owns topology, provider-backed lifecycle, instances, and transformed content. WorldTransport is a browser projection with scalar definition builders and fixed buffers; lifecycle calls route through runtime authority, and render/collision projection parity is covered by tests."
---

# Unify World Runtime and Browser Transport

Make `WorldRuntime` the sole authoritative runtime while `WorldTransport` becomes its browser-facing projection rather than a second runtime.

## Desired Changes

- Remove duplicate topology/instance ownership from `WorldTransport`.
- Feed transport state from authoritative `WorldRuntime` state.
- Preserve application-owned scalar registration/provider boundary.
- Keep one definition, instance, residency, transform, and lifecycle authority.
- Ensure render and collision projections derive from the same runtime snapshot.

## Definition of Done

- [ ] `WorldRuntime` owns topology, provider lifecycle, instances, and transformed content.
- [ ] `WorldTransport` owns only browser transport buffers/building input, or is an explicit runtime adapter.
- [ ] No demo API can mutate transport state without updating authoritative runtime.
- [ ] Render and collision projections expose identical instance state/content.
- [ ] Tests prove provider resolve, activation, refresh, and eviction through one authority.

## Out of Scope

- New level content.
- Browser transition UX.
- WebGPU.
- Full legacy-path removal.

## Implementation Steps

1. Read `docs/architecture/world-runtime.md` and `docs/architecture/wasm-bridge.md`.
2. Choose ownership boundary between `WorldRuntime` and `WorldTransport`.
3. Route transport registration and state changes through authoritative runtime.
4. Add integration tests detecting divergent render/collision state.

## Context

- Related: tasks 54, 56, and 57.
- Key files: `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/world_transport.rs`.
