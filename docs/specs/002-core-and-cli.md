# SPEC-002: Core library and CLI

## Status

Draft — ready after SPEC-001 artifacts are accepted

Owner: unassigned  
Target release: 0.1  
Depends on: SPEC-001, ADR-0004

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
2. Parse YAML frontmatter and Markdown while preserving unknown fields and body bytes when untouched.
3. Return structured diagnostics with stable rule codes, file, location where possible, severity, and remediation.
4. Validate one concept or a complete vault against schemas and cross-file policy.
5. Compare a proposed tree with a supplied Git base ref to enforce immutable Activity/Evidence records and decision supersession.
6. Create and amend concepts through typed operations; reject arbitrary path traversal and UID collision.
7. Capture evidence by hashing exact bytes and writing a descriptor only after the resource is durable.
8. Provide exact and metadata filesystem search with bounded excerpts and explicit truncation.
9. Emit deterministic canonical JSONL sorted by stable UID.
10. Never invoke `git commit`, `git push`, or network services.
11. Expose library APIs without process exits; confine CLI exit codes and formatting to the CLI package.

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

- Core can round-trip valid fixtures without dropping unknown frontmatter or changing untouched body content.
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
- [Security architecture](../architecture/security.md)

## Delivery notes

Implement thinly in this order: load one concept, validate one concept, validate a vault, inspect/search, safe mutation, evidence, Git-base policy, deterministic export. Add no provider or persistence abstraction until there is a second accepted caller behavior to isolate.
