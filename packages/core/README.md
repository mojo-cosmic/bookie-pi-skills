# `@bookie/core`

Pure canonical-domain package for Bookie. It will own OKF/Profile parsing, validation, lifecycle policy, safe filesystem mutation, evidence hashing, local search, and canonical export.

It must not depend on Pi, Redis, an HTTP framework, or a concrete embedding provider. Implement against [SPEC-001](../../docs/specs/001-canonical-ledger.md) and [SPEC-002](../../docs/specs/002-core-and-cli.md).
