---
name: local-model
description: Hand off well-scoped tasks to the local model (ornith-1.0-9b via LM Studio) running headlessly through pi. Use when the user requests local model execution, or when a task is self-contained, well-specified, lower-stakes, and suitable for autonomous offload. Do NOT use for design decisions, ambiguous specs, cross-context reasoning, or anything requiring judgment beyond what is fully defined in the task prompt.
---

# Local Model Skill

## Model

| Field | Value |
|-------|-------|
| Model ID | `ornith-1.0-9b` |
| Provider | LM Studio (local) |
| Pi provider key | `lmstudio` |
| Thinking | Always on — model ignores `thinkingLevel:off`; do not attempt to suppress |
| Eval date | 2026-06-30 |
| Eval score | 59/64 (strong — suitable for autonomous offload) |

---

## Invocation

Run pi in non-interactive print mode (`-p`) with the local model. Pi must be launched from the correct working directory — there is no `--cwd` flag.

```bash
cd /path/to/working/directory

pi -p --no-session \
   --model lmstudio/ornith-1.0-9b \
   --no-context-files \
   --no-skills \
   --skill .pi/skills/task-work/SKILL.md \
   --append-system-prompt "$(cat <<'EOF'
When using the edit tool, always include at least the function or method signature as surrounding context in oldText — never use just the stub body alone. Each oldText must be unique in the file.
When edits span multiple files, use one edit call per file. Never mix oldText from different files in a single call.
You are scoped to the current working directory only. Do not use absolute paths or access files outside the cwd.
EOF
)" \
   "YOUR TASK PROMPT HERE"
```

### Flags explained

| Flag | Reason |
|------|--------|
| `-p` / `--print` | Non-interactive; processes prompt and exits |
| `--no-session` | Ephemeral — no session file written |
| `--model lmstudio/ornith-1.0-9b` | Target local model via LM Studio provider |
| `--no-context-files` | Excludes AGENTS.md / CLAUDE.md — not relevant for isolated grunt work |
| `--no-skills` | Prevents skill injection into context — keeps prompt clean |
| `--skill .pi/skills/task-work/SKILL.md` | Explicitly injects task-work skill — additive even with `--no-skills` |
| `--append-system-prompt` | Injects the three required mitigations (see below) |

> **LM Studio must be running** with `ornith-1.0-9b` loaded before invoking. If the model name is unavailable, run `pi --list-models` while LM Studio is active to confirm the registered model ID.

### Capture output

```bash
output=$(pi -p --no-session --model lmstudio/ornith-1.0-9b \
   --no-context-files --no-skills \
   --skill .pi/skills/task-work/SKILL.md \
   --append-system-prompt "..." \
   "YOUR TASK")

echo "$output"
```

---

## Verified Capabilities (from eval)

These task types the model handles reliably and autonomously:

| Task Type | Evidence |
|-----------|----------|
| Single-file implementation (fill stubs) | T01: 5/5 Python functions, all correct |
| Multi-file implementation from scratch | T02: JS calculator + formatter, correct after self-correction |
| Bug hunting across multiple files | T03: All 4 bugs identified in one read pass, all fixed correctly |
| Refactoring / module splitting | T04: Full monolith → 6-module split, identical output |
| Self-testing | All tasks: model wrote and ran its own verification scripts without prompting |
| Spec ambiguity resolution | T01: Identified contradictory docstring, correctly prioritised spec rule over example |
| Tool error recovery | All tasks: diagnosed edit failures accurately and produced correct retries |

---

## Known Weaknesses

These are predictable failure modes. The required mitigations below address all three.

### 1. Non-unique `oldText` in `edit` calls
When multiple stubs share identical boilerplate (`# TODO\n    pass`), the model's first attempt uses just the stub as `oldText`, causing a "found N occurrences" error. It self-corrects on retry, but costs 2 turns.

**Mitigation (baked into invocation above):** Tell the model to always include the function signature as context.

### 2. Wrong file path in multi-file `edit` calls
When fixing bugs across multiple files in one `edit` call, the model mixed `oldText` from `models/user.py` into a call targeting `app.py`. Self-corrected on retry.

**Mitigation (baked into invocation above):** One `edit` call per file.

### 3. Absolute-path scope leak
The model issued `find` and `bash` commands using absolute paths outside its task directory, accessing the broader repo. In the eval this accidentally helped (found test file with expected module names). In production this is unsafe.

**Mitigation (baked into invocation above):** Explicit cwd-scope restriction in system prompt.

---

## Task Suitability

### Route to local model ✅
- Self-contained implementation tasks (fill stubs, write modules to spec)
- Bug hunting in a defined file set
- Refactoring with clear structural target
- Bulk/repetitive code transformations
- Tasks with verifiable outputs (test suite, diff, import check)
- Any task where "done" can be objectively confirmed

### Keep with primary agent ❌
- Design decisions or architecture choices
- Ambiguous specs without a resolution rule
- Tasks requiring cross-doc or cross-repo reasoning
- Tasks where output verification requires judgment
- Anything touching the FaM docs layer

---

## Writing a Good Prompt for This Model

The model performs best when the prompt is narrow, explicit, and testable. Use this structure:

```
Your working directory is: <absolute path>

Files involved:
- <file1> — <one line description>
- <file2> — <one line description>

Task:
<Precise description of what to implement/fix/refactor. Include spec rules explicitly — do not leave resolution to judgment.>

Success criteria:
- <Objective check 1 — e.g., "all functions in string_utils.py return correct output">
- <Objective check 2 — e.g., "import of all new modules succeeds">
- <Objective check 3 — e.g., "python -m pytest passes">

Write and run a verification script to confirm success before finishing.
```

### Prompt crafting rules

- **List the files explicitly.** The model reads files before acting — naming them upfront reduces unnecessary exploration.
- **State spec rules, not just examples.** When a spec example could be ambiguous, add the rule: "the rule takes priority over the example in the docstring."
- **Include the test command** if one exists: "run `pytest tests/` to verify." The model self-tests reliably when told what to run.
- **Ask for a verification step explicitly.** The model does this unprompted but asking it makes the expectation clear and reduces the chance of a silent exit.
- **Scope the task to one concern.** Multi-concern prompts increase path management errors (T03 pattern). If multiple concerns are needed, split into sequential handoffs.
- **Do not ask for design decisions.** Provide the target structure; the model implements it.

---

## Thinking Behavior

`ornith-1.0-9b` always emits thinking blocks regardless of `--thinking off` or `thinkingLevel:off`. This is a model-level behavior LM Studio does not suppress. Thinking content appears in the output but does not affect correctness. Do not attempt to suppress it — it is effectively free reasoning for this model.

---

## Related Docs

_Link to `/handoff` skill when built — this skill provides the model profile; the handoff skill provides the orchestration wrapper._
