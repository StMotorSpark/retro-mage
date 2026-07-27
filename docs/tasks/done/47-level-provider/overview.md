---
task: "47"
slug: level-provider
status: done
depends-on: ["45", "46"]
blocked-by: ""
assigned-to: ""
created: 2026-07-27
outcome: "Added application-owned LevelProvider request/result contracts with opaque metadata, explicit ready/pending/cancelled/failed outcomes, and coordinator request identity checks that reject stale results. Added deterministic FixtureProvider and unit coverage for authored resolution, pending/failed visibility, cancellation, and stale-result handling."
---

# Add Application Level Provider Boundary

Add the engine boundary through which applications supply authored or generated resolved level definitions.

## Desired Changes

- Define `LevelProvider` request and result contracts.
- Support ready, pending, cancelled, and failed results.
- Treat seed, generator ID, version, and source metadata as opaque.
- Add request identity handling so stale results cannot replace current state.
- Add a deterministic fixture provider for tests.

## Definition of Done

- [ ] Engine has no generator, RNG, biome, or file-format assumptions.
- [ ] Provider can resolve a test authored definition.
- [ ] Pending and failed outcomes are observable.
- [ ] Cancellation and stale-result behavior are tested.
- [ ] Provider contract is usable by both authored and procedural application code.

## Out of Scope

- Implementing a procedural generator.
- Network transport.
- Persistence serialization.
- Rendering or collision.

## Implementation Steps

1. Read world-runtime and world-model docs.
2. Add provider boundary in the world runtime slice.
3. Keep asynchronous mechanics explicit without prescribing provider internals.
4. Add fixture-based unit tests for every result state.
5. Verify application metadata remains opaque to engine code.

## Context

- Read: `docs/architecture/world-runtime.md`
- Read: `docs/features/world-model.md`
- Depends on: tasks 45 and 46.
