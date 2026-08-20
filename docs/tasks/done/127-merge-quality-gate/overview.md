---
task: "127"
slug: merge-quality-gate
status: done
depends-on: ["124", "125", "126"]
blocked-by: ""
assigned-to: ""
created: 2026-08-07
outcome: "Movement proof now polls documented grounded support, zero vertical velocity, and exact expected support height after route predicates; touchend cleanup runs in finally. Fresh cache-cleared `pnpm test:demo:e2e` passed 12/12 three times. `pnpm lint`, `pnpm typecheck`, and `pnpm test` passed; generated E2E artifacts and Vite cache were removed."
---

# Reconcile Demo Branch Merge Quality Gate

The branch has clean repository state and passing required automated checks after demo placement, alpha, and outdoor-route repairs.

## Desired Changes

- Resolve lint violations in files touched by this branch and applicable shared lint/configuration issues so root lint is a reliable merge gate.
- Run complete typecheck, unit/Rust test, and demo browser suite after dependent repairs.
- Reconcile task filesystem state: remove empty stale `docs/tasks/in-flight/114-demo-asset-manifest/` directory and preserve the completed task record in `done/`.
- Inspect final diff for generated test artifacts, accidental files, misleading commit metadata, and unresolved merge conflicts.
- Record exact verification evidence in this task outcome; do not mark done if any required gate fails.

## Definition of Done

- [ ] `pnpm lint` exits 0 with no errors.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm test` exits 0.
- [ ] `pnpm test:demo:e2e` exits 0 using configured deterministic browser settings.
- [ ] No generated `test-results/`, Playwright reports, traces, screenshots, or Vite caches are tracked or left in working tree.
- [ ] `docs/tasks/in-flight/` contains no stale empty task directory and task frontmatter/folder state is consistent.
- [ ] `git status --short` is clean after intentional task lifecycle changes and final commit preparation.

## Out of Scope

- New feature work, visual redesign, editor/inspector implementation, or broad formatting unrelated to lint failures.
- Rewriting history or altering unrelated historical commit messages unless explicitly requested by repository owner.
- Masking test failures with skipped tests, lower timeouts, retries, or assertion weakening.

## Implementation Steps

1. Wait for tasks 124–126 to reach `done`; inspect their diffs and outcomes rather than trusting completion text.
2. Run root lint and fix actual violations with narrow changes. Update types rather than using `any` or suppression where practical.
3. Remove stale task directory and test artifacts. Confirm `.gitignore` and tracked-file state do not retain generated output.
4. Run all required root commands serially; investigate and repair failures rather than recording a false pass.
5. Inspect final branch diff against `origin/main`, merge-base conflict risk, and task state. Complete this task only with exact passing command evidence.

## Context

**Read first:**
- `docs/principles/test-driven-development.md` — automated ground truth requirement.
- `docs/features/demo-experience.md` — demo acceptance behavior.
- `docs/research/known-gaps.md` — single-worker browser-proof constraint.

**Related work:**
- task:124 — tree placement/collision repair.
- task:125 — sprite alpha visual proof.
- task:126 — outdoor containment and route repair.

**Key files/paths:**
- `package.json`
- `eslint.config.js`
- `docs/tasks/in-flight/114-demo-asset-manifest/`
- `test-results/`
- `examples/demo/tests/`


## Verification Failure

Independent root-gate verification on 2026-08-07 rejected completion:

```text
pnpm lint                                      PASS
pnpm typecheck                                 PASS
pnpm test                                      PASS
pnpm test:demo:e2e                             FAIL (11 passed, 1 failed)

full-route.spec.ts: production touch completes dungeon-to-throne route
first dungeon-to-outdoor movement predicate timed out after 15s
last pose: x=16.1660099029541, y=0, z=29.16624641418457
```

The isolated route tests pass but the configured serial complete E2E suite fails. Reproduce from a clean Vite cache, identify the cross-suite/runtime cause, repair without retrying or weakening assertions, and rerun all four required root gates.


## Verification Failure: WebGL Context Startup

Independent verification on 2026-08-07 rejected completion:

```text
rm -rf test-results playwright-report examples/demo/node_modules/.vite
pnpm test:demo:e2e
FAIL: 11 passed, 1 failed

full-route.spec.ts failed before demo readiness:
Demo failed to start: Error: Skybox VS compile error: null
createSkyboxRenderer → createLoop → createRenderer → main
```

The configured serial suite passes earlier specs but intermittently cannot compile the skybox vertex shader for the full-route page. Diagnose browser/context/resource lifecycle or test startup isolation. Do not add retries, weaken readiness assertions, or suppress shader errors.


## Verification Failure: Vertical Movement Timing

Independent verification on 2026-08-07 rejected completion after the first fresh E2E pass:

```text
fresh E2E run 1: PASS 12/12
fresh E2E run 2: FAIL 11/12

movement.spec.ts vertical movement demo
position after moving past ramp bottom: y = 0.12380145490169525
assertion: expected y < 0.1
```

The test observes a legitimate in-flight settling frame after its movement predicate completes. Synchronize on documented grounded/support state rather than a scheduler-dependent frame. Preserve test intent and do not weaken physics assertions, add retries, or use fixed sleeps.
