---
task: "71"
slug: stabilize-playwright-ci
status: done
depends-on: ["70"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "CI now forces one Playwright worker while preserving WebGL flags, explicit waits, and failure diagnostics. Three CI-mode serial browser runs passed; demo typecheck passed. Repository lint remains blocked by pre-existing unrelated errors in spike-ktx2, render tests, and vite-plugin-ktx2 tests."
---

# Stabilize Playwright CI Execution

Make the demo browser proof deterministic in CI by enforcing serial execution, preserving useful failure diagnostics, and documenting the worker policy without attempting parallel-browser hardening.

## Desired Changes

- Enforce one Playwright worker in CI while leaving local configuration usable.
- Keep SwiftShader/WebGL launch flags required by the demo proof.
- Retain page errors, console errors, traces, and useful test artifacts on failure.
- Verify serial execution repeatedly against the current seamless demo tests.
- Document that parallel worker hardening is intentionally deferred until suite size justifies it.

## Definition of Done

- [ ] Playwright config deterministically selects one worker when `CI` is set.
- [ ] Local Playwright invocation remains functional without requiring CI-only environment variables.
- [ ] Existing WebGL flags and explicit readiness waits remain intact.
- [ ] Failure diagnostics retain page/runtime errors and traces.
- [ ] Serial browser proof passes repeatedly with the configured policy.
- [ ] Relevant docs or task notes state why CI uses serial execution and that parallel hardening is deferred.
- [ ] No retry is used to conceal browser instability.

## Out of Scope

- Parallel worker investigation or optimization.
- Pixel-level visual regression.
- Deployed CloudFront validation.
- New demo behavior or engine changes.
- Fixed sleeps or relaxed assertions.

## Implementation Steps

1. Read `docs/research/known-gaps.md`, `.pi/skills/test-demo-playwright/SKILL.md`, and `playwright.config.ts`.
2. Inspect the current browser test diagnostics and workflow context. Choose the smallest config change that forces serial CI execution without damaging local runs.
3. Preserve existing WebGL launch flags, explicit readiness polling, page-error capture, console-error capture, and retain-on-failure traces.
4. Add a concise comment or adjacent documentation explaining serial CI policy and deferred parallel hardening.
5. Run typecheck/build prerequisites and execute the browser proof repeatedly with `CI=1` and one worker. Confirm no retries hide failures.
6. Update `docs/research/known-gaps.md` so the parallel-worker issue records the adopted serial policy and remaining deferred optimization.

## Context

- Read: `docs/research/known-gaps.md` — current parallel Playwright gap.
- Read: `playwright.config.ts` — test runner config.
- Read: `.pi/skills/test-demo-playwright/SKILL.md` — WebGL/cache/readiness requirements.
- Related: task:70 — async provider proof completed.
- Key files: `playwright.config.ts`, `examples/demo/tests/browser-seamless.spec.ts`, `docs/research/known-gaps.md`.
