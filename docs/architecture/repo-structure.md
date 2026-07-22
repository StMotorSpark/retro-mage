---
feature: repo-structure
tags: [architecture, monorepo, packages, agent-first]
summary: Retro Mage is a pnpm monorepo where the engine ships as a consumable package, an example dungeon demonstrates it end to end, and every package is organized as vertical feature slices.
relates-to:
  - "[Tech Stack](./tech-stack.md)"
  - "[Agent Development Principles](../principles/agent-dev-principles.md)"
  - "[Rendering](./rendering.md)"
---

# Repo Structure

Retro Mage is both an engine and a proof of that engine. The repo holds the engine's packages plus one example game that exercises them, structured so the engine is consumable by other, separate game repos.

## Overview

The repo is a pnpm-based monorepo. Three packages make up the engine — `engine-core` (Rust/WASM), `render` (TypeScript), `input` (TypeScript) — and one example app demonstrates them wired together as a minimal playable dungeon. Other game repos consume the engine packages directly rather than forking or copying this repo.

## Layout

```
retro-mage/
  packages/
    engine-core/     # Rust -> WASM: game loop, world state, fixed-point math,
                      # tile/polygon world model, visibility, collision
    render/           # TypeScript: WebGL2/WebGPU renderer, vertical slices per
                      # rendering feature (lighting, skybox, sprites, world-tiles)
    input/            # TypeScript: gamepad + touch overlay abstraction, normalized
                      # input events consumed by engine-core
  examples/
    demo/             # Vite app: minimal dungeon wiring engine-core + render +
                      # input into a playable scene
  docs/
    _map.md
    architecture/
    features/
    principles/
    research/
    tasks/
```

## Package Roles

- **`engine-core`** owns simulation truth: world state, entity/actor data, fixed-point math, tile/polygon geometry, visibility determination, collision. It has no rendering or input concerns — it exposes state and accepts normalized input events across the WASM boundary.
- **`render`** owns everything GPU-facing: shaders, lighting LUTs, sprite drawing, skybox, painter's-algorithm sorting. It reads world state from `engine-core` every frame and draws it; it holds no gameplay logic.
- **`input`** owns device abstraction: gamepad polling, touch overlay (virtual thumbstick, d-pad, contextual buttons), and normalization into the input event shape `engine-core` consumes. It holds no rendering or simulation logic.
- **`examples/demo`** is the thinnest possible glue: a Vite app that imports all three packages and runs a small, real dungeon scene. It exists to prove the engine works end to end and to give agents a concrete, runnable reference when iterating on any package.

## Internal Organization — Vertical Slices

Within `render` and `input`, folders are organized by feature slice, not by technical layer, per [Agent Development Principles](../principles/agent-dev-principles.md). `engine-core`, as a Rust crate, mirrors this at the module level — modules are named for the feature they own (`world_tiles`, `visibility`, `actors`), not for generic layers (`utils`, `types`, `helpers`).

## Consuming the Engine From Another Game Repo

A separate game repo built on Retro Mage depends on `engine-core`, `render`, and `input` as packages rather than including this repo's source directly:

- During active co-development, a consuming repo can reference the packages via the workspace protocol (a local path or symlinked dependency), so changes to the engine are immediately visible without a publish step.
- Once a package's slice is stable, it is versioned and published (private registry or a git-tag dependency) so consuming repos pin to a known-good version instead of tracking a moving workspace path.
- The example app in `examples/demo` is never a dependency of another repo — it is a reference implementation only, kept in this repo to demonstrate and validate the engine packages.

## Related Docs

- [Tech Stack](./tech-stack.md) — the technologies each package is built with and why
- [Agent Development Principles](../principles/agent-dev-principles.md) — the vertical-slice rule this layout follows
- [Rendering](./rendering.md) — the feature slices inside the `render` package
