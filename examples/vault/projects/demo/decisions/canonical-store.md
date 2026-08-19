---
type: Decision
title: Keep OKF Markdown in Git canonical
description: Accepts the portable canonical storage boundary for the demo vault.
tags: [demo, decision, storage]
status: stable
generated:
  by: "human:demo-owner"
  at: 2026-06-27T09:25:00Z
sources:
  - id: format-findings
    resource: /projects/demo/research/format-findings.md
    title: Format portability findings
bookie:
  profile: "1.0"
  uid: DSN-01ARZ3NDEKTSV4RRFFQ69G5FB0
  project: /projects/demo/project.md
  state: accepted
  created_at: 2026-06-27T09:25:00Z
  sensitivity: public
  relations:
    - kind: part_of
      target: /projects/demo/project.md
      target_uid: PRJ-01ARZ3NDEKTSV4RRFFQ69G5FAV
  external_ids: {}
---

# Decision

Keep OKF Markdown and referenced files in Git as the canonical ledger. Treat retrieval indexes and exports as rebuildable derivatives.

# Rationale

The [format research](../research/format-findings.md) demonstrates offline readability and vendor independence.

# Evidence

The captured [canonical-store resource](../evidence/canonical-store-source.md) supports this decision.
