import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { extname, relative, resolve } from "node:path";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parseDocument } from "yaml";

const root = resolve(import.meta.dirname, "..");
const exampleRoot = resolve(root, "examples/vault");
const validVaultRoot = resolve(root, "fixtures/valid-vault");
const invalidVaultRoot = resolve(root, "fixtures/invalid-vaults");
const referencePath = resolve(root, "docs/reference/profile-v1.md");

const typePrefixes = {
  Project: "PRJ",
  Task: "TSK",
  Document: "DOC",
  Research: "RSC",
  Decision: "DSN",
  Activity: "ACT",
  Evidence: "EVD",
  Person: "PER",
};

const invalidCases = [
  "activity-correction-multiple-predecessors",
  "decision-supersession-lifecycle",
  "missing-evidence-resource",
  "missing-relation-target",
  "missing-type",
  "profile-version-mismatch",
  "type-not-allowed",
];

function filesBelow(path) {
  const result = [];
  for (const name of readdirSync(path)) {
    const child = resolve(path, name);
    if (statSync(child).isDirectory()) result.push(...filesBelow(child));
    else result.push(child);
  }
  return result;
}

function conceptFiles(vaultRoot) {
  return filesBelow(vaultRoot).filter(
    (path) =>
      extname(path) === ".md" &&
      !["index.md", "log.md"].includes(path.split("/").at(-1)),
  );
}

function frontmatter(text) {
  assert.ok(text.startsWith("---\n"), "Markdown lacks frontmatter start");
  const end = text.indexOf("\n---\n", 4);
  assert.ok(end > 4, "Markdown lacks frontmatter end");
  return text.slice(4, end);
}

function parseYaml(text, label) {
  const document = parseDocument(text, {
    merge: false,
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
  });
  assert.deepEqual(
    document.errors,
    [],
    `${label}: ${document.errors.map((error) => error.message).join("; ")}`,
  );
  return document.toJS({ maxAliasCount: 0 });
}

function yamlConcept(path) {
  return parseYaml(frontmatter(readFileSync(path, "utf8")), path);
}

