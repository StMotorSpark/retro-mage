---
task: "61"
slug: authored-demo-provider
status: done
depends-on: ["55", "56", "59"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Built authored dungeon/outdoor LevelDefinition content with validated tiles, materials, collision, actors, lights, anchors, provider resolution, and manifest topology. Added scalar WASM registration for anchors, instances, and bidirectional links; removed demo proof-path legacy seam registration. Cargo and demo typecheck/build pass."
---

# Build Authored Dungeon and Outdoor Provider

Replace demo metadata-only definitions with real engine-consumable authored level content.

## Desired Changes

- Define finite dungeon and outdoor `LevelDefinition` content in the app.
- Provide anchors, geometry, materials, collision flags, actors, and lights.
- Register definitions/instances/links through the browser runtime API.
- Keep all source content and provider logic application-owned.

## Definition of Done

- [ ] Provider returns complete validated definitions.
- [ ] Dungeon and outdoor definitions use the same engine contract.
- [ ] Manifest creates two placed instances and a bidirectional link.
- [ ] App does not call old seam registration for this proof path.
- [ ] Provider tests cover authored resolution and invalid data.

## Out of Scope

- Browser crossing proof.
- Procedural generation.
- Full asset authoring pipeline.
- Combat or HUD.

## Implementation Steps

1. Read demo-scope, world-model, and level-provider docs.
2. Convert demo fixtures into resolved engine content.
3. Register topology and provider requests through JS/WASM boundary.
4. Add app-level provider/manifest tests.

## Context

- Read: `docs/features/demo-scope.md`
- Read: `docs/architecture/world-runtime.md`
- Depends on tasks 55, 56, and 59.
