# ADR-0001: Use OKF v0.2 in Git as the canonical store

## Status

Accepted

## Context

Bookie must remain human-readable, auditable, portable across agent and project-management tools, and usable without a running service. A database-first or agent-memory-first source would require an export to recover those properties and would make provider behavior part of the record format.

OKF v0.2 provides a small vendor-neutral envelope for Markdown concepts, links, provenance, generation, verification, freshness, lifecycle, and attested computation. It deliberately permits unknown types and extension fields.

## Decision

The canonical unit is an OKF v0.2 bundle in a dedicated Git repository. Bookie-specific metadata is namespaced under `bookie`. Standard Markdown links express portable relationships; typed Bookie relations supplement them for workflow and export.

Git `main` is the accepted shared state. Branches are proposals. Vectors, caches, indexes, service state, and exports are derived and rebuildable.

## Consequences

### Positive

- Records survive tool and vendor replacement.
- Humans can inspect and edit the source with ordinary tools.
- Git supplies attribution, review, diff, rollback, and replication.
- OKF-aware consumers can use Bookie concepts without understanding every extension.

### Negative

- Multi-record transactions and concurrent edits require Git discipline.
- Path-based OKF concept IDs can change, requiring a separate stable UID.
- Validation and lifecycle enforcement must be built outside the format.
- Team visibility follows merge rather than every local edit.

## Alternatives considered

- **Basic Memory as authority:** capable but adds an AGPL runtime and product-specific behavior to the canonical path.
- **Redis Agent Memory as authority:** strong session semantics but conflicts with durable file ownership and supported self-managed simplicity.
- **Relational database as authority:** improves transactions but weakens direct Git portability and offline readability.
- **mdbase as authority:** promising typed-file direction, but the evaluated skill/spec ecosystem was not stable enough.

## Validation

A clean clone must validate and remain intelligible after deleting Bookie software and all derived services.
