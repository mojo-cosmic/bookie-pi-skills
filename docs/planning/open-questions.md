# Open questions

Open questions are not permission to guess. Resolve them by the listed deadline, record the decision in the appropriate ADR/specification, then mark the entry resolved without deleting its history.

## OQ-001: Project license

- **State:** Open; not blocking private development.
- **Question:** Which license applies to the Bookie code and Pi package, considering Redis client dependencies and intended distribution?
- **Current direction:** Evaluate Apache-2.0 and AGPL-3.0 implications before public release; do not add a license by assumption.
- **Decision deadline:** Before first public package or external contribution.
- **Owner:** Repository owner.

## OQ-002: YAML round-trip implementation

- **State:** Open; blocks lossless core parsing.
- **Question:** Which maintained TypeScript YAML library and update strategy best preserve comments, ordering, unknown fields, multiline scalars, and untouched body bytes?
- **Current direction:** Benchmark document-AST editing rather than parse/stringify normalization using the SPEC-001 fixture corpus.
- **Decision deadline:** Before BK-006.
- **Owner:** Core implementer; record result in an ADR if it changes dependency policy.

## OQ-003: Initial service authentication

- **State:** Open; blocks service protocol acceptance.
- **Question:** Should the first small-team deployment use per-user opaque tokens, reverse-proxy identity headers, or OIDC directly?
- **Current direction:** Prefer short-lived identity from a private reverse proxy if an existing identity provider is available; otherwise hashed scoped tokens.
- **Decision deadline:** Before BK-016.
- **Owner:** Service architect and deployment owner.

## OQ-004: HTTP service framework

- **State:** Open; blocks service runtime scaffolding.
- **Question:** Use Node's native HTTP stack, Fastify, or another maintained minimal framework?
- **Current direction:** Compare cancellation, schema integration, security history, observability, and dependency cost; do not choose on benchmark throughput alone.
- **Decision deadline:** Before BK-016.
- **Owner:** Service implementer.

## OQ-005: Attachment policy defaults

- **State:** Open; does not block schema shape.
- **Question:** What default direct-Git limit, Git LFS range, and external-reference threshold fit actual evidence files?
- **Current direction:** Make limits configurable and fail closed; gather one month of representative file sizes before fixing defaults.
- **Decision deadline:** Before evidence capture is released.
- **Owner:** Product owner.

## OQ-006: Default embedding deployment

- **State:** Open; provider-neutral contract is already decided.
- **Question:** Which provider/model should the first shared deployment configure by default?
- **Current direction:** Choose at deployment among Voyage AI, OpenAI-compatible, and Ollama; evaluate on the Bookie query set rather than generic benchmarks.
- **Decision deadline:** Before BK-019 provider smoke testing.
- **Owner:** Deployment owner.

## OQ-007: Indexable sensitivity classes

- **State:** Open; blocks production indexing of non-public data.
- **Question:** Which classes may be sent to each cloud provider or local model, and who approves changes?
- **Current direction:** Unknown classes fail closed; local models may receive a broader approved set but are not automatically trusted.
- **Decision deadline:** Before the first real vault is indexed.
- **Owner:** Data owner/security reviewer.

## OQ-008: First destination adapter

- **State:** Deferred until real migration demand.
- **Question:** Jira, Asana, or Trello first?
- **Current direction:** Select from an actual target workspace and representative records after JSONL is stable.
- **Decision deadline:** Before BK-022.
- **Owner:** Product owner.
