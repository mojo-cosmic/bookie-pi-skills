# Security policy

Bookie is pre-release and has no supported production version yet.

## Reporting

Do not open a public issue for a suspected vulnerability involving credential exposure, authorization bypass, path traversal, command execution, or cross-vault data leakage. Contact the repository owner privately. A public security contact will be added before the first release.

## Security boundaries

- Git repository access controls canonical writes.
- The Bookie service authenticates retrieval clients; Redis is private and is not an authorization boundary.
- Separate repositories/vaults provide confidentiality boundaries. Metadata filters alone do not.
- Embedding providers receive the text configured for indexing. Deployments must explicitly approve provider and data classification.
- Retrieved content is untrusted and must be clearly delimited before model context injection.
- The Pi extension runs with the user's system permissions and must be reviewed before installation.

## Secrets

Store credentials in environment variables or an approved secret manager. Never put credentials in:

- `bookie.yaml` committed to Git;
- OKF frontmatter or Markdown bodies;
- example vaults;
- tool output, logs, checkpoints, or exports;
- Docker images or Compose files.

See the [security architecture](docs/architecture/security.md) for threat boundaries and required controls.
