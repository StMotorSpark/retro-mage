---
task: "57"
slug: runtime-scene-integration
status: pending
depends-on: ["54", "55", "56"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Integrate Runtime Into Global Render Scene

Connect resident global level content to one renderer scene submission path.

## Desired Changes

- Aggregate all render-resident instances from authoritative runtime state.
- Submit global tiles, actors, and lights through the bridge.
- Keep instance transforms out of TypeScript renderer logic.
- Make capacity overflow explicit and recoverable.
- Ensure target content can render before crossing.

## Definition of Done

- [ ] Runtime resident content reaches renderer through the documented bridge.
- [ ] Multiple instances render in one global scene.
- [ ] Scene lights are consumed by lighting path.
- [ ] Renderer no longer depends on seam transforms for new content.
- [ ] Integration tests cover source/target overlap and overflow.

## Out of Scope

- Browser visual proof.
- WebGPU.
- Portal culling.
- Full legacy-path removal.

## Implementation Steps

1. Read rendering, seam-rendering, visibility, and WASM bridge docs.
2. Connect authoritative runtime scene extraction to transport and reader.
3. Integrate scene submission into render loop and lighting.
4. Add GPU-state/data tests.

## Context

- Read: `docs/architecture/rendering.md`
- Read: `docs/architecture/seam-rendering.md`
- Depends on tasks 54–56.
