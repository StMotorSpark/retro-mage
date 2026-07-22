---
task: "07"
slug: test-tooling-bootstrap
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2025-06-15
outcome: ""
---

# Test Tooling Bootstrap

Wire a JS/TS unit test runner into `render` and `input` (and the workspace root), so tasks that follow can write real unit tests per `docs/principles/test-driven-development.md` instead of deferring test infra decisions.

## Desired Changes

- Add Vitest as the JS/TS test runner for `render` and `input` (choose Vitest per the "decided when the first real test is written" note in `docs/principles/test-driven-development.md` — this task is that decision point)
- Add a `test` script to `packages/render/package.json` and `packages/input/package.json` (e.g. `"test": "vitest run"`)
- Add a root-level workspace script (e.g. `pnpm -r test` or a root `package.json` `test` script) that runs tests across all workspace packages that define one
- Add a minimal `vitest.config.ts` (or shared config) per package if needed for TS path resolution — keep config minimal, no speculative features
- Add one trivial smoke test per package (e.g. `render/src/index.test.ts`, `input/src/index.test.ts`) asserting the package's entrypoint imports without error — proves the runner is wired, not a real feature test
- Confirm `engine-core`'s existing `cargo test` works as-is (Rust's built-in test runner needs no new tooling) — add a `test` script to `packages/engine-core/package.json` that shells out to `cargo test` for consistency with the other packages' `pnpm test` entrypoints

## Definition of Done

- [ ] `pnpm --filter render test` runs Vitest and passes (smoke test only)
- [ ] `pnpm --filter input test` runs Vitest and passes (smoke test only)
- [ ] `pnpm --filter engine-core test` runs `cargo test` and passes
- [ ] A root-level command runs all three packages' tests in one invocation
- [ ] `docs/principles/test-driven-development.md`'s "Test Runners" section is updated to state Vitest is the chosen runner for `render`/`input` (remove the "decided when the first real test is written" hedge now that it's decided)

## Out of Scope

- Any real feature tests beyond the smoke test — those land with the tasks that implement the features they cover (task:08, task:09, task:10)
- `examples/demo` test tooling — not part of this task; add only if/when a task needs it
- CI pipeline wiring (GitHub Actions, etc.) — not requested, out of scope until asked for
- `wasm-bindgen-test` / browser-WASM test runner setup — only plain `cargo test` is needed for now; add browser-WASM test tooling only if a future task needs WASM-runtime-specific test behavior

## Implementation Steps

1. **Add Vitest dependency** to `packages/render/package.json` and `packages/input/package.json` as a `devDependency` (match existing TypeScript version pinning style already in those files)
2. **Add `test` script** to both packages' `package.json`: `"test": "vitest run"`
3. **Add smoke test file** per package: `packages/render/src/index.test.ts` and `packages/input/src/index.test.ts`, each importing that package's `src/index.ts` and asserting it's defined (or asserting one known export exists)
4. **Add `test` script to `packages/engine-core/package.json`**: `"test": "cargo test"`
5. **Add root script** — check root `package.json` for existing workspace scripts pattern (see `build`/`typecheck` if present) and add a `test` script following the same convention (likely `pnpm -r test` or explicit `--filter` chain)
6. **Update `docs/principles/test-driven-development.md`** — "Test Runners" section: replace the hedge language with a direct present-tense statement that Vitest is the runner for `render`/`input`

## Context

**Read first:**
- `docs/principles/test-driven-development.md` — why this task exists, and the section this task resolves
- `docs/architecture/repo-structure.md` — package layout and pnpm workspace conventions

**Related work:**
- task:09 depends on this task's test runner existing
- task:10 depends on this task's test runner existing

**Key files:**
- `packages/render/package.json`, `packages/input/package.json`, `packages/engine-core/package.json`
- Root `package.json`
