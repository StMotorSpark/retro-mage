---
feature: tech-stack
tags: [architecture, wasm, rust, rendering, pwa, mobile]
summary: Retro Mage runs as a phone-first browser engine built on a Rust/WASM core, WebGL2/WebGPU rendering, TypeScript input, Vite tooling, and staged PWA support.
relates-to:
  - "[Repo Structure](./repo-structure.md)"
  - "[Rendering](./rendering.md)"
  - "[Agent Development Principles](../principles/agent-dev-principles.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
---

# Tech Stack

Retro Mage is a retro-style 3D game engine targeting phone browsers, inspired by early-90s immersive sims like Ultima Underworld. It runs entirely client-side, with no server dependency for gameplay.

## Overview

The engine layers three technologies, each chosen for a specific role: a Rust/WASM core for simulation and math, a TypeScript rendering layer for GPU work, and a TypeScript input layer for cross-device controls. Vite drives the build. The target device is a modern phone browser (developed and validated against iPhone 16-class hardware), with the browser as the only distribution channel — no native wrapper, no app store, installable as a PWA.

## Core Engine — Rust compiled to WebAssembly

The simulation core (game loop, ECS-like world state, fixed-point math, tile/polygon world model, visibility and collision logic) is written in Rust and compiled to WebAssembly.

Rust is chosen over AssemblyScript or C++ specifically for agent development: it has the deepest training-data coverage of any WASM-target language, mature tooling (`cargo`, `wasm-pack`, `wasm-bindgen`), and a compiler that catches an agent's mistakes at compile time rather than allowing them to surface as runtime bugs discovered late. The borrow checker's friction is a net gain for an agent-driven workflow — errors are caught immediately, in place, with actionable messages.

## Rendering — WebGL2, with WebGPU as a forward path

Rendering is TypeScript, targeting WebGL2 as the baseline API for broad phone browser compatibility, with WebGPU support added as availability improves. The renderer implements the retro visual approach described in [Rendering](./rendering.md): tile/polygon hybrid geometry, sprite-based actors, painter's-algorithm depth sorting, and lookup-table-driven lighting, layered with longer draw distances and dynamic outdoor rendering than the games that inspire it.

## Input — TypeScript, device-adaptive

The input layer is TypeScript and abstracts over multiple input methods behind one interface consumed by the engine: physical gamepad, and touch overlays presenting a virtual thumbstick, d-pad, and contextual action buttons. Input handling is decoupled from rendering and simulation — the core engine only ever consumes normalized input events, regardless of source device.

## Build Tooling — Vite

Vite drives the dev server and production build for every TypeScript package and the example app. Builds are lean and static: the output is a set of static assets (JS, WASM binary, textures, shaders, manifest) servable from any static host or CDN, with no server-side rendering or backend build step.

## Platform Target — Mobile browser, PWA

The engine targets phone browsers as the primary platform. It is installable as a Progressive Web App, staged as follows:

- **Shell installability**: web manifest and service worker precache the app shell (JS, WASM binary, core CSS) so the engine installs to a home screen and launches without a network round-trip for the shell itself.
- **Asset caching**: static game assets (textures, tile sets, audio) are cached with a cache-first strategy and versioned cache-busting, so repeat sessions avoid re-downloading unchanged assets.
- **Full offline gameplay**: once asset budget and bundling strategy are proven out for a given game built on the engine, the full asset set is precached and gameplay runs with zero network dependency after first load. The engine core never assumes network availability mid-session — this stage is a caching strategy change, not an engine architecture change.

Performance validation happens against iPhone 16-class hardware as the reference device — comfortably capable hardware that keeps the retro rendering techniques inexpensive, leaving headroom for the modern-scale additions (longer draw distance, dynamic lighting, outdoor rendering) layered on top.

## Related Docs

- [Repo Structure](./repo-structure.md) — how the Rust/WASM core, render, and input packages are laid out and consumed
- [Rendering](./rendering.md) — the retro rendering techniques and modern additions built on this stack
- [Agent Development Principles](../principles/agent-dev-principles.md) — why Rust and vertical-slice organization are chosen for agent-driven development
- [WASM Bridge](./wasm-bridge.md) — the concrete data contract crossing the Rust/WASM ↔ TypeScript boundary this stack defines
