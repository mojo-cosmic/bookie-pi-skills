import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { isDeepStrictEqual } from "node:util";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = resolve(import.meta.dirname, "..");
const fixtureRoot = resolve(root, "fixtures/policy/1.0");
const conceptFixtureRoot = resolve(root, "fixtures/concepts/1.0/valid");
const commonSchemaPath = resolve(root, "schemas/bookie-common.schema.json");
const typeSchemaRoot = resolve(root, "schemas/types");
const specPath = resolve(root, "docs/specs/001-canonical-ledger.md");

const uidPrefixes = {
  Project: "PRJ",
  Task: "TSK",
  Document: "DOC",
  Research: "RSC",
  Decision: "DSN",
  Activity: "ACT",
  Evidence: "EVD",
  Person: "PER",
};

const relations = {
  part_of: null,
  relates_to: "relates_to",
  blocks: "blocked_by",
  blocked_by: "blocks",
  depends_on: null,
  supports: null,
  supersedes: "superseded_by",
  superseded_by: "supersedes",
  owned_by: null,
};

const ruleCodes = [
  "TYPE-ALLOWED",
  "UID-UNIQUE",
  "PROJECT-TARGET",
  "RELATION-TARGET",
  "RELATION-INVERSE",
  "DECISION-SUPERSESSION",
  "ACTIVITY-IMMUTABLE",
  "EVIDENCE-IMMUTABLE",
  "EVIDENCE-RESOURCE",
  "EVIDENCE-DIGEST",
  "EVIDENCE-SUPPORT",
];

const validCases = [
  "decision-supersession",
  "decision-supersession-consolidated",
  "evidence-exact-bytes",
  "immutable-replacements",
  "relation-inverses",
];

const invalidCases = {
  "activity-deleted": ["ACTIVITY-IMMUTABLE"],
  "activity-edited": ["ACTIVITY-IMMUTABLE"],
  "activity-correction-multiple-predecessors": ["RELATION-TARGET"],
  "activity-renamed": ["ACTIVITY-IMMUTABLE"],
  "decision-deleted": ["DECISION-SUPERSESSION"],
  "decision-supersession-lifecycle": ["DECISION-SUPERSESSION"],
  "decision-supersession-missing-reciprocal": [
    "RELATION-INVERSE",
    "DECISION-SUPERSESSION",
  ],
  "decision-supersession-missing-successor": ["DECISION-SUPERSESSION"],
  "decision-supersession-multiple-replacements": ["DECISION-SUPERSESSION"],
  "evidence-deleted": ["EVIDENCE-IMMUTABLE"],
  "evidence-digest-mismatch": ["EVIDENCE-DIGEST"],
  "evidence-edited": ["EVIDENCE-IMMUTABLE"],
  "evidence-renamed": ["EVIDENCE-IMMUTABLE"],
  "evidence-resource-bytes-changed": ["EVIDENCE-DIGEST", "EVIDENCE-RESOURCE"],
  "evidence-resource-deleted": ["EVIDENCE-RESOURCE"],
  "evidence-resource-escape": ["EVIDENCE-RESOURCE"],
  "evidence-resource-missing": ["EVIDENCE-RESOURCE"],
  "evidence-resource-oversized": ["EVIDENCE-RESOURCE"],
  "evidence-resource-root-itself": ["EVIDENCE-RESOURCE"],
  "evidence-resource-symlink": ["EVIDENCE-RESOURCE"],
  "evidence-support-missing": ["EVIDENCE-SUPPORT"],
  "immutable-project-target-renamed": ["PROJECT-TARGET"],
  "immutable-relation-target-renamed": ["RELATION-TARGET"],
  "immutable-support-target-renamed": ["EVIDENCE-SUPPORT"],
  "project-target-wrong-type": ["PROJECT-TARGET"],
  "relation-inverse-missing": ["RELATION-INVERSE"],
  "relation-inverse-wrong-kind": ["RELATION-INVERSE"],
  "relation-supersession-wrong-type": ["RELATION-TARGET"],
  "relation-target-missing": ["RELATION-TARGET"],
  "relation-target-uid-mismatch": ["RELATION-TARGET"],
  "type-not-allowed": ["TYPE-ALLOWED"],
  "uid-duplicate": ["UID-UNIQUE"],
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const commonSchema = readJson(commonSchemaPath);
const conceptPathPattern = new RegExp(
  commonSchema.$defs.conceptPath.pattern,
  "u",
);
const bundleFilePathPattern = new RegExp(
  commonSchema.$defs.bundleFilePath.pattern,
  "u",
);

function readCases(kind) {
  return readJson(resolve(fixtureRoot, kind, "cases.json"));
}

function readCase(kind, name) {
  return readCases(kind).find((fixture) => fixture.id === name);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function merge(base, patch) {
  if (
    patch === null ||
    typeof patch !== "object" ||
    Array.isArray(patch) ||
    typeof base !== "object" ||
    base === null ||
    Array.isArray(base)
  ) {
    return structuredClone(patch);
  }
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(patch)) {
    result[key] = merge(result[key], value);
  }
  return result;
}

function materializeTree(tree) {
  const concepts = (tree.concepts ?? []).map((descriptor) => {
    const frontmatter = merge(
      readJson(resolve(conceptFixtureRoot, `${descriptor.fixture}.json`)),
      descriptor.patch ?? {},
    );
    return {
      path: descriptor.path,
      frontmatter,
      markdown: `---\n${JSON.stringify(frontmatter)}\n---\n${descriptor.body}`,
    };
  });
  const resources = new Map(
    (tree.resources ?? []).map((descriptor) => [
      descriptor.path,
      {
        bytes: readFileSync(resolve(fixtureRoot, descriptor.fixture)),
        kind: descriptor.kind ?? "regular",
      },
    ]),
  );
  return { concepts, resources };
}

function createValidators() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(readJson(commonSchemaPath));
  return new Map(
    Object.keys(uidPrefixes).map((type) => [
      type,
      ajv.compile(
        readJson(resolve(typeSchemaRoot, `${type.toLowerCase()}.schema.json`)),
      ),
    ]),
  );
}

