# SPEC-004: Shared retrieval service

## Status

Draft — ready after SPEC-002 validation and canonical export are stable

Owner: unassigned  
Target release: 0.2  
Depends on: SPEC-002, ADR-0002, ADR-0003

## Goal

Run an authenticated, Docker-hosted service that indexes an approved read-only vault checkout into Redis 8 and returns cited lexical/semantic retrieval while preserving filesystem fallback and atomic index generation cutover.

## Non-goals

- Canonical writes through HTTP.
- Redis as backup or authority.
- Automatic long-term memory extraction.
- Kubernetes or high availability.
- Deep graph traversal or arbitrary attachment execution.

## Requirements

1. Mount one or more explicitly configured vault checkouts read-only and resolve authorization to vaults from server-side identity.
2. Reject indexing unless the checkout commit is valid and the complete vault passes canonical validation.
3. Project concepts and heading-aware chunks with all provenance fields defined in retrieval architecture.
4. Implement provider-neutral document/query embeddings with Voyage AI, OpenAI-compatible, and Ollama adapters selectable at deployment.
5. Isolate every embedding generation and reject dimension/model mismatch.
6. Build a namespaced generation, verify it, evaluate it, and atomically activate it without serving partial state.
7. Run lexical and vector retrieval independently and fuse rankings deterministically.
8. Apply project, type, lifecycle, workflow, sensitivity, trust, and freshness filtering.
9. Return bounded citations, score components, active generation, source commit, and degradation state.
10. Keep Redis private; expose authenticated health, readiness, search, context, rebuild-status, and controlled rebuild APIs.
11. Avoid full query/result text in logs by default.
12. Provide Docker Compose deployment for one host with pinned images, health checks, private networking, and persistent Redis volume.

## API outline

```text
GET  /health/live
GET  /health/ready
GET  /v1/index
POST /v1/search
POST /v1/context
POST /v1/admin/rebuild
GET  /v1/admin/rebuild/:id
```

The concrete protocol requires versioned request/response schemas before implementation. Admin authentication is separate from read authentication. Rebuild requests name an exact Git commit and are idempotent.

## Acceptance criteria

- Redis can be deleted and rebuilt from an exact Git commit with equivalent indexed projections.
- Search returns source UID/path, exact commit, heading, bounded excerpt, trust, freshness, and score explanation.
- Cross-vault attempts fail even when a caller supplies another vault in filters.
- Embedding failure returns lexical results with explicit degradation; Redis failure produces an unavailable response that causes the extension's local fallback.
- Partial or failed builds never replace the active complete generation.
- A model migration can shadow-query, cut over, and roll back without mixed vector ranking.
- Warm service-side retrieval meets p95 under 500 ms on the initial benchmark excluding external embedding latency.
- Logs and metrics do not expose configured secret or excluded fixture content.
- Docker exposes no Redis host port in the default configuration.
- Restart, cancellation, duplicate rebuild, malformed concept, oversized input, and provider-rate-limit paths are tested.

## Test strategy

- Unit tests for chunking, projection, fusion, filters, generation identity, and redaction.
- Contract tests for every API response and error shape.
- Testcontainers or Compose integration with pinned Redis 8.
- Fake embedding adapters for deterministic tests plus opt-in provider smoke tests.
- Destructive rebuild/cutover/rollback tests and cross-vault adversarial tests.
- Load test using the documented initial scale or a representative synthetic corpus.
- Failure injection for Redis, provider, cancellation, partial write, and stale checkout.

## Dependencies

- [SPEC-002](002-core-and-cli.md)
- [Retrieval architecture](../architecture/retrieval.md)
- [Security architecture](../architecture/security.md)
- [ADR-0002](../architecture/decisions/0002-redis-derived-retrieval.md)
- [ADR-0003](../architecture/decisions/0003-provider-neutral-embeddings.md)

## Delivery notes

Deliver lexical indexing and authenticated citations before vectors. Then add one fake/deterministic embedding adapter, cloud/local adapters, generation cutover, and evaluation. Do not integrate Iris or Agent Memory V0 into the production path.
