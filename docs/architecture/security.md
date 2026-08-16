# Security architecture

## Assets

- Canonical concepts and evidence resources.
- Git history and review metadata.
- Provider, service, and repository credentials.
- Sensitive project metadata.
- Retrieval indexes and query telemetry.
- Agent context assembled from retrieved records.

## Trust boundaries

```text
untrusted concept text
        |
local user/Pi --- local vault --- Git remote
        |                           |
        | authenticated request     | approved read-only checkout
        v                           v
Bookie service -----------------> Redis private network
        |
        v
external or local embedding provider
```

Git permissions authorize canonical writes. The Bookie service authorizes retrieval. Redis filters are not authorization. Separate vaults are the confidentiality boundary.

## Principal threats and controls

### Prompt injection through records

**Threat:** a retrieved concept instructs an agent to ignore policy, expose secrets, or call tools.

**Controls:** label all retrieved text as untrusted data; delimit it from system instructions; include source and trust state; cap automatic context; never derive authorization or tool policy from corpus text; add adversarial retrieval fixtures.

### Path traversal and arbitrary file access

**Threat:** crafted tool input or concept resource escapes the configured vault.

**Controls:** resolve canonical absolute paths; reject paths outside the real vault root; account for symlinks; use allowlisted reference roots; queue the resolved target path; test encoded, relative, absolute, and symlink escapes.

### Concurrent lost updates

**Threat:** parallel Pi tools overwrite one another.

**Controls:** use Pi's file mutation queue for the complete read-modify-write window; validate the source hash before replacement; write to a same-filesystem temporary file and rename atomically; surface conflicts.

### Credential disclosure

**Threat:** secrets enter records, checkpoints, logs, images, or exports.

**Controls:** environment/secret-manager credentials; excluded path and sensitivity policies; pre-write and pre-index secret scanning; metadata-only query logs; redacted error messages; no credential fields in canonical schemas.

### Cross-vault leakage

**Threat:** a caller queries another client or project boundary.

**Controls:** one service identity is granted explicit vaults; resolve vault scope from authentication rather than caller-supplied filters; use separate indexes/keys and checkout roots; include adversarial isolation tests; prefer separate service deployments for strong client isolation.

### Stale or poisoned indexes

**Threat:** Redis serves content not present in approved Git or from an incomplete build.

**Controls:** index only read-only approved commits; namespace generations; verify source hashes; mark completion after validation; serve one atomic active pointer; return source commit with every result.

### Malicious files and oversized input

**Threat:** parsers consume hostile documents or exhaust resources.

**Controls:** initial ingestion is Markdown plus explicitly allowed evidence types; size, chunk, depth, and timeout limits; no execution of attachments; sandbox future extractors; disclose skipped content.

### Unauthorized service or Redis access

**Threat:** exposed endpoints allow corpus extraction or mutation.

**Controls:** private Docker network; Redis ACL and no public port; authenticated service API; TLS at the private ingress/reverse proxy; least-privilege read-only canonical mount; rate limits and audit metadata.

## Sensitivity policy

The profile supports deployment-specific classes such as `public`, `internal`, and `confidential`. A deployment declares which classes may be indexed by each embedding provider. Unknown classes fail closed. Secrets are never a supported class.

## Practical audit guarantees

The initial release provides Git attribution, pull-request review, source provenance, content hashes, CI validation, and backups. It does not provide WORM retention, signed non-repudiation, legal hold, or independent timestamp authority.

## Required security tests

- vault path and symlink escape rejection;
- immutable record modification/deletion rejection;
- digest mismatch rejection;
- cross-vault authorization isolation;
- prompt-injection content remains inert and labelled;
- credentials do not appear in logs or tool results;
- service/embedding outage is observable;
- output and ingestion limits hold at boundaries.

## Deployment checklist

- Bind Redis only to the private network.
- Configure per-user or workload service credentials.
- Mount canonical checkout read-only in the service.
- Select and document approved embedding data classes.
- Configure backups for Git and evidence resources.
- Validate exclusions before first indexing.
- Record active Git commit and embedding generation.
- Test filesystem-only degraded retrieval.
