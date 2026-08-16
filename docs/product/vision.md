# Product vision

## Problem

Project knowledge is fragmented across repositories, chat sessions, issue trackers, local files, and vendor-specific memory systems. Agents lose decisions and evidence between sessions, while people cannot reliably audit why a task or conclusion exists. Existing task tools cover only part of the record and make later migration difficult.

## Vision

Bookie gives a small team one durable, human-readable ledger for operational knowledge. People and agents can capture, relate, retrieve, verify, and export project records without making any agent framework, SaaS vendor, vector database, or embedding model the permanent owner of the data.

## Primary users

- A practitioner managing multiple projects and cross-project research.
- A small technical team using coding agents across separate repositories.
- Reviewers who need provenance, evidence, decisions, and activity checkpoints.
- Future migration tooling that needs stable IDs and structured metadata.

## Product principles

1. **Files first.** Useful with a text editor, Git, and ordinary search.
2. **Canonical versus derived.** Search infrastructure can disappear without data loss.
3. **Explicit memory.** Agents propose records; users decide what becomes durable.
4. **Portable semantics.** Use OKF fields where they fit and namespaced extensions where they do not.
5. **Audit by construction.** Record provenance, lifecycle, identity, content hashes, and change history.
6. **Graceful degradation.** Service outages reduce retrieval quality rather than block access.
7. **Measured complexity.** Add graph, high availability, and autonomous promotion only after observed need.

## Target outcomes

- A new contributor can understand a project, its current work, and major decisions from the vault alone.
- A checkpoint can reconstruct what changed, why, and what remains without storing an entire chat transcript.
- Evidence can be matched to its captured bytes through a digest.
- Search results explain where they came from and whether they are stale or verified.
- A team can change retrieval or embedding providers by rebuilding, not migrating canonical knowledge.
- Records can be exported through a stable intermediate model.

## Initial success measures

- Ninety percent of a curated query set returns a relevant concept in the top ten results.
- A clean clone passes validation and can rebuild every derived index.
- A Redis outage still permits exact and metadata search from the filesystem.
- An embedding-provider change can cut over and roll back without mixing vector spaces.
- A new agent can select and execute the next backlog item using repository documentation alone.
- No accepted checkpoint or evidence record can be modified undetected by CI.

## Non-goals

- Financial bookkeeping or accounting.
- Real-time collaborative document editing.
- Replacing GitHub, Jira, Asana, or Trello as a full workflow product.
- Capturing every prompt, response, or tool event by default.
- Compliance-grade WORM retention, legal non-repudiation, or records management.
- Making Redis, Pi sessions, vectors, or generated exports authoritative.
- Deep graph analytics before real multi-hop retrieval requirements exist.
- Cross-vault authorization through metadata filtering.
