# ADR-0002: Use Redis 8 for derived shared retrieval

## Status

Accepted

## Context

The team needs shared lexical, semantic, metadata, freshness, and trust-aware retrieval. The deployment should fit one Docker host with no dedicated operations team and must continue to function at reduced quality when the retrieval system is unavailable.

Redis Iris provides useful production context and memory concepts, but its supported self-managed path currently introduces Kubernetes, Helm, externally provisioned Redis, license material, provider credentials, and additional control/worker components. The open-source Agent Memory V0 is explicitly a research foundation rather than the supported production path.

## Decision

Use Redis 8 JSON, full-text, and vector capabilities behind a custom Bookie service. Redis contains projections of one approved Git commit and is never directly exposed to Pi clients. Lexical and vector result lists are fused in the service.

The Pi extension retains a filesystem lexical/metadata fallback. Indexes are namespaced, validated, and atomically activated only after a complete build.

## Consequences

### Positive

- One data service covers initial JSON, text, vector, and filter requirements.
- Docker deployment and Node clients are straightforward.
- Indexing remains tailored to OKF/Bookie trust and lifecycle semantics.
- Redis can be removed or rebuilt without canonical migration.

### Negative

- Redis memory cost may exceed disk-first alternatives.
- Bookie owns indexing, ranking, auth, and lifecycle code rather than buying Iris.
- Deep graph queries remain application-side.
- Redis licensing must be reviewed before distribution or hosted-service use.

## Alternatives considered

- **Redis Iris:** defer until managed context features and operational support justify its cost and deployment model.
- **Redis Agent Memory V0:** permit a disposable benchmark adapter, not a production dependency.
- **Akopia:** useful reference but duplicates the intended service across Qdrant, Meilisearch, and Redis.
- **Qdrant plus Meilisearch:** credible fallback if Redis quality or cost misses measured targets, with higher service count.
- **Files only:** retained as degraded mode but insufficient for shared semantic retrieval.

## Revisit triggers

Reconsider when Redis cannot meet the evaluation set or cost target, the corpus materially exceeds initial scale, deep graph retrieval is justified, or high availability becomes contractual.
