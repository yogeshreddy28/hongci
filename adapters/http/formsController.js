"use strict";

const { sendError } = require("./_helpers");

function createFormsController(deps) {
  return {
    submit: async (req, res) => {
      try {
        const body = req.body;
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return res.status(400).json({ ok: false, error: "JSON object required." });
        }
        const eventId = String(body.event_id || body.eventId || "").trim();
        if (!eventId) return res.status(400).json({ ok: false, error: "event_id is required." });
        const answers = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers) ? body.answers : {};
        const record = {
          event_id: eventId,
          event_title: String(body.event_title || body.eventTitle || ""),
          submitted_at: body.submitted_at || body.submittedAt || new Date().toISOString(),
          answers,
          client: {
            user_agent: String((body.client && body.client.user_agent) || body.user_agent || req.headers["user-agent"] || ""),
            referrer: String((body.client && body.client.referrer) || body.referrer || req.headers.referer || "")
          }
        };
        deps.store.append(eventId, record);
        return res.status(201).json({ ok: true });
      } catch (e) {
        return sendError(res, e);
      }
    },

    list: async (req, res) => {
      try {
        const eventId = String(req.params.event_id || req.params.eventId || "").trim();
        if (!eventId) return res.status(400).json({ ok: false, error: "event_id is required." });
        const items = deps.store.list(eventId);
        return res.json({ ok: true, items });
      } catch (e) {
        return sendError(res, e);
      }
    },

    exportCsv: async (req, res) => {
      try {
        const eventId = String(req.params.event_id || req.params.eventId || "").trim();
        if (!eventId) return res.status(400).json({ ok: false, error: "event_id is required." });
        if (!deps.store.toCSV) return res.status(501).json({ ok: false, error: "CSV export not implemented." });
        const csv = deps.store.toCSV(eventId);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="' + eventId.replace(/[^a-zA-Z0-9._-]/g, "-") + '-submissions.csv"');
        return res.status(200).send(csv);
      } catch (e) {
        return sendError(res, e);
      }
    }
  };
}

module.exports = { createFormsController };
