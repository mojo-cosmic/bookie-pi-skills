# Documentation map

This page is the stable entry point for product and engineering context.

## Product

- [Vision](product/vision.md) — problem, users, principles, success measures, and non-goals.
- [Requirements](product/requirements.md) — authoritative behavioral and quality requirements.

## Architecture

- [System overview](architecture/overview.md) — components, boundaries, flows, failure modes, and scale assumptions.
- [Data model](architecture/data-model.md) — OKF envelope, Bookie profile, entity rules, evidence, and audit semantics.
- [Retrieval](architecture/retrieval.md) — derived indexing, ranking, embeddings, migration, and observability.
- [Security](architecture/security.md) — assets, trust boundaries, threats, and controls.
- [Architecture decisions](architecture/decisions/) — accepted load-bearing decisions.

## Delivery

- [Roadmap](planning/roadmap.md) — release sequence and exit gates.
- [Backlog](planning/backlog.md) — ordered issue-ready work.
- [Definition of done](planning/definition-of-done.md) — completion criteria.
- [Open questions](planning/open-questions.md) — unresolved decisions with owners and deadlines.
- [Toolchain baseline](planning/toolchain.md) — supported versions, compatibility holds, and update procedure.

## Executable specifications

1. [Canonical ledger](specs/001-canonical-ledger.md)
2. [Core library and CLI](specs/002-core-and-cli.md)
3. [Pi extension](specs/003-pi-extension.md)
4. [Retrieval service](specs/004-retrieval-service.md)
5. [Export adapters](specs/005-export-adapters.md)

## Examples and checks

- [Example vault](../examples/vault/)
- [Repository contract tests](../test/repository.test.mjs)

## Document lifecycle

- Requirements are changed deliberately and retain stable identifiers.
- An ADR is immutable after acceptance except for corrections; a new ADR supersedes it.
- Specifications move through `Draft`, `Ready`, `In progress`, `Implemented`, and `Verified`.
- A specification is not `Verified` until its acceptance criteria have recorded test evidence.
- Roadmap and backlog state describe delivery, not architecture authority.
