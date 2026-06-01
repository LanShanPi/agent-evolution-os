# Agent Evolution OS

Auditable self-evolution governance for long-running AI agents.

Evolution OS helps agents capture lessons without polluting core memory. It turns durable learning into a governed flow:

```text
capture → candidate → review → promote/archive draft → manual apply → verify → distill/forget
```

It is designed for people running long-lived AI agents with memory files, skills, project notes, or future training-data pipelines.

## Why this exists

Many agent memory systems only add more text: append to memory, append to skills, append to prompts. Over time this creates prompt bloat, stale rules, duplicated workflows, and unsafe self-modification.

Evolution OS adds a metabolism layer:

- new learning starts as a candidate;
- candidates are reviewed for structure, decay, and duplication;
- durable rules are promoted only after compression;
- stale or duplicate knowledge can be archived;
- high-impact changes stay reviewable.

## What it does

- Keeps new learnings in a candidate inbox first.
- Reviews candidates for missing fields, decay, and duplication.
- Generates promotion/archive drafts instead of directly mutating core files.
- Audits `MEMORY.md` size and workflow-like content.
- Audits skills for frontmatter, description length, size, and duplicate triggers.
- Converts skill audit findings into cleanup candidate drafts.
- Provides init, self-check, and fixture self-test commands.

## Safety boundaries

By default, Evolution OS does **not**:

- automatically edit `MEMORY.md`, `AGENTS.md`, or `SOUL.md`;
- delete memories;
- publish skills/plugins;
- train models;
- upload data.

It only captures, audits, suggests, drafts, and logs.

## Requirements

- Node.js 18+
- A workspace where your agent keeps files such as memory, skills, notes, or project context

No network access is required for normal local use.

## Install

### Option A: Clone from GitHub

```bash
git clone git@github.com:LanShanPi/agent-evolution-os.git
cd agent-evolution-os
npm run verify
```

Then copy the repo into or alongside your agent workspace, or run the CLI from this checkout against a workspace by copying `bin/evolution-review.js` into that workspace.

### Option B: Use as a local CLI checkout

From this repository:

```bash
npm run verify
```

Then in the target workspace, copy the CLI:

```bash
mkdir -p tools
cp /path/to/agent-evolution-os/bin/evolution-review.js tools/evolution-review.js
node tools/evolution-review.js --init
```

### Option C: Future npm usage

This draft includes a `bin` entry:

```json
{
  "evolution-review": "bin/evolution-review.js"
}
```

The package is not published to npm yet. Until then, use clone/copy or a local checkout.

## Runtime loop MVP

Evolution OS is moving beyond review/draft governance into a runtime self-evolution loop.

Before a task, retrieve relevant lessons:

```bash
node tools/evolution-review.js --prepare --task "write and review a public content post"
```

`--prepare` scans memory, promoted rules, hard cases, and skill-bank notes, then returns:

- relevant lessons;
- source citations;
- an apply checklist;
- gaps to capture after the task.

This is the first runtime step: making previous learning affect future behavior.

## Quickstart in a workspace

Run from the root of your agent workspace:

```bash
node tools/evolution-review.js --init
node tools/evolution-review.js --self-check
node tools/evolution-review.js --write-report
```

This creates the Evolution OS file structure if missing:

```text
memory/evolution-os/
  README.md
  DESIGN.md
  policy.md
  config.json
  inbox/
  promoted/
  archive/
  reports/
  schemas/
  training-corpus/

skills/self-evolution-governor/SKILL.md
```

`--init` never overwrites existing files. If package `templates/` are present, it uses them; otherwise it falls back to embedded defaults.

## Common commands

### Review current state

```bash
node tools/evolution-review.js
node tools/evolution-review.js --json
node tools/evolution-review.js --write-report
```

### Create a promotion draft for a candidate

```bash
node tools/evolution-review.js \
  --candidate <candidate-id> \
  --promote-draft
```

### Create an archive draft

```bash
node tools/evolution-review.js \
  --candidate <candidate-id> \
  --archive-draft \
  --reason rejected|merged|expired|superseded|manual-review|promoted
```

### Audit memory

```bash
node tools/evolution-review.js --memory-distill
node tools/evolution-review.js --memory-distill-draft --write-report
```

### Audit skills

```bash
node tools/evolution-review.js --skill-audit
node tools/evolution-review.js --skill-audit --all-skills
```

### Turn skill audit findings into cleanup candidates

```bash
node tools/evolution-review.js --skill-audit --suggest-cleanup-candidates
```

This writes candidate drafts to:

```text
memory/evolution-os/inbox/
```

It does not edit or delete skill files.

### Run self-test

```bash
npm run self-test
```

Or from a copied CLI in a disposable workspace:

```bash
node tools/evolution-review.js --self-test
```

Note: `--self-test` writes fixture files. Run it in a temporary workspace unless fixture files are acceptable.

## Candidate format

Candidates live in:

```text
memory/evolution-os/inbox/
```

They use Markdown plus YAML frontmatter:

```markdown
---
id: evo-YYYYMMDD-HHMM-slug
type: preference | fact | workflow | failure | tool | architecture | training | hypothesis
source: user | task-failure | observation | review | external-research
confidence: low | medium | high
status: candidate
scope: global | user | project | tool | skill | model
created: YYYY-MM-DD
decay: 7d | 30d | 90d | permanent
risk: low | medium | high
suggested_targets:
  - MEMORY.md
---

## Signal

## Proposed Learning

## Why It Matters

## Promotion Criteria

## Rejection Criteria
```

See:

```text
templates/memory/evolution-os/schemas/candidate-template.md
```

## Examples

Examples are included under:

```text
examples/
```

They cover:

- duplicate candidates;
- expired candidates;
- memory distillation flags;
- skill audit flags.

See `examples/README.md` for a copy-and-run workflow.

## Documentation

- `docs/DESIGN.md`
- `docs/INSTALL.md`
- `docs/QUICKSTART.md`
- `docs/COMMANDS.md`
- `docs/PRODUCT.md`

## Status

Current version: `0.1.0-draft`.

This is a file-system-first draft. OpenClaw tool plugin support is planned later.

## License

MIT
