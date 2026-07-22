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
| [`docs/architecture/rendering.md`](./architecture/rendering.md) | Retro Mage renders a tile/polygon hybrid world with sprite-based actors, painter's-algorithm sorting, and lookup-table lighting, extended with longer draw distances and dynamic outdoor rendering for a modern-scale retro look. |
| [`docs/architecture/repo-structure.md`](./architecture/repo-structure.md) | Retro Mage is a pnpm monorepo where the engine ships as a consumable package, an example dungeon demonstrates it end to end, and every package is organized as vertical feature slices. |
| [`docs/architecture/tech-stack.md`](./architecture/tech-stack.md) | Retro Mage runs as a phone-first browser engine built on a Rust/WASM core, WebGL2/WebGPU rendering, TypeScript input, Vite tooling, and staged PWA support. |

---

## Research

> Findings, experiments, model evaluations, prototyping notes.

_No research docs yet._

---

## Principles

> Design philosophy, constraints, guiding decisions that cut across features.

| Doc | Summary |
|-----|---------|
| [`docs/principles/agent-dev-principles.md`](./principles/agent-dev-principles.md) | Code and docs are organized as discoverable vertical feature slices because agents, not humans, are the primary coding actor. |

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
