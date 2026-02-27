"use strict";
const { makeListUseCase } = require("./_crudFactories");
function createListBooks(deps) { return makeListUseCase(deps.bookRepository); }
module.exports = { createListBooks };
