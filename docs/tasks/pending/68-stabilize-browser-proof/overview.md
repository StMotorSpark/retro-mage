---
task: "68"
slug: stabilize-browser-proof
status: pending
depends-on: ["66", "67"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: ""
---

# Stabilize Seamless Browser Proof

Make the browser transition test deterministic and ensure debug state failures expose real page errors.

## Desired Changes

- Remove app-side transition shortcuts from test setup.
- Make debug snapshots safe to poll while the first frame initializes.
- Capture and fail clearly on page errors and runtime exceptions.
- Verify target visibility, forward crossing, reverse crossing, and failed preload.
- Keep Playwright WebGL flags and asset waits documented.

## Definition of Done

- [ ] Browser proof passes repeatedly without retries.
- [ ] Missing debug state produces useful diagnostics, not a secondary TypeError.
- [ ] Test observes engine-reported active instance/crossing state.
- [ ] Forward/reverse continuity assertions remain meaningful.
- [ ] Failure-preload scenario remains covered.

## Out of Scope

- Pixel-perfect visual regression.
- Mobile device lab testing.
- WebGPU.
- New gameplay systems.

## Implementation Steps

1. Read `.pi/skills/test-demo-playwright/SKILL.md`.
2. Add page-error/runtime diagnostics and null-safe polling.
3. Replace threshold-based assertions with engine transition state.
4. Run repeated browser tests under documented WebGL flags.

## Context

- Depends on tasks 66 and 67.
- Key file: `examples/demo/tests/browser-seamless.spec.ts`.
