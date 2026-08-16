# Contributing

## Workflow

1. Choose the first eligible `Ready` item in the [backlog](docs/planning/backlog.md).
2. Read its specification, dependencies, requirements, and ADRs.
3. Create a focused branch.
4. Add a failing test before behavior code.
5. Implement the smallest vertical slice.
6. Run `npm run check`.
7. Update specification/backlog evidence when acceptance criteria are demonstrated.
8. Open a pull request using the repository template.

## Decisions and scope

- Product behavior changes require an updated numbered specification.
- Load-bearing technical choices require an ADR.
- New requirements need a unique `REQ-NNN` entry.
- New work items need a unique `BK-NNN` entry.
- Do not combine architecture decisions, broad refactors, and feature implementation unless inseparable.

## Commit and pull-request expectations

- Keep commits reviewable and free of generated output.
- Explain why, not only what.
- Include the failing-then-passing test evidence in the pull request.
- Identify migration and rollback implications.
- Never auto-commit from a Bookie tool or hook.

## Local checks

```bash
npm test
npm run check
```

The suite will expand as product packages are introduced. Package-specific checks must be wired into the root `check` command before their owning backlog item is marked complete.

## Documentation

Prefer linking to one authoritative description over copying it. Keep specifications implementation-ready and ADRs concise. Use relative links for repository documents and standard Markdown links in OKF examples.
