# Install Evolution OS

Evolution OS is a file-system-first self-evolution governance layer for long-running agents.

It gives you:

- candidate inbox / review / promote / archive flow;
- memory distill and skill audit reports;
- runtime hooks: `--before-task`, `--after-task`, `--periodic-usage`;
- a `self-evolution-governor` skill template;
- host integration docs for OpenClaw and other agent runtimes.

## Requirements

- Node.js >= 18
- A workspace directory for your agent
- Optional: an agent runtime such as OpenClaw, Claude Code, Codex-style agents, or any system that can call shell commands around tasks

Check Node:

```bash
node --version
```

## Option A: clone from GitHub

```bash
git clone git@github.com:LanShanPi/agent-evolution-os.git
cd agent-evolution-os
npm run verify
```

Use the local CLI from inside your agent workspace:

```bash
node /path/to/agent-evolution-os/bin/evolution-review.js --init
node /path/to/agent-evolution-os/bin/evolution-review.js --self-check
```

Example:

```bash
cd ~/my-agent-workspace
node ~/agent-evolution-os/bin/evolution-review.js --init
node ~/agent-evolution-os/bin/evolution-review.js --self-check
```

## Option B: install from GitHub with npm

From your agent workspace:

```bash
npm install github:LanShanPi/agent-evolution-os
npx evolution-review --init
npx evolution-review --self-check
```

If you prefer a project-local script, add this to your workspace `package.json`:

```json
{
  "scripts": {
    "evo": "evolution-review"
  }
}
```

Then run:

```bash
npm run evo -- --write-report
```

## Option C: global install from GitHub

```bash
npm install -g github:LanShanPi/agent-evolution-os
evolution-review --help
```

Then initialize any workspace:

```bash
cd ~/my-agent-workspace
evolution-review --init
evolution-review --self-check
```

## Install the agent adapter

Install to the default global skills directory:

```bash
evolution-review --install-adapter
```

Default target:

```text
~/.agents/skills/self-evolution-governor/SKILL.md
```

Install to a custom skills directory:

```bash
evolution-review --install-adapter --skill-dir ~/.openclaw/skills
```

This command is idempotent. It will not overwrite an existing adapter/skill file.

`--install-skill` is kept as a backward-compatible alias, but docs use `--install-adapter` to make the product shape clear: the adapter is part of this project, not a separate project.

## Add the minimal host entry

Evolution OS needs a small entry in your host agent instructions. Without this, it is only a sidecar tool.

Add this to your `AGENTS.md`, system prompt, or equivalent host instruction file:

```md
## Evolution OS Entry

For durable self-improvement, use Evolution OS instead of directly growing core files.

Trigger Evolution OS when:
- the user corrects the agent;
- a task fails or needs rework;
- the user says "remember this", "next time", or "always do this";
- a complex task starts or ends;
- the agent wants to update memory, skills, tools, or core policy.

Before a relevant task:
`evolution-review --before-task --task "<task>"`

After a relevant task:
`evolution-review --after-task --task "<task>" --outcome "<outcome>"`

Periodically:
`evolution-review --periodic-usage`

New lessons default to `memory/evolution-os/inbox/`. Core files should keep only stable entry rules and reviewed distilled lessons. High-risk changes require confirmation.
```

## Daily usage

### Before a task

```bash
evolution-review --before-task --task "write a proposal for X"
```

This retrieves relevant lessons and records a prepare event.

### After a task

```bash
evolution-review --after-task --task "write a proposal for X" --outcome "completed; user accepted with minor edits"
```

This evaluates whether lessons were applied and records a reflect event.

### Write safe candidates after reflection

```bash
evolution-review --after-task \
  --task "fix repeated API auth issue" \
  --outcome "failed once, fixed after reading tool notes; next time check auth scope first" \
  --write-candidate
```

High-risk candidates are blocked from automatic writes.

### Periodic usage review

```bash
evolution-review --periodic-usage
```

This summarizes effective/stale lessons from:

```text
memory/evolution-os/runtime/usage-log.jsonl
```

## Review candidates

```bash
evolution-review --write-report
```

Generate promotion draft:

```bash
evolution-review --candidate <candidate-id> --promote-draft
```

Generate archive draft:

```bash
evolution-review --candidate <candidate-id> --archive-draft --reason manual-review
```

## OpenClaw integration

For OpenClaw, start with Level 1 + Level 2:

1. Run `evolution-review --init` in the OpenClaw workspace.
2. Run `evolution-review --install-adapter`.
3. Add the minimal Evolution OS entry to `AGENTS.md`.
4. Use `--before-task`, `--after-task`, and `--periodic-usage` manually or through host hooks.

Read:

```text
docs/HOST_INTEGRATION.md
docs/OPENCLAW_INTEGRATION.md
```

OpenClaw plugin integration is the recommended next step for automatic lifecycle calls. Do not directly edit the OpenClaw installation directory.

## Safety boundaries

Evolution OS does not automatically:

- edit `MEMORY.md`, `AGENTS.md`, or `SOUL.md`;
- delete memories;
- publish skills/plugins;
- train models;
- upload data;
- create cron/scheduler jobs without explicit approval.

## Verify installation

```bash
evolution-review --self-check
npm run verify
```

Expected:

```text
Overall: PASS
```
