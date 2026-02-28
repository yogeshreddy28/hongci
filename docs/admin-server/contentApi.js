"use strict";

const fs = require("fs");
const path = require("path");
const express = require("express");
const yaml = require("js-yaml");

function isSafeSlug(value) {
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

function readYAML(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  return yaml.load(text) || {};
}

function writeYAML(filePath, data) {
  const out = yaml.dump(data, {
    noRefs: true,
    lineWidth: 120,
    quotingType: "\""
  });
  fs.writeFileSync(filePath, out, "utf8");
}

function readJSON(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  return JSON.parse(text);
}

function createContentApi(options) {
  const siteRoot = options.siteRoot;
  const contentRoot = path.join(siteRoot, "content");
  const router = express.Router();

  const collections = {
    pages: path.join(contentRoot, "pages"),
    events: path.join(contentRoot, "events"),
    books: path.join(contentRoot, "books"),
    reports: path.join(contentRoot, "reports")
  };

  const routesPath = path.join(contentRoot, "routes.json");

  function loadRoutes() {
    try {
      const routes = readJSON(routesPath);
      return routes && typeof routes === "object" ? routes : { baseUrl: "", pages: [] };
    } catch (error) {
      return { baseUrl: "", pages: [] };
    }
  }

  function findRoutePage(slug) {
    const routes = loadRoutes();
    const pages = Array.isArray(routes.pages) ? routes.pages : [];
    return pages.find((p) => p && String(p.slug || "") === String(slug || "")) || null;
  }

  function listCollection(collection) {
    const dir = collections[collection];
    const files = fs.readdirSync(dir).filter((f) => /\.ya?ml$/i.test(f)).sort();
    return files.map((file) => {
      const slug = file.replace(/\.ya?ml$/i, "");
      let data = {};
      try {
        data = readYAML(path.join(dir, file));
      } catch (error) {
        data = {};
      }
      return {
        slug,
        title: data.title || data.month || data.slug || slug,
        id: data.id || slug,
        month: data.month || null,
        updatedAt: fs.statSync(path.join(dir, file)).mtime.toISOString()
      };
    });
  }

  function getFilePath(collection, slug) {
    if (!collections[collection]) return null;
    if (!isSafeSlug(slug)) return null;
    return path.join(collections[collection], slug + ".yml");
  }

  function collectionRoutes(collection) {
    router.get("/" + collection, (req, res) => {
      try {
        if (collection === "pages") {
          const routes = loadRoutes();
          const baseUrl = String(routes.baseUrl || "").replace(/\/+$/, "");
          const pages = Array.isArray(routes.pages) ? routes.pages : [];
          const items = pages
            .filter((p) => p && p.enabled !== false)
            .map((p) => {
              const slug = String(p.slug || "");
              const filePath = path.join(collections.pages, slug + ".yml");
              let updatedAt = null;
              try {
                updatedAt = fs.statSync(filePath).mtime.toISOString();
              } catch (error) {
                updatedAt = null;
              }
              return {
                slug,
                id: slug,
                title: p.title || slug,
                file: p.file || (slug + ".html"),
                enabled: p.enabled !== false,
                contentPath: "/content/pages/" + slug + ".yml",
                previewUrl: baseUrl ? (baseUrl + "/" + (p.file || (slug + ".html"))) : null,
                updatedAt
              };
            });
          return res.json({ ok: true, items });
        }

        const items = listCollection(collection);
        return res.json({ ok: true, items });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message || "Failed to list items." });
      }
    });

    router.get("/" + collection + "/:slug", (req, res) => {
      const slug = req.params.slug;
      const filePath = getFilePath(collection, slug);
      if (!filePath) return res.status(400).json({ ok: false, error: "Invalid slug." });
      if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: "Not found." });

      try {
        const item = readYAML(filePath);
        return res.json({ ok: true, item, slug });
      } catch (error) {
        return res.status(500).json({ ok: false, error: "Failed to read file." });
      }
    });

    router.put("/" + collection + "/:slug", (req, res) => {
      const slug = req.params.slug;
      if (collection === "pages") {
        const routePage = findRoutePage(slug);
        if (!routePage) {
          return res.status(404).json({ ok: false, error: "Invalid page slug" });
        }
      }
      const filePath = getFilePath(collection, slug);
      if (!filePath) return res.status(400).json({ ok: false, error: "Invalid slug." });

      const payload = req.body;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return res.status(400).json({ ok: false, error: "JSON object required." });
      }

      try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        writeYAML(filePath, payload);
        return res.json({ ok: true, slug, item: payload });
      } catch (error) {
        return res.status(500).json({ ok: false, error: "Failed to save file." });
      }
    });
  }

  ["pages", "events", "books", "reports"].forEach(collectionRoutes);

  router.get("/settings", (req, res) => {
    const filePath = path.join(contentRoot, "settings.yml");
    if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: "Settings file not found." });
    try {
      const item = readYAML(filePath);
      return res.json({ ok: true, item });
    } catch (error) {
      return res.status(500).json({ ok: false, error: "Failed to read settings." });
    }
  });

  router.put("/settings", (req, res) => {
    const filePath = path.join(contentRoot, "settings.yml");
    const payload = req.body;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return res.status(400).json({ ok: false, error: "JSON object required." });
    }
    try {
      writeYAML(filePath, payload);
      return res.json({ ok: true, item: payload });
    } catch (error) {
      return res.status(500).json({ ok: false, error: "Failed to save settings." });
    }
  });

  return router;
}

module.exports = {
  createContentApi
};
