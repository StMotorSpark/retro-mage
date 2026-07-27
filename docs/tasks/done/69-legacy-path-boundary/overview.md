---
task: "69"
slug: legacy-path-boundary
status: done
depends-on: ["68"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Contained legacy room/chunk/seam APIs behind the compatibility path; global world activation now ignores legacy structure, seam, room-graph, and streaming mutations. Added global-path isolation coverage and documented runtime selection/boundaries."
---

# Clarify and Contain Legacy World Path

Make compatibility-only room, chunk, seam, and visibility code explicit and prevent it from silently participating in the global-instance path.

## Desired Changes

- Document which legacy APIs remain compatibility-only.
- Add assertions/tests that global runtime does not mutate legacy seam/structure state.
- Remove obsolete active-path branches where safe.
- Update docs/comments to describe the actual compatibility boundary.
- Preserve old tests only when they cover supported compatibility behavior.

## Definition of Done

- [ ] Global runtime path has no hidden legacy seam handoff.
- [ ] Compatibility APIs are clearly labeled and isolated.
- [ ] Docs match actual runtime selection rules.
- [ ] No unintentional duplicate rendering, collision, or streaming work occurs.

## Out of Scope

- Deleting archived task history.
- Reimplementing legacy features.
- WebGPU.
- Multi-floor physics.

## Implementation Steps

1. Read world-structure-partitioning, seam-rendering, rendering, and known-gaps docs.
2. Trace global and compatibility path selection.
3. Add isolation tests and update documentation.
4. Remove dead code only when no supported compatibility consumer requires it.

## Context

- Depends on task 68.
- Key files: `packages/engine-core/src/lib.rs`, `seam.rs`, `room.rs`, `chunk.rs`.
