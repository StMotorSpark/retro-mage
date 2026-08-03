---
task: "105"
slug: material-registry
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-08-03
outcome: "Added MaterialDescriptor types and MaterialRegistry in render package. Enforced independent application descriptors without WebGL types. Implemented fallback handling and validation with focused unit tests. Passed render tests and workspace typecheck."
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

- [ ] Public descriptor types match `docs/architecture/material-contract.md`.
- [ ] App can register and resolve stable string material IDs.
- [ ] Invalid or missing materials never silently disappear.
- [ ] GPU handles do not appear in app/content descriptor types.
- [ ] Focused render tests pass.
- [ ] No unrelated shader, WASM, or demo work is included.

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
