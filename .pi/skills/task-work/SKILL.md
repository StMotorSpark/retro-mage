---
name: task-work
description: Execute tasks from docs/tasks/ using unified task-prompt format. Covers task lifecycle (pending → in-flight → done) and prompt generation/refinement. Use when picking up work, managing dependencies, creating/refining tasks, or checking status. Use at start of any work session.
---

# Task Work Skill

## Purpose

This skill governs task lifecycle and prompt refinement in `docs/tasks/`. Worker agents discover, claim, execute, and complete tasks using a unified task-prompt format. Orchestrator agents refine prompts for clarity. Every state transition is a folder move plus a frontmatter update. The filesystem is the source of truth.

**Read first:**
- `docs/task-system.md` — lifecycle, states, folder structure
- `docs/task-prompt-format.md` — prompt sections, structure, examples

---

## Quick Ref: Unified Task-Prompt

Every task `overview.md` contains:

```yaml
---
task: "01"
slug: kebab-slug
status: pending
depends-on: []
blocked-by: ""
assigned-to: ""
created: 2026-07-01
outcome: ""
---
```

Followed by prompt sections:
- **Desired Changes** — what to build/modify/delete (scope)
- **Definition of Done** — verifiable acceptance criteria
- **Out of Scope** — explicit non-scope
- **Implementation Steps** — step-by-step how-to
- **Context** — design doc links + related tasks

Design doc = source of truth for **why**. Prompt = source of truth for **what** and **how**.

---

## Starting a Work Session

Orient yourself:

```bash
ls docs/tasks/pending/        # Available to claim
ls docs/tasks/in-flight/      # In progress (avoid collisions)
ls docs/tasks/parked/         # Blocked
```

Read `overview.md` for any relevant task before deciding what to work on.

---

## Refining / Creating a Task Prompt

When **creating a new task** or **refining an existing prompt** before claiming:

### 1. Verify against design doc

- Is there a design doc for this feature? Read it first.
- Design doc = **source of truth for why**
- Task prompt = **distillation of design doc into scope + execution**

If no design doc exists, create one first using `/skill:design-doc`.

### 2. Structure the prompt

Confirm `overview.md` body has all sections (after frontmatter):

```markdown
# Task Title

One-sentence summary of what task accomplishes.

## Desired Changes

Explicit bullet list of what to create/modify/delete. Scope boundaries.

## Definition of Done

Verifiable checklist. Each criterion testable.

## Out of Scope

Explicit non-scope list. Prevents scope creep + agent confusion.

## Implementation Steps

Concrete step-by-step instructions. Include file paths, function names, data structures.

## Context

Links to design docs, related tasks, key files.
```

### 3. Clarity checklist — Before handing off

- [ ] **Desired Changes** — agent knows exactly what to build/modify/delete?
- [ ] **Implementation Steps** — concrete enough agent won't ask clarifying questions?
- [ ] **Definition of Done** — each criterion verifiable/test-able?
- [ ] **Out of Scope** — explicit enough to prevent "should I also...?" confusion?
- [ ] **Context** — design doc link + related task references present?
- [ ] **Design doc** — is it source of truth? Does prompt distill it correctly?

If any fail, refine the prompt before handing off.

### 4. Example: refining a vague prompt

**Before (vague):**
```markdown
## Implementation Steps
- Implement vending machine
- Add purchase logic
- Update router
```

**After (concrete):**
```markdown
## Implementation Steps

1. **Create VendingMachine component** (`src/screens/VendingMachine.tsx`)
   - Import pack types from `core/game/packs.ts`
   - Render carousel of available packs using PackCard component
   - Display current coin balance from Redux store (`selectCoinBalance`)
   - Implement purchase button that calls `purchasePackAction(packId, cost)`

2. **Add purchase handler**
   - Validate coin balance before deduction
   - Deduct coins from store using `deductCoinsAction(cost)`
   - Dispatch action to set "next screen" to scratch flow

...
```

---

## Claiming a Task (pending → in-flight)

### Verify dependencies first

1. Read `overview.md` — check `depends-on` list
2. For each dependency, confirm it's in `docs/tasks/done/`:
   ```bash
   find docs/tasks/done -type d -name "NN-*"
   ```
3. If all dependencies done (or none), proceed

### Claim the task

```bash
mv docs/tasks/pending/NN-slug docs/tasks/in-flight/NN-slug
```

Update `overview.md` frontmatter:
- `status: in-flight`
- `assigned-to: <your session id or "agent">`

### Read the prompt

The `overview.md` body is your complete work spec:
- **Desired Changes** — what to build
- **Implementation Steps** — how to build it
- **Definition of Done** — verification checklist
- **Out of Scope** — what NOT to do
- **Context** — design doc links + related tasks

Execute as specified. If scope needs adjustment, **do not modify it yourself** — park the task and ask for clarification.

---

