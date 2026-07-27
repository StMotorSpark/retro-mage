---
task: "63"
slug: browser-seamless-proof
status: done
depends-on: ["62"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Added browser debug snapshots and Playwright WebGL coverage for target visibility, forward/reverse traversal, render continuity, and failed outdoor preload source safety."
---

# Verify Seamless Transition in Browser

Use the demo browser test workflow to verify the player-visible global transition.

## Desired Changes

- Add deterministic debug hooks for player pose, residency, and active instance.
- Test target visibility before crossing.
- Test forward and reverse traversal.
- Test no load screen/blank frame at the transition.
- Test source safety when target loading fails.

## Definition of Done

- [ ] Headless browser test starts the demo and waits for assets/WASM.
- [ ] Target geometry is observable before threshold crossing.
- [ ] Player crosses and returns without coordinate discontinuity.
- [ ] Render remains valid during preload and failure paths.
- [ ] Test runs with documented WebGL flags and stable waits.

## Out of Scope

- Pixel-perfect visual regression.
- Mobile device lab testing.
- WebGPU.

## Implementation Steps

1. Read demo-scope and Playwright testing skill instructions.
2. Add temporary or supported debug inspection hooks.
3. Test synthetic movement and transition states.
4. Keep test assertions on runtime state and visible scene evidence.

## Context

- Read: `docs/features/demo-scope.md`
- Read: `.pi/skills/test-demo-playwright/SKILL.md`
- Depends on task 62.
