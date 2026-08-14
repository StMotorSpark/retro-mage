---
task: "127"
slug: merge-quality-gate
status: done
depends-on: ["124", "125", "126"]
blocked-by: ""
assigned-to: ""
created: 2026-08-07
outcome: "Removed stale empty in-flight Task 114 directory; removed generated Playwright results/traces and Vite caches (none tracked/remain). Verified serially from clean state: pnpm lint (PASS); pnpm typecheck (PASS); pnpm test (PASS: engine-core 119 unit + 5 integration, input 6, KTX2 2, render 48); pnpm test:demo:e2e (PASS: 12 tests, 1 worker). Final git status --short is clean after this task lifecycle/fix commit."
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
