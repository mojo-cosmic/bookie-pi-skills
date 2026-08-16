# ADR-0004: Use a TypeScript monorepo with a shared core

## Status

Accepted

## Context

The Pi extension is TypeScript and runs in Node.js. The CLI and service need the same parsing, validation, policy, hashing, and canonical export behavior. Separate implementations would create semantic drift in the most important boundary.

The project does not yet need independent repositories or polyglot operational ownership.

## Decision

Use a private Node.js 24 TypeScript monorepo with these intended units:

- `packages/core`: pure domain, format, filesystem, and policy behavior;
- `packages/cli`: automation and CI interface over core;
- `packages/pi-extension`: Pi package, tools, commands, and hooks;
- `apps/service`: authenticated indexing and retrieval service.

Use npm workspaces once the first package is introduced. Keep provider, Redis, HTTP, and Pi dependencies outside core. Build abstractions only for accepted replaceability seams or deterministic tests.

## Consequences

### Positive

- One implementation defines canonical behavior.
- Types and test fixtures are shared across all entry points.
- Pi package development aligns with its native runtime.
- One CI pipeline can exercise end-to-end behavior.

### Negative

- Node.js is also used for a service that could have richer Python retrieval libraries.
- Workspace release/version policy must be established before publishing.
- Care is required to keep service and extension dependencies from leaking into core.

## Alternatives considered

- **Python service plus TypeScript extension:** viable later but initially duplicates models or requires generated contracts.
- **Single package:** simpler briefly, but directly couples Pi and Redis dependencies to offline canonical operations.
- **Separate repositories:** increases coordination and contract-versioning cost before independent teams exist.

## Revisit triggers

Reconsider the service language only if a measured retrieval requirement cannot be met reasonably in Node, or independent service ownership emerges. Preserve the protocol and canonical core contract during any split.
