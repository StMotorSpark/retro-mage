---
task: "49"
slug: anchor-link-transforms
status: pending
depends-on: ["45", "46", "48"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Implement Anchor Alignment and Link Transforms

Resolve target instance placement from source and target anchor transforms for spatial and explicit-transform links.

## Desired Changes

- Resolve target instance transforms by aligning named anchors.
- Preserve continuous global player pose for spatial links.
- Support explicit target arrival transforms for teleports and non-spatial links.
- Validate safe arrival offsets and link directionality.
- Add transform and crossing-pose tests.

## Definition of Done

- [ ] Doorway anchors align position and orientation in global space.
- [ ] Bidirectional links resolve the reverse path correctly.
- [ ] One-way links reject reverse crossing.
- [ ] Explicit-transform links produce the documented target pose.
- [ ] Tests cover rotated and vertically offset targets.

## Out of Scope

- Loading target content.
- Collision activation.
- Rendering overlap.
- Actor transfer.

## Implementation Steps

1. Read level-transitions and world-runtime docs.
2. Implement pure anchor-alignment math.
3. Integrate resolved transforms with level instances.
4. Keep crossing policy separate from provider and renderer code.
5. Add boundary tests for all supported link forms.

## Context

- Read: `docs/features/level-transitions.md`
- Read: `docs/architecture/world-runtime.md`
- Depends on: tasks 45, 46, and 48.