## Completing a Task (in-flight → done)

When **all** Definition of Done criteria met:

```bash
mv docs/tasks/in-flight/NN-slug docs/tasks/done/NN-slug
```

Update `overview.md` frontmatter:
- `status: done`
- `assigned-to: ""` (clear it)
- `outcome: "One or two sentences summarizing what was done and key decisions"`

**Write a useful outcome.** Future agents read it. Include:
- What was built/changed
- Key decisions made
- Any gotchas or surprises

**Example:**
```yaml
outcome: "Implemented vending machine screen with pack carousel. Used Redux for coin state to maintain consistency. Touch responsiveness tested on iPhone 12 and Android. Decision: kept animations minimal per Out of Scope."
```

---

## Parking a Task (in-flight → parked)

Park when you cannot continue. Two cases:

**Blocked by another task:**
```yaml
blocked-by: "task:05"
```

**Blocked by human input:**
```yaml
blocked-by: "human: need decision on auth library"
```

### To park

```bash
mv docs/tasks/in-flight/NN-slug docs/tasks/parked/NN-slug
```

Update `overview.md` frontmatter:
- `status: parked`
- `blocked-by: <reason>`
- `assigned-to: ""` (clear it)

### Add Parking Notes section

Add to body explaining:
- What you tried
- What you discovered
- Exactly what's needed to unblock
- Any code state left behind

**Example:**
```markdown
## Parking Notes

Hit blocker on purchase validation. Prompt requires `deductCoinsAction(cost)` from Redux store, but action doesn't exist yet. It's defined in task:02 (coin store setup). Once task:02 reaches done and `deductCoinsAction` is available, this task resumes immediately — component structure and purchase button are already stubbed in `src/screens/VendingMachine.tsx`.
```

---

## Releasing a Task (in-flight → pending)

If session ends and task unfinished but not blocked:

```bash
mv docs/tasks/in-flight/NN-slug docs/tasks/pending/NN-slug
```

Update `overview.md` frontmatter:
- `status: pending`
- `assigned-to: ""` (clear it)

**Optional:** Add `## Session Notes` section if useful for next worker.

---

## Unparking a Task (parked → pending)

When blocker resolves:

1. Confirm resolution — if `blocked-by: task:05`, verify it's in `done/`
2. Move folder:
   ```bash
   mv docs/tasks/parked/NN-slug docs/tasks/pending/NN-slug
   ```
3. Update `overview.md` frontmatter:
   - `status: pending`
   - `blocked-by: ""`
4. Read Parking Notes to understand state left behind

---

## Checking for Unblocked Parked Tasks

After completing a task, find any parked tasks waiting on it:

```bash
grep -r "task:NN" docs/tasks/parked/
```

Replace `NN` with your completed task number. Unpark any tasks whose only blocker was resolved.

---

## Frontmatter Contract

`status` must match parent folder — this is invariant. Update both on every state transition.

| State | Folder | `status` | `assigned-to` | `blocked-by` |
|-------|--------|----------|---------------|--------------|
| pending | `pending/` | `pending` | `""` | `""` |
| in-flight | `in-flight/` | `in-flight` | set | `""` |
| parked | `parked/` | `parked` | `""` | set |
| done | `done/` | `done` | `""` | `""` |

---

## Finding a Task by Number

Task IDs stable. Locate any task:

```bash
find docs/tasks -type d -name "NN-*"
```

---

## Prompt Refinement Checklist

Use when **creating or reviewing** a task prompt before handing to worker:

- [ ] **Design doc exists** — source of truth for why?
- [ ] **Desired Changes** — explicit list of what to build/modify/delete?
- [ ] **Implementation Steps** — concrete enough no clarifying questions needed?
- [ ] **Definition of Done** — each criterion verifiable?
- [ ] **Out of Scope** — explicit enough to prevent scope creep?
- [ ] **Context** — design doc link + related task references?
- [ ] **No ambiguity** — could any instruction be misunderstood?

If any fail, refine before handing off.

---

## What Not To Do

- Do not claim without verifying dependencies done
- Do not mark done without verifying Definition of Done checklist
- Do not park without writing Parking Notes explaining blocker + state
- Do not delete tasks — done is permanent record
- Do not edit another agent's in-flight task without checking `assigned-to`
- Do not claim task with vague prompt — refine it first
- Do not modify Desired Changes / Out of Scope yourself mid-task — park and ask

---

## Related Docs

- [Task System](../../docs/task-system.md) — lifecycle, states, folder structure
- [Task-Prompt Format](../../docs/task-prompt-format.md) — prompt template + sections + examples
- [AGENTS.md](../../AGENTS.md) — FaM principles
- [docs/_map.md](../../docs/_map.md) — master index of design docs

---

## Related Skills

- `/skill:task-create` — decompose goals into well-formed tasks
- `/skill:design-doc` — create feature docs (source of truth for why)
