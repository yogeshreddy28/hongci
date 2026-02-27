"use strict";
const { Book } = require("../entities/Book");
const { makeSaveUseCase } = require("./_crudFactories");
function createSaveBook(deps) { return makeSaveUseCase(deps.bookRepository, Book, "id"); }
module.exports = { createSaveBook };
