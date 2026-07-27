---
task: "46"
slug: world-manifest
status: pending
depends-on: ["45"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Implement World Manifest Registration

Add application-owned world topology registration for known level instances and links.

## Desired Changes

- Represent `WorldManifest`, instance descriptors, and link records.
- Register initial manifests with the engine.
- Support explicit runtime registration of instances and links.
- Validate referenced definitions, instances, and anchors.
- Support one-way and bidirectional links.

## Definition of Done

- [ ] Startup manifest registration works.
- [ ] Dynamic instance/link registration has explicit validation errors.
- [ ] Link references support reusable definitions and placed instances.
- [ ] Multiple links can share an anchor only when policy permits it.
- [ ] Unit tests cover valid, invalid, one-way, and bidirectional topology.

## Out of Scope

- Resolving level content from providers.
- Loading or streaming.
- Player crossing.
- Procedural generation.

## Implementation Steps

1. Read world-runtime and level-transitions docs.
2. Add manifest and topology state beside world contracts.
3. Keep link ownership outside reusable definitions.
4. Expose registration APIs with explicit failure results.
5. Add tests for topology validation and dynamic registration.

## Context

- Read: `docs/architecture/world-runtime.md`
- Read: `docs/features/level-transitions.md`
- Depends on: task 45.
