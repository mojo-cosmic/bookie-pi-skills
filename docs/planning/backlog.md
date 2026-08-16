# Ordered backlog

Statuses: `Ready`, `Blocked`, `Deferred`, `Done`. Work top to bottom unless a dependency explicitly allows parallel work. Marking an item Done requires evidence under the [definition of done](definition-of-done.md).

| ID | Status | Specification | Work item | Dependencies | Observable acceptance |
|---|---|---|---|---|---|
| BK-001 | Done | SPEC-001/ADR-0004 | Establish npm workspaces, TypeScript baseline, formatter/linter policy, and root quality command. See [evidence](evidence/BK-001.md). | None | A minimal core package test fails then passes; root `npm run check` executes all workspace checks on Node 24. |
| BK-002 | Ready | SPEC-001 | Implement `bookie.yaml` profile manifest and JSON Schema. | BK-001 | Valid configuration fixtures pass; unknown keys policy and invalid paths/classes fail with fixture evidence. |
| BK-003 | Blocked | SPEC-001 | Implement common metadata and all initial type schemas. | BK-002 | Every type has positive and required negative fixtures; schema meta-validation passes. |
| BK-004 | Blocked | SPEC-001 | Define relation vocabulary, lifecycle/state enums, UID prefixes, and named cross-file policy rules. | BK-003 | Reference tables and fixtures cover inverse, supersession, immutable, and digest boundaries. |
| BK-005 | Blocked | SPEC-001 | Complete the profile reference, full example vault, and profile-version migration rules. | BK-004 | Generic OKF checks and repository fixture checks pass for all concept types. |
| BK-006 | Blocked | SPEC-002 | Implement lossless concept loading and structured diagnostics in core. | BK-005, OQ-002 | Golden round trips preserve unknown frontmatter and untouched Markdown; malformed YAML reports stable diagnostics. |
| BK-007 | Blocked | SPEC-002 | Implement vault and cross-file validation. | BK-006 | One run reports independent schema, link, relation, resource, and digest errors with stable rule codes. |
| BK-008 | Blocked | SPEC-002 | Implement safe atomic create/amend APIs and conflict detection. | BK-007 | Traversal/symlink tests fail closed; concurrent source-hash change yields a conflict and no lost update. |
| BK-009 | Blocked | SPEC-002 | Implement evidence capture and Git-base immutability validation. | BK-008 | Exact-byte digest succeeds; mismatch, missing resource, immutable edit, and deletion fail without partial records. |
| BK-010 | Blocked | SPEC-002 | Implement bounded filesystem search and inspect. | BK-007 | Exact/metadata filters and Unicode work; results identify local mode and disclose truncation. |
| BK-011 | Blocked | SPEC-002/005 | Implement deterministic canonical JSONL export. | BK-007 | Repeated exports of all type fixtures are byte-identical and schema-valid. |
| BK-012 | Blocked | SPEC-002 | Expose validated core operations through the CLI and wire CI. | BK-008, BK-009, BK-010, BK-011 | Process tests cover stdout/stderr, exit codes, cancellation, and no network/commit/push behavior. |
| BK-013 | Blocked | SPEC-003 | Package the Pi extension and implement read, local search, and validate. | BK-012 | Local/Git package smoke tests load tools and run against a temporary vault with bounded output. |
| BK-014 | Blocked | SPEC-003 | Implement explicit Pi create/amend workflows with queued mutations. | BK-013 | Parallel mutation test preserves both updates or reports conflict; non-interactive approval ambiguity fails clearly. |
| BK-015 | Blocked | SPEC-003 | Implement curated checkpoint preview, approval, and compaction reminder. | BK-014 | Approve writes one Activity; decline/no-UI writes none and compaction continues; ordinary agent completion never writes. |
| BK-016 | Blocked | SPEC-004 | Define service protocol, auth model, Redis projection, and Docker threat-reviewed design. | BK-012, OQ-003, OQ-004 | Versioned schemas, authorization matrix, key/index plan, and Compose review are accepted before runtime code. |
| BK-017 | Blocked | SPEC-004 | Implement authenticated lexical indexing/search with atomic generations. | BK-016 | Rebuild from exact commit, cross-vault isolation, citations, active pointer, and failed-build rollback pass integration tests. |
| BK-018 | Blocked | SPEC-004 | Implement embedding contract and deterministic test provider. | BK-017 | Generation mismatch fails; document/query modes and complete backfill/cutover/rollback pass without a network provider. |
| BK-019 | Blocked | SPEC-004 | Add Voyage, OpenAI-compatible, and Ollama adapters plus retrieval evaluation. | BK-018, OQ-006 | Deploy-time selection, credential redaction, shadow comparison, and cloud-to-local migration pass configured smoke tests. |
| BK-020 | Blocked | SPEC-003/004 | Merge shared retrieval with local overlay and observable fallback. | BK-017 | Local modifications override same-UID shared results; service/provider failures are labelled and local search remains useful. |
| BK-021 | Blocked | SPEC-005 | Implement pure export plan and receipt model. | BK-011 | Dry-run plan is deterministic, loss-aware, credential-free, and hashes source commit/configuration. |
| BK-022 | Deferred | SPEC-005 | Implement the first destination adapter selected from real demand. | BK-021, OQ-008 | Sandbox replay is idempotent; rate-limit/partial-failure receipts support safe retry and approved ID write-back. |
