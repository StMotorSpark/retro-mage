---
feature: consumer-reference-app
tags: [consumer, demo, reference, integration]
summary: Retro Mage consumers inspect the demo by integration concern while treating it as a runnable reference rather than a reusable dependency.
relates-to:
  - "[Consumer Agent Guide](./agent-guide.md)"
  - "[Quickstart](./quickstart.md)"
  - "[Consumer Integration](../architecture/consumer-integration.md)"
  - "[Demo Scope](../features/demo-scope.md)"
---

# Consumer Reference App

`examples/demo` is a working reference build. It demonstrates a production-shaped Vite app using `engine-core`, `render`, and `input`; it is never imported, copied wholesale, or treated as a game framework dependency.

## Navigation Index

| Need | Reference location | Extract |
| --- | --- | --- |
| WASM, engine, renderer, input startup | `examples/demo/src/main.ts` | Initialization order and public package imports. |
| World-aware frame loop | `examples/demo/src/main.ts` | Input submission, `worldTransport.tick_engine`, provider polling, scene reader usage. |
| Game-owned topology/content/provider | `examples/demo/src/demo-world.ts` | Shape of game-side definitions, manifest registration, and asynchronous provider boundary. |
| Material/asset integration | `examples/demo/src/main.ts` | `MaterialRegistry`, asset-key byte resolver, resource registration, and LUT upload. |
| Render state read bridge | `examples/demo/src/main.ts` | `WorldStateReader` plus `WorldTransportReader` composed into renderer views. |
| Browser proofs | `examples/demo/tests/` | Lifecycle diagnostics and production-input assertions. |
| PWA/build integration | `examples/demo/vite.config.ts`, `examples/demo/package.json` | Vite, WASM, asset, and deployment-facing configuration. |

## Safe Extraction

Copy concepts, not identities:

- Replace demo `LevelDefinition`, instance, material, sprite, asset key, and URL values with game-owned content.
- Replace demo debug-query flags and globals with consumer test diagnostics appropriate to the game.
- Retain public package call ordering and transport ownership.
- Re-check APIs in package declarations each time; demo implementation code can change without becoming public contract.

## Do Not Reuse

- Demo source imports or relative paths.
- Demo IDs, assets, query-string proof modes, fixture delays, or global debug hooks.
- Demo gameplay route as game topology.
- Test-only teleport/cancellation helpers as runtime game mechanics.

## Related Docs

- [Consumer Agent Guide](./agent-guide.md) — entrypoint
- [Quickstart](./quickstart.md) — minimal startup path
- [Consumer Integration](../architecture/consumer-integration.md) — stable boundary
- [Demo Scope](../features/demo-scope.md) — demo purpose and limits
