# Unattended Evolution Model

Evolution OS supports **unattended-safe evolution**, not unlimited self-modification.

The goal is to let an agent improve continuously without waiting for a human on every low-risk lesson, while keeping irreversible or high-impact changes behind review.

## Permission tiers

### Tier 0: Observe only

Allowed automatically:

- record prepare / reflect usage events;
- generate reports;
- detect stale or effective lessons;
- produce suggestions.

No file writes except runtime logs/reports.

### Tier 1: Low-risk unattended

Allowed automatically:

- write low/medium-risk candidates to `memory/evolution-os/inbox/`;
- generate promotion/archive drafts;
- update usage reports;
- create rollback metadata for generated drafts.

Not allowed:

- edit `MEMORY.md`, `AGENTS.md`, `SOUL.md`, or host config directly;
- delete or rewrite existing memories;
- publish packages, skills, or plugins;
- upload private data;
- train or fine-tune models;
- grant new runtime permissions.

This is the default target for `--install --unattended-safe`.

### Tier 2: Reviewed apply

Allowed only after explicit approval or host policy grant:

- apply a promoted lesson to a skill/tool note/memory file;
- update plugin config;
- enable OpenClaw conversation hooks;
- create scheduler jobs;
- archive stale candidates.

Every action must have:

- a diff or structured mutation preview;
- an audit record;
- a rollback path when possible.

### Tier 3: High-risk / external

Always requires explicit human approval:

- modify core identity/safety files;
- delete durable memory;
- publish to package registries or marketplaces;
- send external messages or upload private data;
- train, fine-tune, or export a model dataset;
- expand filesystem/network/runtime permissions.

## Why not unlimited unattended evolution?

Unlimited unattended self-modification is unsafe because the agent could:

- silently corrupt its own rules;
- accumulate bad lessons from one-off failures;
- leak private data through publishing or training;
- disable oversight or expand access;
- make irreversible changes without a rollback path.

Evolution OS therefore separates **learning capture** from **authority to apply**.

## Practical unattended loop

A host runtime such as OpenClaw should wire:

1. `agent_turn_prepare` → `evolution-review --before-task --json`
2. task execution
3. `agent_end` → `evolution-review --after-task --json --write-candidate`
4. periodic scheduler → `evolution-review --periodic-usage --json`
5. review flow → promote/archive/apply according to tier policy

In unattended-safe mode, step 3 may write only candidate files. Applying candidates to core files remains reviewed.

## Install shortcut

```bash
npm install -g github:LanShanPi/agent-evolution-os
cd ~/my-agent-workspace
evolution-review --install --unattended-safe
```

This performs safe local setup only:

- initialize `memory/evolution-os/`;
- create `config.json`;
- install the agent adapter if missing;
- configure `mode: unattended-safe`;
- run self-check;
- print the host entry to copy into AGENT/system instructions.

It does not edit host instructions, restart OpenClaw, grant conversation access, publish, upload, train, delete, or modify core memory files.
