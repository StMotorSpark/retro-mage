---
task: "09"
slug: render-buffer-reader
status: done
depends-on: ["07", "08"]
blocked-by: ""
assigned-to: ""
created: 2025-06-15
outcome: "Implemented render-side WASM buffer reader slice (packages/render/src/world-state/) for actors, lights, tiles, and camera views over engine-core linear memory. Includes growth-safe defensive re-wrapping to reuse Float32Array views in steady state (zero per-frame heap allocations) and Vitest unit tests verifying WASM boundary round-trips."
---

# Render Buffer Reader

Implement the `render`-side read path for the WASM bridge buffers: typed-array views over `engine-core`'s WASM memory, wrapped per `docs/architecture/wasm-bridge.md`'s "Memory Access Pattern" section, with defensive re-fetch on memory growth.

## Desired Changes

- Add a new vertical slice (e.g. `packages/render/src/world-state/` or similar — worker names it, following `docs/principles/agent-dev-principles.md`'s feature-folder convention) that owns reading `engine-core`'s exported buffers
- Implement a reader function/module per buffer (actors, lights, tiles, camera) that, given an `engine-core` `EngineState` instance and its WASM memory, returns typed-array views (`Float32Array`) for each field, using the pointer/count getters task:08 exposes
- Implement the "re-fetch views defensively at the start of each frame" behavior described in `docs/architecture/wasm-bridge.md` — detect when the underlying `WebAssembly.Memory` buffer has grown (view's `.buffer !== memory.buffer` or `.byteLength` mismatch) and re-wrap views when it has
- Add a small typed interface per buffer (e.g. `ActorsView`, `LightsView`, `TilesView`, `CameraView`) exposing the per-field arrays and live count, for `render`'s other slices (`world-tiles`, `sprites`, `lighting`) to consume later
- Add TypeScript unit tests (using the Vitest runner from task:07) that import the built `engine-core` package, construct an `EngineState`, write known values into it (using task:08's write methods), read them back through this task's reader code, and assert the exact expected values — this is the reader-side half of the boundary test described in `docs/principles/test-driven-development.md`

## Definition of Done

- [ ] A reader module exists per buffer (actors, lights, tiles, camera) returning correctly-typed, correctly-strided views into WASM memory
- [ ] Reader code re-fetches/re-wraps views when WASM memory has grown, verified by a test that forces a memory growth scenario (or, if forcing real growth isn't practical, a test that asserts the re-check logic runs every frame call)
- [ ] `pnpm --filter render test` passes, including at least one round-trip test per buffer type using real values written via `engine-core`'s write methods
- [ ] No per-frame heap allocation in the steady-state read path (views are reused, not reconstructed, when memory hasn't grown)
- [ ] Reader module's public interface is documented with a short comment block describing the shape each `*View` type exposes

## Out of Scope

- Actually drawing anything with this data (no changes to `world-tiles`, `sprites`, `lighting`, or `loop.ts` consuming these views yet) — this task only builds the read path, wiring it into the render loop is future work
- Changing the buffer schema itself — if the schema in `docs/architecture/wasm-bridge.md` seems wrong or incomplete while implementing this, flag it as a new known gap rather than silently changing it
- Visibility culling or filtering of which tiles/actors/lights are "in view" — this task reads whatever `engine-core` exposes as the live count, with no filtering logic

## Implementation Steps

1. **Confirm task:08's getter API** — read `packages/engine-core/pkg/engine_core.d.ts` (built output) to see the exact generated method names and pointer/count getter signatures
2. **Create the reader slice folder** in `packages/render/src/` — one file or sub-folder per buffer type, following existing slice conventions (compare to `packages/render/src/world-tiles/index.ts`, `packages/render/src/lighting/index.ts`)
3. **Implement view construction** — given an `EngineState` instance, read its exposed WASM `memory` (via `engine-core`'s generated `pkg` output, which exposes the `WebAssembly.Memory` instance), and construct `Float32Array` views using each field's pointer + a fixed stride/offset matching task:08's layout
4. **Implement growth-safe re-fetch** — wrap view construction in a function callable every frame; internally check whether cached views are still valid against current `memory.buffer`, only reconstruct when stale
5. **Write Vitest tests** — import built `engine-core` package (task:08's output), populate known actor/light/tile/camera data via its write methods, call this task's reader functions, assert returned typed-array values match exactly
6. **Run `pnpm --filter render test`** and confirm passing

## Context

**Read first:**
- `docs/architecture/wasm-bridge.md` — exact schema and memory access pattern this task implements
- `docs/principles/test-driven-development.md` — why boundary tests matter here specifically
- `packages/engine-core/src/lib.rs` (post task:08) — the getter API this task consumes

**Related work:**
- task:07 (dependency: Vitest runner must exist in `render`)
- task:08 (dependency: buffer storage + getters must exist in `engine-core`)
- task:10 depends on this task's reader code existing

**Key files:**
- `packages/render/src/` (new slice folder)
- `packages/engine-core/pkg/engine_core.d.ts` (generated types this task reads against)
