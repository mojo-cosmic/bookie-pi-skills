# Definition of done

A backlog item is Done only when all applicable conditions are evidenced. “Code exists” and “it compiles” are not completion evidence.

## Requirement and scope

- The implementation maps to an accepted specification and backlog item.
- Every acceptance criterion is demonstrated or explicitly deferred through a spec change.
- No unrelated feature or speculative abstraction was added.
- Requirement or ADR conflicts were resolved before implementation.

## Tests

- A relevant test was observed failing before behavior implementation.
- Success, failure, and boundary behavior are automated.
- Security-sensitive work includes adversarial tests.
- Package tests and root `npm run check` pass.
- External provider tests are deterministic by default; opt-in smoke tests are documented.
- Test evidence is recorded in the pull request or backlog handoff.

## Canonical integrity

- Unknown OKF fields and untouched body content remain preserved.
- No derived data became canonical.
- Immutable Activity/Evidence and decision-supersession rules remain enforced.
- Timestamps, UIDs, links, resources, and evidence digests validate.
- No secrets, local vault data, exports, indexes, or credentials are committed.

## Reliability and security

- Errors are actionable and distinguishable from empty success.
- Cancellation and partial failure leave a consistent state.
- Output, path, size, and time bounds are enforced.
- Auth and vault scoping fail closed.
- Retrieval content remains labelled untrusted.
- Degraded behavior is observable and documented.

## Operability

- Logs and metrics avoid sensitive bodies by default.
- Migration, rollback, and rebuild behavior are documented where relevant.
- Configuration has safe defaults and an example without secrets.
- A clean clone can reproduce the tests and generated artifacts.

## Documentation and review

- Public interfaces and non-obvious policy are documented.
- Relevant specification status and backlog evidence are updated.
- New load-bearing choices have an ADR.
- A correctness and simplicity review found no blockers.
- Follow-up work is recorded rather than hidden in comments or handoff prose.

## Release-level verification

A specification becomes `Verified` only after its integrated acceptance criteria pass in the intended environment. Individual backlog items may be Done while their parent specification remains In progress.
