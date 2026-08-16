import assert from "node:assert/strict";
import test from "node:test";

import { OKF_VERSION } from "../dist/index.js";

test("core publishes the accepted OKF version", () => {
  assert.equal(OKF_VERSION, "0.2");
});
