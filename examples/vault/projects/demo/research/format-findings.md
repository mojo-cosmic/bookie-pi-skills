---
type: Research
title: Format portability findings
description: Records why plain Markdown and Git satisfy the local-first requirement.
tags: [demo, research, portability]
status: stable
generated:
  by: "human:demo-owner"
  at: 2026-06-27T09:20:00Z
bookie:
  profile: "1.0"
  uid: RSC-01ARZ3NDEKTSV4RRFFQ69G5FAZ
  project: /projects/demo/project.md
  created_at: 2026-06-27T09:20:00Z
  sensitivity: public
  relations:
    - kind: part_of
      target: /projects/demo/project.md
      target_uid: PRJ-01ARZ3NDEKTSV4RRFFQ69G5FAV
  external_ids: {}
---

# Question

Can the ledger remain useful without Pi, Redis, or a vendor service?

# Finding

Yes. A generic reader can inspect the Markdown, YAML frontmatter, standard links, and referenced files directly. Git retains reviewable history.

# Follow-up

The [canonical storage decision](../decisions/canonical-store.md) applies this finding.
