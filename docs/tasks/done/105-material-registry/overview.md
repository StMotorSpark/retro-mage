---
task: "105"
slug: material-registry
status: done
depends-on: []
blocked-by: ""
assigned-to: "repair"
created: 2026-08-03
outcome: "Fixed trailing whitespace. Added missing lutConfig and emissiveConfig to MaterialDescriptor to match contract exactly. Verified tests (38/38 passing) and typecheck passing. All DoD criteria checked and verified."
---

# Implement Material Registry Contract

Implement app-owned material descriptors and renderer-owned registration for the initial material capabilities.

## Desired Changes

- Add stable string material IDs and descriptors in `packages/render`.
- Support texture asset keys, UV modes (`tile-repeat`, `explicit`, `billboard`), and flags (`opaque`, `cutout`, `lit`, `unlit`, `emissive`, `water`, `sky`).
- Keep application descriptors independent from WebGL resource objects.
- Add deterministic missing-material/invalid-descriptor diagnostics and visible fallback behavior.
- Add unit tests for registration, validation, replacement, and fallback.

## Definition of Done

- [x] Public descriptor types match `docs/architecture/material-contract.md`.
- [x] App can register and resolve stable string material IDs.
- [x] Invalid or missing materials never silently disappear.
- [x] GPU handles do not appear in app/content descriptor types.
- [x] Focused render tests pass.
- [x] No unrelated shader, WASM, or demo work is included.

## Repair Notes

Initial agent marked task done without checking the required Definition of Done items. `git diff --check` reports trailing whitespace in new material files. Descriptor shape also needs review against the contract before acceptance. Repair must clean these issues, verify public exports and tests, then return the task to `done` only with evidence.

## Out of Scope

- WASM scene transport changes.
- Texture decoding/upload implementation.
- LUT generation.
- Showcase demo geometry.
- Transparent/PBR/shadow materials.

## Implementation Steps

1. Read material, rendering, and asset-pipeline docs.
2. Inspect current render public API and test conventions.
3. Add the smallest public descriptor/registry boundary required by the contract.
4. Implement validation and observable fallback diagnostics.
5. Add focused unit tests and run render typecheck/tests.

## Context

- Read: `docs/architecture/material-contract.md`.
- Read: `docs/architecture/rendering.md`.
- Read: `docs/architecture/asset-pipeline.md`.
- Key files: `packages/render/src/`, `packages/render/src/index.ts`.
