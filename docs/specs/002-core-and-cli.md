# SPEC-002: Core library and CLI

## Status

In progress — BK-007 vault validation complete; BK-008 safe mutation ready

Owner: unassigned  
Target release: 0.1  
Depends on: SPEC-001, ADR-0004, ADR-0005

## Goal

Implement one deterministic core for loading, validating, mutating, hashing, searching, and exporting a Bookie vault, then expose it through a non-interactive CLI suitable for humans, CI, the Pi extension, and the indexing service.

## Non-goals

- TUI behavior or Pi hooks.
- Redis, HTTP, auth, or embeddings.
- Automatic Git commit or push.
- Destination API calls.
- Parsing arbitrary binary document formats.

## Requirements

1. Resolve a vault from an explicit path or upward configuration search without escaping the trusted root.
2. Parse strict YAML 1.2 frontmatter and Markdown through the ADR-0005 source-retaining Document strategy while preserving unknown fields and body bytes when untouched.
3. Return structured diagnostics with stable rule codes, file, location where possible, severity, and remediation.
4. Validate one concept or a complete vault against schemas and cross-file policy.
5. Compare a proposed tree with a supplied Git base ref to enforce immutable Activity/Evidence records and decision supersession.
6. Create and amend concepts through typed operations; reject arbitrary path traversal and UID collision.
7. Capture evidence by hashing exact bytes and writing a descriptor only after the resource is durable.
8. Provide exact and metadata filesystem search with bounded excerpts and explicit truncation.
9. Emit deterministic canonical JSONL sorted by stable UID.
10. Never invoke `git commit`, `git push`, or network services.
11. Expose library APIs without process exits; confine CLI exit codes and formatting to the CLI package.

## Lossless loading contract

BK-006 introduces a pure byte-to-concept boundary before filesystem and schema policy:

- input is bounded before fatal UTF-8 decoding; defaults are 1 MiB and YAML depth 64, and callers may supply lower positive limits;
- frontmatter starts at byte zero with an exact `---` line and ends at the next exact, unindented `---` line; LF and CRLF are preserved rather than normalized;
- the YAML document uses version 1.2, has one string-keyed mapping root, contains no aliases or unsupported tags, and represents integers without precision loss;
- loaded concepts retain original source, frontmatter, delimiter, and body text so no-op serialization is byte-identical;
- decoded frontmatter is an immutable plain value view; parser AST types do not cross the public core boundary;
- diagnostics have a stable code, severity, caller-supplied file label, bounded message, remediation, and a byte/line/column range where available;
- parser-native exception classes and messages are not public contracts and malformed content does not throw through the content-loading API;
- a near-limit hostile concept must fail closed within five seconds on the supported Node baseline; bulk CLI/service ingestion adds worker or process isolation with a caller deadline because synchronous parsing cannot be interrupted honestly.

Stable BK-006 diagnostic codes are:

| Code                | Meaning                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| `CONCEPT-SIZE`      | Input exceeds the configured byte limit.                                 |
| `CONCEPT-UTF8`      | Input is not valid UTF-8.                                                |
| `FRONTMATTER-OPEN`  | The exact opening delimiter is missing at byte zero.                     |
| `FRONTMATTER-CLOSE` | No exact closing delimiter line exists.                                  |
| `YAML-SYNTAX`       | Strict YAML 1.2 parsing failed, including duplicate or non-string keys.  |
| `YAML-UNSUPPORTED`  | The document uses an unsupported version, tag, alias, or unsafe integer. |
| `YAML-ROOT`         | The parsed document root is not a mapping.                               |

Schema, profile, and current-tree cross-file diagnostics are introduced by BK-007. Mutation diagnostics remain BK-008, and Git-base diagnostics remain BK-009.

## Vault validation contract

BK-007 adds asynchronous `validateVault(root, options?)` for one explicit filesystem vault root. Upward discovery, mutation paths, and Git-base comparison remain later slices.

Validation:

- resolves one real vault root, never follows traversed symlinks, rejects multiply linked or special file entries, ignores `.git`, counts traversed entries before exclusions, treats `policy.exclude` as anchored segment globs, and uses deterministic POSIX-relative ordering;
- parses the complete `bookie.yaml` byte stream directly as exactly one bounded strict YAML 1.2 mapping, with the same precision, alias, tag, and depth policy as concept loading, then validates it and Bookie records with the canonical JSON Schemas through Ajv 2020;
- requires root `index.md` to be a bounded frontmatter document declaring exact `okf_version: "0.2"`; other reserved Markdown remains content/link input rather than a Bookie concept;
- treats any concept with a `bookie` mapping as an attempted Bookie record; type names alone are never reserved, so generic OKF Markdown without `bookie` remains outside Bookie schema and relation policy but still requires a non-empty `type`;
- resolves project, relation, inverse, Decision lifecycle, and Evidence support rules only through schema-valid Bookie targets. Independently trustworthy project, relation, support, and Evidence fields in a source with an unrelated schema error are still checked, while malformed policy structures do not generate speculative cascades;
- parses inert CommonMark inline links, images, and referenced definitions without rendering or fetching, rejects AST block-container nesting above 256, and isolates lexically suspicious container input in a cancellable worker with a five-second deadline. It checks used local targets from concept bodies and complete reserved `index.md`/`log.md` files; fragment-only and query-only references and explicit external schemes/network-path references are ignored; query/fragment suffixes do not affect local file resolution; relative links resolve from the source file, one-leading-slash links from the vault root, URI escapes are decoded except encoded path separators are rejected, and local targets must remain inside the non-symlink enumerated tree. Heading fragments, unused definitions, and raw-HTML attributes are not validated in BK-007;
- opens Evidence resources only when no-follow support is available, rejects symlinks, special files, and multiply linked files, verifies real-root and configured-root containment, hashes bounded exact bytes from one file handle, and detects metadata/path identity changes around the read;
- applies per-concept, manifest, entry, concept-count, aggregate concept-byte, aggregate streamed-resource-byte and diagnostic limits; bytes streamed by failed hashes still debit the aggregate allowance. Cancellation consistently rejects with `AbortError`, while bounds and unreadable or torn required input return `complete: false`. `diagnosticsTruncated` separately identifies diagnostic-cap exhaustion, and `valid` is true only when validation is complete and has no error diagnostics;
- returns deterministic static diagnostics that never include parser messages or source values. Default bounds support 50,000 concepts when their aggregate UTF-8 bytes fit 512 MiB, with at most 100,000 traversed entries and 2 GiB of streamed Evidence bytes; diagnostic limits qualify the all-independent-errors guarantee rather than implying unbounded output. Diagnostics for a loaded record assigned an excluded sensitivity class use `<excluded>` instead of its path and never include its UID, title, body, or field values.

