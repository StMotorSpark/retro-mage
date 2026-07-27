---
task: "48"
slug: level-instance-runtime
status: done
depends-on: ["45", "46", "47"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Added LevelInstanceRuntime with immutable shared definition storage, stable instance creation, exactly-once local-to-global content transforms, transformed bounds, persistence/runtime state isolation, lookup, and idempotent destruction. Added tests covering reusable definitions at distinct transforms, isolation, duplicate IDs, and safe destruction."
---

# Implement Level Instance Runtime

Create runtime level instances from resolved definitions and place them into global world coordinates.

## Desired Changes

- Instantiate definitions with stable instance IDs and transforms.
- Derive transformed world bounds and global actor/light/geometry positions.
- Track mutable runtime state separately from immutable definitions.
- Support persistence policy metadata.
- Expose instance lookup and lifecycle-safe destruction.

## Definition of Done

- [ ] Multiple instances can reference one definition.
- [ ] Local content transforms into global coordinates exactly once.
- [ ] Runtime state does not mutate the shared definition.
- [ ] World bounds match transformed content.
- [ ] Tests cover two instances using one definition at different transforms.

## Out of Scope

- Streaming lifecycle states.
- Player crossing.
- Full multi-floor physics.
- Renderer submission.

## Implementation Steps

1. Read world-model and world-runtime docs.
2. Build instance creation around task 45 contracts and task 47 provider results.
3. Keep local data immutable and global data runtime-owned.
4. Add tests for transforms, identity, and runtime-state isolation.

## Context

- Read: `docs/features/world-model.md`
- Read: `docs/architecture/world-runtime.md`
- Depends on: tasks 45, 46, and 47.
