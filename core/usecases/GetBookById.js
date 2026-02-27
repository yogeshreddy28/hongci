"use strict";
const { makeGetUseCase } = require("./_crudFactories");
function createGetBookById(deps) { return makeGetUseCase(deps.bookRepository, "id"); }
module.exports = { createGetBookById };
