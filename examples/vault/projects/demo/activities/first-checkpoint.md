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
  external_ids: {}
---

# Outcome

Created the [first task fixture](../tasks/first-task.md) and verified the repository-level OKF envelope check.

# Decisions

The fixture remains intentionally minimal until SPEC-001 defines the complete profile.

# Unresolved work

Implement the versioned schemas and full valid/invalid fixture corpus.
