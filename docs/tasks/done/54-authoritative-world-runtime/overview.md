---
task: "54"
slug: authoritative-world-runtime
status: done
depends-on: ["45", "46", "47", "48", "49", "50"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Added WorldRuntime composition root joining manifest topology, provider resolution, authoritative lifecycle records, transformed global content, collision, and simulation queries. Renamed lifecycle storage to ResidencyStore with compatibility alias, synchronized topology descriptors, preserved pin/cancel/failure/persistence behavior, and added integration coverage."
---

# Establish One Authoritative World Runtime

Consolidate topology, provider resolution, level instances, transformed content, and residency into one runtime authority.

## Desired Changes

- Create one `WorldRuntime` composition root for topology, provider coordination, instances, and residency.
- Remove duplicate ownership of definitions/global content between `LevelInstanceRuntime` and `ResidencyManager`.
- Preserve explicit lifecycle, persistence handoff, pinning, cancellation, and failure behavior.
- Expose one query path for resident global content and active collision instances.

## Definition of Done

- [ ] One runtime owns each definition, instance, transformed content, and lifecycle state.
- [ ] Provider results update the authoritative instance record.
- [ ] Render and collision consumers query the same resident content.
- [ ] Existing lifecycle tests pass or are migrated without duplicate state.
- [ ] Runtime API documents render residency, collision activity, and simulation activity separately.

## Out of Scope

- JS/WASM transport.
- Renderer implementation.
- Demo migration.
- Full multi-floor physics.

## Implementation Steps

1. Read `docs/architecture/world-runtime.md` and related task implementations.
2. Define composition ownership and migrate existing standalone logic.
3. Add integration tests for load, resolve, activate, fail, evict, and persistence handoff.
4. Keep application topology/provider ownership explicit.

## Context

- Read: `docs/architecture/world-runtime.md`
- Read: `docs/features/world-model.md`
- Depends on tasks 45–50.
