import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";

const root = resolve(import.meta.dirname, "..");
const schemaPath = resolve(
  root,
  "schemas/profile/1.0/bookie-config.schema.json",
);
const fixtureRoot = resolve(root, "fixtures/profile/1.0/bookie-config");
const exampleConfigPath = resolve(root, "examples/vault/bookie.yaml");
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

function readFixture(kind, name) {
  return JSON.parse(
    readFileSync(resolve(fixtureRoot, kind, `${name}.json`), "utf8"),
  );
}

function createAjv() {
  return new Ajv2020({ allErrors: true, strict: true });
}

const validFixtures = [
  "minimal",
  "example",
  "boundary-minimum",
  "boundary-maximum",
];

const invalidFixtures = {
  "unknown-root": "additionalProperties",
  "unknown-vault": "additionalProperties",
  "unknown-policy": "additionalProperties",
  "unknown-sensitivity": "additionalProperties",
  "version-mismatch": "const",
  "version-number": "type",
  "uid-overflow": "pattern",
  "uid-forbidden-symbol": "pattern",
  "uid-lowercase": "pattern",
  "vault-missing-uid": "required",
  "allowed-type-unknown": "enum",
  "allowed-type-duplicate": "uniqueItems",
  "allowed-types-empty": "minItems",
  "evidence-roots-empty": "minItems",
  "evidence-root-absolute": "pattern",
  "evidence-root-parent": "pattern",
  "evidence-root-backslash": "pattern",
  "evidence-root-glob": "pattern",
  "evidence-root-dot-segment": "pattern",
  "evidence-root-empty-segment": "pattern",
  "evidence-root-drive-path": "pattern",
  "evidence-root-uri-colon": "pattern",
  "evidence-root-percent-encoded": "pattern",
  "evidence-root-c1-control": "pattern",
  "exclude-absolute": "pattern",
  "exclude-parent": "pattern",
  "exclude-backslash": "pattern",
  "exclude-embedded-star": "pattern",
  "exclude-unsupported-glob": "pattern",
  "exclude-dot-segment": "pattern",
  "exclude-empty-segment": "pattern",
  "sensitivity-malformed": "pattern",
  "sensitivity-duplicate": "uniqueItems",
  "sensitivity-reserved-class": "not",
  "sensitivity-reserved-exclusion": "not",
  "sensitivity-classes-empty": "minItems",
  "sensitivity-class-too-long": "maxLength",
  "attachment-zero": "minimum",
  "attachment-fraction": "type",
  "attachment-unsafe": "maximum",
};

test("bookie config schema is valid JSON Schema 2020-12 in Ajv strict mode", () => {
  const ajv = createAjv();
  assert.equal(ajv.validateSchema(schema), true, ajv.errorsText(ajv.errors));
  assert.doesNotThrow(() => ajv.compile(schema));
});

test("bookie config valid fixtures cover minimal, example, and boundaries", async (t) => {
  assert.deepEqual(
    readdirSync(resolve(fixtureRoot, "valid"))
      .filter((name) => name.endsWith(".json"))
      .sort(),
    validFixtures.map((name) => `${name}.json`).sort(),
    "Every valid fixture must be enumerated",
  );

  const validate = createAjv().compile(schema);

  for (const name of validFixtures) {
    await t.test(name, () => {
      const fixture = readFixture("valid", name);
      const declaredClasses = new Set(fixture.policy.sensitivity.classes);
      assert.ok(
        fixture.policy.sensitivity.excluded_classes.every((className) =>
          declaredClasses.has(className),
        ),
        `${name} excludes an undeclared sensitivity class`,
      );
      assert.equal(validate(fixture), true, validate.errors?.join("\n"));
    });
  }
});

test("decoded example fixture stays aligned with lightweight YAML scalar checks", () => {
  const fixture = readFixture("valid", "example");
  const example = readFileSync(exampleConfigPath, "utf8");

  assert.equal(
    example.match(/^profile:\s*["']?([^"'\n]+)["']?$/m)?.[1],
    fixture.profile,
  );
  assert.equal(example.match(/^\s{2}uid:\s+(\S+)$/m)?.[1], fixture.vault.uid);
  assert.equal(
    Number(example.match(/^\s{2}attachment_max_bytes:\s+(\d+)$/m)?.[1]),
    fixture.policy.attachment_max_bytes,
  );
});

