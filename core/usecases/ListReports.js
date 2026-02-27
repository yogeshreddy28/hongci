"use strict";
const { makeListUseCase } = require("./_crudFactories");
function createListReports(deps) { return makeListUseCase(deps.reportRepository); }
module.exports = { createListReports };
