"use strict";

const fs = require("fs");
const path = require("path");

function sanitizeBaseName(name) {
  return String(name || "file")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "") || "file";
}

class LocalUploadStore {
  constructor(options) {
    this.siteRoot = options.siteRoot;
    this.uploadDir = path.join(this.siteRoot, "assets", "uploads");
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  getUploadDir() {
    fs.mkdirSync(this.uploadDir, { recursive: true });
    return this.uploadDir;
  }

  buildStoredFilename(originalName) {
    var ext = path.extname(String(originalName || "")).toLowerCase();
    var base = sanitizeBaseName(originalName);
    return Date.now() + "-" + base + ext;
  }

  publicUrlForFilename(filename) {
    return "assets/uploads/" + String(filename || "").replace(/^\/+/, "");
  }
}

module.exports = { LocalUploadStore };