test("bookie config required properties reject omission at every level", async (t) => {
  const requiredProperties = [
    ["profile"],
    ["vault"],
    ["allowed_concept_types"],
    ["policy"],
    ["vault", "uid"],
    ["vault", "title"],
    ["policy", "evidence_roots"],
    ["policy", "exclude"],
    ["policy", "sensitivity"],
    ["policy", "attachment_max_bytes"],
    ["policy", "sensitivity", "classes"],
    ["policy", "sensitivity", "excluded_classes"],
  ];
  const validate = createAjv().compile(schema);

  for (const path of requiredProperties) {
    await t.test(path.join("."), () => {
      const fixture = structuredClone(readFixture("valid", "minimal"));
      const parent = path
        .slice(0, -1)
        .reduce((value, property) => value[property], fixture);
      delete parent[path.at(-1)];

      assert.equal(
        validate(fixture),
        false,
        `${path.join(".")} omission passed`,
      );
      assert.ok(
        validate.errors?.some((error) => error.keyword === "required"),
        JSON.stringify(validate.errors),
      );
    });
  }
});

test("bookie config arrays reject duplicates and vault title rejects empty", async (t) => {
  const invalidMutations = [
    [
      "vault.title empty",
      (fixture) => {
        fixture.vault.title = "";
      },
      "minLength",
    ],
    [
      "allowed_concept_types duplicate",
      (fixture) => fixture.allowed_concept_types.push("Project"),
      "uniqueItems",
    ],
    [
      "policy.evidence_roots duplicate",
      (fixture) => fixture.policy.evidence_roots.push("evidence"),
      "uniqueItems",
    ],
    [
      "policy.exclude duplicate",
      (fixture) => fixture.policy.exclude.push("cache/**", "cache/**"),
      "uniqueItems",
    ],
    [
      "policy.sensitivity.classes duplicate",
      (fixture) => fixture.policy.sensitivity.classes.push("public"),
      "uniqueItems",
    ],
    [
      "policy.sensitivity.excluded_classes duplicate",
      (fixture) =>
        fixture.policy.sensitivity.excluded_classes.push(
          "restricted",
          "restricted",
        ),
      "uniqueItems",
    ],
  ];
  const validate = createAjv().compile(schema);

  for (const [name, mutate, keyword] of invalidMutations) {
    await t.test(name, () => {
      const fixture = structuredClone(readFixture("valid", "minimal"));
      mutate(fixture);

      assert.equal(validate(fixture), false, `${name} unexpectedly passed`);
      assert.ok(
        validate.errors?.some((error) => error.keyword === keyword),
        `${name} should fail ${keyword}: ${JSON.stringify(validate.errors)}`,
      );
    });
  }
});

test("evidence roots reject line-separator bypasses and lone surrogates", async (t) => {
  const invalidRoots = [
    ["U+2028 then colon", `safe\u2028:escape`],
    ["U+2029 then colon", `safe\u2029:escape`],
    ["U+2028 then percent", `safe\u2028%2fescape`],
    ["U+2029 then percent", `safe\u2029%2fescape`],
    ["U+2028 then glob", `safe\u2028*escape`],
    ["U+2029 then glob", `safe\u2029*escape`],
    ["U+2028 then traversal", `safe\u2028/../escape`],
    ["U+2029 then traversal", `safe\u2029/../escape`],
    ["U+2028 then C0", `safe\u2028\u0001escape`],
    ["U+2029 then C0", `safe\u2029\u0001escape`],
    ["lone UTF-16 surrogate", `safe\ud800escape`],
  ];
  const validate = createAjv().compile(schema);

  for (const [name, evidenceRoot] of invalidRoots) {
    await t.test(name, () => {
      const fixture = structuredClone(readFixture("valid", "minimal"));
      fixture.policy.evidence_roots = [evidenceRoot];

      assert.equal(validate(fixture), false, `${name} unexpectedly passed`);
      assert.ok(
        validate.errors?.some((error) => error.keyword === "pattern"),
        `${name} should fail pattern: ${JSON.stringify(validate.errors)}`,
      );
    });
  }

  await t.test("valid supplementary Unicode scalar", () => {
    const fixture = structuredClone(readFixture("valid", "minimal"));
    fixture.policy.evidence_roots = ["evidence/😀"];
    assert.equal(validate(fixture), true, JSON.stringify(validate.errors));
  });
});

test("bookie config invalid fixtures cover strict, lexical, and numeric boundaries", async (t) => {
  assert.deepEqual(
    readdirSync(resolve(fixtureRoot, "invalid"))
      .filter((name) => name.endsWith(".json"))
      .sort(),
    Object.keys(invalidFixtures)
      .map((name) => `${name}.json`)
      .sort(),
    "Every invalid fixture must have an asserted failure reason",
  );

  const validate = createAjv().compile(schema);
  for (const [name, keyword] of Object.entries(invalidFixtures)) {
    await t.test(name, () => {
      const fixture = readFixture("invalid", name);
      assert.equal(validate(fixture), false, `${name} unexpectedly passed`);
      assert.ok(
        validate.errors?.some((error) => error.keyword === keyword),
        `${name} should fail ${keyword}: ${JSON.stringify(validate.errors)}`,
      );
    });
  }
});
