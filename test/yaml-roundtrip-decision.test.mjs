import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import { parseDocument } from "yaml";

const root = resolve(import.meta.dirname, "..");
const vaultRoots = [
  resolve(root, "examples/vault"),
  resolve(root, "fixtures/valid-vault"),
];

function markdownFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory()
      ? markdownFiles(path)
      : path.endsWith(".md")
        ? [path]
        : [];
  });
}

function frontmatter(path) {
  const source = readFileSync(path, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  assert.ok(match, `Missing frontmatter in ${relative(root, path)}`);
  return match[1];
}

test("ADR-0005 corpus evidence pins raw-source passthrough", () => {
  const conceptPaths = vaultRoots.flatMap((vaultRoot) =>
    markdownFiles(vaultRoot).filter(
      (path) => !/[\\/](?:index|log)\.md$/.test(path),
    ),
  );
  assert.equal(conceptPaths.length, 16);

  let exactDocumentSerializations = 0;
  for (const path of conceptPaths) {
    const source = frontmatter(path);
    const document = parseDocument(source, {
      keepSourceTokens: true,
      prettyErrors: false,
      strict: true,
      uniqueKeys: true,
      version: "1.2",
    });
    assert.deepEqual(
      document.errors,
      [],
      `YAML parse failed for ${relative(root, path)}`,
    );
    if (document.toString() === source) exactDocumentSerializations += 1;
  }

  assert.equal(exactDocumentSerializations, 0);
});

test("ADR-0005 Document mutation retains protected source structure", () => {
  const source = `# document comment\ntype: Task # inline type\ntitle: 'Quoted title'\nunknown_extension:\n  keep: yes # unknown comment\ndescription: |-\n  literal line one\n  literal line two\nsummary: >+\n  folded line one\n  folded line two\n\nstatus: draft\n`;
  const document = parseDocument(source, {
    keepSourceTokens: true,
    prettyErrors: false,
    strict: true,
    uniqueKeys: true,
    version: "1.2",
  });
  assert.deepEqual(document.errors, []);
  const literalValue = document.get("description");
  const foldedValue = document.get("summary");

  document.set("status", "stable");
  const output = document.toString();
  for (const protectedText of [
    "# document comment",
    "type: Task # inline type",
    "title: 'Quoted title'",
    "unknown_extension:",
    "keep: yes # unknown comment",
    "description: |-",
    "  literal line one\n  literal line two",
    "summary: >+",
    "status: stable",
  ]) {
    assert.ok(output.includes(protectedText), `Lost ${protectedText}`);
  }
  assert.ok(
    output.indexOf("unknown_extension:") < output.indexOf("description:"),
  );

  const reparsed = parseDocument(output, { strict: true, version: "1.2" });
  assert.equal(reparsed.get("description"), literalValue);
  assert.equal(reparsed.get("summary"), foldedValue);
});
