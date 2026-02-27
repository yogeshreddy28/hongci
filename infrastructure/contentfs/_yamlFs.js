"use strict";

const fs = require("fs");
const path = require("path");
const yaml = require(path.join(__dirname, "../../site/admin-server/node_modules/js-yaml"));

function readYAML(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  return yaml.load(text) || {};
}

function writeYAML(filePath, data) {
  const out = yaml.dump(data, { noRefs: true, lineWidth: 120, quotingType: '"' });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, out, "utf8");
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listYamlFiles(dir) {
  return fs.readdirSync(dir).filter((f) => /\.ya?ml$/i.test(f)).sort();
}

function fileMtimeIso(filePath) {
  try {
    return fs.statSync(filePath).mtime.toISOString();
  } catch (e) {
    return null;
  }
}

function ensureSafeKey(value, label) {
  if (!/^[a-zA-Z0-9._-]+$/.test(String(value || ""))) {
    throw new Error("Invalid " + label);
  }
  return String(value);
}

module.exports = {
  fs,
  path,
  readYAML,
  writeYAML,
  readJSON,
  listYamlFiles,
  fileMtimeIso,
  ensureSafeKey
};
