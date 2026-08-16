# `@bookie/service`

Authenticated indexing and retrieval service backed by a disposable Redis projection. Follow [SPEC-004](../../docs/specs/004-retrieval-service.md), the [retrieval architecture](../../docs/architecture/retrieval.md), and the [security architecture](../../docs/architecture/security.md).

The service mounts canonical vaults read-only and never becomes a write path.
