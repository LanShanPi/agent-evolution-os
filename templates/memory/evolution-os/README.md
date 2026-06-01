# Evolution OS

Agent self-evolution governance system.

## Directory

- `policy.md`: self-evolution writing, promotion, forgetting, and rollback policy.
- `inbox/`: default entry for candidate learnings.
- `promoted/`: promoted records and promotion logs.
- `archive/`: expired, merged, rejected, or downgraded records.
- `reports/`: review reports.
- `schemas/`: candidate and future training sample schemas.
- `training-corpus/`: future parameter-evolution sample drafts; only validated distilled samples should enter.

## Current Stage

This is a file-system-first governance layer for long-running agents.

It supports:

- config-driven review;
- CLI help;
- self-check and self-test;
- candidate inbox;
- promotion/archive drafts;
- memory distill suggestions;
- skill audit and cleanup candidate drafts.

## Safety Boundary

Evolution OS does not automatically modify core memory files, delete memories, publish skills/plugins, train models, or upload data.

See package docs for full install and command usage.
