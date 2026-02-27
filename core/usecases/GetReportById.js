"use strict";
const { makeGetUseCase } = require("./_crudFactories");
function createGetReportById(deps) { return makeGetUseCase(deps.reportRepository, "id"); }
module.exports = { createGetReportById };
