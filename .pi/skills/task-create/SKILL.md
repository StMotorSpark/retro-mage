---
name: task-create
description: Create well-formed tasks in docs/tasks/pending/ using unified task-prompt format. Use when decomposing goals into discrete units, investigating dependencies, or writing task-prompts as complete execution specs. Use before any significant work begins.
---

# Task Create Skill

## Purpose

This skill governs how orchestrator agents (or humans) create tasks in `docs/tasks/`. A well-formed task uses unified task-prompt format — it is self-contained, actionable, and written so a worker agent reads `overview.md` and immediately knows what to do.

**Read first:**
- `docs/task-system.md` — lifecycle, states, folder structure
- `docs/task-prompt-format.md` — prompt sections, structure, examples

---

## Pre-Creation Checklist

Before creating any task:

1. **Scan for duplicates** — check all state folders for existing tasks covering same work
   ```bash
   find docs/tasks -name "overview.md" | xargs grep -l "keyword"
   ```

2. **Read relevant design docs** — tasks distill design docs into prompts. If design doc doesn't exist for feature, create it first using `/skill:design-doc`.
   - Design doc = source of truth for **why**
   - Task prompt = distillation of design doc into **what** + **how**

3. **Determine granularity** — task completable in one agent session. If work spans multiple systems or has separable phases, split into multiple tasks with explicit `depends-on` declarations.

---

## Finding Next Task Number

Task number must be unique across ALL state folders (pending, in-flight, parked, done).

```bash
find docs/tasks -type d | grep -oE '/[0-9]+-' | grep -oE '[0-9]+' | sort -n | tail -1
```

Increment by 1. Zero-pad to 2 digits (01, 02, ..., 09, 10, 11...). If no tasks exist, start at `01`.

---

## Creating a Task

### 1. Create the folder

```
docs/tasks/pending/NN-kebab-slug/
```

Slug is 2–5 words, kebab-case, describing work. Examples:
- `01-bootstrap-project`
- `07-add-combat-animations`
- `12-fix-coin-floor-bug`

### 2. Write `overview.md` — Unified Task-Prompt

Start with frontmatter:

```yaml
---
task: "NN"
slug: kebab-slug
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: YYYY-MM-DD
outcome: ""
---
```

Then write body as **complete prompt**. Worker agent reads only this file before starting work. Body must have all sections:

```markdown
# Task Title

One-sentence summary of what task accomplishes.

## Desired Changes

Explicit bullet list of what to create/modify/delete. Scope boundaries.

## Definition of Done

- [ ] Criterion one — specific and verifiable
- [ ] Criterion two
- [ ] Criterion three

## Out of Scope

Explicit list of what task does NOT do. Prevents scope creep.

## Implementation Steps

Ordering + constraints guide the worker through the work without over-prescribing implementation.
- Reference file paths and modules that must exist before each step (dependencies).
- Name the APIs/functions/state fields involved — *what* connects, not *how* it's wired internally.
- Specify integration points with existing code (e.g. "must consume `openPack` from `src/lib/loot.ts`").
- Leave internal implementation choices to the worker agent.

## Context

Links to design docs, related tasks, key files.

- Read: `docs/some-feature.md` — design doc (source of truth)
- Related: task:02 (dependency reason)
- Key files: `src/screens/`, `src/store/`
```

**Why these sections:**
- **Desired Changes** = coordination boundaries (what to build, what interfaces must exist)
- **Implementation Steps** = ordering + constraints (what must exist before this step, integration points) — *not* pre-defined implementation code
- **Definition of Done** = verification checklist (when done)
- **Out of Scope** = prevent scope creep + agent confusion
- **Context** = design doc + related work

## Pre-Definition Boundaries

