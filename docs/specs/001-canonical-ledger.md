# SPEC-001: Canonical ledger profile

## Status

Ready

Owner: unassigned  
Target release: 0.1  
Depends on: ADR-0001

## Goal

Define a versioned Bookie profile over OKF v0.2 that can represent the initial concept types, lifecycle rules, typed relations, evidence, and append-only policies without requiring any running Bookie software to read the corpus.

## Non-goals

- Implementing CLI or Pi behavior.
- Redis indexing or embeddings.
- Destination exports.
- Full transcript storage.
- Signed or compliance-grade records.

## Requirements

1. Create a machine-readable profile manifest format for `bookie.yaml` with profile version, vault identity, allowed concept types, evidence roots, exclusions, sensitivity policy, and attachment limits.
2. Create JSON Schemas for common Bookie metadata and each initial type: Project, Task, Document, Research, Decision, Activity, Evidence, and Person.
3. Keep OKF `status` separate from `bookie.state` and validate both against their own enums.
4. Require stable prefixed ULIDs and define prefix/type mapping.
5. Define timestamps as UTC ISO 8601; retain `created_at` and `occurred_at` independently from `generated.at`.
6. Define the typed relation vocabulary, target path normalization, and required inverse relations.
7. Define activity/evidence immutability and decision supersession as policy rules that can be evaluated against a Git base tree.
8. Define evidence digest, media type, capture time, origin, resource path, and support-link rules.
9. Preserve unknown OKF frontmatter and body content.
10. Supply a conformant example vault with at least one record of every initial type and both valid and invalid test fixtures.
11. Document profile compatibility and migration rules.

## Interfaces and artifacts

Expected artifacts:

```text
schemas/bookie-config.schema.json
schemas/bookie-common.schema.json
schemas/types/*.schema.json
fixtures/valid-vault/
fixtures/invalid-vaults/<case>/
docs/reference/profile-v1.md
```

The schema is a contract, not the complete policy engine. Cross-file constraints such as target existence, inverse relations, Git-base immutability, and resource digests are documented as named validation rules for SPEC-002.

## Acceptance criteria

- A generic OKF v0.2 consumer can parse every valid fixture.
- Every non-reserved Markdown concept in the valid fixture has a non-empty `type`.
- Each initial type has a documented valid example and at least one invalid fixture.
- Schema validation rejects missing UID, malformed UID, invalid lifecycle, invalid workflow state, and missing type-specific fields.
- Named cross-file rules cover broken relations, inverse mismatch, missing evidence resource, digest mismatch, immutable edit/deletion, and invalid decision supersession.
- Unknown custom frontmatter is accepted and declared preservable.
- The example profile contains no secrets or environment-specific credentials.
- Profile compatibility rules explain additive minor and breaking major changes.

## Test strategy

- JSON Schema meta-validation and positive/negative fixtures.
- Table-driven UID, enum, timestamp, and relation examples.
- OKF envelope checks for every Markdown fixture.
- Mutation fixtures comparing a base and proposed tree for each immutable-policy boundary.
- Digest fixtures containing valid bytes, changed bytes, missing files, and path escapes.

## Dependencies

- [Data model](../architecture/data-model.md)
- [ADR-0001](../architecture/decisions/0001-okf-git-canonical-store.md)
- Official [OKF v0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)

## Delivery notes

Implement schema and fixtures before the policy engine. Do not introduce a YAML round-trip library in this spec; that choice belongs to SPEC-002 and must demonstrate preservation behavior.
