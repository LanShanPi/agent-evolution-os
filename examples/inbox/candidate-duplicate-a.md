---
id: evo-example-duplicate-a
type: architecture
source: observation
confidence: medium
status: candidate
scope: global
created: 2026-06-01
decay: 30d
risk: low
suggested_targets:
  - memory/evolution-os/policy.md
---

## Signal

Two candidates express the same durable learning.

## Proposed Learning

Agent should keep durable lessons in the candidate inbox before promotion.

## Why It Matters

It prevents direct pollution of core memory files and keeps promotion auditable.

## Promotion Criteria

- The learning changes future behavior.
- It is not already represented by a better rule.

## Rejection Criteria

- Another candidate already captures the same learning more clearly.
