# SPEC-001: Canonical ledger profile

## Status

In progress

Owner: unassigned  
Target release: 0.1  
Depends on: ADR-0001

## Goal

Define a versioned Bookie profile over OKF v0.2 that can represent the initial concept types, lifecycle rules, typed relations, evidence, and append-only policies without requiring any running Bookie software to read the corpus.

## Non-goals

- Implementing YAML parsing or choosing a YAML round-trip library.
- Implementing cross-file/runtime policy, filesystem containment, or realpath, symlink, and glob execution.
- Implementing CLI, Pi, service, Redis, or embedding behavior.
- Destination exports.
- Full transcript storage.
- Signed or compliance-grade records.

## Requirements

1. Create a machine-readable profile manifest format for `bookie.yaml` with profile version, vault identity, allowed concept types, evidence roots, exclusions, sensitivity policy, and attachment limits. The version 1.0 manifest contract is defined below.
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

## Version 1.0 `bookie.yaml` contract

The profile manifest is a YAML serialization of the JSON instance validated by the JSON Schema 2020-12 document at `schemas/profile/1.0/bookie-config.schema.json`. YAML decoding and round-trip behavior are not part of this increment; schema tests use decoded JSON fixtures. Profile 1.0 has this fixed shape:

```yaml
profile: "1.0"
vault:
  uid: VLT-01ARZ3NDEKTSV4RRFFQ69G5FAY
  title: Demo Bookie vault
allowed_concept_types:
  - Project
  - Task
policy:
  evidence_roots:
    - references/files
  exclude:
    - exports/**
  sensitivity:
    classes:
      - public
      - restricted
    excluded_classes:
      - restricted
  attachment_max_bytes: 26214400
```

All listed objects are fixed-shape and reject unknown keys recursively. This strictness applies only to `bookie.yaml`; it must never be applied to unknown OKF concept frontmatter, which remains accepted and preservable under ADR-0001 and requirement 9.

- `profile` is required and is exactly the string `"1.0"`. A different string is not implicitly compatible with this schema.
- `vault` is required and contains only required `uid` and `title`. `uid` is `VLT-` followed by a canonical uppercase Crockford Base32 ULID: 26 symbols, excluding `I`, `L`, `O`, and `U`, with a leading ULID symbol from `0` through `7` so values do not exceed 128 bits. `title` is a non-empty string.
- `allowed_concept_types` is the normative descriptive manifest key. It is a required, non-empty, duplicate-free array whose members are exactly `Project`, `Task`, `Document`, `Research`, `Decision`, `Activity`, `Evidence`, or `Person`. It does not establish a centralized OKF type registry.
- `policy.evidence_roots` is a required, non-empty, duplicate-free array of lexical relative POSIX paths. Each path consists of non-empty slash-separated segments. Absolute paths, empty segments, `.` or `..` segments, backslashes, the metacharacters `*`, `?`, `[`, `]`, `{`, `}`, and `!`, colons (including Windows drive and URI-like forms), percent-encoded forms, C0 controls, DEL, C1 controls, and lone UTF-16 surrogates are rejected. Other characters with glob meaning in some runtimes, including extglob punctuation, are not excluded by this schema; runtimes MUST treat evidence roots as literal paths rather than glob expressions. Valid Unicode scalar path characters remain intentionally supported and require ECMAScript Unicode regex semantics. This is only a lexical schema boundary: filesystem containment, normalization against a vault root, and realpath/symlink handling remain runtime policy and are not claimed here.
- `policy.exclude` is a required duplicate-free array of constrained relative POSIX glob strings. Each slash-separated segment is either a literal made from ASCII letters, digits, `.`, `_`, and `-`, or exactly `*` or `**`. Absolute paths, empty segments, `.` or `..` segments, backslashes, and all other glob syntax are rejected. Matching and glob execution remain runtime policy.
- `policy.sensitivity.classes` is a required, non-empty, duplicate-free array of vault sensitivity class declarations. `policy.sensitivity.excluded_classes` is a required duplicate-free array of vault-global exclusions. Both arrays use lowercase kebab-case tokens of at most 63 characters; `unknown` and `unclassified` are reserved sentinels and cannot be declared. The schema validates each array independently and does not require every excluded class to appear in the declarations array; every listed exclusion still remains excluded under REQ-026. These fields classify and exclude vault data; they do not authorize any provider. Provider-specific approval remains unresolved under OQ-007.
- `policy.attachment_max_bytes` is a required integer from 1 through JavaScript's maximum safe integer, `9007199254740991`. The schema enforces integer and safe-range constraints on the decoded numeric value. The eventual YAML parser/runtime must also reject numeric scalar text whose conversion would lose precision, even when the rounded decoded value would pass this schema. YAML parser selection remains unresolved under OQ-002; this contract does not resolve it. The setting expresses a configured limit but establishes no product default; OQ-005 remains open.

### Deferred runtime policy

**`SENSITIVITY-EXCLUSION`** refines REQ-026: a record assigned a class listed in `policy.sensitivity.excluded_classes` MUST NOT be indexed, checkpointed, logged, or exported. This schema declares the exclusions but does not enforce operation behavior. Export enforcement belongs to SPEC-002/BK-011, checkpoint enforcement to SPEC-003/BK-015, and indexing enforcement to SPEC-004/BK-017; any logging implementation must apply the same requirement when introduced. This increment does not define runtime behavior for missing, reserved, or undeclared record classes and does not settle provider authorization; OQ-007 remains open.

## Interfaces and artifacts

Expected artifacts are delivered sequentially at these repository-relative paths:

```text
schemas/profile/1.0/bookie-config.schema.json
fixtures/profile/1.0/bookie-config/valid/*.json
fixtures/profile/1.0/bookie-config/invalid/*.json
schemas/bookie-common.schema.json
schemas/types/*.schema.json
fixtures/valid-vault/
fixtures/invalid-vaults/<case>/
docs/reference/profile-v1.md
```

The schema is a contract, not the complete policy engine. `SENSITIVITY-EXCLUSION` above is a named deferred runtime rule; target existence, inverse relations, Git-base immutability, and resource digests are documented as additional named validation rules for SPEC-002.

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

- Direct Ajv 8 JSON Schema 2020-12 strict-mode meta-validation and positive/negative decoded JSON fixtures.
- Table-driven UID, enum, timestamp, and relation examples.
- OKF envelope checks for every Markdown fixture.
- Mutation fixtures comparing a base and proposed tree for each immutable-policy boundary.
- Digest fixtures containing valid bytes, changed bytes, missing files, and path escapes.

## Dependencies

- [Data model](../architecture/data-model.md)
- [ADR-0001](../architecture/decisions/0001-okf-git-canonical-store.md)
- Official [OKF v0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)

## Delivery notes

BK-002 delivers the profile manifest schema and decoded configuration fixtures. BK-003 delivers the common metadata and initial concept schemas with decoded fixtures. Relation vocabulary, target normalization, inverse validation, exact type-prefix mapping, and Git-base policy remain BK-004 work.

Implement schema and fixtures before the policy engine. Do not introduce a YAML round-trip library in this spec; that choice belongs to SPEC-002 and must demonstrate preservation behavior.
