# Retro Mage

Retro-style 3D dungeon-crawler engine for phone browsers, inspired by early-90s immersive sims (Ultima Underworld). Client-side only, installable as a PWA. Core sim in Rust/WASM, rendering + input in TypeScript, Vite for tooling.

See [`docs/architecture/tech-stack.md`](docs/architecture/tech-stack.md) for full stack rationale, [`docs/architecture/repo-structure.md`](docs/architecture/repo-structure.md) for package layout, and [`docs/_map.md`](docs/_map.md) for all design docs.

> This repo is built doc-first using Filesystem-as-Memory (FaM) + AI agent workflow. See [`AGENT-DEV-PROCESS.md`](./AGENT-DEV-PROCESS.md) for that process.

## Repo Layout

```
packages/
  engine-core/   # Rust → WASM sim core
  render/        # TypeScript, WebGL2 rendering
  input/         # TypeScript, gamepad + touch input
examples/
  demo/          # Vite app wiring engine-core + render + input, PWA shell
docs/            # design docs (source of truth)
```

## Prerequisites

- Node 18+ and [pnpm](https://pnpm.io/) 9.x (`packageManager` pinned in `package.json`)
- Rust toolchain + `wasm32-unknown-unknown` target
- [`wasm-pack`](https://rustwasm.github.io/wasm-pack/) (builds `engine-core`)

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

## Getting Started

```bash
pnpm install
pnpm build     # builds all packages (engine-core wasm, render, input)
pnpm dev       # runs demo app (Vite dev server)
```

Open the demo URL Vite prints. It wires `engine-core` + `render` + `input` and includes a PWA shell (manifest + service worker).

## Other Commands

```bash
pnpm lint        # eslint across repo
pnpm typecheck   # tsc --noEmit across TS packages
pnpm format      # prettier --write
```

## Testing

No automated test suite yet — the project is in early bootstrapping (engine-core, render, input skeletons + demo wiring only). Current validation is manual: run `pnpm dev`, load the demo in a phone browser (iPhone 16-class reference device), confirm render loop + input + PWA install work. Automated tests will be added per-package as functionality lands; check [`docs/_map.md`](docs/_map.md) and `docs/tasks/` for current status before assuming a test command exists.

## Working on This Project

1. Read [`docs/_map.md`](docs/_map.md) — index of all design docs
2. Read relevant feature/architecture docs before changing code — docs are target state, code follows them
3. Work is tracked as tasks in `docs/tasks/{pending,in-flight,done}/`
4. See [`AGENT-DEV-PROCESS.md`](./AGENT-DEV-PROCESS.md) for how docs/tasks/skills fit together
