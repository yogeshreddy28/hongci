"use strict";

const { Event } = require("../../core/entities/Event");
const { fs, path, readYAML, writeYAML, listYamlFiles, fileMtimeIso, ensureSafeKey } = require("./_yamlFs");
const { buildEventsIndex } = require("./buildEventsIndex");

class YamlEventRepository {
  constructor(options) {
    this.dir = path.join(options.contentRoot, "events");
    this.contentRoot = options.contentRoot;
  }
  _filePath(id) { return path.join(this.dir, ensureSafeKey(id, "id") + ".yml"); }
  async list() {
    return listYamlFiles(this.dir).map((file) => {
      const id = file.replace(/\.ya?ml$/i, "");
      const fp = path.join(this.dir, file);
      const data = readYAML(fp);
      return new Event(Object.assign({}, data, { id: data.id || id, updatedAt: fileMtimeIso(fp) }));
    });
  }
  async get(id) {
    const fp = this._filePath(id);
    try { const data = readYAML(fp); return new Event(Object.assign({}, data, { id: data.id || id, updatedAt: fileMtimeIso(fp) })); }
    catch (e) { if (e && e.code === "ENOENT") return null; throw e; }
  }
  async save(entity) {
    const data = entity.toJSON ? entity.toJSON() : entity;
    writeYAML(this._filePath(data.id), data);
    buildEventsIndex({ contentRoot: this.contentRoot });
  }

  async delete(id) {
    const fp = this._filePath(id);
    try {
      fs.unlinkSync(fp);
    } catch (e) {
      if (e && e.code !== "ENOENT") throw e;
    }
    buildEventsIndex({ contentRoot: this.contentRoot });
  }
}
module.exports = { YamlEventRepository };
