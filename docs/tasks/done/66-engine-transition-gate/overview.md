---
task: "66"
slug: engine-transition-gate
status: done
depends-on: ["65", "59"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Moved spatial anchor crossing, readiness gating, activation, arrival pose, hysteresis, and active-instance reporting into authoritative WorldRuntime/WorldTransport APIs. Demo now crosses through runtime state instead of X-coordinate thresholds; failed targets leave source playable."
---

# Move Transition Crossing Into Engine Runtime

Make level links, preload readiness, anchor resolution, and crossing activation drive actual player transitions.

## Desired Changes

- Resolve links from player proximity/anchor volumes in engine runtime.
- Gate crossing on target render and collision readiness.
- Materialize dynamic targets through the provider/runtime boundary.
- Apply spatial or explicit arrival transforms to player pose.
- Preserve source playability on target failure.
- Expose active instance and crossing state to the app.

## Definition of Done

- [ ] Demo no longer changes active instance from an app-side X-coordinate threshold.
- [ ] Spatial link crossing uses engine anchor/link resolution.
- [ ] Target cannot become active before residency readiness.
- [ ] Forward and reverse links work through runtime APIs.
- [ ] Failure leaves source active and playable.
- [ ] Engine tests cover proximity, readiness, transform, hysteresis, and failure.

## Out of Scope

- Advanced portal rendering.
- Full multi-floor physics.
- Actor transfer.
- Procedural world topology.

## Implementation Steps

1. Read `docs/features/level-transitions.md` and `docs/architecture/world-runtime.md`.
2. Add engine crossing evaluation to the authoritative runtime/tick path.
3. Connect link resolution to residency activation and player pose.
4. Add browser-facing state accessors and deterministic tests.

## Context

- Depends on tasks 65 and 59.
- Key files: `packages/engine-core/src/world_runtime.rs`, `world_manifest.rs`, `lib.rs`.
