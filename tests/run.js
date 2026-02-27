"use strict";

const path = require("path");

const tests = [
  path.join(__dirname, "boundary.test.js"),
  path.join(__dirname, "core.entities.test.js"),
  path.join(__dirname, "core.usecases.test.js"),
  path.join(__dirname, "submissions.unify.smoke.test.js")
];

(async function run() {
  for (const file of tests) {
    console.log("[test]", path.basename(file));
    const result = require(file);
    if (result && typeof result.then === "function") {
      await result;
    }
  }
  console.log("All tests passed.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
