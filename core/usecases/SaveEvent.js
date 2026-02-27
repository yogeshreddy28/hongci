"use strict";
const { Event } = require("../entities/Event");
const { makeSaveUseCase } = require("./_crudFactories");
function createSaveEvent(deps) { return makeSaveUseCase(deps.eventRepository, Event, "id"); }
module.exports = { createSaveEvent };
