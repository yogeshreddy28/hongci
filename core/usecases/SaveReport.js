"use strict";
const { Report } = require("../entities/Report");
const { makeSaveUseCase } = require("./_crudFactories");
function createSaveReport(deps) { return makeSaveUseCase(deps.reportRepository, Report, "id"); }
module.exports = { createSaveReport };
