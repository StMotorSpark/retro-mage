---
task: "02"
slug: engine-core-skeleton
status: pending
depends-on: ["01"]
blocked-by: ""
assigned-to: ""
created: 2025-06-01
outcome: ""
---

# Engine Core Skeleton (Rust/WASM)

Create the `packages/engine-core` Rust crate, wired to compile to a WASM binary consumable as an npm package by the `render`/`input`/demo packages.

## Desired Changes

- Create `packages/engine-core/Cargo.toml` (crate name `engine-core`, `crate-type = ["cdylib", "rlib"]`)
- Add `wasm-bindgen` as a dependency; expose a minimal placeholder API surface (e.g. an `EngineState` struct with a `tick(dt: f64)` method and a way to read a simple placeholder value back) — enough to prove the build pipeline, not real simulation logic
- Add a `wasm-pack`-driven (or equivalent) build script producing a JS/TS-consumable package output (`pkg/` or similar) with generated `.d.ts` types
- Wire `packages/engine-core/package.json` so the built output is importable by other workspace packages via the workspace protocol
- Organize the crate with feature-oriented module names from the start (`src/lib.rs` plus a placeholder `src/world.rs` module) rather than generic `utils`/`helpers` modules, per agent-dev-principles
- Add root workspace script hookup so `pnpm --filter engine-core build` (or the chosen script name) builds the WASM package

## Definition of Done

- [ ] `cargo build` succeeds inside `packages/engine-core`
- [ ] WASM build command produces a `pkg/` (or equivalent) output directory containing `.wasm`, JS glue, and `.d.ts` files
- [ ] A placeholder TypeScript snippet (can live in this task's own scratch/test file, not shipped) can `import` the built package and call `tick()` without error
- [ ] `package.json` present so another workspace package can add `"engine-core": "workspace:*"` as a dependency
- [ ] Module layout uses feature-named files, not generic `utils.rs`/`helpers.rs`

## Out of Scope

- Real world state, tile/polygon geometry, fixed-point math, visibility, or collision logic — this is a placeholder API only, proving the build pipeline
- Any rendering or input logic
- Resolving the WASM↔JS bridge shape for real per-frame data (tracked in `docs/research/known-gaps.md`) — this task uses the simplest possible placeholder API and does not need to anticipate the final shape

## Implementation Steps

1. **Crate setup** (`packages/engine-core/Cargo.toml`)
   - `crate-type = ["cdylib", "rlib"]`, add `wasm-bindgen` dependency
2. **Placeholder API** (`packages/engine-core/src/lib.rs`, `src/world.rs`)
   - Define a `#[wasm_bindgen] pub struct EngineState` with `new()`, `tick(&mut self, dt: f64)`, and a getter returning a placeholder number (e.g. a tick counter) — proves round-trip works
   - Keep `world.rs` as a placeholder module for where real world-state logic lands later (per vertical-slice module naming)
3. **Build tooling**
   - Add a build script (npm script in `packages/engine-core/package.json`, e.g. `"build": "wasm-pack build --target web"`) producing the consumable package output
4. **Workspace wiring**
   - Ensure `packages/engine-core/package.json` has a `name` (`engine-core`) and `main`/`module`/`types` fields pointing at the built output
5. **Verify**
   - From a scratch script or ad hoc test, import the built package in TS and call `tick()` — confirms the pipeline works end to end

## Context

**Read first:**
- `docs/architecture/tech-stack.md` — why Rust/WASM, agent-fluency rationale
- `docs/architecture/repo-structure.md` — `engine-core` package role and boundaries
- `docs/principles/agent-dev-principles.md` — feature-named module convention
- `docs/research/known-gaps.md` — WASM↔JS bridge shape is still open; this task deliberately avoids depending on that resolution

**Related work:**
- task:01 (dependency: workspace/tsconfig must exist)
- task:05 depends on this task's built package being importable

**Key files:**
- `packages/engine-core/Cargo.toml`, `packages/engine-core/src/lib.rs`, `packages/engine-core/package.json`
