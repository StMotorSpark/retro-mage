---
name: antigravity
description: Hand off well-scoped tasks to Antigravity running headlessly. Use when the user requests antigravity execution or wants to offload a task with a complete task prompt. Antigravity gets full read/write access to the repo root, auto-approves, commits, and pushes on completion.
---

# Antigravity Skill

## What It Does

Runs Antigravity headlessly against the repo root with full read/write access. Fire-and-forget — no output capture. Agent receives task prompt, implements it, commits, and pushes on the current branch.

---

## Pre-Flight Checks

Before invoking, verify:

1. **Branch is not `main` or `master`**
   ```bash
   git branch --show-current
   ```
   If on `main` or `master` — **warn the user and stop**. Task implementations must never commit directly to trunk. Ask user to switch branches first.

2. **Task exists and is in `pending/`**
   ```bash
   find docs/tasks/pending -type d -name "NN-*"
   ```
   If not found, do not invoke. Task must have a complete prompt before handoff.

---

## Invocation

Run from **repo root** with the full absolute path to the working directory. Antigravity is long-running — always launch in the background with `&`:

```bash
agy -p "PROMPT HERE" --add-dir /absolute/path/to/repo &
```

> `--add-dir` requires the **full absolute path** — relative paths (e.g., `--add-dir .`) do not work as expected.
> Trailing `&` runs the process in the background. Capture the PID with `echo "Antigravity launched (PID $!)"` for reference.

### Get repo root path

```bash
git rev-parse --show-toplevel
```

Use this value as the `--add-dir` argument.

---

## Standard Prompt Template

```
Use ultra caveman. Use the task-work skill to implement task {taskNumber} on the current branch. Once completed commit and push to remote.
```

Replace `{taskNumber}` with the zero-padded task number (e.g., `03`).

### Full invocation example (task 03)

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)

agy -p "Use ultra caveman. Use the task-work skill to implement task 03 on the current branch. Once completed commit and push to remote." \
    --add-dir "$REPO_ROOT"
```

---

## Workflow Context

This skill sits at the end of a two-phase workflow:

| Phase | Who | What |
|-------|-----|-------|
| Design + planning | You + pi | Create design docs, decompose into tasks, refine prompts |
| Implementation | Antigravity | Pick up tasks, implement, commit, push |

All phases happen on the **same feature branch**. Design docs, tasks, and implementations land in the same PR.

---

## Related Skills

- `/skill:task-work` — task lifecycle + prompt refinement (Antigravity uses this internally)
- `/skill:task-create` — decompose goals into tasks before handing off
- `/skill:design-doc` — create design docs (source of truth for why)
