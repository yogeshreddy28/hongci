"use strict";
const { entityToPlain, sendError } = require("./_helpers");
function createSettingsController(deps) {
  return {
    get: async (req, res) => { try { const out = await deps.getSettings(); res.json({ ok: true, item: entityToPlain(out.item) }); } catch (e) { sendError(res, e); } },
    save: async (req, res) => { try { const payload = req.body; if (!payload || typeof payload !== "object" || Array.isArray(payload)) return res.status(400).json({ok:false,error:"JSON object required."}); const out = await deps.saveSettings(payload); res.json({ ok: true, item: entityToPlain(out.item) }); } catch (e) { sendError(res, e); } }
  };
}
module.exports = { createSettingsController };
