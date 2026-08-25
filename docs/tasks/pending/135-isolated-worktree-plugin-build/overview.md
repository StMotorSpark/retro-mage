---
task: "135"
slug: isolated-worktree-plugin-build
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-08-25
outcome: ""
---

# Make the Demo Proof Runnable From an Independently Installed Worktree

Ensure a clean pnpm workspace install builds every local package needed by the demo's Vite configuration before its browser proof runs.

## Desired Changes

- Repair the package/build dependency contract for the local `vite-plugin-ktx2` workspace package.
- Make `pnpm test:demo:persistence:proof` runnable after `pnpm install --frozen-lockfile` in a fresh, independent worktree.
- Preserve the existing Vite filesystem security allow-list and local workspace dependency model.

## Definition of Done

- [ ] A fresh worktree at the recorded revision, with its own `pnpm install --frozen-lockfile`, resolves `vite-plugin-ktx2` without relying on another worktree's generated `dist/` files.
- [ ] The persistence proof command builds the plugin or otherwise declares its build ordering before Vite loads `examples/demo/vite.config.ts`.
- [ ] The demo continues to consume `vite-plugin-ktx2` as a workspace dependency.
- [ ] No Vite filesystem allow-list change is used to mask cross-worktree package leakage.
- [ ] Focused plugin, demo typecheck/build, and applicable browser proof commands pass from the independent worktree.

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
