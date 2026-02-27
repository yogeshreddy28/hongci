"use strict";
function createGetSettings(deps) {
  const repo = deps.settingsRepository;
  return async function GetSettings() {
    return { item: await repo.get() };
  };
}
module.exports = { createGetSettings };
