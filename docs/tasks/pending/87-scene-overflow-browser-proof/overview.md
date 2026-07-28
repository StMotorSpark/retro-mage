---
task: "87"
slug: scene-overflow-browser-proof
status: pending
depends-on: ["86"]
blocked-by: ""
assigned-to: ""
created: 2026-07-28
outcome: ""
---

# Prove Scene Overflow in Browser

Add deterministic browser coverage and diagnostics for configured scene overflow, atomic omission, and default crossing rejection.

## Desired Changes

- Add a small intentional overflow fixture to the demo or dedicated browser test setup.
- Expose structured overflow diagnostics through a stable test hook or diagnostics callback.
- Verify accepted source content remains visible when target content overflows.
- Verify target crossing is rejected by default and source remains playable.
- Verify diagnostics identify the overflowing category and instance.
- Keep normal demo capacities and seamless proof behavior unchanged.
- Document the browser test command and any single-worker requirement.

## Definition of Done

- [ ] Playwright deterministically triggers tile, actor, or light capacity overflow.
- [ ] Browser test observes structured diagnostics without relying only on console text or pixels.
- [ ] Accepted scene content remains rendered after overflow.
- [ ] Default crossing rejection is observed from browser input/API behavior.
- [ ] Source movement/collision continues after target rejection.
- [ ] Normal seamless demo and PWA regression tests pass with no overflow.
- [ ] Test fixture does not depend on timing races or network availability.

## Out of Scope

- Capacity contract design (task 84).
- Atomic publication implementation (task 85).
- Crossing policy implementation (task 86).
- Visual polish or image-quality validation.
- Parallel Playwright worker hardening.

## Implementation Steps

1. Read `docs/architecture/scene-capacity.md` and existing browser test and demo integration patterns.
2. Add deterministic fixture configuration that exceeds one configured category while keeping source content within capacity.
3. Add a diagnostics test hook or use the documented transport diagnostics API.
4. Exercise overflow, render observation, rejected crossing, and continued source movement.
5. Add cleanup/reset so fixture state cannot leak into normal demo tests.
6. Run the focused Playwright test plus seamless and PWA regression suites.

## Context

- Read: `docs/architecture/scene-capacity.md` — source of truth.
- Related: task:86 — crossing gate must exist first.
- Key files: `examples/demo/src/main.ts`, `examples/demo/tests/browser-seamless.spec.ts`, `playwright.config.ts`, `packages/render/src/world-state/`.
