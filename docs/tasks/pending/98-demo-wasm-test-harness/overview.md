---
task: "98"
slug: demo-wasm-test-harness
status: pending
depends-on: ["95"]
blocked-by: ""
assigned-to: ""
created: 2026-07-29
outcome: ""
---

# Stabilize Demo WASM Test Harness

Make demo browser tests consume freshly built engine-core WASM bindings through a deterministic, bounded test command.

## Desired Changes

- Add a documented/scripted persistence browser test command that builds engine-core WASM and dependent packages before launching Vite.
- Ensure generated bindings expose `begin_restore`, `complete_restore`, and restore diagnostics consumed by the demo.
- Prevent stale Vite dependency cache, demo `dist`, or reused dev servers from masking binding changes during focused proof runs.
- Add an early browser preflight that reports missing restore exports as a clear harness failure.
- Use bounded serial Playwright execution for persistence proof.
- Preserve existing demo build, PWA, seamless, provider, overflow, and eviction/reload commands.
- Keep generated WASM/build output out of git unless already tracked by repository convention.

## Definition of Done

- [ ] `pnpm --filter engine-core build` produces bindings containing all restore operations/diagnostics.
- [ ] `pnpm --filter render build` and `pnpm --filter demo build` consume those bindings successfully.
- [ ] Fresh-server persistence test command exists and does not depend on a stale reused Vite process.
- [ ] Browser preflight fails clearly when restore exports are missing.
- [ ] Focused persistence Playwright command is bounded, serial, and reproducible.
- [ ] Existing demo/package tests remain passing.
- [ ] No generated traces, screenshots, recordings, cache directories, or temporary patch files enter the commit.

## Out of Scope

- Persistence lifecycle behavior; task:94 owns core behavior.
- WASM/TypeScript restore API shape; task:95 owns the bridge.
- Persistence browser scenario assertions; task:96 owns proof.
- Production save storage, migration, cloud sync, parallel worker hardening, or unrelated Vite features.

## Implementation Steps

1. Read `docs/architecture/persistence-restore.md`, task:95 outcome, `examples/demo/package.json`, `examples/demo/vite.config.ts`, `playwright.config.ts`, and `packages/engine-core/package.json`.
2. Trace how `engine-core/pkg` is built, imported, cached by Vite, and served to the demo. Identify whether generated bindings are stale during browser runs.
3. Add the smallest reliable package script or Playwright setup needed to build dependencies and start a fresh demo server for persistence proof. Avoid global cache deletion in normal commands; isolate cache invalidation to the proof harness.
4. Add an explicit browser binding preflight and bounded focused command. Keep existing default development workflow intact.
5. Run engine-core build, render/demo build, focused persistence proof setup checks, and relevant package tests. Remove all generated artifacts before commit.

## Context

- Read: `docs/architecture/wasm-bridge.md` — binding ownership and boundary rules.
- Read: `docs/architecture/persistence-restore.md` — restore API contract.
- Related: task:95 — bridge producer.
- Related: task:96 — blocked browser proof consumer.
- Key files: `packages/engine-core/package.json`, `packages/engine-core/src/world_transport.rs`, `examples/demo/package.json`, `examples/demo/vite.config.ts`, `playwright.config.ts`.
