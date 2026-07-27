---
task: "59"
slug: transition-edge-cases
status: done
depends-on: ["54", "55"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Fixed dynamic definition-target validation/materialization with stable IDs and authoritative runtime placement. Corrected reverse explicit-link destination transforms and arrival offsets; normalized quaternion math and rejected zero-scale/degenerate anchor geometry. Added edge-case coverage."
---

# Complete Transition Edge Cases

Correct dynamic targets, explicit reverse links, transform validation, and arrival-pose semantics.

## Desired Changes

- Support definition-target links without requiring a pre-registered target instance.
- Resolve application-created target instances through the provider/runtime boundary.
- Correct bidirectional explicit-link reverse placement and arrival.
- Enforce normalized quaternion or normalize transforms consistently.
- Reject zero scale and invalid arrival/anchor geometry.

## Definition of Done

- [ ] Dynamic definition targets validate without a phantom instance requirement.
- [ ] App-created target instances receive stable identity and placement.
- [ ] Explicit links work correctly in both directions.
- [ ] Spatial links preserve expected global pose through rotation/elevation.
- [ ] Tests cover zero scale, non-unit quaternion, dynamic target, and reverse explicit link.

## Out of Scope

- Async network transport.
- Renderer integration.
- Full multi-floor movement.

## Implementation Steps

1. Read level-transitions, world-runtime, and world-model docs.
2. Fix topology validation and crossing-resolution semantics.
3. Add pure transform tests before integration changes.
4. Integrate dynamic target creation with authoritative runtime.

## Context

- Read: `docs/features/level-transitions.md`
- Read: `docs/architecture/world-runtime.md`
- Depends on tasks 54 and 55.
