---
task: "85"
slug: atomic-scene-publication
status: done
depends-on: ["84"]
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: "Implemented atomic scene submission in Rust WorldTransport and TypeScript GlobalSceneSubmission. Added structured per-frame overflow diagnostics and skipped instances list. Verified counts remain consistent and subsequent valid instances continue rendering when an overflow occurs."
---

# Implement Atomic Scene Publication

Make global scene submission reject overflowing instances without partial geometry and publish structured per-frame overflow diagnostics.

## Desired Changes

- Preflight each instance's tile, actor, light, and metadata counts against remaining capacity.
- Make instance submission atomic across all scene categories.
- Never truncate or partially publish an overflowing instance.
- Continue deterministic submission of later instances according to runtime priority/order.
- Keep accepted counts, instance IDs, and field arrays aligned.
- Preserve collision, gameplay, and lifecycle state when render submission overflows.
- Add structured overflow diagnostics while retaining the compatibility boolean.
- Reset per-frame overflow diagnostics with scene reset.
- Keep TypeScript adapter semantics equivalent to Rust transport semantics.

## Definition of Done

- [ ] An instance that exceeds any category is absent from every published scene buffer.
- [ ] Earlier accepted instances remain intact after a later overflow.
- [ ] Later instances follow documented deterministic ordering and are handled consistently.
- [ ] Counts never exceed configured capacities.
- [ ] Diagnostics identify frame, category, requested count, capacity, affected instance, and skipped instances.
- [ ] Overflow does not mutate collision or gameplay state.
- [ ] Diagnostics reset at the documented frame boundary.
- [ ] Rust and TypeScript tests cover each category, multiple failures, ID alignment, and reset behavior.
- [ ] No silent geometry truncation remains in global scene publication.

## Out of Scope

- Construction-time capacity configuration (task 84).
- Crossing gate behavior (task 86).
- Browser UI/overlay and end-to-end proof (task 87).
- Polygon submission.
- Dynamic resizing or chunked scene submission.

## Implementation Steps

1. Read `docs/architecture/scene-capacity.md` and inspect `WorldTransport::sync`, `GlobalSceneSubmission.submit`, and their tests.
2. Add preflight and atomic append behavior at the production Rust publication boundary.
3. Add structured diagnostics with stable category and instance identifiers; preserve existing compatibility accessors.
4. Align TypeScript adapter error/report behavior with the Rust contract.
5. Add focused unit tests for each overflow path and accepted-content preservation.
6. Run Rust, render, and bridge tests; verify no legacy scene path still truncates global content.

## Context

- Read: `docs/architecture/scene-capacity.md` — source of truth.
- Related: task:84 — supplies capacity/config contract.
- Related: task:86 — consumes overflow state for crossing.
- Key files: `packages/engine-core/src/world_transport.rs`, `packages/render/src/world-state/scene.ts`, `packages/render/src/world-state/scene.test.ts`.
