"use strict";

const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const usecases = require("../../core/usecases");
const { YamlPageRepository } = require("../../infrastructure/contentfs/YamlPageRepository");
const { YamlEventRepository } = require("../../infrastructure/contentfs/YamlEventRepository");
const { YamlBookRepository } = require("../../infrastructure/contentfs/YamlBookRepository");
const { YamlReportRepository } = require("../../infrastructure/contentfs/YamlReportRepository");
const { YamlSettingsRepository } = require("../../infrastructure/contentfs/YamlSettingsRepository");
const { PageRoutesRegistry } = require("../../infrastructure/contentfs/PageRoutesRegistry");
const { SystemClock } = require("../../infrastructure/clock/SystemClock");
const { createPagesController } = require("../../adapters/http/pagesController");
const { createEventsController } = require("../../adapters/http/eventsController");
const { createBooksController } = require("../../adapters/http/booksController");
const { createReportsController } = require("../../adapters/http/reportsController");
const { createSettingsController } = require("../../adapters/http/settingsController");
const { createUploadController } = require("../../adapters/http/uploadController");
const { createEventSubmissionsController } = require("../../adapters/http/eventSubmissionsController");
const { createFormsController } = require("../../adapters/http/formsController");
const { LocalUploadStore } = require("../../infrastructure/contentfs/LocalUploadStore");
const { buildEventsIndex } = require("../../infrastructure/contentfs/buildEventsIndex");
const { EventSubmissionsStore } = require("../../infrastructure/contentfs/EventSubmissionsStore");
const { FormSubmissionsStore } = require("../../infrastructure/contentfs/FormSubmissionsStore");

function createAdminServerApp(options) {
  const siteRoot = options.siteRoot;
  const contentRoot = path.join(siteRoot, "content");
  const clock = new SystemClock();
  void clock;

  const pageRepository = new YamlPageRepository({ contentRoot });
  const eventRepository = new YamlEventRepository({ contentRoot });
  const bookRepository = new YamlBookRepository({ contentRoot });
  const reportRepository = new YamlReportRepository({ contentRoot });
  const settingsRepository = new YamlSettingsRepository({ contentRoot });
  const pageRoutes = new PageRoutesRegistry({ contentRoot });
  const uploadStore = new LocalUploadStore({ siteRoot });
  const eventSubmissionsStore = new EventSubmissionsStore({ contentRoot });
  const formSubmissionsStore = new FormSubmissionsStore({ contentRoot });

  const pagesController = createPagesController({
    listPages: usecases.createListPages({ pageRepository, pageRoutes }),
    getPageBySlug: usecases.createGetPageBySlug({ pageRepository }),
    savePage: usecases.createSavePage({ pageRepository, pageRoutes })
  });
  const eventsController = createEventsController({
    listEvents: usecases.createListEvents({ eventRepository }),
    getEventById: usecases.createGetEventById({ eventRepository }),
    saveEvent: usecases.createSaveEvent({ eventRepository }),
    deleteEvent: async ({ id }) => eventRepository.delete(id)
  });
  const booksController = createBooksController({
    listBooks: usecases.createListBooks({ bookRepository }),
    getBookById: usecases.createGetBookById({ bookRepository }),
    saveBook: usecases.createSaveBook({ bookRepository })
  });
  const reportsController = createReportsController({
    listReports: usecases.createListReports({ reportRepository }),
    getReportById: usecases.createGetReportById({ reportRepository }),
    saveReport: usecases.createSaveReport({ reportRepository })
  });
  const settingsController = createSettingsController({
    getSettings: usecases.createGetSettings({ settingsRepository }),
    saveSettings: usecases.createSaveSettings({ settingsRepository })
  });
  const uploadStorage = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, uploadStore.getUploadDir());
    },
    filename: function (_req, file, cb) {
      cb(null, uploadStore.buildStoredFilename(file && file.originalname));
    }
  });
  const uploader = multer({
    storage: uploadStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (_req, file, cb) {
      var mimetype = String(file && file.mimetype || "").toLowerCase();
      var ok = /^(image\/jpeg|image\/png|image\/webp)$/.test(mimetype);
      if (!ok) return cb(new Error("Only jpg, jpeg, png, and webp images are allowed."));
      cb(null, true);
    }
  });
  const uploadController = createUploadController({ uploader, uploadStore });
  const eventSubmissionsController = createEventSubmissionsController({ store: eventSubmissionsStore });
  const formsController = createFormsController({ store: formSubmissionsStore });

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));
  app.use(cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      cb(null, /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
    },
    credentials: true
  }));

  const api = express.Router();
  api.get("/ping", (req, res) => res.json({ ok: true }));

  api.get("/pages", pagesController.list);
  api.get("/pages/:slug", pagesController.get);
  api.put("/pages/:slug", pagesController.save);

  api.get("/events/index", eventsController.index);
  api.get("/events", eventsController.list);
  api.post("/events", eventsController.create);
  api.get("/events/:slug", eventsController.get);
  api.put("/events/:slug", eventsController.save);
  api.delete("/events/:slug", eventsController.remove);
  api.post("/events/:slug/submissions", eventSubmissionsController.create);
  api.get("/events/:slug/submissions", eventSubmissionsController.list);
  api.get("/events/:slug/submissions/export.csv", eventSubmissionsController.exportCsv);

  api.get("/books", booksController.list);
  api.get("/books/:slug", booksController.get);
  api.put("/books/:slug", booksController.save);

  api.get("/reports", reportsController.list);
  api.get("/reports/:slug", reportsController.get);
  api.put("/reports/:slug", reportsController.save);

  api.get("/settings", settingsController.get);
  api.put("/settings", settingsController.save);
  api.post("/upload", uploadController.upload);
  api.post("/forms/submit", formsController.submit);
  api.get("/forms/submissions/:event_id", formsController.list);
  api.get("/forms/submissions/:event_id/export.csv", formsController.exportCsv);

  app.use("/api", api);
  app.use("/assets", express.static(path.join(siteRoot, "assets")));

  app.use("/admin-custom", express.static(path.join(siteRoot, "admin-custom"), { extensions: ["html"] }));
  app.get("/", (req, res) => res.redirect("/admin-custom/"));

  try {
    buildEventsIndex({ contentRoot });
  } catch (e) {
    console.warn("Failed to build events index on startup:", e && e.message ? e.message : e);
  }

  return app;
}

function startAdminServer(options) {
  const siteRoot = options.siteRoot;
  const port = Number(options.port) || 5050;
  const app = createAdminServerApp({ siteRoot });
  const server = app.listen(port, () => {
    console.log("Custom admin server running on http://localhost:" + port);
    console.log("Admin UI: http://localhost:" + port + "/admin-custom/");
    console.log("API: http://localhost:" + port + "/api/*");
    console.log("Health: http://localhost:" + port + "/health");
    console.log("Port:", port);
  });
  app.get("/health", (req, res) => res.json({ ok: true, port }));
  server.on("error", (error) => {
    if (error && error.code === "EADDRINUSE") {
      console.error("Port " + port + " in use. Either kill it or run with PORT=" + (port + 1) + " node server.js");
      process.exit(1);
      return;
    }
    console.error(error);
    process.exit(1);
  });
  return { app, server };
}

module.exports = { createAdminServerApp, startAdminServer };
