---
feature: consumer-vertical-slice-playbook
tags: [consumer, agents, workflow, testing, vertical-slices]
summary: Retro Mage consumer agents deliver bounded game slices through contract reading, world-aware integration, browser proof, and explicit engine-gap escalation.
relates-to:
  - "[Consumer Agent Guide](./agent-guide.md)"
  - "[Consumer Integration](../architecture/consumer-integration.md)"
  - "[Demo Slices](../features/demo-slices.md)"
  - "[Test-Driven Development](../principles/test-driven-development.md)"
---

# Consumer Vertical Slice Playbook

A consumer game proves engine usability through small complete gameplay slices, not a broad integration shell. Each slice has one route or loop, uses production package boundaries, and leaves an automated browser proof.

## Slice Sequence

1. **Orient** — read consumer docs plus architecture docs for each used capability.
2. **Define game ownership** — specify content, topology, provider behavior, material assets, gameplay state, and persistence needs in game code.
3. **Build smallest route** — include one player objective and only required engine integration.
4. **Wire production path** — use package exports, normalized input, `WorldTransport.tick_engine`, provider pull queue, exported render views, and renderer-owned resources.
5. **Prove behavior** — add deterministic unit/type/build/browser checks.
6. **Classify findings** — fix game defects locally; create an engine issue/task only for a cross-consumer contract gap.

## First Consumer Slice

A useful first slice contains:

```text
one local level definition
→ one provider-backed instance
→ player movement/collision
→ one material-backed visual surface
→ one game interaction
→ one saved game-state change
→ reload/re-entry confirms state
```

A second slice adds a linked target and proves preload, crossing, target failure safety, and return traversal. Keep game entities and interaction rules game-owned even when their position is represented in engine content.

## Definition of Done

- [ ] Game boot uses only documented package exports and no demo source import.
- [ ] World setup establishes game-owned topology/provider and engine-owned runtime state.
- [ ] Frame loop submits normalized input then performs one world-aware tick.
- [ ] Provider tests cover ready, failed, cancelled, retry, and stale completion paths used by slice.
- [ ] Browser proof drives production input and asserts exact route/lifecycle/collision state.
- [ ] Material/asset diagnostics and scene overflow are asserted clean or explicitly expected.
- [ ] Build, typecheck, unit tests, and browser proof commands/results are recorded.
- [ ] No generated traces, screenshots, recordings, cache artifacts, or test hooks ship accidentally.

## Gap Classification

| Observation | Classification | Action |
| --- | --- | --- |
| Game rule, asset path, topology, or UI is wrong | game defect | Fix in consumer repo. |
| Public engine API meets contract but is awkward for one game | game adapter decision | Keep adapter in consumer repo; document rationale. |
| Contract is unclear or public API lacks general consumer operation | engine contract gap | Reproduce minimally; create Retro Mage design/task work. |
| Capability is listed as deferred | planned engine gap | Decide game workaround or fund engine slice; do not imply support. |
| Browser proof flakes under supported path | engine/integration defect | Capture exact lifecycle diagnostics and isolate reproduction. |

## Proof Standard

A screenshot alone proves only pixels. A browser proof reads game diagnostics plus engine transport state and asserts conditions such as active instance, provider request state, collision/support state, pose bounds, resolved material IDs, resource diagnostics, and overflow status. Use touch/gamepad production input when the slice claims device behavior.

## Related Docs

- [Consumer Agent Guide](./agent-guide.md) — entrypoint
- [Consumer Integration](../architecture/consumer-integration.md) — ownership rules
- [Demo Slices](../features/demo-slices.md) — established slice discipline
- [Test-Driven Development](../principles/test-driven-development.md) — proof expectations
