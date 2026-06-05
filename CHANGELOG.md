# Changelog

All notable changes to Evolution OS will be documented here.

## [0.1.0-draft] - 2026-06-01

### Added

- One-command safe install via `evolution-review --install` and unattended-safe mode via `--install --unattended-safe`.
- Documented tiered unattended evolution model in `docs/UNATTENDED_EVOLUTION.md`.
- Optional OpenClaw typed lifecycle hooks in the plugin scaffold: `agent_turn_prepare` for bounded same-turn prepare context and `agent_end` for post-turn reflection, both disabled by default.
- Initial `plugins/openclaw-evolution-os/` scaffold with native OpenClaw manifest, command bridge, safe defaults, and plugin syntax check wired into verify.
- Renamed installation docs around the semantic trigger layer from “skill” to “agent adapter”; added `--install-adapter` as the primary command while keeping `--install-skill` as an alias.
- `--install-skill` command and expanded GitHub installation docs for clone/npm/global usage.
- `OPENCLAW_INTEGRATION.md` blueprint based on OpenClaw internal hooks, typed plugin hooks, and Plugin SDK host hooks; recommends an `openclaw-evolution-os` plugin instead of editing OpenClaw core.
- `--before-task`, `--after-task`, and `--periodic-usage` host hook commands for Level 2 runtime integration; self-test now verifies beforeTask/afterTask usage events.
- `HOST_INTEGRATION.md` to define the minimum core entry, skill integration, runtime hooks, and plugin guardrails required for Evolution OS to actually affect host agent behavior.
- `EVOLUTION_BOUNDARIES.md` to define L0-L6 evolution targets, automation/approval boundaries, and the separation between file-system governance, future plugin guardrails, and parameter training.
- `RUNTIME_LOOP.md` to define Governance Mode vs Runtime Mode, prepare/reflect/usage-report responsibilities, runtime lesson state transitions, lesson reuse metrics, and the boundary between usage logs and training corpus.
- `--prepare --task <text>` to retrieve relevant lessons before a task and produce an apply checklist.
- File-system based Evolution OS MVP.
- Candidate inbox, promoted log, archive, reports, schemas, training-corpus directories.
- `tools/evolution-review.js` review/draft CLI.
- `--init` to create missing Evolution OS files/directories without overwriting existing files.
- `--init` now prefers package `templates/` and falls back to embedded defaults when templates are unavailable.
- `--skill-audit --suggest-cleanup-candidates` to convert flagged skills, duplicate names, and similar triggers into Evolution OS candidate drafts.
- `--init-config` for default config creation.
- `--self-check` for required files/directories/config/safety boundaries.
- `--self-test` fixture-based smoke test for init, review, decay, duplicate, archive, memory distill, and skill audit.
- Candidate review with frontmatter/section validation.
- Candidate decay checking.
- Duplicate candidate detection.
- Promotion suggestion and promote draft generation.
- Archive draft generation.
- `MEMORY.md` distill suggestions and distill draft.
- Skill audit for frontmatter, description length, size, duplicate names, and similar triggers.
- Install, quickstart, commands, product, design, and repo plan docs.
- Examples for duplicate candidates, expired candidates, memory distill, and skill audit.

### Safety Boundaries

- No automatic edits to `MEMORY.md`, `AGENTS.md`, or `SOUL.md`.
- No automatic deletion of memories.
- No skill/plugin publishing.
- No model training.
- No data upload.

### Not Yet Included

- Runtime loop docs/templates copied into repo-draft docs/templates consistently.
- npm package structure draft.
- GitHub Actions draft.
- OpenClaw tool plugin.
- Automatic skill cleanup apply/delete operations.
- Apply/rollback tools.
- Training sample schema.
