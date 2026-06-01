---
id: evo-example-expired
type: hypothesis
source: review
confidence: low
status: candidate
scope: project
created: 2026-05-01
decay: 7d
risk: low
suggested_targets:
  - memory/evolution-os/archive/
---

## Signal

A stale candidate stayed in inbox past its review window.

## Proposed Learning

Candidates with expired decay should be reviewed for archive, merge, or rejection instead of staying active indefinitely.

## Why It Matters

Forgetting is part of evolution; stale candidates should not silently accumulate.

## Promotion Criteria

- The candidate is still relevant and should become a rule.

## Rejection Criteria

- The candidate is stale, duplicated, or no longer changes behavior.
