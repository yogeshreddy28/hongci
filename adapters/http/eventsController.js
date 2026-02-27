"use strict";

const { entityToPlain, mapCollectionListItems, sendError } = require("./_helpers");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function dateKey(value) {
  var m = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function generateEventId(payload) {
  var base = slugify(payload && payload.title);
  var d = dateKey(payload && payload.start_datetime);
  if (base && d) return base + "-" + d;
  if (base) return base;
  if (d) return "event-" + d;
  return "event-" + Date.now();
}

function createEventsController(deps) {
  return {
    index: async (req, res) => {
      try {
        const out = await deps.listEvents();
        const items = (out.items || []).map(entityToPlain);
        const sorted = items.slice().sort(function (a, b) {
          var as = String(a && a.status || "upcoming");
          var bs = String(b && b.status || "upcoming");
          var aPast = as === "past";
          var bPast = bs === "past";
          if (aPast !== bPast) return aPast ? 1 : -1; // upcoming first, past later
          var aFeat = !!(a && a.featured);
          var bFeat = !!(b && b.featured);
          if (aFeat !== bFeat) return aFeat ? -1 : 1; // featured first within group
          var ad = String(a && (a.start_datetime || a.startDateTime || "") || "");
          var bd = String(b && (b.start_datetime || b.startDateTime || "") || "");
          if (!aPast) return ad.localeCompare(bd); // upcoming asc
          return bd.localeCompare(ad); // past desc
        });
        res.json(sorted);
      } catch (e) { sendError(res, e); }
    },

    list: async (req, res) => {
      try {
        const out = await deps.listEvents();
        const full = String(req.query.full || "") === "1" || String(req.query.full || "") === "true";
        if (full) return res.json({ ok: true, items: (out.items || []).map(entityToPlain) });
        var mapped = mapCollectionListItems(out.items).map(function (row, i) {
          var raw = entityToPlain((out.items || [])[i]) || {};
          row.start_datetime = raw.start_datetime || raw.startDateTime || null;
          row.status = raw.status || "upcoming";
          return row;
        });
        res.json({ ok: true, items: mapped });
      } catch (e) { sendError(res, e); }
    },

    get: async (req, res) => {
      try {
        const slug = String(req.params.slug || "");
        const out = await deps.getEventById({ id: slug });
        if (!out.item) return res.status(404).json({ ok: false, error: "Not found." });
        res.json({ ok: true, item: entityToPlain(out.item), slug });
      } catch (e) { sendError(res, e); }
    },

    create: async (req, res) => {
      try {
        const payload = req.body;
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          return res.status(400).json({ ok: false, error: "JSON object required." });
        }
        var baseId = String(payload.id || "").trim() || generateEventId(payload);
        var id = baseId;
        if (typeof deps.getEventById === "function") {
          var counter = 2;
          while (true) {
            // eslint-disable-next-line no-await-in-loop
            var existing = await deps.getEventById({ id: id });
            if (!existing || !existing.item) break;
            id = baseId + "-" + counter;
            counter += 1;
          }
        }
        const out = await deps.saveEvent(Object.assign({}, payload, { id }));
        res.status(201).json({ ok: true, slug: id, item: entityToPlain(out.item) });
      } catch (e) { sendError(res, e); }
    },

    save: async (req, res) => {
      try {
        const slug = String(req.params.slug || "");
        const payload = req.body;
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          return res.status(400).json({ ok: false, error: "JSON object required." });
        }
        const out = await deps.saveEvent(Object.assign({}, payload, { id: slug }));
        res.json({ ok: true, slug, item: entityToPlain(out.item) });
      } catch (e) { sendError(res, e); }
    },

    remove: async (req, res) => {
      try {
        const slug = String(req.params.slug || "");
        if (!slug) return res.status(400).json({ ok: false, error: "id is required." });
        if (typeof deps.deleteEvent !== "function") {
          return res.status(501).json({ ok: false, error: "Delete not implemented." });
        }
        await deps.deleteEvent({ id: slug });
        res.json({ ok: true, slug });
      } catch (e) { sendError(res, e); }
    }
  };
}

module.exports = { createEventsController };
