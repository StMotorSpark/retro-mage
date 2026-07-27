---
task: "74"
slug: stabilize-spatial-placement
status: pending
depends-on: ["73"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Stabilize Spatial Target Placement

Resolve spatial link target transforms before target render residency so connected geometry does not move when the player crosses.

## Desired Changes

- Make spatial target placement authoritative before target content becomes render-resident.
- Align target anchor world transform to source anchor world transform during explicit target preload/materialization.
- Rebuild transformed render and collision content using the resolved target transform.
- Make crossing a readiness/activation operation that does not mutate a resident target transform.
- Preserve global player pose and source playability semantics.
- Keep preload and crossing policy separate.
- Add runtime invariants/tests proving target transform and global geometry remain stable across crossing.
- Add demo/browser proof that target geometry placement is stable before and after doorway traversal.
- Update design docs if implementation exposes a missing placement/readiness boundary.

## Definition of Done

- [ ] Target transform is resolved before target render residency is exposed.
- [ ] A resident spatial target does not change transform during crossing.
- [ ] Render and collision projections use the same resolved target transform before and after crossing.
- [ ] Outdoor floor/actors/lights remain spatially fixed relative to the doorway across forward traversal.
- [ ] Forward and reverse traversal preserve global player pose without geometry jumps.
- [ ] Pending/failed target preload leaves source state unchanged.
- [ ] Rust tests cover anchor alignment, pre-residency placement, transform stability, and projection parity.
- [ ] Browser proof compares target placement/state before and after crossing and passes under serial CI execution.
- [ ] Existing Rust, typecheck, build, and Playwright tests pass.

## Out of Scope

- New crossing distance or directional policy.
- Runtime-driven preload scheduling.
- General transform editing during gameplay.
- Dynamic topology mutation.
- Multi-floor movement physics.
- Pixel-perfect screenshot regression.
- WebGPU or renderer lighting redesign.

## Implementation Steps

1. Read `docs/architecture/crossing-policy.md`, `docs/features/level-transitions.md`, `docs/architecture/world-runtime.md`, and `docs/architecture/seam-rendering.md`. Trace `resolve_crossing`, target materialization, provider acceptance, transformed content creation, and browser transport sync.
2. Identify the authoritative point where a spatial link target becomes render-resident. Resolve its target instance transform there, using source/target anchor transforms and the spatial placement contract.
3. Ensure provider acceptance and transformed render/collision content consume the resolved transform. Reject or defer residency when spatial placement cannot be resolved safely.
4. Remove crossing-time transform mutation for already-resident targets. Crossing may validate readiness and activate state, but it does not relocate resident content.
5. Preserve explicit/non-spatial link behavior and existing player arrival semantics; do not conflate explicit teleport placement with spatial preload alignment.
6. Add Rust tests for target anchor alignment, resident transform stability, shared render/collision transforms, reverse traversal, and failed/pending target behavior.
7. Update browser debug state with stable target placement evidence (for example, target transform or representative global geometry) and add assertions across approach, forward crossing, and reverse crossing.
8. Regenerate WASM bindings, clear demo Vite cache when needed, run typecheck/build, and execute repeated serial CI Playwright proof.
9. Update relevant design/gap docs only if the resolved placement boundary differs from the current documented target state.

## Context

- Read: `docs/architecture/crossing-policy.md` — crossing activation must not substitute for preload placement.
- Read: `docs/features/level-transitions.md` — spatial alignment and seamless continuity contract.
- Read: `docs/architecture/world-runtime.md` — residency/readiness ownership.
- Read: `docs/architecture/seam-rendering.md` — global transformed rendering contract.
- Related: task:73 — directional crossing and demo proof completed.
- Key files: `packages/engine-core/src/world_runtime.rs`, `packages/engine-core/src/world_manifest.rs`, `packages/engine-core/src/residency.rs`, `packages/engine-core/src/instance_runtime.rs`, `packages/engine-core/src/world_transport.rs`, `examples/demo/src/main.ts`, `examples/demo/src/demo-world.ts`, `examples/demo/tests/browser-seamless.spec.ts`.
