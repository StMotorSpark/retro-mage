---
feature: consumer-integration-contract
tags: [consumer, contract, ownership, lifecycle, agents]
summary: Retro Mage consumers preserve engine lifecycle authority while owning game content, provider execution, assets, gameplay, and durable state.
relates-to:
  - "[Consumer Integration](../architecture/consumer-integration.md)"
  - "[World Runtime](../architecture/world-runtime.md)"
  - "[Provider Lifecycle](../architecture/provider-lifecycle.md)"
  - "[Runtime Dynamic Content](../architecture/runtime-dynamic-content.md)"
  - "[Material Contract](../architecture/material-contract.md)"
---

# Consumer Integration Contract

Use this checklist during implementation and review. [Consumer Integration](../architecture/consumer-integration.md) is canonical; this document turns it into agent-facing decisions.

## Game Owns

- Authored/generated local definitions, topology manifests, content versions, anchor/link selection, and provider metadata.
- Fetches, workers, generator jobs, cancellation handles, retry presentation, and network policy.
- Material IDs/descriptors, asset keys, byte resolution, palette choices, and content folder conventions.
- Game mechanics, UI, button semantics, actor behavior, dynamic-content slot/variant selection, persistence payload format/storage/migration, and deployment.

## Engine Owns

- Validation, runtime IDs, local-to-global placement, residency, active state, collision activation, crossing readiness, arrival safety, scene publication, and atomic per-instance dynamic-content application.
- Provider request IDs, stale-result rejection, terminal lifecycle cleanup, scheduling intent, and crossing hysteresis.
- Simulation pose/movement and world-aware tick ordering.
- Renderer GPU resources, shader/pass execution, texture upload/lifetime, and LUT upload.
- Raw-device normalization into one input schema.

## Required Handling

| Event | Consumer action |
| --- | --- |
| Provider request | Start/track game-owned work keyed by engine request ID. |
| Provider cancellation | Abort supported work; allow late completion to be rejected as stale. |
| Provider failure | Report it with same ID; preserve source gameplay; offer game-owned retry/UI. |
| Scene overflow | Read diagnostic, reduce/split content or raise configured capacity; never accept missing geometry. |
| Missing material/asset | Surface diagnostic and repair game descriptor/asset resolution; do not conceal fallback. |
| Eviction handoff | Persist opaque game payload when accepted; follow runtime restore lifecycle on reload. |
| Button press | Map generic slot to game action outside `input` and engine movement internals. |

## Dynamic-Content Public Contract

A definition authors a named slot before it is finalized. `content_id` is unique in its definition, and each non-empty `variant_id` is unique in its slot. Runtime selection always uses `(instance_id, content_id, variant_id)`; definition-array indexes, coordinates, material IDs, and scene-buffer indexes are not runtime identities.

The supported dynamic-content authoring operations are:

```text
begin_dynamic_content_slot(definition_id, content_id, default_variant_id)
definition_dynamic_content_variant(definition_id, content_id, variant_id)
dynamic_content_variant_tile(...)
dynamic_content_variant_actor(...)
dynamic_content_variant_light(...)
dynamic_content_variant_polygon(...)
finish_dynamic_content_slot(definition_id, content_id)
```

The variant contribution is authored between `definition_dynamic_content_variant(...)` and `finish_dynamic_content_slot(...)`. A variant supplies its complete tile, actor, light, and polygon contribution through the matching builder; it may supply no contribution. The finalized definition stays immutable.

The supported per-instance operations are:

```text
set_dynamic_content_variant(instance_id, content_id, variant_id)
clear_dynamic_content_override(instance_id, content_id)
dynamic_content_last_result()
dynamic_content_diagnostics_json()
```

`set_dynamic_content_variant(...)` selects an authored variant for one instance. `clear_dynamic_content_override(...)` removes that instance's transient override and restores its authored default variant. These operations do not accept arbitrary runtime geometry or expose render or collision internals.

### Submission, Commit, and Results

