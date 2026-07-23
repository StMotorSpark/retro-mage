---
summary: Master index of all design docs in the FaM system.
tags: [meta, index]
---

# Design Doc Map

Master index of all design documentation for this project. Read this before starting any feature work to understand what knowledge exists and where to find it.

Each entry links to a design doc and includes the doc's one-line summary. Docs describe target state in present tense.

---

## Features

> Core feature mechanics and domain logic. Add docs here as you develop features.

| Doc | Summary |
|-----|---------|
| [`docs/features/world-model.md`](./features/world-model.md) | Retro Mage represents the game world as a grid-ish, real-time dungeon-crawler space indoors and chunked terrain outdoors, with room for simulation depth layered on top. |

---

## Architecture

> System structure, technology decisions, data models, integration points.

| Doc | Summary |
|-----|---------|
| [`docs/architecture/asset-pipeline.md`](./architecture/asset-pipeline.md) | Retro Mage ships texture assets as KTX2/UASTC, compressed by the consuming game's build step and transcoded/uploaded at runtime by the engine's render package, splitting the compression step (build-time, app-owned) from the transcode step (runtime, engine-owned). |
| [`docs/architecture/example-deployment.md`](./architecture/example-deployment.md) | Retro Mage example apps deploy as static sites to S3 + CloudFront under pixeldrip.games subdomains, so anyone can test the engine without running a local dev server. |
| [`docs/architecture/input-schema.md`](./architecture/input-schema.md) | Retro Mage normalizes gamepad and touch input into one fixed-shape event struct — two analog vectors, a reserved vertical axis, and a 12-slot button bitmask — that the input package produces and engine-core consumes identically regardless of source device. |
| [`docs/architecture/rendering.md`](./architecture/rendering.md) | Retro Mage renders a tile/polygon hybrid world with sprite-based actors, painter's-algorithm sorting, and lookup-table lighting, extended with longer draw distances and dynamic outdoor rendering for a modern-scale retro look. |
| [`docs/architecture/repo-structure.md`](./architecture/repo-structure.md) | Retro Mage is a pnpm monorepo where the engine ships as a consumable package, an example dungeon demonstrates it end to end, and every package is organized as vertical feature slices. |
| [`docs/architecture/tech-stack.md`](./architecture/tech-stack.md) | Retro Mage runs as a phone-first browser engine built on a Rust/WASM core, WebGL2/WebGPU rendering, TypeScript input, Vite tooling, and staged PWA support. |
| [`docs/architecture/visibility.md`](./architecture/visibility.md) | Retro Mage determines what's visible each frame with one occlusion-aware, light-driven cull that runs identically across a single seamless world, fed by two streaming strategies for indoor and outdoor space. |
| [`docs/architecture/wasm-bridge.md`](./architecture/wasm-bridge.md) | Retro Mage crosses the WASM boundary via fixed-size typed-array buffers that engine-core writes and render reads as zero-copy views into WASM linear memory. |
| [`docs/architecture/world-streaming.md`](./architecture/world-streaming.md) | Retro Mage streams indoor rooms and outdoor terrain chunks in and out as the player moves using distance/proximity triggers, hop-based load-ahead, and per-seam coordinate translation, so the two data structures behind the seamless world of Visibility never require a load screen or level swap. |

---

## Research

> Findings, experiments, model evaluations, prototyping notes.

| Doc | Summary |
|-----|---------|
| [`docs/research/known-gaps.md`](./research/known-gaps.md) | Tracks unresolved design questions that block specific implementation tasks, to be resolved in future design conversations as work reaches them. |

---

## Principles

> Design philosophy, constraints, guiding decisions that cut across features.

| Doc | Summary |
|-----|---------|
| [`docs/principles/agent-dev-principles.md`](./principles/agent-dev-principles.md) | Code and docs are organized as discoverable vertical feature slices because agents, not humans, are the primary coding actor. |
| [`docs/principles/test-driven-development.md`](./principles/test-driven-development.md) | Every slice and every boundary — especially loosely-coupled connector points like WASM buffer schemas — carries unit tests written alongside the code, because agents need fast, automated ground truth rather than manual verification. |

See also [`AGENTS.md`](../AGENTS.md) for Filesystem as Memory principles.

---

## Game Design / Product

> Top-level vision, loop structure, and progression.

_No product docs yet._

---

## Meta

| Doc | Summary |
|-----|---------|
| [`docs/_map.md`](./_map.md) | This file — master index of all design docs |

---

## Usage

- Use `/skill:design-doc` to create or update docs
- Keep this file updated when docs are added or changed
- All docs follow the four FaM principles defined in [`AGENTS.md`](../AGENTS.md)
