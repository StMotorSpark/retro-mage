---
task: "78"
slug: streaming-browser-integration
status: pending
depends-on: ["76", "77"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Integrate and Prove Streaming Scheduler in Browser Demo

Expose scheduler requests and diagnostics through the WASM transport, connect the demo provider, and prove deterministic preload, cancellation, retention, and failure behavior in the browser.

## Desired Changes

- Expose scheduler policy/configuration, pending request identity, cancellation, intent, queue state, pin state, and lifecycle diagnostics through the browser transport.
- Connect the existing deterministic demo provider to scheduler-generated requests while retaining explicit test controls for delay and failure.
- Preserve engine-owned runtime lifecycle and crossing authority; TypeScript only supplies provider results and reads diagnostics.
- Add browser proof for coarse relevance-triggered preload, target non-active residency, bounded request behavior, failure/source preservation, cancellation/stale-result safety, and retention/eviction/reload.
- Keep debug state explicit enough that tests do not infer scheduler behavior from timing or pixels alone.
- Update architecture/known-gap docs to record implementation boundaries and remaining deferred work.

## Definition of Done

- [ ] Browser demo receives scheduler-generated provider requests without app-side coordinate-threshold crossing logic.
- [ ] Target becomes render-resident before crossing while active gameplay instance remains unchanged.
- [ ] Scheduler diagnostics expose intent, request ID, queue/loading state, and lifecycle state.
- [ ] Concurrent request count never exceeds configured limit in browser proof.
- [ ] Cancellation and stale completion cannot replace current content.
- [ ] Failed target keeps source render, collision, and gameplay state active.
- [ ] Unneeded content becomes evictable/evicted only after retention conditions and reloads safely when relevant again.
- [ ] Rust, TypeScript, build, and serial Playwright tests pass.
- [ ] Documentation accurately distinguishes implemented runtime scheduling from deferred memory heuristics, infinite regions, and renderer batching.

## Out of Scope

- Network-backed provider, worker provider, or production asset streaming.
- Byte-accurate memory budgets, adaptive pressure response, or infinite procedural worlds.
- Renderer buffer redesign or WebGPU.
- New topology authoring tools, combat, actor transfer, or multi-floor movement.
- Parallel Playwright hardening.
- Pixel-perfect visual regression.

## Implementation Steps

1. Read task:76 and task:77 outcomes plus `docs/architecture/streaming-scheduler.md`, `docs/architecture/wasm-bridge.md`, and `.pi/skills/test-demo-playwright/SKILL.md`.
2. Extend `WorldTransport` and TypeScript readers with stable scheduler diagnostics and provider request/result operations; preserve request identity and runtime validation.
3. Replace demo-only explicit preload triggers with scheduler-driven request handling while keeping deterministic delay/failure/cancellation controls for tests.
4. Add debug snapshots for desired intent, actual lifecycle, active instance, request IDs, queue depth, active loads, pins, and eviction.
5. Add Rust/TypeScript boundary tests and serial Playwright assertions for preload/crossing separation, concurrency, cancellation, failure preservation, eviction, and reload.
6. Regenerate WASM artifacts and clear Vite caches as required by the repository workflow.
7. Run package tests, typecheck/build, and documented `CI=1` serial Playwright proof.
8. Update `docs/research/known-gaps.md` and relevant architecture docs to reflect the delivered scheduler boundary.

## Context

- Read: `docs/architecture/streaming-scheduler.md` — complete scheduler target state.
- Read: `docs/architecture/wasm-bridge.md` — boundary schema ownership and tests.
- Read: `docs/features/demo-scope.md` — demo behavior and proof scope.
- Related: task:76 provides scheduler/provider runtime integration.
- Related: task:77 provides retention/eviction behavior.
- Key files: `packages/engine-core/src/world_transport.rs`, `packages/engine-core/src/world_runtime.rs`, `examples/demo/src/main.ts`, `examples/demo/src/demo-world.ts`, `examples/demo/tests/browser-seamless.spec.ts`, `packages/render/src/world-state/`.
