---
task: "103"
slug: vertical-movement-browser-proof
status: done
depends-on: ["102"]
blocked-by: ""
assigned-to: ""
created: 2026-07-30
outcome: "Proved vertical movement in browser via deterministic Playwright coverage (movement.spec.ts). Verified ramp ascent/descent, ledges, falling, landing, steep ramp blocking, and ceiling clearance through diagnostic hooks."
---

# Prove Vertical Movement in Browser

Add deterministic serial Playwright coverage for ramp movement, gravity, landing, slope blocking, ceiling clearance, and regression safety.

## Desired Changes

- Extend production demo diagnostics with pose, grounded, vertical velocity, selected support, and movement-blocking evidence.
- Add browser scenarios driven through real input and world-aware transport.
- Verify continuous ramp elevation, ledge fall, landing, steep-ramp blocking, and low-ceiling clearance.
- Preserve seamless traversal, persistence, PWA, overflow, provider, and eviction/reload proofs.
- Keep execution serial and deterministic under the existing test harness.

## Definition of Done

- [x] Browser fixture ascends and descends ramp with monotonic expected Y movement.
- [x] Player walks off ledge, enters falling state, lands, and becomes grounded.
- [x] Too-steep ramp blocks uphill movement without corrupting pose.
- [x] Low ceiling prevents body/head penetration.
- [x] Diagnostics prove support selection and vertical velocity transitions, not merely DOM/object existence.
- [x] Existing browser proof suites pass serially.
- [x] Focused command is documented and bounded.
- [x] No screenshots, traces, caches, or generated artifacts enter git.

## Out of Scope

- Parallel Playwright hardening.
- Visual art review beyond functional geometry evidence.
- Mobile performance optimization beyond recording obvious regressions.
- New gameplay systems.

## Implementation Steps

1. Read task:102 outcome and existing Playwright skills/configs before changing fixtures.
2. Add deterministic movement zones/debug hooks through the production browser boundary.
3. Use synthetic touch/gamepad input only through existing supported input paths.
4. Assert exact lifecycle/state transitions with serial timing and clear diagnostics.
5. Run focused vertical proof plus full relevant regression commands; remove all generated artifacts.

## Context

- Read: `docs/architecture/vertical-movement.md`.
- Read: `docs/architecture/collision-bridge.md`.
- Read: `.pi/skills/test-demo-playwright/SKILL.md`.
- Depends on: task:102.
- Key files: `examples/demo/tests/`, `examples/demo/src/main.ts`, `playwright.config.ts`, `playwright.persistence.config.ts`.
