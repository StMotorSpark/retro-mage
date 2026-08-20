---
task: "128"
slug: consumer-agent-docs
status: done
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-12-27
outcome: "Added canonical consumer integration architecture plus six agent runbooks covering startup, ownership, vertical slices, diagnostics, and demo navigation. Validated local Markdown links, required frontmatter/Related Docs, present-tense constraints, and git diff formatting."
---

# Create Consumer Agent Documentation

Document the supported Retro Mage integration path so an agent can create and verify a separate game repository without treating the demo as a dependency or inventing engine contracts.

## Desired Changes

- Add agent-facing consumer documentation covering quickstart, ownership contracts, vertical-slice workflow, troubleshooting, and reference-app navigation.
- Establish a canonical architecture/design document for consumer integration constraints.
- Update design-doc relationships and `docs/_map.md`.

## Definition of Done

- [ ] A new consumer agent can find supported package, runtime, render, input, provider, and verification paths from the documentation.
- [ ] Documentation distinguishes stable contracts from demo implementation details and assigns engine versus game ownership.
- [ ] Documentation names prohibited integration patterns and failure-safe behavior.
- [ ] Each added design document has valid frontmatter and a Related Docs section; map and relevant existing docs link it.
- [ ] Documentation links and formatting are checked, with no generated artifacts.

## Out of Scope

- Publishing/versioning packages or changing package APIs.
- Creating a separate game repository.
- Changing engine, renderer, input, or demo runtime behavior.

## Implementation Steps

1. Read engine architecture docs, package exports, and demo integration code to identify actual supported boundaries.
2. Create one focused consumer-integration architecture doc and supporting agent runbooks under `docs/consumer/`.
3. Keep normative ownership/lifecycle requirements in the architecture doc; use runbooks for exact current setup and diagnostic guidance.
4. Add reciprocal links where appropriate and index the docs in `docs/_map.md`.
5. Validate Markdown links, frontmatter, and repository formatting; record commands/results in outcome.

## Context

- Read: `docs/architecture/repo-structure.md` — separate consumer repository contract.
- Read: `docs/architecture/world-runtime.md`, `docs/architecture/wasm-bridge.md`, and `docs/architecture/collision-bridge.md` — runtime and bridge ownership.
- Read: `examples/demo/` — reference integration only.
- Related: task:127 — current quality baseline.
