"use strict";

function makeListUseCase(repo) {
  return async function execute() {
    const items = await repo.list();
    return { items };
  };
}

function makeGetUseCase(repo, idField) {
  return async function execute(input) {
    const key = input && input[idField];
    if (!key) throw new Error(idField + " is required");
    const item = await repo.get(String(key));
    return { item: item || null };
  };
}

function makeSaveUseCase(repo, EntityCtor, idField, options) {
  options = options || {};
  return async function execute(input) {
    if (!input || typeof input !== "object") throw new Error("payload is required");
    if (options.validateId) {
      await options.validateId(input[idField]);
    }
    const entity = new EntityCtor(input);
    await repo.save(entity);
    return { item: entity };
  };
}

module.exports = {
  makeListUseCase,
  makeGetUseCase,
  makeSaveUseCase
};