function createValidators() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const common = JSON.parse(
    readFileSync(resolve(root, "schemas/bookie-common.schema.json"), "utf8"),
  );
  const config = JSON.parse(
    readFileSync(
      resolve(root, "schemas/profile/1.0/bookie-config.schema.json"),
      "utf8",
    ),
  );
  const validateConfig = ajv.compile(config);
  ajv.addSchema(common);
  const byType = new Map(
    Object.keys(typePrefixes).map((type) => [
      type,
      ajv.compile(
        JSON.parse(
          readFileSync(
            resolve(root, `schemas/types/${type.toLowerCase()}.schema.json`),
            "utf8",
          ),
        ),
      ),
    ]),
  );
  return { byType, validateConfig };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function vaultPath(vaultRoot, absoluteBundlePath) {
  assert.match(absoluteBundlePath, /^\//);
  const target = resolve(vaultRoot, `.${absoluteBundlePath}`);
  assert.ok(
    target.startsWith(`${vaultRoot}/`),
    `${absoluteBundlePath} escapes the vault`,
  );
  return target;
}

function requiredInverse(kind, sourceType) {
  if (kind === "relates_to") return "relates_to";
  if (kind === "blocks") return "blocked_by";
  if (kind === "blocked_by") return "blocks";
  if (sourceType === "Decision" && kind === "supersedes") {
    return "superseded_by";
  }
  if (sourceType === "Decision" && kind === "superseded_by") {
    return "supersedes";
  }
  return null;
}

function validateVault(vaultRoot) {
  const { byType, validateConfig } = createValidators();
  const manifest = parseYaml(
    readFileSync(resolve(vaultRoot, "bookie.yaml"), "utf8"),
    `${vaultRoot}/bookie.yaml`,
  );
  const concepts = conceptFiles(vaultRoot).map((path) => ({
    path: `/${relative(vaultRoot, path).replaceAll("\\", "/")}`,
    frontmatter: yamlConcept(path),
  }));
  const byPath = new Map(concepts.map((concept) => [concept.path, concept]));
  const diagnostics = [];
  const uids = new Set();

  if (!validateConfig(manifest)) {
    diagnostics.push({ code: "MANIFEST", path: "/bookie.yaml" });
    return { concepts, diagnostics, manifest };
  }

  for (const concept of concepts) {
    const validate = byType.get(concept.frontmatter.type);
    if (!validate || !validate(concept.frontmatter)) {
      diagnostics.push({ code: "SCHEMA", path: concept.path });
      continue;
    }
    const { bookie, type } = concept.frontmatter;
    if (!manifest.allowed_concept_types.includes(type)) {
      diagnostics.push({ code: "TYPE-ALLOWED", path: concept.path });
    }
    if (!bookie.uid.startsWith(`${typePrefixes[type]}-`)) {
      diagnostics.push({ code: "SCHEMA", path: concept.path });
    }
    if (uids.has(bookie.uid)) {
      diagnostics.push({ code: "UID-UNIQUE", path: concept.path });
    }
    uids.add(bookie.uid);

    if (bookie.project) {
      const project = byPath.get(bookie.project);
      if (!project || project.frontmatter.type !== "Project") {
        diagnostics.push({ code: "PROJECT-TARGET", path: concept.path });
      }
    }

    const seenRelations = new Set();
    for (const relation of bookie.relations ?? []) {
      const key = `${relation.kind}\u0000${relation.target}`;
      if (seenRelations.has(key)) {
        diagnostics.push({ code: "RELATION-TARGET", path: concept.path });
      }
      seenRelations.add(key);
      const target = byPath.get(relation.target);
      if (
        !target ||
        (relation.target_uid &&
          relation.target_uid !== target.frontmatter.bookie.uid)
      ) {
        diagnostics.push({ code: "RELATION-TARGET", path: concept.path });
        continue;
      }

      if (["supersedes", "superseded_by"].includes(relation.kind)) {
        const correction =
          relation.kind === "supersedes" &&
          ["Activity", "Evidence"].includes(type) &&
          target.frontmatter.type === type &&
          bookie.project === target.frontmatter.bookie.project;
        const decision =
          type === "Decision" && target.frontmatter.type === "Decision";
        if ((!correction && !decision) || target === concept) {
          diagnostics.push({ code: "RELATION-TARGET", path: concept.path });
        }
      }

      const inverse = requiredInverse(relation.kind, type);
      if (inverse) {
        const matches = (target.frontmatter.bookie.relations ?? []).filter(
          (candidate) =>
            candidate.kind === inverse &&
            candidate.target === concept.path &&
            (!candidate.target_uid || candidate.target_uid === bookie.uid),
        );
        if (matches.length !== 1) {
          diagnostics.push({ code: "RELATION-INVERSE", path: concept.path });
        }
      }
    }

    if (
      ["Activity", "Evidence"].includes(type) &&
      (bookie.relations ?? []).filter(
        (relation) => relation.kind === "supersedes",
      ).length > 1
    ) {
      diagnostics.push({ code: "RELATION-TARGET", path: concept.path });
    }

    if (type === "Decision") {
      for (const relation of (bookie.relations ?? []).filter(
        (candidate) => candidate.kind === "supersedes",
      )) {
        const predecessor = byPath.get(relation.target);
        const reciprocal = (
          predecessor?.frontmatter.bookie.relations ?? []
        ).filter(
          (candidate) =>
            candidate.kind === "superseded_by" &&
            candidate.target === concept.path,
        );
        if (
          concept.frontmatter.status !== "stable" ||
          bookie.state !== "accepted" ||
          !predecessor ||
          predecessor.frontmatter.type !== "Decision" ||
          predecessor.frontmatter.bookie.project !== bookie.project ||
          predecessor.frontmatter.status !== "deprecated" ||
          predecessor.frontmatter.bookie.state !== "superseded" ||
          reciprocal.length !== 1
        ) {
          diagnostics.push({
            code: "DECISION-SUPERSESSION",
            path: concept.path,
          });
        }
      }
    }

    if (type === "Decision" && bookie.state === "superseded") {
      const links = (bookie.relations ?? []).filter(
        (relation) => relation.kind === "superseded_by",
      );
      const replacement = byPath.get(links[0]?.target);
      if (
        concept.frontmatter.status !== "deprecated" ||
        links.length !== 1 ||
        !replacement ||
        replacement.frontmatter.type !== "Decision" ||
        replacement.frontmatter.bookie.project !== bookie.project ||
        replacement.frontmatter.status !== "stable" ||
        replacement.frontmatter.bookie.state !== "accepted"
      ) {
        diagnostics.push({ code: "DECISION-SUPERSESSION", path: concept.path });
      }
    }

    if (type === "Evidence") {
      for (const support of bookie.supports) {
        if (!byPath.has(support)) {
          diagnostics.push({ code: "EVIDENCE-SUPPORT", path: concept.path });
        }
      }
      const relativeResource = concept.frontmatter.resource.slice(1);
      const insideRoot = manifest.policy.evidence_roots.some((rootPath) =>
        relativeResource.startsWith(`${rootPath}/`),
      );
      const resourcePath = vaultPath(vaultRoot, concept.frontmatter.resource);
      if (
        !insideRoot ||
        !existsSync(resourcePath) ||
        !lstatSync(resourcePath).isFile() ||
        lstatSync(resourcePath).isSymbolicLink() ||
        lstatSync(resourcePath).size > manifest.policy.attachment_max_bytes
      ) {
        diagnostics.push({ code: "EVIDENCE-RESOURCE", path: concept.path });
      } else if (
        sha256(readFileSync(resourcePath)) !== concept.frontmatter.bookie.sha256
      ) {
        diagnostics.push({ code: "EVIDENCE-DIGEST", path: concept.path });
      }
    }
  }

  return { concepts, diagnostics, manifest };
}

test("profile reference documents the complete portable contract and migrations", () => {
  const reference = readFileSync(referencePath, "utf8");
  for (const heading of [
    "# Bookie profile 1.0",
    "## Vault manifest",
    "## Common concept metadata",
    "## Initial concept types",
    "## Paths and resources",
    "## Relations",
    "## Cross-file validation",
    "## Compatibility and migration",
    "## Authoring checklist",
  ]) {
    assert.ok(reference.includes(heading), `Missing ${heading}`);
  }
  for (const [type, prefix] of Object.entries(typePrefixes)) {
    assert.ok(reference.includes(`| ${type} | \`${prefix}-\` |`));
  }
  for (const phrase of [
    "same major",
    "newer minor",
    "breaking major",
    "explicit migration",
    "legacy immutable",
    "Git rollback",
  ]) {
    assert.ok(
      reference.includes(phrase),
      `Missing compatibility rule: ${phrase}`,
    );
  }
});

test("YAML 1.2 consumer parses and validates the full example vault", () => {
  const { concepts, diagnostics, manifest } = validateVault(exampleRoot);
  assert.deepEqual(diagnostics, []);
  assert.deepEqual(
    [...new Set(concepts.map((concept) => concept.frontmatter.type))].sort(),
    Object.keys(typePrefixes).sort(),
  );
  assert.deepEqual(
    [...manifest.allowed_concept_types].sort(),
    Object.keys(typePrefixes).sort(),
  );
  for (const path of conceptFiles(exampleRoot)) {
    assert.equal(
      frontmatter(readFileSync(path, "utf8")).trimStart().startsWith("{"),
      false,
      `${path} should remain a human-readable block-style YAML example`,
    );
  }
});

test("flow-style valid vault is schema-valid and cross-file complete", () => {
  const { concepts, diagnostics, manifest } = validateVault(validVaultRoot);
  assert.deepEqual(diagnostics, []);
  assert.deepEqual(
    [...new Set(concepts.map((concept) => concept.frontmatter.type))].sort(),
    Object.keys(typePrefixes).sort(),
  );
  assert.equal(manifest.profile, "1.0");
  assert.ok(
    concepts.some(
      (concept) => concept.frontmatter.custom_fixture_extension === true,
    ),
    "Boundary fixture must retain an unknown top-level extension",
  );
  assert.ok(
    concepts.some((concept) => concept.path.includes("Δ")),
    "Boundary fixture must include a Unicode concept path",
  );
});

test("invalid vault fixtures isolate schema and cross-file failures", async (t) => {
  assert.deepEqual(
    readdirSync(invalidVaultRoot).sort(),
    [...invalidCases].sort(),
  );

  const expectations = {
    "activity-correction-multiple-predecessors": "RELATION-TARGET",
    "decision-supersession-lifecycle": "DECISION-SUPERSESSION",
    "missing-evidence-resource": "EVIDENCE-RESOURCE",
    "missing-relation-target": "RELATION-TARGET",
    "missing-type": "SCHEMA",
    "profile-version-mismatch": "SCHEMA",
    "type-not-allowed": "TYPE-ALLOWED",
  };
  for (const name of invalidCases) {
    await t.test(name, () => {
      const { diagnostics } = validateVault(resolve(invalidVaultRoot, name));
      assert.deepEqual(
        [...new Set(diagnostics.map((diagnostic) => diagnostic.code))],
        [expectations[name]],
      );
    });
  }
});