function assertSchemaValid(tree, validators, label) {
  assert.equal(
    new Set(tree.concepts.map((concept) => concept.path)).size,
    tree.concepts.length,
    `${label} has duplicate concept paths`,
  );
  for (const concept of tree.concepts) {
    assert.match(concept.path, conceptPathPattern, `${label} invalid path`);
    assert.equal(
      typeof concept.markdown,
      "string",
      `${label} missing Markdown`,
    );
    assert.ok(concept.markdown.length > 0, `${label} has empty Markdown`);
    const validate = validators.get(concept.frontmatter.type);
    assert.ok(
      validate,
      `${label} has unknown type ${concept.frontmatter.type}`,
    );
    assert.equal(
      validate(concept.frontmatter),
      true,
      `${label} ${concept.path}: ${JSON.stringify(validate.errors)}`,
    );
  }
  for (const resourcePath of tree.resources.keys()) {
    assert.match(
      resourcePath,
      bundleFilePathPattern,
      `${label} invalid resource path`,
    );
  }
}

function mapByPath(tree) {
  return new Map(tree.concepts.map((concept) => [concept.path, concept]));
}

function findByUid(tree, uid) {
  return tree.concepts.find(
    (concept) => concept.frontmatter.bookie.uid === uid,
  );
}

function relationInverse(kind, sourceType) {
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

function validatePolicy(base, proposed, policy) {
  const errors = new Set();
  const baseByPath = mapByPath(base);
  const proposedByPath = mapByPath(proposed);
  const proposedByUid = new Map();

  for (const concept of proposed.concepts) {
    const uid = concept.frontmatter.bookie.uid;
    if (!policy.allowed_concept_types.includes(concept.frontmatter.type)) {
      errors.add("TYPE-ALLOWED");
    }
    if (proposedByUid.has(uid)) errors.add("UID-UNIQUE");
    proposedByUid.set(uid, concept);
  }

  for (const source of proposed.concepts) {
    const { bookie, type } = source.frontmatter;
    if (bookie.project) {
      const project = proposedByPath.get(bookie.project);
      if (!project || project.frontmatter.type !== "Project") {
        errors.add("PROJECT-TARGET");
      }
    }

    const seenRelations = new Set();
    for (const relation of bookie.relations ?? []) {
      const key = `${relation.kind}\u0000${relation.target}`;
      if (seenRelations.has(key)) errors.add("RELATION-TARGET");
      seenRelations.add(key);
      const target = proposedByPath.get(relation.target);
      if (
        !target ||
        (relation.target_uid &&
          relation.target_uid !== target.frontmatter.bookie.uid)
      ) {
        errors.add("RELATION-TARGET");
        continue;
      }

      if (["supersedes", "superseded_by"].includes(relation.kind)) {
        const correction =
          relation.kind === "supersedes" &&
          ["Activity", "Evidence"].includes(type) &&
          target.frontmatter.type === type;
        const decision =
          type === "Decision" && target.frontmatter.type === "Decision";
        if ((!correction && !decision) || target === source) {
          errors.add("RELATION-TARGET");
        }
        if (
          correction &&
          bookie.project !== target.frontmatter.bookie.project
        ) {
          errors.add("RELATION-TARGET");
        }
      }

      const inverse = relationInverse(relation.kind, type);
      if (inverse) {
        const matches = (target.frontmatter.bookie.relations ?? []).filter(
          (candidate) =>
            candidate.kind === inverse &&
            candidate.target === source.path &&
            (!candidate.target_uid || candidate.target_uid === bookie.uid),
        );
        if (matches.length !== 1) errors.add("RELATION-INVERSE");
      }
    }
    if (
      ["Activity", "Evidence"].includes(type) &&
      (bookie.relations ?? []).filter(
        (relation) => relation.kind === "supersedes",
      ).length > 1
    ) {
      errors.add("RELATION-TARGET");
    }
  }

  for (const predecessor of base.concepts.filter(
    (concept) => concept.frontmatter.type === "Decision",
  )) {
    if (!findByUid(proposed, predecessor.frontmatter.bookie.uid)) {
      errors.add("DECISION-SUPERSESSION");
    }
  }
  for (const predecessor of proposed.concepts.filter(
    (concept) =>
      concept.frontmatter.type === "Decision" &&
      concept.frontmatter.bookie.state === "superseded",
  )) {
    const reciprocal = (predecessor.frontmatter.bookie.relations ?? []).filter(
      (relation) => relation.kind === "superseded_by",
    );
    const replacement = proposedByPath.get(reciprocal[0]?.target);
    if (
      predecessor.frontmatter.status !== "deprecated" ||
      reciprocal.length !== 1 ||
      !replacement ||
      replacement.frontmatter.type !== "Decision" ||
      replacement.frontmatter.bookie.project !==
        predecessor.frontmatter.bookie.project ||
      replacement.frontmatter.status !== "stable" ||
      replacement.frontmatter.bookie.state !== "accepted" ||
      !(replacement.frontmatter.bookie.relations ?? []).some(
        (relation) =>
          relation.kind === "supersedes" &&
          relation.target === predecessor.path,
      )
    ) {
      errors.add("DECISION-SUPERSESSION");
    }
  }
  for (const replacement of proposed.concepts.filter(
    (concept) => concept.frontmatter.type === "Decision",
  )) {
    for (const relation of replacement.frontmatter.bookie.relations ?? []) {
      if (relation.kind !== "supersedes") continue;
      const predecessor = proposedByPath.get(relation.target);
      const reciprocal = (
        predecessor?.frontmatter.bookie.relations ?? []
      ).filter(
        (candidate) =>
          candidate.kind === "superseded_by" &&
          candidate.target === replacement.path,
      );
      if (
        !predecessor ||
        predecessor.frontmatter.type !== "Decision" ||
        predecessor.frontmatter.bookie.project !==
          replacement.frontmatter.bookie.project ||
        predecessor.frontmatter.status !== "deprecated" ||
        predecessor.frontmatter.bookie.state !== "superseded" ||
        replacement.frontmatter.status !== "stable" ||
        replacement.frontmatter.bookie.state !== "accepted" ||
        reciprocal.length !== 1
      ) {
        errors.add("DECISION-SUPERSESSION");
      }
    }
  }

  for (const type of ["Activity", "Evidence"]) {
    const code = `${type.toUpperCase()}-IMMUTABLE`;
    for (const original of base.concepts.filter(
      (concept) => concept.frontmatter.type === type,
    )) {
      const candidate = findByUid(proposed, original.frontmatter.bookie.uid);
      if (
        !candidate ||
        candidate.path !== original.path ||
        candidate.markdown !== original.markdown ||
        !isDeepStrictEqual(candidate.frontmatter, original.frontmatter)
      ) {
        errors.add(code);
      }
    }
  }

  for (const evidence of proposed.concepts.filter(
    (concept) => concept.frontmatter.type === "Evidence",
  )) {
    const resourcePath = evidence.frontmatter.resource;
    const relative = resourcePath.slice(1);
    const insideRoot = policy.evidence_roots.some((rootPath) =>
      relative.startsWith(`${rootPath}/`),
    );
    const resource = proposed.resources.get(resourcePath);
    if (
      !insideRoot ||
      !resource ||
      resource.kind !== "regular" ||
      resource.bytes.length > policy.attachment_max_bytes
    ) {
      errors.add("EVIDENCE-RESOURCE");
    } else if (sha256(resource.bytes) !== evidence.frontmatter.bookie.sha256) {
      errors.add("EVIDENCE-DIGEST");
    }
    for (const support of evidence.frontmatter.bookie.supports) {
      if (!proposedByPath.has(support)) errors.add("EVIDENCE-SUPPORT");
    }
  }

  for (const original of base.concepts.filter((concept) =>
    ["Activity", "Evidence"].includes(concept.frontmatter.type),
  )) {
    const { bookie, type } = original.frontmatter;
    if (bookie.project) {
      const before = baseByPath.get(bookie.project);
      const after = proposedByPath.get(bookie.project);
      if (
        !before ||
        !after ||
        before.frontmatter.bookie.uid !== after.frontmatter.bookie.uid
      ) {
        errors.add("PROJECT-TARGET");
      }
    }
    for (const relation of bookie.relations ?? []) {
      const before = baseByPath.get(relation.target);
      const after = proposedByPath.get(relation.target);
      if (
        !before ||
        !after ||
        before.frontmatter.bookie.uid !== after.frontmatter.bookie.uid
      ) {
        errors.add("RELATION-TARGET");
      }
    }
    if (type === "Evidence") {
      for (const support of bookie.supports) {
        const before = baseByPath.get(support);
        const after = proposedByPath.get(support);
        if (
          !before ||
          !after ||
          before.frontmatter.bookie.uid !== after.frontmatter.bookie.uid
        ) {
          errors.add("EVIDENCE-SUPPORT");
        }
      }
      const beforeResource = base.resources.get(original.frontmatter.resource);
      const afterResource = proposed.resources.get(
        original.frontmatter.resource,
      );
      if (
        !beforeResource ||
        !afterResource ||
        beforeResource.kind !== "regular" ||
        afterResource.kind !== "regular" ||
        !beforeResource.bytes.equals(afterResource.bytes)
      ) {
        errors.add("EVIDENCE-RESOURCE");
      }
    }
  }

  return [...errors].sort();
}

test("SPEC-001 fixes UID prefixes, relation inverses, and stable rule codes", () => {
  const spec = readFileSync(specPath, "utf8");

  for (const [type, prefix] of Object.entries(uidPrefixes)) {
    assert.ok(
      spec.includes(`| ${type} | \`${prefix}-\` |`),
      `Missing ${type}/${prefix} mapping`,
    );
  }
  for (const [kind, inverse] of Object.entries(relations)) {
    const renderedInverse = inverse === null ? "None" : `\`${inverse}\``;
    assert.ok(
      spec.includes(`| \`${kind}\` | ${renderedInverse} |`),
      `Missing ${kind} inverse contract`,
    );
  }

  const documentedRules = [...spec.matchAll(/^#### `([A-Z-]+)`$/gm)].map(
    (match) => match[1],
  );
  assert.deepEqual(documentedRules, ruleCodes);
});

test("cross-file fixtures materialize schema-valid trees and isolate policy rules", async (t) => {
  assert.deepEqual(
    readdirSync(resolve(fixtureRoot, "valid"))
      .filter((name) => name.endsWith(".json"))
      .sort(),
    ["cases.json"],
  );
  assert.deepEqual(
    readdirSync(resolve(fixtureRoot, "invalid"))
      .filter((name) => name.endsWith(".json"))
      .sort(),
    ["cases.json"],
  );
  assert.deepEqual(
    readCases("valid")
      .map((fixture) => fixture.id)
      .sort(),
    [...validCases].sort(),
  );
  assert.deepEqual(
    readCases("invalid")
      .map((fixture) => fixture.id)
      .sort(),
    Object.keys(invalidCases).sort(),
  );

  const validators = createValidators();
  for (const name of validCases) {
    await t.test(`valid/${name}`, () => {
      const fixture = readCase("valid", name);
      assert.equal(fixture.profile, "1.0");
      assert.ok(fixture.description.length > 0);
      const base = materializeTree(fixture.facts.base);
      const proposed = materializeTree(fixture.facts.proposed);
      assertSchemaValid(base, validators, `${name} base`);
      assertSchemaValid(proposed, validators, `${name} proposed`);
      assert.deepEqual(
        validatePolicy(base, proposed, fixture.facts.policy),
        [],
      );
      assert.deepEqual(fixture.expected, { valid: true, rules: [] });
    });
  }

  for (const [name, expectedRules] of Object.entries(invalidCases)) {
    await t.test(`invalid/${name}`, () => {
      const fixture = readCase("invalid", name);
      assert.equal(fixture.profile, "1.0");
      assert.ok(fixture.description.length > 0);
      const base = materializeTree(fixture.facts.base);
      const proposed = materializeTree(fixture.facts.proposed);
      assertSchemaValid(base, validators, `${name} base`);
      assertSchemaValid(proposed, validators, `${name} proposed`);
      assert.deepEqual(
        validatePolicy(base, proposed, fixture.facts.policy),
        [...expectedRules].sort(),
      );
      assert.deepEqual(fixture.expected, {
        valid: false,
        rules: expectedRules,
      });
    });
  }

  assert.deepEqual(
    [...new Set(Object.values(invalidCases).flat())].sort(),
    [...ruleCodes].sort(),
    "Every named rule needs a failing fixture",
  );
});

test("digest resources pin exact UTF-8, CRLF, and binary bytes", () => {
  const exact = readFileSync(resolve(fixtureRoot, "resources/exact.txt"));
  const changed = readFileSync(resolve(fixtureRoot, "resources/changed.txt"));
  const crlf = readFileSync(resolve(fixtureRoot, "resources/crlf.txt"));
  const binary = readFileSync(resolve(fixtureRoot, "resources/binary.bin"));

  assert.notEqual(sha256(exact), sha256(changed));
  assert.notEqual(sha256(exact), sha256(crlf));
  assert.equal(binary.includes(0), true);
  assert.equal(
    readCase("valid", "evidence-exact-bytes").facts.expected_digests[
      "exact.txt"
    ],
    sha256(exact),
  );
  assert.equal(
    readCase("valid", "evidence-exact-bytes").facts.expected_digests[
      "crlf.txt"
    ],
    sha256(crlf),
  );
  assert.equal(
    readCase("valid", "evidence-exact-bytes").facts.expected_digests[
      "binary.bin"
    ],
    sha256(binary),
  );
});
