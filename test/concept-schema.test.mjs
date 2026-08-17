import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";

const root = resolve(import.meta.dirname, "..");
const commonSchemaPath = resolve(root, "schemas/bookie-common.schema.json");
const typeSchemaRoot = resolve(root, "schemas/types");
const fixtureRoot = resolve(root, "fixtures/concepts/1.0");

const typeNames = [
  "Project",
  "Task",
  "Document",
  "Research",
  "Decision",
  "Activity",
  "Evidence",
  "Person",
];

const validFixtures = typeNames.map((type) => type.toLowerCase());

const invalidFixtures = {
  "project-missing-created-at": ["Project", "required", "/bookie"],
  "task-missing-project": ["Task", "required", "/bookie"],
  "document-missing-project": ["Document", "required", "/bookie"],
  "research-missing-created-at": ["Research", "required", "/bookie"],
  "decision-missing-state": ["Decision", "required", "/bookie"],
  "activity-missing-occurred-at": ["Activity", "required", "/bookie"],
  "evidence-missing-sha256": ["Evidence", "required", "/bookie"],
  "person-missing-created-at": ["Person", "required", "/bookie"],
  "project-invalid-status": ["Project", "enum", "/status"],
  "project-invalid-state": ["Project", "enum", "/bookie/state"],
  "task-invalid-state": ["Task", "enum", "/bookie/state"],
  "project-malformed-uid": ["Project", "pattern", "/bookie/uid"],
  "project-non-utc-created-at": ["Project", "pattern", "/bookie/created_at"],
  "project-impossible-calendar-date": [
    "Project",
    "pattern",
    "/bookie/created_at",
  ],
  "project-impossible-calendar-month": [
    "Project",
    "pattern",
    "/bookie/created_at",
  ],
  "project-impossible-clock-time": ["Project", "pattern", "/bookie/created_at"],
  "evidence-invalid-sha256": ["Evidence", "pattern", "/bookie/sha256"],
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function createAjv() {
  return new Ajv2020({ allErrors: true, strict: true });
}

function loadValidator(type) {
  const ajv = createAjv();
  ajv.addSchema(readJson(commonSchemaPath));
  return ajv.compile(
    readJson(resolve(typeSchemaRoot, `${type.toLowerCase()}.schema.json`)),
  );
}

test("common and initial type schemas meta-validate in Ajv strict mode", () => {
  const ajv = createAjv();
  const commonSchema = readJson(commonSchemaPath);
  assert.equal(
    ajv.validateSchema(commonSchema),
    true,
    ajv.errorsText(ajv.errors),
  );
  ajv.addSchema(commonSchema);

  for (const type of typeNames) {
    const schema = readJson(
      resolve(typeSchemaRoot, `${type.toLowerCase()}.schema.json`),
    );
    assert.equal(ajv.validateSchema(schema), true, ajv.errorsText(ajv.errors));
    assert.doesNotThrow(() => ajv.compile(schema));
  }
});

test("every initial type has an enumerated valid fixture", async (t) => {
  assert.deepEqual(
    readdirSync(resolve(fixtureRoot, "valid"))
      .filter((name) => name.endsWith(".json"))
      .sort(),
    validFixtures.map((name) => `${name}.json`).sort(),
  );

  for (const type of typeNames) {
    await t.test(type, () => {
      const validate = loadValidator(type);
      const fixture = readJson(
        resolve(fixtureRoot, "valid", `${type.toLowerCase()}.json`),
      );
      assert.equal(validate(fixture), true, JSON.stringify(validate.errors));
    });
  }
});

test("every initial type has a required-field negative fixture", async (t) => {
  assert.deepEqual(
    readdirSync(resolve(fixtureRoot, "invalid"))
      .filter((name) => name.endsWith(".json"))
      .sort(),
    Object.keys(invalidFixtures)
      .map((name) => `${name}.json`)
      .sort(),
  );

  for (const [name, [type, keyword, instancePath]] of Object.entries(
    invalidFixtures,
  )) {
    await t.test(name, () => {
      const validate = loadValidator(type);
      const fixture = readJson(resolve(fixtureRoot, "invalid", `${name}.json`));
      assert.equal(validate(fixture), false, `${name} unexpectedly passed`);
      assert.ok(
        validate.errors?.some(
          (error) =>
            error.keyword === keyword && error.instancePath === instancePath,
        ),
        `${name} failed for the wrong reason: ${JSON.stringify(validate.errors)}`,
      );
    });
  }
});

test("common schema validates lifecycle, UID, UTC timestamps, and preserves extensions", () => {
  const fixture = readJson(resolve(fixtureRoot, "valid", "project.json"));
  const validate = loadValidator("Project");

  fixture.custom_top_level = { retained: true };
  fixture.bookie.custom_metadata = "retained";
  fixture.bookie.created_at = "2024-02-29T00:00:00Z";
  assert.equal(validate(fixture), true, JSON.stringify(validate.errors));

  fixture.status = "done";
  assert.equal(validate(fixture), false);
  assert.ok(
    validate.errors?.some(
      (error) => error.keyword === "enum" && error.instancePath === "/status",
    ),
  );
});
