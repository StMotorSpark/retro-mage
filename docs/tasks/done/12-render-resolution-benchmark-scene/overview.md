---
task: "12"
slug: render-resolution-benchmark-scene
status: done
depends-on: ["11"]
blocked-by: ""
assigned-to: ""
created: 2026-07-22
outcome: "Built non-canonical throwaway benchmark app in examples/bench/ with 30-tile corridor stress scene, 8 actors, and light animation. Added live rolling avg/p95/p99 frame-timing overlay and dynamic runtime DPR cap switching (100%, 85%, 70%, 50% & custom URL query param). Host server configured with vite --host for LAN reachability."
---

# Render Resolution Benchmark Scene

Build a throwaway (non-canonical) benchmark scene and on-screen frame-timing overlay so the actual internal-resolution pixel-budget cap value (left as a placeholder by task:11) can be determined by testing on real iPhone hardware over LAN.

## Desired Changes

- Add a new, clearly-marked-as-non-canonical example app or route (e.g. `examples/bench/`, sibling to `examples/demo/`) — do NOT modify or extend `examples/demo/` itself
- Scene content: a representative stress case, not the final game —
  - A room/corridor layout with tile + polygon geometry roughly matching expected real-scene density
  - 5–10 sprite actors on screen simultaneously (billboard sprites, using existing `sprites` renderer from `packages/render/src/sprites/`)
  - At least one dynamic light source exercised through the LUT lighting path (if the LUT lighting slice isn't implemented yet, use whatever placeholder lighting currently exists in `packages/render/src/lighting/` and note the gap rather than blocking on it — see Out of Scope)
  - Draw distance set to the project's "longer than era" target rather than a short/conservative view — this is the exact case the resolution cap must protect against
- An on-screen frame-timing overlay showing rolling average frame time, plus p95 and p99 frame time in ms over a sustained window (few hundred frames), not just an instantaneous FPS counter
- A way to switch the resolution cap at runtime without a rebuild — a URL query param (e.g. `?capDPR=0.5`) or an on-screen control — that overrides task:11's tunable cap config value for direct comparison across candidate settings

## Definition of Done

- [ ] `pnpm --filter <bench app> dev` (or equivalent) runs a standalone dev server servable over LAN, reachable from a phone browser on the same network as the host machine
- [ ] Scene renders the stress-case content described above using the real `render` package (via task:11's offscreen-framebuffer + blit path), not a mock
- [ ] On-screen overlay displays rolling avg / p95 / p99 frame time in milliseconds, updating live
- [ ] Resolution cap is switchable at runtime (query param or control) across at least 4 candidate settings (e.g. 100%, 85%, 70%, 50% of native effective DPR) without restarting the dev server
- [ ] README or top-of-file comment in the bench app clearly states this is a throwaway benchmarking tool, not a canonical example, and explains how to point a phone at it over LAN
- [ ] No changes made to `examples/demo/`

## Out of Scope

- Determining or writing the final cap number into `docs/architecture/rendering.md` or `docs/research/known-gaps.md` — this task only builds the tool; interpreting results and updating docs happens in a follow-up conversation once real device numbers are collected
- Building or improving the LUT lighting pipeline if it doesn't already exist — use current placeholder lighting, note as a known limitation in the bench app's README rather than blocking this task on it
- Polishing this scene as a real demo (visuals, UI chrome, asset quality) — functional stress-test only
- Any WebGL timer-query (`EXT_disjoint_timer_query_webgl2`) based GPU timing — iOS Safari support is inconsistent; use JS wall-clock frame timing (`performance.now()` deltas across `requestAnimationFrame` calls) instead
- Automated CI testing of this bench app — it is a manual, human-driven tool by design

## Implementation Steps

1. **Confirm task:11's tunable cap config shape** — read its implementation in `packages/render/src/context.ts` (or wherever it landed) to know exactly what value/interface to override at runtime.
2. **Scaffold the bench app** — copy `examples/demo`'s Vite/package.json/tsconfig setup as a starting structure into `examples/bench/`, strip it down, and mark clearly as non-canonical (README + file header comment).
3. **Build the stress scene** — construct placeholder tile/polygon geometry, sprite actor instances, and a light source using `render`'s existing public API (`createRenderer` from `packages/render/src/index.ts`), sized per the Desired Changes bullet list. If `engine-core` WASM wiring is more overhead than needed for a throwaway bench, static/hand-authored `WorldStateViews`-shaped data is acceptable here — this task does not need to exercise the full WASM bridge, only the render pipeline's GPU cost.
4. **Implement the frame-timing overlay** — a simple DOM overlay (not WebGL-rendered) sampling `performance.now()` each `requestAnimationFrame`, maintaining a rolling window (e.g. last 300 frames) and computing avg/p95/p99 from it.
5. **Implement the runtime cap override** — read a query param (e.g. `?capDPR=`) at startup and pass it into task:11's config entry point instead of its default.
6. **Verify LAN reachability** — confirm the dev server binds to `0.0.0.0` (or Vite's `--host` flag) so a phone on the same WiFi network can reach it via the host machine's LAN IP.
7. **Write the bench app's README** — usage instructions: how to start the dev server with LAN host flag, how to find the LAN URL, how to switch cap settings via query param, what the overlay numbers mean.

## Context

**Read first:**
- `docs/architecture/rendering.md` — "Internal Render Resolution and Upscaling" + "Performance Target" sections (60 FPS flat target, iPhone 16-class reference device)
- `docs/research/known-gaps.md` — "Internal Render Resolution Pixel Budget" entry, this task exists specifically to gather the data that resolves it

**Related work:**
- task:11 (dependency: this task overrides its tunable cap config value and renders through its offscreen-framebuffer + blit path)

**Key files:**
- `examples/demo/` — reference structure to copy from, do not modify
- `examples/bench/` — new app this task creates
- `packages/render/src/index.ts` — public `createRenderer` entry point this task consumes
- `packages/render/src/sprites/`, `packages/render/src/lighting/`, `packages/render/src/world-tiles/` — existing renderers to compose the stress scene from
