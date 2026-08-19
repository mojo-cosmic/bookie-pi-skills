---
type: Activity
title: First fixture checkpoint
description: Records completion of the initial repository fixture.
tags: [demo, checkpoint]
status: stable
generated:
  by: "human:demo-owner"
  at: 2026-06-27T09:30:00Z
sources:
  - id: demo-session
    resource: urn:pi:session:demo-session
    title: Demonstration Pi session
bookie:
  profile: "1.0"
  uid: ACT-01ARZ3NDEKTSV4RRFFQ69G5FAX
  project: /projects/demo/project.md
  occurred_at: 2026-06-27T09:30:00Z
  sensitivity: public
  relations:
    - kind: relates_to
      target: /projects/demo/tasks/first-task.md
      target_uid: TSK-01ARZ3NDEKTSV4RRFFQ69G5FAW
  external_ids: {}
---

# Outcome

Completed the portable profile fixture with every initial concept type, exact-byte Evidence, and resolvable relations.

# Changed artifacts

Created the [first task](../tasks/first-task.md), [overview](../documents/overview.md), [research](../research/format-findings.md), [decision](../decisions/canonical-store.md), and [Evidence](../evidence/canonical-store-source.md).

# Decisions and evidence

The [canonical storage decision](../decisions/canonical-store.md) is supported by captured Evidence and its exact digest.

# Validation

Repository contract, schema, path, relation, and digest fixture checks pass.

# Unresolved work

Lossless YAML parsing and runtime cross-file validation remain SPEC-002 work.
