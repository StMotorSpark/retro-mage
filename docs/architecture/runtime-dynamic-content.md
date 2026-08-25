---
feature: runtime-dynamic-content
tags: [architecture, world, runtime, collision, rendering, persistence, consumer-contract]
summary: Retro Mage exposes named per-instance dynamic-content slots whose variant changes atomically update render publication and collision participation.
relates-to:
  - "[World Model](../features/world-model.md)"
  - "[World Runtime](./world-runtime.md)"
  - "[Collision Bridge](./collision-bridge.md)"
  - "[Persistence and Restore](./persistence-restore.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[Consumer Integration](./consumer-integration.md)"
  - "[Consumer Integration Contract](../consumer/integration-contract.md)"
---

# Runtime Dynamic Content

Retro Mage exposes named, application-addressed dynamic-content slots inside a resident level instance. A slot selects one authored variant, and each variant contributes its render and collision data through the same engine-owned runtime record. This supports a door that changes from a visible solid closed variant to a visible non-solid open variant without reloading an instance, mutating renderer data, or synchronizing collision in application code.

## Ownership

The consuming application owns:

- stable slot and variant identifiers in its authored definition;
- gameplay rules that select a variant;
- interaction range, facing, UI, and input mapping;
- durable state that records the selected variant and its restore decision.

`engine-core` owns:

- definition validation and immutable base content;
- per-instance runtime overrides and runtime identity;
- local-to-global transformation of the selected variant;
- atomic collision-index and scene-publication updates;
- lifecycle and residency validation;
- mutation ordering, diagnostics, and stale-operation safety.

A dynamic-content operation never changes an immutable `LevelDefinition`, another instance of that definition, application save data, link topology, or application gameplay policy.

## Authored Slots and Identity

A definition may declare one or more dynamic-content slots. Each slot has a non-empty application-authored `content_id` that is unique within its definition. A slot has a finite set of non-empty `variant_id` values that are unique within that slot, including its authored default variant.

Each variant contains a complete local content contribution. Its contribution may contain tiles, actors, lights, and polygons. Every contribution declares its ordinary rendering and collision properties; collision derives only from collision-capable content such as solid tiles and never from renderer flags. A variant may contain no contribution, which represents a removed or disabled runtime object.

Runtime addressing always uses:

```text
(instance_id, content_id, variant_id)
```

`instance_id` scopes a change to one placed runtime instance. A definition reused by several instances therefore gives each instance an independent slot state. Coordinates, definition tile-array indexes, material IDs, and renderer-buffer indexes are not stable runtime identities and are not public mutation keys.

A catacombs door is an ordinary slot with a `closed` variant containing a visible solid contribution and an `open` variant containing its visible non-solid contribution. The open contribution may be empty when the game has no separate open-door visual.

## Public Transport Contract

The browser-facing `WorldTransport` public surface provides the following conceptual operations. Rust/WASM and TypeScript bindings expose equivalent names, parameter validation, result codes, and diagnostics.

```text
begin_dynamic_content_slot(definition_id, content_id, default_variant_id)
definition_dynamic_content_variant(definition_id, content_id, variant_id, ...content...)
finish_dynamic_content_slot(definition_id, content_id)

set_dynamic_content_variant(instance_id, content_id, variant_id)
clear_dynamic_content_override(instance_id, content_id)
```

The exact content-builder parameters reuse the existing tile, actor, light, polygon, material, UV, and collision contracts. They do not expose renderer buffers or collision-index data structures. A definition builder validates and finalizes a slot with its definition; finalized definitions remain immutable.

`set_dynamic_content_variant` selects an authored variant for one slot in one instance. `clear_dynamic_content_override` restores that instance slot to its authored default variant. Neither operation creates unvalidated arbitrary geometry at runtime. Runtime variability is generic because an application can author any finite set of stable content variants, including variants that add, replace, or remove contributions.

Each operation returns a stable result code rather than only a boolean. Successful acceptance identifies the instance, content ID, selected variant, and accepted runtime revision. Rejection identifies a stable error class. `WorldTransport` diagnostics expose the same identifiers, current effective variant, runtime revision, and rejection detail without exposing application save payloads.

## Atomic Mutation Semantics

A successful mutation creates one pending runtime-content revision. At the next world-frame commit boundary, `WorldRuntime` validates the selected variant, transforms its contribution, replaces the affected slot contribution in that instance's composed global content, updates the affected collision-index entry, and publishes the resulting scene snapshot.

The commit is atomic across the affected slot's render and collision state:

```text
old effective variant + old collision contribution
→ one runtime-content commit
→ new effective variant + new collision contribution + new scene publication
```

Movement receives an immutable collision query for its whole resolution. A mutation never changes that query halfway through movement. Scene readers never receive a partial slot contribution. If interaction handling accepts a mutation before `WorldTransport.tick_engine(...)`, that tick publishes the selected variant and uses its collision contribution consistently for the following world frame. The application does not call a collision synchronization API, rebuild a collision snapshot, reload content, or move the player to make the change effective.

Several accepted mutations in one frame commit in deterministic acceptance order as one runtime-content revision set. If any selected variant is invalid at commit validation, that operation is rejected and leaves the last effective variant, collision contribution, and published scene unchanged. Unrelated slots and instances continue normally.

