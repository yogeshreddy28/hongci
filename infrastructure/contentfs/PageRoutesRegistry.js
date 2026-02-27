"use strict";

const { path, readJSON } = require("./_yamlFs");

class PageRoutesRegistry {
  constructor(options) {
    this.contentRoot = options.contentRoot;
    this.routesPath = path.join(this.contentRoot, "routes.json");
  }

  _load() {
    try {
      const data = readJSON(this.routesPath);
      return data && typeof data === "object" ? data : { baseUrl: "", pages: [] };
    } catch (e) {
      return { baseUrl: "", pages: [] };
    }
  }

  getBaseUrl() {
    return String(this._load().baseUrl || "");
  }

  listPages() {
    const pages = this._load().pages;
    return Array.isArray(pages) ? pages : [];
  }

  findPageBySlug(slug) {
    const key = String(slug || "");
    return this.listPages().find((p) => p && String(p.slug || "") === key) || null;
  }
}

module.exports = { PageRoutesRegistry };
