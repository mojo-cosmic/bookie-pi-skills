import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { validateVault } from "../dist/index.js";

const count = Number(process.argv[2] ?? "50000");
if (!Number.isSafeInteger(count) || count <= 0 || count > 50_000) {
  throw new TypeError("concept count must be an integer from 1 through 50000");
}

const root = mkdtempSync(join(tmpdir(), "bookie-vault-benchmark-"));
try {
  mkdirSync(join(root, "concepts"));
  writeFileSync(
    join(root, "bookie.yaml"),
    `profile: "1.0"
vault:
  uid: VLT-00000000000000000000000009
  title: Scale benchmark
allowed_concept_types:
  - Project
policy:
  evidence_roots:
    - references/files
  exclude: []
  sensitivity:
    classes:
      - public
    excluded_classes: []
  attachment_max_bytes: 1024
`,
  );
  writeFileSync(join(root, "index.md"), '---\nokf_version: "0.2"\n---\n');
  const concept = "---\ntype: Generic\n---\n";
  for (let index = 0; index < count; index += 1) {
    writeFileSync(
      join(root, "concepts", `${String(index).padStart(5, "0")}.md`),
      concept,
    );
  }

  const started = performance.now();
  const result = await validateVault(root);
  const elapsedMilliseconds = Math.round(performance.now() - started);
  const output = {
    concepts: count,
    valid: result.valid,
    complete: result.complete,
    diagnostics: result.diagnostics.length,
    elapsedMilliseconds,
    rssMiB: Math.round(process.memoryUsage().rss / 1_048_576),
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
  };
  console.log(JSON.stringify(output));
  if (!result.valid || !result.complete) process.exitCode = 1;
} finally {
  rmSync(root, { recursive: true, force: true });
}
