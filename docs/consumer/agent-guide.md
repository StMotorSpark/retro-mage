---
feature: consumer-agent-guide
tags: [consumer, agents, onboarding, integration]
summary: Retro Mage consumer agents use this entrypoint to integrate the engine without inheriting demo-specific behavior or violating runtime ownership.
relates-to:
  - "[Consumer Integration](../architecture/consumer-integration.md)"
  - "[Quickstart](./quickstart.md)"
  - "[Vertical Slice Playbook](./vertical-slice-playbook.md)"
  - "[Troubleshooting](./troubleshooting.md)"
  - "[Reference App](./reference-app.md)"
---

# Consumer Agent Guide

Read this document first when creating or changing a game that consumes Retro Mage. Then read [Consumer Integration](../architecture/consumer-integration.md) for non-negotiable ownership and lifecycle rules, followed by the runbook matching the task.

## Agent Start Sequence

1. Read `docs/_map.md`, this guide, and the relevant engine architecture docs.
2. Confirm package source strategy. The packages are private workspace packages; do not write an npm dependency that assumes public publication.
3. Create game-owned topology, assets, provider, and gameplay code. Do not import demo source.
4. Integrate the minimal world-aware frame path from [Quickstart](./quickstart.md).
5. Build one bounded playable slice and its browser proof using [Vertical Slice Playbook](./vertical-slice-playbook.md).
6. Classify any failure: game implementation defect, engine contract defect, or missing engine capability.

## Stable Contract vs Current Reference

Treat architecture docs as stable contract. They define ownership, lifecycle, failure behavior, and prohibited paths.

Treat package export names, build wiring, demo asset paths, test hooks, and `examples/demo` layouts as current reference details. Verify them against checked-out package declarations when copying a pattern. A demo helper is not a public engine API merely because it exists.

## Required Knowledge

An agent working in a consumer game understands:

- local `LevelDefinition` content, instance topology, anchors, and links belong to game code;
- provider jobs run in game code but engine-issued request identity decides acceptance;
- `WorldTransport.tick_engine(engineState, dt)` is the global-world frame authority;
- `render` reads exported global state and owns GPU resources;
- `input` emits device-neutral state while game code gives buttons meaning;
- persistence payloads/storage belong to the game while restore safety belongs to the runtime;
- target preload failure preserves source playability;
- overflow, missing material, and provider diagnostics are observable failures requiring action.

## Escalation Rule

Keep game-specific work in the game repository: mechanics, authored content, UI, save schema, network policy, and product decisions.

Create or request Retro Mage work when a required capability contradicts a documented contract, a public package boundary lacks an operation necessary for all consumers, or an engine ownership rule blocks a valid game use case. Record observed reproduction, intended consumer behavior, affected package boundary, and browser/test evidence. Do not patch package internals from the game repository as a substitute for an engine contract.

## Read Next

- [Quickstart](./quickstart.md) — minimal integration order
- [Integration Contract](./integration-contract.md) — ownership checklist and forbidden paths
- [Vertical Slice Playbook](./vertical-slice-playbook.md) — agent workflow and proof standard
- [Troubleshooting](./troubleshooting.md) — symptom-driven diagnostics
- [Reference App](./reference-app.md) — exact demo areas to inspect

## Related Docs

- [Consumer Integration](../architecture/consumer-integration.md) — canonical consumer boundary
- [Quickstart](./quickstart.md) — bootstrap sequence
- [Vertical Slice Playbook](./vertical-slice-playbook.md) — bounded delivery workflow
- [Troubleshooting](./troubleshooting.md) — diagnostic path
- [Reference App](./reference-app.md) — demo navigation index
