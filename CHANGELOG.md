# Changelog

All notable changes to Evolution OS will be documented here.

## [0.1.0-draft] - 2026-06-01

### Added

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

- npm package structure draft.
- GitHub Actions draft.
- OpenClaw tool plugin.
- Automatic skill cleanup apply/delete operations.
- Apply/rollback tools.
- Training sample schema.
