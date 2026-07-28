---
task: "90"
slug: eviction-reload-core
status: done
depends-on: ["88"]
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: "Implemented protected deterministic eviction, opaque application persistence handoff, and safe reload through provider lifecycle. Fixed direct Active->Evictable transition in engine-core to require explicit deactivation."
---

# Harden Eviction and Reload Core

Implement protected deterministic eviction, opaque application persistence handoff, and safe reload through the provider lifecycle in engine runtime code.

## Desired Changes

- Prevent eviction of current, active, explicitly pinned, transition-critical, loading, or required instances.
- Reject direct `Active → Evictable`; require explicit runtime deactivation.
- Preserve topology identity, definition identity/version, transform, persistence policy, and link placement.
- Release transformed definition/content, render participation, and collision participation without moving the player or changing topology.
- Expose opaque application persistence handoff without defining engine save serialization.
- Add deterministic eligible-victim ordering using protection, retention, priority, distance, relevance age, and stable ID.
- Reload evicted instances through normal scheduler/provider request and validation path.
- Separate state restoration from definition resolution and optional activation.

## Definition of Done

- [ ] Current, active, pinned, transition-critical, required, and loading instances resist eviction.
- [ ] Active-to-evictable direct transition is rejected.
- [ ] Evictable state and reason are observable before release.
- [ ] Release clears transient render/collision/content state while preserving descriptor/topology/transform/persistence identity.
- [ ] Persistence handoff exposes identity/policy/reason and opaque app state reference.
- [ ] Victim ordering is deterministic and tested.
- [ ] Reload validates definition identity/version and preserves spatial placement.
- [ ] Failed, cancelled, and stale reloads preserve current/retained source content.
- [ ] Rust and integration tests pass; no browser/demo changes are included.

## Out of Scope

- Provider lifecycle implementation; task:88 owns it.
- Demo/browser proof; task:91 owns it.
- Persistence serialization/storage, actor transfer, memory budgets, GPU accounting, pressure APIs, topology mutation, new planner rules, and gameplay changes.

## Implementation Steps

1. Read eviction/reload, runtime, streaming, and provider design docs. Verify task:88 is done.
2. Trace `ResidencyStore`, `WorldRuntime`, scheduler pins, transition pairs, persistence handoff, and reload paths.
3. Enforce protection/deactivation invariants and deterministic candidate ordering.
4. Define opaque handoff data at engine boundary; keep payload interpretation app-owned.
5. Route reload through scheduler/provider identity and authoritative transform placement.
6. Add Rust/integration tests for protection, ordering, release, transform preservation, success/failure/cancel/stale reload.
7. Run Rust/package tests and typecheck/build as applicable.

## Context

- Read: `docs/architecture/eviction-reload.md` — source of truth.
- Read: `docs/architecture/provider-lifecycle.md` — prerequisite request semantics.
- Related: task:77 — existing retention/eviction implementation.
- Related: task:88 — provider prerequisite.
- Related: task:91 — browser proof consumes this core.
- Key files: `packages/engine-core/src/residency.rs`, `packages/engine-core/src/streaming_scheduler.rs`, `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/level_provider.rs`.
