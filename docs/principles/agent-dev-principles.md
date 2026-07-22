---
feature: agent-dev-principles
tags: [principles, agent-first, code-structure]
summary: Code and docs are organized as discoverable vertical feature slices because agents, not humans, are the primary coding actor.
relates-to:
  - "[Tech Stack](../architecture/tech-stack.md)"
  - "[Repo Structure](../architecture/repo-structure.md)"
  - "[Rendering](../architecture/rendering.md)"
  - "[Test-Driven Development](../principles/test-driven-development.md)"
---

# Agent Development Principles

Retro Mage is built primarily by AI coding agents, not humans. Every structural decision in the codebase optimizes for agent discoverability and safe iteration over conventional software-engineering purity (heavy dependency injection, deep abstraction layers, generic interfaces for hypothetical swappability).

## Overview

An agent operating on this codebase reads files, greps for context, and edits with limited working memory per turn. The primary risk is not "insufficiently abstract code" — it's an agent editing the wrong file, missing a related piece of logic split across layers, or introducing inconsistency because related code is scattered. Vertical-slice organization minimizes that risk: a feature's logic, types, shaders, and tests live together, in one place, discoverable by folder name alone.

## Core Rule: Folder Is Feature, Not Type

Code organizes by feature slice, never by generic technical layer. A slice folder contains everything needed to understand and modify that feature.

**Avoid** (layered by type):
```
render/
  shaders/
  materials/
  utils/
  managers/
```

**Prefer** (vertical slice):
```
render/
  lighting/       # LUT generation, application, shader, types
  skybox/         # atmospheric scattering, procedural clouds
  sprites/        # billboard actors, sprite effects
  world-tiles/    # tile/polygon hybrid geometry, painter's-algorithm sort
```

Each slice folder colocates its logic, types, shaders, and tests. An agent opens one folder and sees the whole feature — no hunting across `shaders/`, `types/`, `utils/` directories scattered by type.

## Package Boundaries Are the Exception

The monorepo splits `engine-core` (Rust/WASM), `render` (TypeScript), and `input` (TypeScript) as top-level packages. This split is not a violation of the vertical-slice rule — it exists because of a hard technical boundary (language and build toolchain), not a stylistic layering choice. Vertical slicing applies **inside** each package.

## Minimize Cross-Slice Coupling

- Slices avoid importing from each other directly where possible.
- Genuinely shared code lives in an explicit `shared/` or `core/` folder per package, kept intentionally small.
- A slice growing dependent on many other slices is a signal to reconsider its boundaries, not to add more shared abstraction layers.

## Prefer Concrete Code Over Speculative Abstraction

- No dependency injection frameworks, no interface-for-every-implementation, unless a real, current need for swappability exists.
- Code is written so an agent can trace a call path directly, without navigating through injected abstractions or generic factories.
- Duplication across two slices is acceptable when it keeps each slice self-contained and independently understandable; premature sharing is avoided.

## Docs Mirror Code

`docs/features/*.md` and the vertical slices in `packages/*/` mirror each other one-to-one wherever possible. A feature doc describes the target state of a slice; the slice folder implements it. When an agent needs context on a slice, the corresponding doc is the first stop.

## Related Docs

- [Tech Stack](../architecture/tech-stack.md) — technology choices this principle applies across
- [Repo Structure](../architecture/repo-structure.md) — how packages and slices are laid out on disk
- [Rendering](../architecture/rendering.md) — first concrete application of slice organization
- [Test-Driven Development](../principles/test-driven-development.md) — the testing discipline that lives inside each vertical slice
