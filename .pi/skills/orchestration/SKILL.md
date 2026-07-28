---
name: orchestration
description: Coordinate dependent task execution through background agents, independently verify completion, recover false completions, reconcile docs, and report test readiness.
---

# Orchestration Skill

## Purpose

Orchestration owns multi-task execution from dependency planning through verified completion. It sits above task creation, task lifecycle management, and agent handoff.

Agent completion messages are proposals. Orchestrator review makes completion authoritative.

## Workflow

```text
plan → validate dependencies → hand off → monitor → review → accept/recover → reconcile → report
```

### 1. Plan

- Read `docs/_map.md` and relevant design docs.
- Scan all task state folders for duplicates and collisions.
- Split work at real ownership boundaries:
  - core/runtime behavior;
  - WASM/TypeScript bridge;
  - browser/demo proof;
  - docs/gap reconciliation and cleanup.
- Create explicit dependencies between boundary tasks.
- Define shared cross-task contracts before implementation:
  - API names/signatures;
  - state fields and enum values;
  - diagnostics fields;
  - ownership and failure semantics.

### 2. Validate Handoff

Before launching an agent:

- branch is not `main` or `master`;
- task exists in the expected state folder;
- every dependency is in `done/`;
- task prompt has all required sections;
- working tree is clean or changes are explicitly owned;
- no other agent is modifying overlapping files.

Use Antigravity only for one dependency-ready task at a time unless file ownership is provably disjoint.

### 3. Monitor

Launch background work with the Antigravity skill requirements:

- absolute repo path;
- `--dangerously-skip-permissions`;
- redirected log;
- captured PID.

Verify process liveness and log activity after launch. Poll status, task folder, branch, and commits. A silent or exited process is a failed handoff until inspected.

### 4. Review Completion

Never trust agent completion text alone. Independently verify:

- task folder matches frontmatter status;
- dependencies and assigned-to fields are correct;
- every Definition of Done checkbox has code/test evidence;
- implementation behavior exists, not only types/fields/diagnostics;
- producer and consumer boundaries are wired end-to-end;
- success, failure, retry, stale, and cancellation paths are covered;
- browser assertions check exact lifecycle states and flags, not only object existence;
- required tests actually ran and passed;
- generated traces, screenshots, recordings, and temporary files are absent;
- git diff is scoped and clean.

Required evidence report:

```text
Task: NN
Changed: <files/modules>
Tests: <exact commands and results>
DoD: <each criterion verified or reason unmet>
Artifacts: clean/removed
Status: accepted/rejected/parked
```

### 5. Recover False Completion

If any criterion is unmet:

- do not leave task `done`;
- move `done → in-flight` for active repair, or `done → parked` when blocked;
- update frontmatter and add Parking Notes;
- explain exact missing behavior and evidence;
- remove invalid generated artifacts or weak stubs;
- relaunch only with a targeted repair prompt.

Never silently rewrite Desired Changes or Out of Scope. Refine implementation steps or create a follow-up task when boundary scope was wrong.

### 6. Reconcile

After implementation/proof tasks complete:

- review design docs against actual behavior;
- update `known-gaps.md` only from verified evidence;
- preserve unresolved gaps when proof is incomplete;
- verify task status/folder invariants;
- run final regression checks;
- confirm branch clean and pushed before reporting test readiness.

## Completion Gate

Orchestration reports “ready for testing” only when:

- all required tasks are verified done;
- implementation and bridge boundaries work together;
- browser proof covers required behavior;
- final regression suite passes;
- known-gap wording is accurate;
- branch is clean and remote is current.

Otherwise report “not ready”, name blockers, and identify next task.

## Related Skills

- `/skill:task-create` — create and decompose task prompts
- `/skill:task-work` — manage individual task lifecycle
- `/skill:antigravity` — execute a task in background
- `/skill:design-doc` — maintain authoritative design docs
