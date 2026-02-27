"use strict";

const { Settings } = require("../../core/entities/Settings");
const { path, readYAML, writeYAML } = require("./_yamlFs");

class YamlSettingsRepository {
  constructor(options) { this.file = path.join(options.contentRoot, "settings.yml"); }
  async get() { return new Settings(readYAML(this.file)); }
  async save(entity) { const data = entity.toJSON ? entity.toJSON() : entity; writeYAML(this.file, data); }
}
module.exports = { YamlSettingsRepository };
