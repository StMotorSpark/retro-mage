---
task: "51"
slug: global-scene-submission
status: pending
depends-on: ["48", "50"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Submit One Global Render Scene

Feed transformed resident level instances into one depth-tested renderer scene.

## Desired Changes

- Submit geometry, actors, lights, and camera in global coordinates.
- Render resident target content before player crossing when relevant.
- Use depth testing for opaque geometry.
- Keep renderer independent of indoor/outdoor categories and seam transforms.
- Define explicit capacity/overflow behavior for scene submission.

## Definition of Done

- [ ] Two transformed instances render through one scene submission path.
- [ ] Target geometry is visible through a connection before crossing.
- [ ] Opaque overlap resolves through depth testing.
- [ ] Renderer receives no local-level transform responsibility.
- [ ] Submission tests cover instance transforms and capacity behavior.

## Out of Scope

- WebGPU backend.
- Portal culling.
- Full lighting polish.
- Gameplay collision.

## Implementation Steps

1. Read rendering, seam-rendering, visibility, and world-runtime docs.
2. Adapt the render bridge around global transformed state.
3. Implement depth-tested opaque submission.
4. Add a minimal two-instance fixture scene.
5. Test GPU-bound state/data rather than pixels.

## Context

- Read: `docs/architecture/rendering.md`
- Read: `docs/architecture/seam-rendering.md`
- Read: `docs/architecture/wasm-bridge.md`
- Depends on: tasks 48 and 50.
