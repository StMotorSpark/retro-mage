---
task: "81"
slug: wasm-demo-collision-integration
status: pending
depends-on: ["80"]
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: ""
---

# Migrate WASM and Demo to World-Aware Collision

Remove normal application dependence on explicit collision snapshot synchronization and prove the world-aware tick through browser integration.

## Desired Changes

- Update `WorldTransport` WASM-facing API and demo callers to use world-aware ticking.
- Remove normal-flow calls to `sync_collision()`.
- Preserve direct collision APIs only where tests or compatibility require them.
- Add browser proof for automatic lifecycle collision updates and seamless movement/crossing.

## Definition of Done

- [ ] Demo uses world-aware tick path.
- [ ] Normal demo flow contains no manual collision snapshot sync.
- [ ] Browser proof covers inactive target, activation, crossing, and eviction collision behavior.
- [ ] Render/collision state remains consistent after provider completion and crossing.
- [ ] Existing seamless proof and PWA checks pass.

## Out of Scope

- Removing all legacy indoor/outdoor APIs.
- Full multi-floor movement.
- Persistence serialization.
- Renderer capacity work.

## Implementation Steps

1. Read collision bridge, WASM bridge, demo scope, and test-demo Playwright skill docs.
2. Trace `examples/demo/src/main.ts`, `WorldTransport`, and browser seamless tests.
3. Migrate callers from explicit collision sync to world-aware tick orchestration.
4. Add deterministic browser assertions for collision lifecycle behavior.
5. Run Rust, package, and single-worker Playwright verification.
6. Update relevant docs only where implementation boundaries differ from target state.

## Context

- Read: `docs/architecture/collision-bridge.md` — source of truth.
- Depends: task:80 (world-aware engine tick).
- Key files: `examples/demo/src/main.ts`, `examples/demo/tests/browser-seamless.spec.ts`, `packages/engine-core/src/world_transport.rs`.
- Follow-up: task:82 (compatibility cleanup).
