---
task: "95"
slug: restore-bridge
status: done
depends-on: ["94"]
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: "Exported restore operations and diagnostics through WorldTransport. Added TS interfaces and reader mapping. Adapter tests prove mapping without leaking payload."
---

# Expose Restore Through WASM and TypeScript

Expose the completed engine restore lifecycle through the production `WorldTransport` WASM/browser boundary with typed diagnostics and adapter coverage.

## Desired Changes

- Export restore start/completion operations through `WorldTransport`.
- Export restore status, attempt count, state version, failure reason, and activation block reason per instance.
- Keep opaque application handles/payloads opaque at the bridge boundary.
- Update TypeScript transport interfaces/readers to consume the engine-owned fields.
- Preserve stable existing scene, residency, collision, and provider transport behavior.
- Add Rust/WASM-adapter/TypeScript tests for field mapping, status mapping, failure data, and absent/empty values.

## Definition of Done

- [ ] Browser-facing API can start and complete restore through production transport, not direct lifecycle mutation.
- [ ] Every exported diagnostic maps to engine state with documented enum/value semantics.
- [ ] Restore failure reason and state version cross the boundary without payload leakage.
- [ ] Existing transport readers remain compatible and existing fields retain behavior.
- [ ] Adapter tests prove success, pending, failed, retry, and blocked activation mappings.
- [ ] Package typecheck/build and relevant Rust/WASM tests pass.
- [ ] No demo fixture or Playwright test changes are included.

## Out of Scope

- Engine restore state machine; task:94 owns it.
- Demo persistence store and browser proof; task:96 owns them.
- Application serialization/storage, migration, actor transfer, geometry mutation, or visual changes.

## Implementation Steps

1. Read `docs/architecture/persistence-restore.md` and task:94 outcome. Inspect existing `WorldTransport` Rust exports, generated bindings, `packages/render/src/world-state/transport.ts`, types, and tests.
2. Agree API names/signatures with task:94’s committed boundary; avoid a second lifecycle authority in TypeScript.
3. Add bindings and typed reader fields for restore operations and diagnostics. Preserve existing ABI/view conventions.
4. Add focused adapter tests and run package typecheck/build plus relevant engine tests.
5. Verify no generated browser artifacts enter the commit.

## Context

- Read: `docs/architecture/persistence-restore.md` — source of truth.
- Read: `docs/architecture/wasm-bridge.md` — bridge ownership rules.
- Related: task:94 — core restore lifecycle prerequisite.
- Related: task:96 — browser proof consumer.
- Key files: `packages/engine-core/src/world_transport.rs`, `packages/render/src/world-state/transport.ts`, `packages/render/src/world-state/types.ts`, associated tests/bindings.
