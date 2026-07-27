---
task: "60"
slug: remove-legacy-world-path
status: pending
depends-on: ["57", "58", "59"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Remove Conflicting Legacy World Path

Remove or isolate old seam/indoor-outdoor runtime paths once the global instance path replaces them.

## Desired Changes

- Stop new runtime behavior from using separate indoor/outdoor coordinate systems.
- Remove obsolete seam injection and structure-switching behavior from the active path.
- Retain only explicitly documented compatibility code, if required.
- Update comments/tests/docs that describe superseded behavior.

## Definition of Done

- [ ] One active world path drives rendering, collision, and transitions.
- [ ] No hidden old seam transform runs during the new path.
- [ ] Old compatibility APIs are clearly isolated or removed.
- [ ] Tests prove no cross-path state mutation.
- [ ] Documentation and task outcomes match actual runtime behavior.

## Out of Scope

- Demo content migration.
- WebGPU.
- Multi-floor physics.
- Deleting archived task history.

## Implementation Steps

1. Read world-model, rendering, collision, streaming, and seam-rendering docs.
2. Identify old active paths and migrate/remove them only after new integrations pass.
3. Preserve compatibility only where explicitly justified.
4. Run full Rust, TS, and build validation.

## Context

- Read: `docs/architecture/world-structure-partitioning.md`
- Read: `docs/architecture/seam-rendering.md`
- Depends on tasks 57–59.
