# SPEC-005: Canonical and destination exports

## Status

Draft — JSONL portion depends on SPEC-002; destination adapters are deferred until real migration demand

Owner: unassigned  
Target release: 0.3  
Depends on: SPEC-002

## Goal

Export Bookie concepts through one deterministic, versioned JSONL intermediate model and then map that model to Jira, Asana, and Trello with dry-run, loss reporting, stable identity, and idempotent execution.

## Non-goals

- Perfect behavioral emulation of destination tools.
- Bidirectional continuous synchronization in the initial release.
- Making an export artifact canonical.
- Writing external IDs before destination success and user approval.
- Hiding unsupported-field loss.

## Requirements

1. Define an export envelope with schema version, Bookie UID/path/type, canonical fields, body, typed relations, sources, evidence manifest, and external IDs.
2. Sort deterministic JSONL by stable UID and normalize dates and empty values.
3. Separate pure mapping/planning from network execution.
4. Produce a dry-run plan containing create/update/skip/conflict actions and field-loss warnings.
5. Use Bookie UID plus recorded external ID to make reruns idempotent.
6. Never infer destructive deletes by default.
7. Write external IDs back through the canonical mutation path only after confirmed success and explicit approval.
8. Preserve an execution receipt linking destination results, canonical source commit, mapper version, and plan hash.
9. Implement Jira CSV/API, Asana CSV, and Trello API/JSON as separate adapters only after fixture mappings are approved.
10. Bound and hash attachments; disclose destination size/type limitations.

## Intermediate record outline

```json
{
  "schema_version": "1.0",
  "source_commit": "<git-sha>",
  "uid": "TSK-...",
  "path": "projects/demo/tasks/example",
  "type": "Task",
  "title": "Example",
  "lifecycle": {},
  "workflow": {},
  "relations": [],
  "sources": [],
  "evidence": [],
  "body_markdown": "...",
  "external_ids": {}
}
```

The final schema belongs in the repository and is validated before any adapter consumes it.

## Acceptance criteria

- Two exports of the same commit and configuration are byte-for-byte identical.
- Every initial concept type has an export fixture.
- Dry-run performs no network or canonical write.
- Mapping reports every dropped, approximated, or unsupported field.
- Replaying a successful plan produces updates/skips rather than duplicate destination objects.
- A partial destination failure records successful operations, leaves failed operations retryable, and does not write uncertain IDs.
- External-ID write-back requires explicit approval and passes normal canonical validation.
- Destination credentials never appear in plans, receipts, logs, or canonical records.
- Attachment limits and unsupported relation types are visible before execution.

## Test strategy

- Golden JSONL fixtures and deterministic byte comparisons.
- Pure adapter mapping tests using representative destination fixtures.
- Fake HTTP servers for retries, rate limits, pagination, partial failure, and idempotency.
- Receipt/plan hash tests and approval/write-back tests.
- Credential-redaction and attachment-boundary tests.
- Optional sandbox smoke tests guarded by explicit environment configuration.

## Dependencies

- [SPEC-002](002-core-and-cli.md)
- [Canonical data model](../architecture/data-model.md)
- Destination API decisions, credentials, and representative real records.

## Delivery notes

Complete and use JSONL before choosing the first destination adapter. Select the first adapter from an actual migration need and preserve unsupported data in the export rather than forcing it into lossy destination fields.
