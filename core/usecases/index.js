"use strict";
module.exports = {
  ...require("./ListPages"),
  ...require("./GetPageBySlug"),
  ...require("./SavePage"),
  ...require("./ListEvents"),
  ...require("./GetEventById"),
  ...require("./SaveEvent"),
  ...require("./ListBooks"),
  ...require("./GetBookById"),
  ...require("./SaveBook"),
  ...require("./ListReports"),
  ...require("./GetReportById"),
  ...require("./SaveReport"),
  ...require("./GetSettings"),
  ...require("./SaveSettings")
};
