"use strict";
const { makeGetUseCase } = require("./_crudFactories");
function createGetEventById(deps) { return makeGetUseCase(deps.eventRepository, "id"); }
module.exports = { createGetEventById };
