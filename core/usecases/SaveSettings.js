"use strict";
const { Settings } = require("../entities/Settings");
function createSaveSettings(deps) {
  const repo = deps.settingsRepository;
  return async function SaveSettings(input) {
    const entity = new Settings(input || {});
    await repo.save(entity);
    return { item: entity };
  };
}
module.exports = { createSaveSettings };
