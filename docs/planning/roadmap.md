# Roadmap

The sequence minimizes irreversible infrastructure work: establish the portable corpus first, prove offline behavior second, integrate Pi third, and add shared retrieval only after canonical semantics are stable.

## Release 0.1 — trustworthy local ledger

### Scope

- [Canonical profile](../specs/001-canonical-ledger.md)
- [Core library and CLI](../specs/002-core-and-cli.md)
- Local portion of the [Pi extension](../specs/003-pi-extension.md)
- Deterministic JSONL from [export specification](../specs/005-export-adapters.md)

### Exit gate

- Valid and invalid fixtures cover every initial concept type.
- A clean clone can initialize, validate, mutate, search, checkpoint, hash evidence, and export without network access.
- Immutable-policy validation works against a Git base ref.
- Pi performs explicit capture and local fallback without auto-writing, committing, or pushing.
- Root checks pass on Node 24 in CI.

## Release 0.2 — shared retrieval

### Scope

- Authenticated Bookie service and Redis 8 deployment.
- Lexical retrieval and cited context first.
- Provider-neutral cloud/local embeddings.
- Atomic generation rebuild, evaluation, cutover, and rollback.
- Local overlay merged with shared approved-main results.

### Exit gate

- Redis deletion/rebuild is demonstrated from an exact commit.
- Cross-vault and prompt-injection security tests pass.
- Failure modes visibly degrade to lexical/local search.
- Initial-scale retrieval meets quality and latency thresholds.
- Cloud-to-local embedding migration is rehearsed without mixed spaces.

## Release 0.3 — migration adapters

### Scope

- Real-world import cleanup.
- First destination adapter chosen from an actual migration need.
- Jira, Asana, and Trello adapters added incrementally.
- Plan/receipt and external-ID write-back workflows.

### Exit gate

- Destination dry-run is loss-aware and deterministic.
- Repeated execution is idempotent in a sandbox.
- Partial failures are retryable and do not create uncertain canonical IDs.

## Deferred tracks and triggers

| Track | Start only when |
|---|---|
| Graph database | A named multi-hop evaluation set cannot meet quality/latency with bounded application traversal. |
| Redis high availability | Enhanced retrieval receives a contractual RTO or becomes operationally critical. |
| Redis Iris adapter | Managed context/memory behavior justifies Kubernetes, licensing, and service dependency. |
| Autonomous promotion | Curated checkpoint adoption is healthy and false-memory risk has a measurable acceptance process. |
| Compliance controls | A real retention, legal-hold, access-audit, or WORM requirement is funded. |
| Multi-vault aggregation | Authorization and leakage requirements are specified independently from metadata filtering. |
