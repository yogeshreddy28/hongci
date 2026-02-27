"use strict";

const { Report } = require("../../core/entities/Report");
const { path, readYAML, writeYAML, listYamlFiles, fileMtimeIso, ensureSafeKey } = require("./_yamlFs");
const { CollectionIndexWriter } = require("./CollectionIndexWriter");

class YamlReportRepository {
  constructor(options) {
    this.dir = path.join(options.contentRoot, "reports");
    this.contentRoot = options.contentRoot;
    this.indexWriter = new CollectionIndexWriter({ contentRoot: options.contentRoot });
  }
  _filePath(id) { return path.join(this.dir, ensureSafeKey(id, "id") + ".yml"); }
  async list() {
    return listYamlFiles(this.dir).map((file) => {
      const id = file.replace(/\.ya?ml$/i, "");
      const fp = path.join(this.dir, file);
      const data = readYAML(fp);
      return new Report(Object.assign({}, data, { month: data.month || id, updatedAt: fileMtimeIso(fp) }));
    });
  }
  async get(id) {
    const fp = this._filePath(id);
    try { const data = readYAML(fp); return new Report(Object.assign({}, data, { month: data.month || id, updatedAt: fileMtimeIso(fp) })); }
    catch (e) { if (e && e.code === "ENOENT") return null; throw e; }
  }
  async save(entity) {
    const data = entity.toJSON ? entity.toJSON() : entity;
    writeYAML(this._filePath(data.month), data);
    this.indexWriter.writeReportsIndex();
  }
}
module.exports = { YamlReportRepository };
