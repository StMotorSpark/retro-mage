# BPS AI Base

A template repository for AI-driven projects using **Filesystem as Memory (FaM)** — a system where design docs and tasks live as files in `docs/`, making them the source of truth for both humans and AI agents.

This template includes:
- ✅ **FaM principles** and design doc structure
- ✅ **Integrated AI skills** for pi (task management, design docs, local model execution, and more)
- ✅ **Task system** — filesystem-native task tracking with pending/in-flight/done states
- ✅ **Pre-configured folder structure** — ready for docs, tasks, and code

## Quick Start

### 1. Clone & Initialize

```bash
git clone https://github.com/YOUR_USERNAME/bps-ai-base.git my-project
cd my-project
```

### 2. Understand FaM

**Read [`AGENTS.md`](./AGENTS.md) first.** It explains:
- Why design docs are in `docs/` (they're your memory)
- The four FaM principles
- How to structure and link docs
- Why design docs are written in present tense

Then check [`docs/_map.md`](docs/_map.md) — it's your project's doc index.

### 3. Install Pi & Skills

This template is designed to work with **[pi](https://github.com/earendil-works/pi)** — a coding agent harness that lets you offload work to AI models or local LLMs.

```bash
# Install pi globally (if not already installed)
npm install -g @earendil-works/pi-coding-agent

# Verify pi and skills are accessible
pi skill list
```

You should see skills like:
- `design-doc` — Create/update design docs
- `task-create` — Write well-formed tasks
- `task-work` — Execute and manage tasks
- `antigravity` — Hand off tasks to Antigravity (Claude via API)
- `local-model` — Hand off tasks to your local LLM (LM Studio)
- `caveman` — Ultra-compressed communication mode

### 4. Create Your First Doc

Use the `design-doc` skill to create your first design doc:

```bash
/skill:design-doc
```

Follow the prompts to write a doc. It will be created in `docs/` with:
- YAML frontmatter (feature, tags, summary, relates-to)
- Proper markdown structure
- Automatic link updates to `docs/_map.md`

### 5. Create & Execute Tasks

Use the `task-work` skill to manage your task lifecycle:

```bash
# Create a task
/skill:task-work

# Or directly:
/skill:task-create
```

Tasks live in `docs/tasks/` with states:
- `pending/` — waiting to be picked up
- `in-flight/` — actively being worked
- `done/` — completed (kept for history)

## Project Structure

```
.
├── AGENTS.md                 # FaM principles & working agreement
├── README.md                 # This file
├── .gitignore               # Standard node/python ignores
│
├── docs/
│   ├── _map.md              # Master index of all design docs
│   └── tasks/
│       ├── pending/         # New tasks waiting to be picked up
│       ├── in-flight/       # Tasks being actively worked
│       └── done/            # Completed tasks (history)
│
├── .pi/
│   └── skills/              # Integrated pi skills
│       ├── design-doc/
│       ├── task-create/
│       ├── task-work/
│       ├── antigravity/
│       ├── local-model/
│       └── caveman/
│
└── [your code here]
    ├── src/
    ├── tests/
    └── ...
```

## Working in This Repo

### Doc-First Development

1. **Write a design doc** — Define *what* you're building and *why*
2. **Create a task** — Break it down into executable work
3. **Execute & iterate** — Code follows docs, docs are updated as you learn

**Key principle**: Docs describe **target state** in present tense. They're written as if the feature exists, even if it's not yet implemented. This keeps them unambiguous and actionable.

### Using Skills

#### Design Docs
```bash
/skill:design-doc
```
Creates or updates docs in `docs/`. Skills will prompt you through structure, keep docs linked, and maintain `_map.md`.

#### Task Management
```bash
/skill:task-work
```
Manages task lifecycle: create, pick up pending work, mark complete, refine prompts.

```bash
/skill:task-create
```
Quick task creation with the full task-prompt format.

#### Offloading Work
```bash
/skill:antigravity
```
Hand off complete, well-scoped tasks to Claude (via API) — full read/write access, auto-commits.

```bash
/skill:local-model
```
Hand off tasks to your local LLM (via LM Studio) for autonomous execution.

#### Compressed Communication
```bash
/skill:caveman
```
Ultra-compressed token mode (~75% savings) for when you want brief, caveman-speak responses while keeping technical accuracy. Useful for token efficiency.

## Core Concepts

### Filesystem as Memory (FaM)

Your `docs/` folder is persistent memory:
- **Design docs** are authoritative — they define *target state*
- **Tasks** track work — they live in `docs/tasks/` with lifecycle states
- **Links** connect docs — backlinks in frontmatter keep context clear
- **AI-readable** — tools read this structure to understand your system

### Design Doc Structure

Every doc has:
```yaml
---
feature: <feature name>
tags: [tag1, tag2]
summary: <one-line summary>
relates-to:
  - docs/other-doc.md
---
```

Plus sections like Features, Architecture, Behavior, Related Docs, etc.

### Task Lifecycle

```
pending/ → pick up → in-flight/ → complete → done/
```

Tasks are files with frontmatter + prompt. When you pick one up, it moves to `in-flight/`. When done, it moves to `done/` (history kept forever).

## Tips

- **Always start with `docs/_map.md`** — it's your project's table of contents
- **Keep docs linked** — use the skill to maintain backlinks automatically
- **Write in present tense** — "The system does X" not "We will build X"
- **Tasks are executable** — they should be specific enough for an AI or human to run autonomously
- **Design docs explain *why*** — code comments explain *how*

## Next Steps

1. Read [`AGENTS.md`](./AGENTS.md)
2. Read [`docs/_map.md`](docs/_map.md)
3. Create your first design doc with `/skill:design-doc`
4. Create your first task with `/skill:task-work`
5. Start building! 🚀

---

Built with [FaM](./AGENTS.md) principles and [pi](https://github.com/earendil-works/pi).
