---
name: antigravity
description: Hand off well-scoped tasks to Antigravity running headlessly. Use when the user requests antigravity execution or wants to offload a task with a complete task prompt. Antigravity gets full read/write access to the repo root, auto-approves, commits, and pushes on completion.
---

# Antigravity Skill

## What It Does

Runs Antigravity headlessly against the repo root with full read/write access. Agent receives task prompt, implements it, commits, and pushes on the current branch. Always launch with output redirected to a log file — headless runs give no other signal that work is progressing or that it failed.

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

Run from **repo root** with the full absolute path to the working directory. Antigravity is long-running — always launch in the background with `&`, and always redirect stdout/stderr to a log file:

```bash
nohup agy -p "PROMPT HERE" --add-dir /absolute/path/to/repo --dangerously-skip-permissions \
    > /tmp/agy-task-NN.log 2>&1 &
echo "Antigravity launched (PID $!)"
```

> `--add-dir` requires the **full absolute path** — relative paths (e.g., `--add-dir .`) do not work as expected.
> `--dangerously-skip-permissions` is **required**. Without it, headless mode auto-denies any tool that would normally prompt for the "command" permission (most shell/file operations), the run produces zero output, and the process exits almost immediately with nothing committed — no error surfaced unless you capture the log. This is not optional for unattended runs.
> Redirect output to a log file (`/tmp/agy-task-NN.log` or similar) — do not treat this as truly fire-and-forget. Check the log to confirm the process is actually working, not silently dead.
> Trailing `&` runs the process in the background. Capture the PID with `echo "Antigravity launched (PID $!)"` for reference.

### Verifying the run took hold

After launch, confirm the process is genuinely alive and working before walking away:

```bash
sleep 10
ps -p $PID -o pid,etime,command   # still running?
cat /tmp/agy-task-NN.log            # any permission-denial or error output?
```

A process that exits within a few seconds with an empty or permission-denial log means the launch failed — relaunch with `--dangerously-skip-permissions` before assuming the task is progressing.

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

nohup agy -p "Use ultra caveman. Use the task-work skill to implement task 03 on the current branch. Once completed commit and push to remote." \
    --add-dir "$REPO_ROOT" --dangerously-skip-permissions \
    > /tmp/agy-task03.log 2>&1 &
echo "Antigravity launched (PID $!)"
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

## Known Failure Modes

- **Silent permission auto-deny** — omitting `--dangerously-skip-permissions` causes headless mode to auto-deny any permission-gated tool call. The process exits quickly with no commits and no visible error unless output was redirected to a log file. Symptom: log contains `no output produced — a tool required the "command" permission that headless mode cannot prompt for, so it was auto-denied`. Fix: always pass `--dangerously-skip-permissions`.
- **Assuming fire-and-forget means no verification needed** — always check the log file and process liveness a short time after launch (see Verifying the run took hold above) before considering the handoff successful.

## Related Skills

- `/skill:task-work` — task lifecycle + prompt refinement (Antigravity uses this internally)
- `/skill:task-create` — decompose goals into tasks before handing off
- `/skill:design-doc` — create design docs (source of truth for why)