---
task: "31"
slug: demo-world-streaming-proof-scene
status: pending
depends-on: ["30"]
blocked-by: ""
assigned-to: ""
created: 2025-06-17
outcome: ""
---

# Demo World Streaming Proof Scene

Extend `examples/demo` to prove `docs/architecture/world-streaming.md`'s design end to end: a player walks from an indoor dungeon room, through a seam, into outdoor chunked terrain (and back), with resident data streaming in/out and no load screen or level swap, mirroring task:25's visibility proof scene pattern.

## Desired Changes

- Extend `examples/demo`'s scene with at least two connected indoor rooms (proving task:28's room-graph streaming across a hop) and an outdoor area spanning multiple chunks (proving task:27's chunk streaming across chunk boundaries), joined by at least one seam (task:29)
- Use the reference `ChunkProvider` from task:26 (or a demo-specific placeholder implementation of the same interface) to source outdoor chunk data — this is the natural place to demonstrate the pluggable-source pattern from `docs/architecture/world-streaming.md`
- Wire the streaming tuning config (task:30) with concrete demo-appropriate values (small enough radii/depths to observably stream during normal movement in the demo's scene scale)
- Ensure the existing render/input loop (per `docs/architecture/wasm-bridge.md` and `docs/architecture/input-schema.md`) drives movement across all of the above with no special-cased "load screen" state or discrete scene swap

## Definition of Done

- [ ] Player can walk from the demo's starting indoor room, through at least one other connected room, through a seam, into outdoor terrain spanning at least 2 chunks in each direction from the seam, with no load screen, freeze, or discrete transition visible during normal frame-rate movement
- [ ] Walking back through the seam into indoor space works symmetrically
- [ ] Manual verification (documented in this task's outcome) confirms no visible pop-in of geometry at normal movement speed, given the configured load-ahead radii/trigger distance
- [ ] Demo scene construction (rooms, chunks, seam, config values) is committed as part of `examples/demo`
- [ ] Existing demo build/run instructions still work; `pnpm` scripts for the demo succeed

## Out of Scope

- New engine-core streaming mechanics — this task only assembles and configures a scene using task:26–30's existing capabilities
- Automated visual regression testing — manual verification is sufficient, matching task:25's precedent
- Production-quality terrain/room content — placeholder/minimal geometry is sufficient to prove the streaming mechanics, per `docs/research/known-gaps.md`'s "Example Demo Scope" entry

## Implementation Steps

1. Read `docs/architecture/world-streaming.md` in full, and review task:25's visibility proof scene for the established demo-proof pattern
2. Extend `examples/demo`'s scene data with the multi-room, multi-chunk, seam-connected layout described above
3. Wire the reference/placeholder `ChunkProvider` (task:26) as the outdoor data source for the demo
4. Configure streaming tuning values (task:30) appropriate to the demo's scale
5. Run the demo, walk the full indoor→seam→outdoor→seam→indoor path, confirm no load screen/freeze/pop-in at normal movement speed
6. Record verification results in this task's `outcome` field on completion

## Context

**Read first:**
- `docs/architecture/world-streaming.md` — source of truth for what this scene must prove
- task:25's demo visibility proof scene — established pattern for demo-based design-doc proof tasks
- `docs/research/known-gaps.md`'s "Example Demo Scope" entry — scope precedent for demo content minimality

**Related work:**
- task:26, task:27, task:28, task:29, task:30 (dependencies: this task exercises all of them together)

**Key files:**
- `examples/demo/`
