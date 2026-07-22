# Filesystem as Memory (FaM)

This repo uses `docs/` as a persistent memory layer. Design docs define **target state** — the canonical, present-tense description of how the system is designed to work. They are authoritative. Code follows docs, not the other way around.

## Doc Map

[`docs/_map.md`](docs/_map.md) — master index of all design docs.

**Read `docs/_map.md` before starting any feature work.** Load relevant feature docs before making decisions or writing code.

## Design Doc Principles

1. **Vertical Slices** — each doc covers one cohesive feature slice, understandable in isolation
2. **Frontmatter** — every doc has YAML frontmatter: `feature`, `tags`, `summary`, `relates-to`
3. **Document Links** — docs link to related docs via markdown links in frontmatter and a Related Docs section
4. **Target State / Present Tense** — docs describe how the system *is*. No "v1/v2", "before/after", "prior to", "previously", "we will", or "going forward" language. If something is not yet implemented, describe it in present tense as the target state — this is intentional.

## Working in This Repo

- Read `docs/_map.md` first, then load relevant docs for the task at hand
- Use `/skill:design-doc` to create or update design docs
- Keep `docs/_map.md` updated when docs are added or changed
- When in doubt about intent or design, the docs are the source of truth
