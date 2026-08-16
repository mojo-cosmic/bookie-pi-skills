# ADR-0003: Make embeddings provider-neutral and generation-scoped

## Status

Accepted

## Context

Anthropic does not supply a native Claude embeddings API. Deployments may prefer Voyage AI, an OpenAI-compatible provider, or local models through Ollama. Embeddings from different models occupy incompatible vector spaces even when dimensions match, so a casual in-place provider switch silently corrupts retrieval quality.

## Decision

Define a provider-neutral contract with separate document and query methods. Every index is bound to an immutable embedding generation containing provider/model identity, dimensions, distance metric, input mode, preprocessing, and chunker version.

Cloud and local provider implementations are selectable at deployment. Model changes use a parallel index, complete backfill, shadow evaluation, atomic cutover, and retained rollback generation. Mixed-generation vector ranking is forbidden.

## Consequences

### Positive

- Deployments choose privacy, cost, and quality trade-offs.
- A cloud-first deployment has a planned path to local models.
- Provider changes are observable data migrations rather than configuration accidents.
- The canonical source always contains the text needed to rebuild.

### Negative

- Multiple adapters and compatibility tests are required.
- Migration temporarily doubles vector storage and embedding work.
- Provider identity and input-mode details must be carefully normalized.
- Evaluation infrastructure is required before cutover.

## Alternatives considered

- **One cloud provider:** simpler initially but creates avoidable lock-in and no local path.
- **Local only:** best privacy but imposes compute and model operations on every deployment.
- **Store vectors in Git:** vectors are large, model-specific derived artifacts and do not belong in the canonical ledger.
- **Overwrite vectors in place:** rejected because partial migration mixes incompatible spaces and removes instant rollback.

## Validation

Tests must reject cross-generation queries. A migration test must build both generations, keep the old active during backfill, cut over only after completion, and roll back by changing the active pointer.
