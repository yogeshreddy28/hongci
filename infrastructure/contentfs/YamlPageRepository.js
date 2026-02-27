"use strict";

const { Page } = require("../../core/entities/Page");
const { path, readYAML, writeYAML, listYamlFiles, fileMtimeIso, ensureSafeKey } = require("./_yamlFs");

class YamlPageRepository {
  constructor(options) {
    this.pagesDir = path.join(options.contentRoot, "pages");
  }

  _filePath(slug) {
    return path.join(this.pagesDir, ensureSafeKey(slug, "slug") + ".yml");
  }

  async list() {
    return listYamlFiles(this.pagesDir).map((file) => {
      const slug = file.replace(/\.ya?ml$/i, "");
      const data = readYAML(path.join(this.pagesDir, file));
      return new Page(Object.assign({}, data, { slug: data.slug || slug, updatedAt: fileMtimeIso(path.join(this.pagesDir, file)) }));
    });
  }

  async get(slug) {
    const fp = this._filePath(slug);
    try {
      const data = readYAML(fp);
      return new Page(Object.assign({}, data, { slug: data.slug || slug, updatedAt: fileMtimeIso(fp) }));
    } catch (e) {
      if (e && e.code === "ENOENT") return null;
      throw e;
    }
  }

  async getUpdatedAt(slug) {
    return fileMtimeIso(this._filePath(slug));
  }

  async save(page) {
    const data = typeof page.toJSON === "function" ? page.toJSON() : page;
    writeYAML(this._filePath(data.slug), data);
  }
}

module.exports = { YamlPageRepository };
