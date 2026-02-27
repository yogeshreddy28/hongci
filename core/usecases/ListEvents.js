"use strict";
const { makeListUseCase } = require("./_crudFactories");
function createListEvents(deps) { return makeListUseCase(deps.eventRepository); }
module.exports = { createListEvents };