A valid selection or clear returns `1`, meaning it is accepted for the next `WorldTransport.tick_engine(...)` world-frame commit. The game calls `tick_engine(...)` normally; at that boundary the engine revalidates the command, atomically publishes the selected render contribution, and replaces its collision contribution. It does not reload the world, teleport the player, mutate a definition, edit scene buffers, or synchronize collision manually.

Invalid identifiers and unavailable lifecycle states return an immediate stable rejection code. Commit-time revalidation remains authoritative. `dynamic_content_last_result()` reports the latest submission or commit result, so a previously accepted command can become a commit-time rejection. The stable codes are:

| Code | Result |
| --- | --- |
| `1` | accepted for next world-frame commit |
| `2` | unknown-instance |
| `3` | invalid-identifier |
| `4` | invalid-lifecycle-state |
| `5` | unknown-content-id |
| `6` | unknown-variant-id |
| `7` | instance-definition-mismatch |
| `8` | invalid-content |
| `9` | scene-capacity-overflow |

Code `9` preserves the old effective variant, rendered scene, collision contribution, and runtime revision. It never produces a partial render/collision change.

### Door Selection, Persistence, and Restore

A generic door definition names a slot such as `"door"`, makes `"closed"` its default, and authors a closed solid tile contribution plus an open non-solid tile contribution (or an empty open contribution). At interaction time, game code validates its own interaction rule, range, and facing, then selects the open variant and records the durable decision:

```ts
if (game.validDoorInteraction(player, instanceId, "door")) {
  const result = world.set_dynamic_content_variant(instanceId, "door", "open");
  if (result === 1) game.save.openDoors[instanceId] = "open";
}

world.tick_engine(engine, dtSeconds);
```

The engine commits the accepted change atomically across render publication and collision. The game owns the durable `(instance_id, content_id, variant_id)` selection and reapplies it with `set_dynamic_content_variant(...)` after base content arrives, while the target is resident-inactive, then runs `tick_engine(...)` normally. A resident-inactive linked target accepts the selection before crossing; only `resident` and `active` instances are valid. `known`, `loading`, `evictable`, `evicted`, and `failed` instances reject it. The game retains desired state and reapplies it during restore instead of relying on queued engine intent, because eviction clears transient runtime overrides.

### Diagnostics and Repair

Parse `dynamic_content_diagnostics_json()` as JSON. For each result, inspect `reason`, `instance_id`, `content_id`, `variant_id`, and `runtime_revision`; inspect `lifecycle_state` where it is supplied. A rejection is an integration failure to repair: correct authored IDs/content, lifecycle timing, or capacity. It is never a cue to add manual collision/render workarounds.

## Forbidden Shortcuts

- Calling legacy `EngineState.tick()` for a `WorldTransport` game.
- Calling manual collision synchronization or deriving collision from render data.
- Moving player across a link through game-specific coordinate threshold/teleport logic.
- Accepting provider output without matching current request ID and instance ID.
- Marking an instance collision-active merely because it is visible.
- Editing scene data, collision state, definitions, or instance lifecycle to apply a dynamic-content selection.
- Passing WebGL objects into level data/WASM.
- Importing demo source or assuming demo debug hooks are supported consumer APIs.
- Treating fallback materials, overflow, or silent provider failures as a successful slice.

## Review Questions

1. Does game code own every app concern and avoid engine private state?
2. Does every global-world frame use `WorldTransport.tick_engine` exactly once?
3. Does provider code preserve identity through success, failure, cancellation, retry, and stale completion?
4. Does render use exported global views and game-owned resource resolution?
5. Does browser proof observe lifecycle/collision/render diagnostics rather than only a rendered canvas?

## Related Docs

- [Consumer Integration](../architecture/consumer-integration.md) — canonical boundary
- [World Runtime](../architecture/world-runtime.md) — lifecycle and crossing authority
- [Provider Lifecycle](../architecture/provider-lifecycle.md) — request identity rules
- [Runtime Dynamic Content](../architecture/runtime-dynamic-content.md) — public mutation ownership, ordering, and diagnostics
- [Material Contract](../architecture/material-contract.md) — asset and GPU ownership
