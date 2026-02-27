"use strict";

const assert = require("assert");
const path = require("path");
const { createAdminServerApp } = require("../app/adminServer/main");

const siteRoot = path.join(__dirname, "..", "site");
const app = createAdminServerApp({ siteRoot });

assert(app && typeof app.use === "function", "Express app not created");
console.log("Smoke OK: admin server app composed successfully.");
