"use strict";

const path = require("path");
const { startAdminServer } = require("../../app/adminServer/main");

const PORT = Number(process.env.PORT) || 5050;
const siteRoot = path.resolve(__dirname, "..");

startAdminServer({
  port: PORT,
  siteRoot
});
