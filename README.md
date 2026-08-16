# Bookie

Bookie is a local-first, Git-native project ledger for people and agents. It keeps tasks, documents, research, decisions, activity checkpoints, files, and evidence in an [Open Knowledge Format (OKF) v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)-compatible bundle and exposes disciplined workflows through a Pi extension.

> **Status:** architecture and repository bootstrap accepted; product implementation begins with [SPEC-001](docs/specs/001-canonical-ledger.md) and the next Ready item in the ordered [backlog](docs/planning/backlog.md).

## Design commitments

- OKF Markdown in Git is canonical.
- Redis and embeddings are rebuildable retrieval indexes.
- Capture is explicit; checkpoints require user approval.
- Evidence is hashed; activity records become append-only after merge.
- Storage and embedding providers remain replaceable.
- The corpus stays useful without Pi, Redis, or any external vendor.

## Start here

| Reader | First documents |
|---|---|
| Any contributor or agent | [Agent guide](AGENTS.md), [documentation map](docs/INDEX.md) |
| Product/brainstorming | [Vision](docs/product/vision.md), [requirements](docs/product/requirements.md), [open questions](docs/planning/open-questions.md) |
| Architecture | [System overview](docs/architecture/overview.md), [ADRs](docs/architecture/decisions/) |
| Planning | [Roadmap](docs/planning/roadmap.md), [backlog](docs/planning/backlog.md), active specification |
| Implementation | [Specifications](docs/specs/), [definition of done](docs/planning/definition-of-done.md) |

## Repository commands

```bash
npm test
npm run check
```

These checks currently validate the planning contract, internal links, specification completeness, and the example OKF bundle. Product tests will be added with each implementation increment.

## Intended repository shape

```text
apps/service/          shared retrieval/indexing service (planned)
packages/core/         format, policy, validation, and filesystem logic (planned)
packages/cli/          automation and CI interface (planned)
packages/pi-extension/ Pi package, tools, commands, and hooks (planned)
docs/                  product, architecture, planning, and executable specs
examples/vault/        minimal OKF + Bookie fixture
test/                  repository-level contract tests
```

## Scope

Bookie is operational recordkeeping, not financial accounting, real-time collaborative editing, or compliance-grade WORM storage. See [vision and non-goals](docs/product/vision.md#non-goals).

No license has been selected yet; see [OQ-001](docs/planning/open-questions.md#oq-001-project-license).
