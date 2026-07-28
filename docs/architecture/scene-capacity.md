---
feature: scene-capacity
tags: [architecture, rendering, wasm, buffers, overflow]
summary: Retro Mage uses application-configured fixed scene capacities with atomic instance submission and observable overflow so global rendering never silently loses geometry.
relates-to:
  - "[Rendering](./rendering.md)"
  - "[WASM Bridge](./wasm-bridge.md)"
  - "[World Runtime](./world-runtime.md)"
  - "[Collision Bridge](./collision-bridge.md)"
  - "[Visibility](./visibility.md)"
  - "[Known Gaps](../research/known-gaps.md)"
---

# Scene Capacity and Overflow

The global scene uses fixed, preallocated structure-of-arrays buffers whose capacities are configured by the consuming application when `WorldTransport` is created. Capacity applies to logical scene objects and protects predictable frame cost, stable WASM views, and explicit failure behavior as resident content changes.

## Capacity Configuration

The engine supplies defaults for each scene category. The application can override them at transport construction:

```text
tiles       → logical tile entries
actors      → logical actor entries
lights      → logical point-light entries
instances   → resident instance metadata entries
```

Each category has an independent non-negative integer capacity. Capacity is fixed for the lifetime of a transport and is not resized during a frame or through implicit per-frame allocation. The configured values remain bounded by available WASM, browser, and GPU memory; the engine does not promise unlimited scene size.

The production capacity authority is `WorldTransport`. TypeScript scene submission helpers use the same contract for tests and non-WASM adapters, but they do not define a second production capacity authority. Buffer comments, defaults, and boundary tests use the same values and semantics.

## Submission Unit

World content is submitted in stable instance order. Each instance contributes transformed global tiles, actors, lights, and instance metadata. Submission uses coarse world relevance and residency filtering; renderer fine-grained frustum, distance, depth, and optional occlusion culling runs after scene publication.

An instance is the atomic submission unit:

1. Runtime evaluates whether instance metadata and content fit remaining capacities.
2. If all categories fit, the instance is appended to every relevant buffer.
3. If any category does not fit, no part of that instance is appended.
4. Runtime records the instance and category in the frame overflow report.
5. Runtime evaluates later instances using the same deterministic ordering.

A submission never truncates an instance. Accepted instances remain valid when a later instance overflows. Collision and gameplay state do not change because render submission overflows.

## Ordering and Priority

Runtime orders render submissions deterministically:

1. current active instance
2. crossing-critical transition targets
3. explicitly pinned instances
4. other relevant instances by global relevance
5. stable instance identity as the final tie-breaker

This ordering protects playable content and visible traversal targets when capacity is insufficient. Renderer code does not invent gameplay priority or reorder instance residency decisions.

## Overflow Contract

Overflow is explicit, observable, and non-silent. The transport exposes a compatibility boolean plus structured per-frame diagnostics containing:

- frame identity
- category that exceeded capacity
- requested count and configured capacity
- affected instance identity
- skipped instance identities
- cumulative overflow counters when enabled by diagnostics configuration

The overflow report resets with the next scene frame reset. Counts never exceed configured capacities. A failed instance submission cannot leave mismatched counts, IDs, or partially initialized fields.

The renderer skips an overflowing instance and continues rendering accepted instances. Development integrations expose the report through diagnostics and an optional browser overlay or callback; production integrations can choose their own presentation without changing scene semantics.

## Crossing Behavior

Render overflow makes a target unavailable for seamless visual presentation. The default crossing policy blocks traversal into an overflowing target while the source remains playable. Applications can select an alternate overflow policy when they provide an explicit fallback experience, such as a closed link or application-owned loading state.

Overflow does not deactivate source collision, evict content, teleport the player, or mutate world topology. A target can retry scene publication after capacity configuration or relevant-content changes satisfy the submission contract.

## Buffer and Bridge Rules

- SoA buffers are preallocated at transport construction.
- Typed-array and WASM pointer views remain valid until the transport memory contract requires a refresh.
- Per-category counts describe only successfully published entries.
- Instance metadata aligns with accepted instance IDs only.
- Zero capacities remain valid for boundary tests and intentionally empty categories.
- Polygon submission is outside this contract until polygon transport and rendering are defined.
- Dynamic resizing and chunked scene submission are separate capabilities, not implicit overflow recovery.

## Tests and Proof

The implementation carries tests for:

- application-configured capacities and engine defaults
- capacity validation and zero-capacity categories
- atomic whole-instance rejection for each category
- stable counts and IDs after overflow
- multiple overflowing instances with deterministic diagnostics
- per-frame overflow reset
- accepted instances continuing to render after a later overflow
- collision and gameplay remaining unchanged by render overflow
- target traversal blocked by default when target publication overflows
- TypeScript adapter and Rust/WASM transport sharing equivalent semantics
- browser diagnostics exposing an intentional overflow fixture

## Related Docs

- [Rendering](./rendering.md) — global scene composition and depth-tested drawing
- [WASM Bridge](./wasm-bridge.md) — typed buffer ownership and boundary schemas
- [World Runtime](./world-runtime.md) — residency, crossing, and lifecycle authority
- [Collision Bridge](./collision-bridge.md) — render state remains separate from collision truth
- [Visibility](./visibility.md) — coarse relevance and fine renderer culling
- [Known Gaps](../research/known-gaps.md) — remaining implementation work
