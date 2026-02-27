"use strict";

const { sendError } = require("./_helpers");

function createEventSubmissionsController(deps) {
  return {
    create: async (req, res) => {
      try {
        var eventId = String(req.params.slug || req.params.id || "").trim();
        var payload = req.body;
        if (!eventId) return res.status(400).json({ ok: false, error: "Event id required." });
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) return res.status(400).json({ ok: false, error: "JSON object required." });
        var answers = payload.answers && typeof payload.answers === "object" && !Array.isArray(payload.answers) ? payload.answers : {};
        var submittedAt = payload.submittedAt || new Date().toISOString();
        var record = {
          eventId,
          submittedAt,
          answers
        };
        deps.store.append(eventId, record);
        res.status(201).json({ ok: true, item: record });
      } catch (e) { sendError(res, e); }
    },
    list: async (req, res) => {
      try {
        var eventId = String(req.params.slug || req.params.id || "").trim();
        if (!eventId) return res.status(400).json({ ok: false, error: "Event id required." });
        var items = deps.store.list(eventId);
        res.json({ ok: true, items: items });
      } catch (e) { sendError(res, e); }
    },
    exportCsv: async (req, res) => {
      try {
        var eventId = String(req.params.slug || req.params.id || "").trim();
        if (!eventId) return res.status(400).json({ ok: false, error: "Event id required." });
        var csv = deps.store.toCSV(eventId);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="' + eventId.replace(/[^a-zA-Z0-9._-]/g, "-") + '-submissions.csv"');
        res.status(200).send(csv);
      } catch (e) { sendError(res, e); }
    }
  };
}

module.exports = { createEventSubmissionsController };
