"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CORE_DIR = path.join(ROOT, "core");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.js$/i.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(CORE_DIR);
const bannedStrings = [
  "express",
  "fs",
  "path",
  "js-yaml",
  "node:fs",
  "node:path",
  "fetch(",
  "window.",
  "document."
];

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");

  assert(!/require\((['"])\.\.\/(adapters|infrastructure|app)\1\)/.test(src), file + " imports forbidden layer");
  assert(!/from\s+['"]\.\.\/(adapters|infrastructure|app)['"]/.test(src), file + " imports forbidden layer");

  for (const banned of bannedStrings) {
    if (banned === "fetch(" || banned === "window." || banned === "document.") {
      assert(!src.includes(banned), file + " contains forbidden token: " + banned);
      continue;
    }
    assert(!new RegExp("require\\((['\"])" + banned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\1\\)").test(src), file + " requires banned module: " + banned);
    assert(!new RegExp("from\\s+['\"]" + banned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "['\"]").test(src), file + " imports banned module: " + banned);
  }
}
