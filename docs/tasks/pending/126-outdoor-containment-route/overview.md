---
task: "126"
slug: outdoor-containment-route
status: pending
depends-on: ["124"]
blocked-by: ""
assigned-to: ""
created: 2026-08-07
outcome: ""
---

# Restore Outdoor Containment and Route Proof

The outdoor floor and mountain boundary keep the player grounded and contained while allowing documented forest, stream, castle, and mountain-route traversal.

## Desired Changes

- Reproduce current failing mountain-boundary, seamless outdoor-route, and full-route browser proofs using the production touch path.
- Identify why the player can leave outdoor support and fall indefinitely, and why route predicates fail near the stream/castle.
- Repair authored support surfaces, collision geometry, transform alignment, or test-driving assumptions at the responsible boundary.
- Preserve documented route behavior: forest corridor, blocked stream banks, cobblestone crossing, open castle entry, vertical castle route, and impassable mountain boundary.

## Definition of Done

- [ ] Player cannot fall below authored outdoor ground anywhere reachable by normal touch movement, including mountain-boundary contact paths.
- [ ] Mountain boundary blocks travel beyond authored outdoor extent without trapping or launching the player below support surfaces.
- [ ] Production-touch route reaches the castle/throne assertions without debug teleport bypass.
- [ ] `examples/demo/tests/mountain-boundary.spec.ts`, `examples/demo/tests/full-route.spec.ts`, and applicable outdoor test in `browser-seamless.spec.ts` pass in isolation and together.
- [ ] Tests assert physical behavior/pose and collision state; no assertion is weakened, skipped, or converted to array-presence-only proof.
- [ ] `pnpm --filter demo typecheck` passes and no Playwright artifacts remain.

## Out of Scope

- New world/editor format, new mountain art, broad collision-system rewrite, or changes to core vertical-movement policy.
- Relaxing route bounds or removing blockers solely to make scripted movement pass.
- Sprite alpha diagnostics covered by task:125.

## Implementation Steps

1. Read outdoor tiles, support surfaces, instance transform, global collision projection, and failing test traces. Capture precise pose/state at support loss and route failure.
2. Confirm every reachable outdoor region has intended transformed support coverage and every boundary tile has compatible collision behavior.
3. Repair the smallest responsible authored-data or engine/demo integration defect. Maintain separation between render geometry and collision/support geometry.
4. Re-run isolated tests, then run their combined Playwright command with supported SwiftShader configuration.
5. Record exact commands/results in task outcome and remove test artifacts.

## Context

**Read first:**
- `docs/features/demo-experience.md` — stream, castle, and mountain route contract.
- `docs/architecture/collision.md` — transformed active collision geometry.
- `docs/architecture/vertical-movement.md` — grounded support behavior.
- `docs/architecture/material-contract.md` — render/collision geometry boundary.

**Related work:**
- task:124 — tree collision/placement must settle shared outdoor authored data first.

**Key files:**
- `examples/demo/src/demo-world.ts`
- `examples/demo/tests/mountain-boundary.spec.ts`
- `examples/demo/tests/full-route.spec.ts`
- `examples/demo/tests/browser-seamless.spec.ts`
- `packages/engine-core/src/global_collision.rs`
- `packages/engine-core/src/world_transport.rs`
