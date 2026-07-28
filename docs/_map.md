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
| [`docs/features/demo-scope.md`](./features/demo-scope.md) | The Retro Mage demo proves a continuous global scene by connecting a small authored dungeon level to an outdoor level with visible preloading, traversal, collision, sprites, sky, and stylized lighting. |
| [`docs/features/level-transitions.md`](./features/level-transitions.md) | Retro Mage connects reusable level instances through explicit anchors and application-owned links while rendering both sides as one continuous global scene. |
| [`docs/features/world-model.md`](./features/world-model.md) | Retro Mage represents one continuous global 3D world made from reusable authored or application-generated level definitions placed as runtime instances. |

---

## Architecture

> System structure, technology decisions, data models, integration points.

| Doc | Summary |
|-----|---------|
| [`docs/architecture/asset-pipeline.md`](./architecture/asset-pipeline.md) | Retro Mage ships texture assets as KTX2/UASTC, compressed by the consuming game's build step and transcoded/uploaded at runtime by the engine's render package, splitting the compression step (build-time, app-owned) from the transcode step (runtime, engine-owned). |
| [`docs/architecture/collision-bridge.md`](./architecture/collision-bridge.md) | The world transport drives one world-aware tick while runtime-owned collision state feeds engine movement without caller-managed snapshots. |
| [`docs/architecture/collision.md`](./architecture/collision.md) | Retro Mage resolves player movement against active transformed level geometry while preserving a 3D-capable world and simple sliding movement for the initial ground-plane slice. |
| [`docs/architecture/crossing-policy.md`](./architecture/crossing-policy.md) | Retro Mage separates link preload relevance from narrow directional crossing and explicit re-arm hysteresis so active-world state changes only during intentional traversal. |
| [`docs/architecture/eviction-reload.md`](./architecture/eviction-reload.md) | Retro Mage releases unneeded level-instance content through protected deterministic eviction and reloads it through the same provider and transform validation path while application state remains opaque. |
| [`docs/architecture/example-deployment.md`](./architecture/example-deployment.md) | Retro Mage example apps deploy as static sites to S3 + CloudFront under pixeldrip.games subdomains, so anyone can test the engine without running a local dev server. |
| [`docs/architecture/input-schema.md`](./architecture/input-schema.md) | Retro Mage normalizes gamepad and touch input into one fixed-shape event struct — two analog vectors, a reserved vertical axis, and a 12-slot button bitmask — that the input package produces and engine-core consumes identically regardless of source device. |
| [`docs/architecture/lighting.md`](./architecture/lighting.md) | Retro Mage computes surface shading using dynamic 2D lighting lookup tables (LUTs) generated at runtime, mapping surface base colors and active point lights read from engine-core's WASM buffer to shaded pixel colors. |
| [`docs/architecture/persistence-restore.md`](./architecture/persistence-restore.md) | Retro Mage restores application-owned instance state after base content reload while keeping runtime identity, placement, and activation safety engine-owned. |
| [`docs/architecture/provider-lifecycle.md`](./architecture/provider-lifecycle.md) | Retro Mage exposes application-owned level provider work through a pull-based request queue with explicit cancellation, terminal cleanup, retry identity, and stale-result rejection. |
| [`docs/architecture/rendering.md`](./architecture/rendering.md) | Retro Mage renders transformed level instances as one global retro 3D scene using depth-tested tile and polygon geometry, billboard sprites, stylized LUT lighting, and long-distance outdoor support. |
| [`docs/architecture/repo-structure.md`](./architecture/repo-structure.md) | Retro Mage is a pnpm monorepo where the engine ships as a consumable package, an example dungeon demonstrates it end to end, and every package is organized as vertical feature slices. |
| [`docs/architecture/scene-capacity.md`](./architecture/scene-capacity.md) | Retro Mage uses application-configured fixed scene capacities with atomic instance submission and observable overflow so global rendering never silently loses geometry. |
| [`docs/architecture/seam-rendering.md`](./architecture/seam-rendering.md) | Retro Mage renders connected level instances together in global coordinates so doorway, portal, terrain, and vertical transitions remain visually continuous. |
| [`docs/architecture/streaming-scheduler.md`](./architecture/streaming-scheduler.md) | The world runtime computes coarse level-instance residency intent from global relevance, transition links, and application pins, then schedules bounded provider work without changing crossing or simulation ownership. |
| [`docs/architecture/tech-stack.md`](./architecture/tech-stack.md) | Retro Mage runs as a phone-first browser engine built on a Rust/WASM core, WebGL2/WebGPU rendering, TypeScript input, Vite tooling, and staged PWA support. |
| [`docs/architecture/visibility.md`](./architecture/visibility.md) | Retro Mage separates renderer culling from gameplay awareness and uses global-world frustum, distance, depth, residency, and optional occlusion checks to limit draw work. |
| [`docs/architecture/wasm-bridge.md`](./architecture/wasm-bridge.md) | Retro Mage crosses the Rust/WASM and TypeScript boundary through explicit typed render-state views while keeping level content local to engine-owned simulation and global after instance transforms. |
| [`docs/architecture/world-runtime.md`](./architecture/world-runtime.md) | Retro Mage manages application-supplied level definitions as transformed runtime instances with explicit loading, residency, activation, persistence, and eviction states. |
| [`docs/architecture/world-streaming.md`](./architecture/world-streaming.md) | Retro Mage streams application-supplied level instances by relevance, preloads linked targets before visual reveal, and evicts unneeded content without interrupting global-world traversal. |
| [`docs/architecture/world-structure-partitioning.md`](./architecture/world-structure-partitioning.md) | Retro Mage permits separate storage and streaming strategies for indoor and outdoor content while composing both through one global runtime coordinate space. |

---

## Research

> Findings, experiments, model evaluations, prototyping notes.

| Doc | Summary |
|-----|---------|
| [`docs/research/known-gaps.md`](./research/known-gaps.md) | Tracks intentionally deferred capabilities and unresolved implementation details around the global level-instance runtime and seamless transition proof. |

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
