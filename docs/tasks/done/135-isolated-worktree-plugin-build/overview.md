---
task: "135"
slug: isolated-worktree-plugin-build
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-08-25
outcome: "A fresh independent worktree installed with pnpm --frozen-lockfile and passed plugin tests, demo typecheck, and both browser proofs. The demo prebuild compiles vite-plugin-ktx2 before Vite config loading; proof scripts build all generated workspace entries without filesystem workarounds."
---

# Make the Demo Proof Runnable From an Independently Installed Worktree

Ensure a clean pnpm workspace install builds every local package needed by the demo's Vite configuration before its browser proof runs.

## Desired Changes

- Repair the package/build dependency contract for the local `vite-plugin-ktx2` workspace package.
- Make `pnpm test:demo:persistence:proof` runnable after `pnpm install --frozen-lockfile` in a fresh, independent worktree.
- Preserve the existing Vite filesystem security allow-list and local workspace dependency model.

## Definition of Done

- [x] A fresh worktree at the recorded revision, with its own `pnpm install --frozen-lockfile`, resolves `vite-plugin-ktx2` without relying on another worktree's generated `dist/` files.
- [x] The persistence proof command builds the plugin or otherwise declares its build ordering before Vite loads `examples/demo/vite.config.ts`.
- [x] The demo continues to consume `vite-plugin-ktx2` as a workspace dependency.
- [x] No Vite filesystem allow-list change is used to mask cross-worktree package leakage.
- [x] Focused plugin, demo typecheck/build, and applicable browser proof commands pass from the independent worktree.

## Completion Evidence

A detached worktree created from this branch received no linked `node_modules`, generated `dist/`, or WASM output. After `pnpm install --frozen-lockfile`, `packages/vite-plugin-ktx2/dist/index.js` was absent. The workspace symlink at `examples/demo/node_modules/vite-plugin-ktx2` resolved to that local package. Running `pnpm test:demo:persistence:proof` built `engine-core`, `input`, `render`, and the demo; the demo `prebuild` built `vite-plugin-ktx2` before `vite build` loaded `examples/demo/vite.config.ts`. Results: plugin Vitest 2/2; demo typecheck passed; persistence Playwright 6/6; dynamic-content Playwright 1/1. `examples/demo/vite.config.ts` and its `server.fs.allow` remained unchanged.

## Out of Scope

- Changing collision, traversal, persistence, or dynamic-content product behavior.
- Publishing the private plugin to an external registry.
- Symlinking `node_modules`, generated `dist/`, or WASM output across worktrees.

## Implementation Steps

1. Reproduce from a new `origin/main`-based worktree after `pnpm install --frozen-lockfile` and record package resolution paths.
2. Verify that `examples/demo/node_modules/vite-plugin-ktx2` links to `packages/vite-plugin-ktx2`, whose package entry is `dist/index.js` and is absent after a clean install.
3. Update the appropriate root script, workspace build graph, or package metadata so the plugin is built before Vite evaluates the demo config.
4. Re-run the proof using only local dependencies in the independent worktree; do not alter Vite server `fs.allow`.

## Context

- Read: `docs/architecture/asset-pipeline.md` — application build-time asset ownership.
- Related: task:133 — requires a valid independent baseline comparison but does not depend on this task's product behavior.
- Key files: `package.json`, `examples/demo/package.json`, `packages/vite-plugin-ktx2/package.json`, `examples/demo/vite.config.ts`.
- Reproduction: at `origin/main` revision `db247f2`, `pnpm install --frozen-lockfile` creates the demo workspace symlink but does not build `packages/vite-plugin-ktx2/dist/`; Vite then fails resolving its declared `main` entry `./dist/index.js` while loading the demo config.
