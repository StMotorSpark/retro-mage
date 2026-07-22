---
task: "01"
slug: bootstrap-monorepo
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2025-06-01
outcome: "pnpm workspace bootstrapped (packages/*, examples/* members) with tsconfig.base.json (strict, ESNext/Bundler), Prettier + ESLint flat config, .editorconfig, and .gitignore covering node_modules/dist/target/*.wasm. Root scripts (build/dev/lint/typecheck/format) fan out via pnpm -r and no-op cleanly against empty workspace. Used corepack to pin pnpm 9.15.9 since pnpm wasn't preinstalled. Added type:module to package.json to silence ESM warning from flat-config eslint.config.js."
---

# Bootstrap Monorepo

Set up the pnpm workspace root and shared tooling so `packages/*` and `examples/*` can be added as workspace members.

## Desired Changes

- Add `pnpm-workspace.yaml` declaring `packages/*` and `examples/*` as workspace members
- Add root `package.json` with workspace scripts (`build`, `dev`, `lint`, `typecheck` — fan out to workspace members via pnpm `-r`)
- Add root `tsconfig.base.json` with shared TS compiler options (strict mode on) that per-package `tsconfig.json` files extend
- Add root `.editorconfig` and a formatter/linter config (Prettier + ESLint, TypeScript-aware) shared across packages
- Create empty `packages/` and `examples/` directories (each with a `.gitkeep` until populated by later tasks)
- Update root `.gitignore` for `node_modules`, `dist`, `target` (Rust build output), `*.wasm` build artifacts (source-controlled `.wasm` if any is explicitly excluded from this ignore)

## Definition of Done

- [ ] `pnpm install` succeeds at repo root with zero workspace members (empty workspace is valid)
- [ ] `pnpm -r run build` and `pnpm -r run lint` run without error against an empty workspace (no-op is acceptable)
- [ ] `tsconfig.base.json` exists and is referenced by name in this doc's Context section for later packages to extend
- [ ] Prettier/ESLint config present and runnable via a root script
- [ ] `.gitignore` covers `node_modules`, `dist`, `target`, build artifacts

## Out of Scope

- Creating any actual package content (engine-core, render, input, demo) — later tasks
- CI pipeline configuration
- Publishing configuration for any package

## Implementation Steps

1. **Workspace manifest** (`pnpm-workspace.yaml`)
   - Declare `packages/*` and `examples/*` as members
2. **Root package.json**
   - Set `"private": true`, `"packageManager"` field pinning pnpm version
   - Add scripts: `build`, `dev`, `lint`, `typecheck`, each running `pnpm -r run <script>` (or equivalent recursive form)
3. **Shared TypeScript config** (`tsconfig.base.json`)
   - `strict: true`, `target`/`module` set for modern bundler (ESNext/Bundler resolution), `skipLibCheck: true`
   - This file is the one later packages' `tsconfig.json` extend via `"extends": "../../tsconfig.base.json"`
4. **Formatter/linter**
   - Add Prettier config (`.prettierrc`) and ESLint config (`eslint.config.js` or equivalent flat config) with TypeScript plugin
   - Wire root `lint` script to run ESLint across the repo
5. **Ignore rules**
   - Update `.gitignore`: `node_modules/`, `dist/`, `target/`, `*.wasm` (built artifacts only — do not ignore any hand-authored `.wasm` if none exists yet, this is fine to leave broad)

## Context

**Read first:**
- `docs/architecture/repo-structure.md` — package layout this workspace supports
- `docs/architecture/tech-stack.md` — Vite, TypeScript, Rust/WASM stack this tooling serves

**Related work:**
- task:02, task:03, task:04 all depend on this task's `tsconfig.base.json` and workspace manifest existing

**Key files:**
- `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`