Not every part of a task needs pre-defined code. Distinguish between **coordination constraints** (shared surface area that must be agreed up-front so tasks don't collide) and **implementation decisions** (internal choices the worker agent owns).

### What to pre-define (coordination constraints)
- **Type shapes / interfaces** — `BattleForm`, `PackSlotSpec` etc. Multiple tasks touch these; they must agree on the shape.
- **API signatures that cross task boundaries** — e.g. `openPack` return type, context action signatures.
- **File paths and module structure** — where things go lives in shared design docs, not just one task prompt.
- **State field names + locations** — what state exists and where it lives (`RunState`, store slices).
- **Data structures that other tasks consume** — seed format, config schema, etc.

### What to leave for the model (implementation decisions)
- Internal implementation patterns (hooks vs helpers, component composition approach).
- Exact internal data structures within a module — as long as the interface matches.
- Animation specifics not tied to constraints — pacing and rhythm belong here.
- Code organization within a file — grouping of functions, naming conventions for private methods.

**Rule of thumb:** If another pending/in-flight task might need this piece, pre-define it. If only *this* task touches it, let the model choose.

---

### 3. Declare dependencies

If task cannot start until another task done, add task number(s) to `depends-on`:

```yaml
depends-on: ["02", "05"]
```

Dependencies mean: those tasks must reach `done` before this task moves to `in-flight`. If dependencies unresolved, create task in `parked/` instead of `pending/`, with `blocked-by: task:02`.

---

## Decomposing Large Work

When goal too large for one task:

1. **Identify seams** — different systems, separable deliverables, clear handoff points
2. **Distinguish coordination from implementation** — shared types and APIs must be pre-defined; internal choices belong in individual tasks
3. **Create smallest useful tasks** — each independently completable
4. **Map dependencies** — if Task B needs Task A output, declare it in `depends-on`
5. **Create all before starting any** — full picture matters for dependency ordering

**Anti-patterns to avoid:**
- Pre-defining implementation code — giving exact function bodies, UI markup, or internal patterns. The model should choose these.
- Vague acceptance criteria ("improve the system")
- Bundled unrelated changes ("fix bug + refactor + add feature")
- Missing dependencies — if unsure, investigate first
- No design doc reference when feature has a doc
- Vague **Desired Changes** section (be specific)
- Missing **Out of Scope** section

---

## Dependency Investigation

Before declaring `depends-on: []`, verify:

1. Does this task read/modify files another in-flight or pending task also touches?
2. Does this task require output (code, config, data) another task produces?
3. Does this task make assumptions about system state only true after another task completes?

If yes to any: add dependency. Better to over-declare than have two agents collide.

---

## Prompt Refinement Checklist

Before task ready to hand off, verify:

- [ ] **Design doc exists** — is there source of truth for *why*?
- [ ] **Desired Changes** — explicit list of what to build/modify/delete?
- [ ] **Implementation Steps** — concrete enough no clarifying questions needed?
- [ ] **Definition of Done** — each criterion verifiable/testable?
- [ ] **Out of Scope** — explicit enough to prevent scope creep?
- [ ] **Context** — design doc link + related task references present?
- [ ] **Pre-definition balanced** — coordination constraints pre-defined, implementation decisions left open? (see Pre-Definition Boundaries section)
- [ ] **No ambiguity** — could any instruction be misunderstood?

If any fail, refine before task goes to pending queue.

---

## Example: Well-Formed Task-Prompt

```
docs/tasks/pending/03-implement-vending-machine-ui/
└── overview.md
```

```markdown
---
task: "03"
slug: implement-vending-machine-ui
status: pending
depends-on: ["01", "02"]
blocked-by: ""
assigned-to: ""
created: 2026-07-01
outcome: ""
---

# Implement Vending Machine UI

Build vending machine screen where players browse and purchase ticket packs.

## Desired Changes

- Create `src/screens/VendingMachine.tsx` with pack carousel layout
- Add pack purchase state to Redux store (`src/store/vendingSlice.ts`)
- Update game router to include vending machine route
- Implement coin balance deduction on purchase
- Trigger scratch flow after successful purchase

## Definition of Done

- [ ] Player sees all available pack types with names and coin costs
- [ ] Player cannot purchase pack with insufficient coins (button disabled)
- [ ] Successful purchase triggers mandatory scratch flow
- [ ] Coin balance updates immediately after purchase
- [ ] Screen touch-friendly and portrait-locked per design
- [ ] Vending machine route reachable from hub screen

## Out of Scope

- Vending machine animations or transition effects
- Achievements or unlock system
- Backend persistence (use local Redux state for now)

## Implementation Steps

1. **Create VendingMachine component** (`src/screens/VendingMachine.tsx`)
   - Import pack types from `core/game/packs.ts`
   - Render carousel of available packs using PackCard component
   - Display current coin balance from Redux store (`selectCoinBalance`)
   - Implement purchase button calling `purchasePackAction(packId, cost)`

2. **Add purchase handler** (`src/store/vendingSlice.ts`)
   - Create `purchasePackAction` thunk — signature: `(packId, cost) => Promise<...>`
   - Validate coin balance before deduction; reject if insufficient
   - Deduct coins using `deductCoinsAction(cost)` from existing store helper
   - Dispatch action to set "next screen" to scratch flow via router state

3. **Update router** (`src/routes/gameRouter.ts`)
   - Add vending machine route mapped to VendingMachine component
   - Ensure reachable from hub screen; add navigation action hub → vending → scratch

4. **Test on device**
   - Verify touch responsiveness on mobile
   - Test with insufficient coins (button disabled state)
   - Verify scratch flow triggers after successful purchase

## Context

**Read first:**
- `docs/vending-machine.md` — full design spec (source of truth)
- `docs/coin-economy.md` — coin balance rules
- `docs/tech-architecture.md` — stack + constraints

**Related work:**
- task:01 — bootstrap project
- task:02 — coin store setup

**Key files:**
- `src/screens/` — screen components
- `src/store/` — Redux store
- `core/game/packs.ts` — pack definitions
```

---

## Related Docs

- [Task System](../../docs/task-system.md) — lifecycle, states, folder structure
- [Task-Prompt Format](../../docs/task-prompt-format.md) — prompt sections + examples
- [AGENTS.md](../../AGENTS.md) — FaM principles
- [docs/_map.md](../../docs/_map.md) — master index of design docs

---

## Related Skills

- `/skill:task-work` — execute tasks through pipeline
- `/skill:design-doc` — create feature docs (source of truth for *why*)
