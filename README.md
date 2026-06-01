# Agent Evolution OS

Auditable self-evolution governance for long-running AI agents.

Evolution OS helps agents capture lessons without polluting core memory. It turns durable learning into a governed flow:

```text
capture → candidate → review → promote/archive draft → manual apply → verify → distill/forget
```

## What it does

- Keeps new learnings in a candidate inbox first.
- Reviews candidates for missing fields, decay, and duplication.
- Generates promotion/archive drafts instead of directly mutating core files.
- Audits `MEMORY.md` size and workflow-like content.
- Audits skills for frontmatter, description length, size, and duplicate triggers.
- Provides init, self-check, and fixture self-test commands.

## Safety boundaries

By default, Evolution OS does **not**:

- automatically edit `MEMORY.md`, `AGENTS.md`, or `SOUL.md`;
- delete memories;
- publish skills/plugins;
- train models;
- upload data.

It only captures, audits, suggests, drafts, and logs.

## Quickstart

```bash
node bin/evolution-review.js --init
node bin/evolution-review.js --self-check
node bin/evolution-review.js --write-report
```

Run fixture smoke tests in a temporary workspace:

```bash
npm run self-test
```

## Documentation

- `docs/DESIGN.md`
- `docs/INSTALL.md`
- `docs/QUICKSTART.md`
- `docs/COMMANDS.md`
- `docs/PRODUCT.md`

## Status

Current version: `0.1.0-draft`.

This is a file-system-first draft. OpenClaw tool plugin support is planned later.