Stable BK-007 infrastructure/schema codes are:

| Code                    | Meaning                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `VAULT-ROOT`            | The explicit root is missing, unreadable, or not a directory.                               |
| `VAULT-IO`              | A required entry cannot be safely enumerated or read, or is a symlink/special file.         |
| `VAULT-BOUNDS`          | An entry, concept-count, aggregate-byte, or cancellation-safe validation bound was reached. |
| `MANIFEST-MISSING`      | `bookie.yaml` is absent or not a regular file.                                              |
| `MANIFEST-SIZE`         | The manifest exceeds its configured byte limit.                                             |
| `MANIFEST-SYNTAX`       | Manifest UTF-8/YAML mapping parsing failed or uses an unsupported feature.                  |
| `MANIFEST-SCHEMA`       | Decoded manifest data fails the profile schema.                                             |
| `CONCEPT-PATH`          | A Bookie concept's derived bundle path is not canonical.                                    |
| `CONCEPT-SCHEMA`        | A generic envelope or decoded Bookie record fails its schema.                               |
| `MARKDOWN-LINK`         | A local CommonMark link target is malformed, escaping, missing, or a symlink.               |
| `DIAGNOSTICS-TRUNCATED` | The diagnostic limit was reached and additional findings were omitted.                      |

BK-007 also emits current-tree SPEC-001 codes `TYPE-ALLOWED`, `UID-UNIQUE`, `PROJECT-TARGET`, `RELATION-TARGET`, `RELATION-INVERSE`, `DECISION-SUPERSESSION`, `EVIDENCE-RESOURCE`, `EVIDENCE-DIGEST`, and `EVIDENCE-SUPPORT`. `ACTIVITY-IMMUTABLE`, `EVIDENCE-IMMUTABLE`, Git tracking, base-tree Decision retention, pinned target identity, and base resource changes require `--base` and remain BK-009.

## CLI contract

Initial commands:

```text
bookie init <path>
bookie validate [path] [--base <git-ref>] [--format text|json]
bookie create --type <type> --project <path> [--input <json-file>]
bookie amend <uid-or-path> --input <json-file>
bookie evidence add <file> --project <path> --supports <path...>
bookie search <query> [filters] [--format text|json]
bookie export jsonl --output <file>
bookie inspect <uid-or-path> [--format yaml|json]
```

Commands that mutate require an explicit vault and report every changed path. Interactive prompting is deferred to the Pi extension.

Exit codes:

- `0`: completed successfully;
- `1`: operation or validation failure;
- `2`: invalid invocation/configuration;
- `3`: conflict or immutable-policy violation.

## Acceptance criteria

- Core can round-trip valid fixtures byte-for-byte without dropping unknown frontmatter or changing untouched body content.
- Validation reports all independent errors in one run and uses documented rule codes.
- Every mutating API rejects absolute, relative, encoded, and symlink paths outside the vault.
- Concurrent writes detect source-hash conflicts rather than silently overwrite.
- Evidence capture verifies the digest after writing and leaves no descriptor on failure.
- Filesystem search reports degraded/local mode and respects project, type, lifecycle, workflow, and sensitivity filters.
- JSONL export is byte-for-byte deterministic across repeated runs.
- A mixed-sensitivity export retains included records but omits records assigned a class in `policy.sensitivity.excluded_classes`; excluded UIDs, paths, and marker content appear in neither JSONL nor export diagnostics or logs.
- CLI stdout is machine-safe in JSON mode and diagnostics go to stderr.
- No core test requires Pi, Redis, Docker, or a network connection.

## Test strategy

- Unit tests for path resolution, normalization, diagnostics, identity, hashing, filters, and deterministic serialization.
- Golden round-trip fixtures with comments, unknown fields, multiline YAML, Unicode, and Markdown links.
- Boundary tests for empty vaults, large concepts, duplicate IDs, broken links, malformed YAML, symlink escapes, and interrupted writes.
- Integration tests in temporary Git repositories for base-ref immutability.
- CLI process tests covering output, stderr, exit codes, cancellation, and no-partial-write behavior.
- Mixed-sensitivity JSONL fixtures assert positive inclusion and excluded UID, path, content, diagnostic, and log omission.

## Dependencies

- [SPEC-001](001-canonical-ledger.md)
- [ADR-0004](../architecture/decisions/0004-typescript-monorepo.md)
- [ADR-0005](../architecture/decisions/0005-yaml-document-ast.md)
- [Security architecture](../architecture/security.md)

## Delivery notes

Implement thinly in this order: load one concept, validate one concept, validate a vault, safe mutation, evidence and Git-base policy, inspect/search, deterministic export. Add no provider or persistence abstraction until there is a second accepted caller behavior to isolate.