Dynamic-content commands preflight the complete resulting global scene at the world-frame commit boundary. The preflight substitutes the affected instance's post-mutation contribution, retains every other resident contribution, and applies the transport's ordinary deterministic instance ordering and capacity accounting. A scene that cannot publish rejects that command as `scene-capacity-overflow`; it preserves the prior effective variant, rendered publication, collision contribution, and runtime revision, and publishes no partial mutation. This command-specific rejection does not change the general scene-overflow behavior for unrelated lifecycle publication. Collision and gameplay lifecycle ownership remain independent of unrelated overflow, while crossing follows the established overflow gate.

## Lifecycle and Residency

A slot mutation is valid only when its addressed instance is `resident` or `active`. A resident-but-inactive linked target accepts mutations, allowing an application to prepare its gameplay state while preserving engine activation authority. An active instance accepts mutations without deactivating its unrelated content, simulation, links, or placement.

Mutations reject instances in `known`, `loading`, `evictable`, `evicted`, and `failed` lifecycle states. They also reject unknown IDs, unknown slots, unknown variants, malformed identifiers, and invalid definition/instance relationships. The engine does not queue application gameplay intent across an unavailable lifecycle state.

The application retains its desired variant in durable state and reapplies it through the normal restore boundary after the provider has supplied validated base content and while the instance is resident-inactive. The engine commits that selected variant before collision and gameplay activation when restored state affects passage. This keeps a restored-open door from becoming collision-active as closed content.

Eviction releases runtime overrides with transient resident content. It does not alter application-owned durable state. Reload reconstructs immutable base content, then consumes application restore decisions through the same validated dynamic-content operation.

## Diagnostics and Failure Behavior

Dynamic-content diagnostics provide a stable code and actionable context for at least:

- `unknown-instance`;
- `unknown-content-id`;
- `unknown-variant-id`;
- `invalid-identifier`;
- `definition-not-finalized` or malformed slot definition;
- `invalid-lifecycle-state` with current lifecycle state;
- `instance-definition-mismatch`;
- `stale-runtime-revision` when an operation explicitly requires a prior revision;
- `invalid-content` or transform validation failure;
- `scene-capacity-overflow` when publication cannot fit the affected instance.

Rejected operations leave the effective content, collision index, scene snapshot, transform, links, residency, active instance, and player pose intact. Diagnostics identify public instance/content/variant IDs and runtime revision, but never application-private persistence payloads.

## Consumer Integration

A consumer handles an interaction entirely in game code, then selects an authored slot variant through the public transport:

```text
if gameValidatesDoorInteraction(player, "catacombs-door"):
    transport.set_dynamic_content_variant(
        "catacombs-instance",
        "catacombs-door",
        "open",
    )
    gameSave.catacombsDoorOpen = true

WorldTransport.tick_engine(engine, dt)
```

On reload, the provider supplies the immutable catacombs definition. During application restore, the consumer reads `catacombsDoorOpen` and selects `open` for the resident-inactive instance when true. The normal runtime lifecycle then enables collision and gameplay. The consumer neither edits the definition nor accesses collision or render internals.

Consumers treat a rejected result as an integration failure with a diagnostic to inspect. They do not fall back to whole-instance deactivation, manual collision edits, definition reconstruction, reload loops, or player teleports.

## Proof and Implementation Plan

Implementation is partitioned at the engine, bridge, and consumer-documentation seams.

1. **Core runtime and content contract**
   - Add validated authored dynamic-slot and variant data to immutable definitions.
   - Add per-instance effective-variant overrides, runtime revisions, lifecycle validation, and structured mutation results.
   - Compose only the affected slot contribution into transformed global content and the collision index.
   - Cover independent reused-definition instances, all content contribution categories, deterministic multiple mutations, invalid IDs, invalid variants, lifecycle rejection, and no-partial-change safety.

2. **World-frame and WASM transport boundary**
   - Expose definition slot builders, mutation/clear operations, result codes, and diagnostics through `WorldTransport` and TypeScript bindings.
   - Commit pending changes at the documented world-frame boundary and prove movement, collision, and scene readers never observe mixed revisions.
   - Preserve scene-capacity atomicity and verify overflow, render publication, collision, and crossing behavior remain consistent.

3. **Persistence and linked-instance integration**
   - Apply an application-restored effective variant to resident-inactive content before activation.
   - Verify eviction drops transient overrides while application persistence restores the selected variant after reload.
   - Verify mutations for active and resident linked instances preserve transforms, links, runtime lifecycle authority, and source playability.

4. **Consumer surface and proof**
   - Update consumer guides with authored identity, ordering, lifecycle, save/restore, diagnostics, and ownership rules.
   - Add an engine-owned consumer fixture proving a closed solid door blocks movement, an accepted open mutation changes scene and collision together, and passage succeeds without manual synchronization.

## Explicit Boundaries

This contract does not define door mechanics, keys, locks, UI, sounds, toggling policy, application save formats, arbitrary runtime topology edits, moving platforms, runtime-generated unvalidated geometry, renderer-private mutation, manual collision control, or demo-specific integration behavior.

## Related Docs

- [World Model](../features/world-model.md) — immutable definitions and independently placed instances
- [World Runtime](./world-runtime.md) — lifecycle, residency, and activation authority
- [Collision Bridge](./collision-bridge.md) — world-frame collision and render synchronization
- [Persistence and Restore](./persistence-restore.md) — application-owned state restoration and activation gates
- [WASM Bridge](./wasm-bridge.md) — public transport and scene-boundary ownership
- [Consumer Integration](./consumer-integration.md) — consumer world-aware frame flow
- [Consumer Integration Contract](../consumer/integration-contract.md) — consumer ownership and prohibited shortcuts
