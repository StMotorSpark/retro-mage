---
name: design-doc
description: Create or update design docs in the docs/ folder following FaM (Filesystem as Memory) principles. Use when asked to write, create, update, or maintain design documentation — feature specs, architecture docs, research notes, or principles docs. Also use when docs/_map.md needs to be updated.
---

# Design Doc Skill

## Purpose

Design docs in `docs/` define **target state** — the canonical, present-tense description of how the system is designed to work. They are the persistent memory layer (FaM) for all agents working in this repo. Docs are authoritative: code follows docs.

---

## The Four Principles

### 1. Vertical Slices
Each doc covers one cohesive feature slice. A doc is completable and understandable in isolation. Do not mix unrelated features in one doc. When a topic grows large, split it — then link the child docs from the parent and update the map.

### 2. Document Frontmatter
Every design doc starts with YAML frontmatter:

```yaml
---
feature: feature-name
tags: [tag1, tag2]
summary: One sentence describing what this doc covers.
relates-to:
  - "[Related Feature](./path-to-related.md)"
---
```

| Field | Required | Description |
|-------|----------|-------------|
| `feature` | Yes | Primary feature name — lowercase, kebab-case |
| `tags` | Yes | List of relevant tags |
| `summary` | Yes | One sentence — used verbatim in `docs/_map.md` |
| `relates-to` | No | Markdown links to related docs (quoted strings in YAML) |

### 3. Document Links
Related docs are linked in two places:
- The `relates-to` frontmatter field (for machine/agent parsing)
- A **## Related Docs** section at the bottom of the document body (for human reading)

When you create a new doc, also update the `relates-to` and Related Docs sections of any existing docs that relate to it.

### 4. Present Tense / Target State
- Write as if describing a working system: "The scratch mechanic awards tokens", not "The scratch mechanic will award tokens"
- Use present tense throughout
- Never use: "v1", "v2", "prior to", "before...now", "previously", "going forward", "we will", "in the future", "after this change"
- Unimplemented features are described in present tense — docs define the north star, not the current codebase state

---

## Doc Template

```markdown
---
feature: feature-name
tags: [tag1, tag2]
summary: One sentence describing what this doc covers.
relates-to:
  - "[Related Feature](./related-feature.md)"
---

# Feature Name

Brief intro paragraph — what this feature is and why it exists within the game.

## Overview

High-level description. What problem does this solve? What player experience does it create?

## [Core Sections — varies by doc type]

Use H2 sections to organize the content. Feature docs typically include:
- Mechanics (how it works)
- Player Experience (what the player sees/feels)
- Data Model (key state/entities involved)
- Integration Points (how it connects to other features)

## Related Docs

- [Related Feature](./related-feature.md) — brief note on the relationship
```

---

## Doc Locations

| Type | Path | When to use |
|------|------|-------------|
| Feature slice | `docs/features/` | Core game mechanics, player-facing systems |
| Architecture | `docs/architecture/` | System structure, tech stack decisions, data models |
| Research | `docs/research/` | Findings, experiments, model evaluations, prototype learnings |
| Principles | `docs/principles/` | Design philosophy, constraints, cross-cutting guidelines |

File naming: lowercase, kebab-case. Example: `docs/features/scratch-mechanic.md`

---

## Workflows

### Creating a New Doc

1. Determine doc type and feature name → choose location and filename
2. Create the file, start with the YAML frontmatter block
3. Write the body in present tense, target state
4. Add **## Related Docs** section
5. Update `docs/_map.md` — add the doc to the correct section, use the `summary` field verbatim
6. Update `relates-to` and Related Docs sections in any existing docs that relate to the new one

### Updating an Existing Doc

1. Read the full existing doc first
2. Edit in place — keep present tense, remove any historical/versioning language found
3. Update frontmatter if feature scope, tags, or relations changed
4. Update the summary in `docs/_map.md` if the doc's scope changed
5. Do NOT create "v2" docs or "updated" variants — always edit in place

### Updating the Map (`docs/_map.md`)

- Add new docs to the correct section
- Use the doc's `summary` frontmatter field verbatim as the map entry text
- Keep entries within each section in alphabetical order by filename
- Remove entries when docs are deleted

### Splitting a Doc

When a doc grows too large or covers too much scope:
1. Create the child docs using the normal creation workflow
2. Reduce the parent doc to an overview that links to children
3. Update `docs/_map.md` to include the new child docs
4. Keep the parent doc in the map — it becomes the entry point for the topic

---

## Language Checklist

Before saving any doc, verify:
- [ ] All verbs are present tense
- [ ] No "v1/v2", "phase 1/2", "iteration N" language
- [ ] No "prior to", "before this", "now that", "going forward"
- [ ] No "we will", "we plan to", "in the future"
- [ ] `summary` field is one sentence, present tense
- [ ] `feature` field is lowercase kebab-case
- [ ] `docs/_map.md` is updated
