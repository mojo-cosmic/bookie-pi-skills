# `@bookie/core`

Pure canonical-domain package for Bookie. It will own OKF/Profile parsing, validation, lifecycle policy, safe filesystem mutation, evidence hashing, local search, and canonical export.

It must not depend on Pi, Redis, an HTTP framework, or a concrete embedding provider. Implement against [SPEC-001](../../docs/specs/001-canonical-ledger.md) and [SPEC-002](../../docs/specs/002-core-and-cli.md).

## Lossless concept loading

`loadConcept(bytes, { file, maxBytes?, maxDepth? })` validates bounded UTF-8 and a strict YAML 1.2 frontmatter envelope without filesystem access or schema policy. Success returns frozen decoded frontmatter plus the untouched frontmatter, body, and complete source text while retaining parser/envelope state privately. `serializeConcept(concept)` accepts that loader-owned object and returns a new byte array equal to the original source; forged or spread copies throw `TypeError` rather than claiming lossless provenance.

Content failures are returned as stable `ConceptDiagnostic` values with remediation and source ranges where available; malformed content does not throw. Invalid programmer options such as non-positive or above-default limits throw `TypeError`. The default limits are exported as `DEFAULT_MAX_CONCEPT_BYTES` and `DEFAULT_MAX_YAML_DEPTH`.

## Vault validation

`await validateVault(root, options?)` resolves one explicit vault, validates the packaged canonical manifest/type schemas, checks CommonMark local links and current-tree profile relations, and streams exact Evidence bytes through SHA-256. It does not discover parent vaults, mutate files, read Git bases, commit, push, render Markdown, or fetch network links.

Results expose `valid`, `complete`, `diagnosticsTruncated`, the real root, and deterministic static diagnostics. Content failures do not throw. Invalid options throw `TypeError`; cancellation consistently rejects with `AbortError`. Entry, concept, aggregate-byte, YAML-depth, resource, and diagnostic defaults are exported and callers may lower them.

Traversal never accepts symlinks: each directory/file ancestor is snapshotted with high-resolution identity metadata around enumeration or reading. Resources are hashed incrementally without loading the entire file. Diagnostics for parsed records assigned an excluded sensitivity class redact the source path as `<excluded>`.

Git-base immutability remains BK-009.
