"use strict";

const { entityToPlain, sendError } = require("./_helpers");

function createPagesController(deps) {
  const listPages = deps.listPages;
  const getPageBySlug = deps.getPageBySlug;
  const savePage = deps.savePage;

  return {
    list: async function (req, res) {
      try {
        const out = await listPages();
        res.json({ ok: true, items: out.items || [] });
      } catch (error) { sendError(res, error); }
    },
    get: async function (req, res) {
      try {
        const slug = String(req.params.slug || "");
        const out = await getPageBySlug({ slug });
        if (!out.item) return res.status(404).json({ ok: false, error: "Not found." });
        res.json({ ok: true, item: entityToPlain(out.item), slug });
      } catch (error) { sendError(res, error); }
    },
    save: async function (req, res) {
      try {
        const slug = String(req.params.slug || "");
        const payload = req.body;
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          return res.status(400).json({ ok: false, error: "JSON object required." });
        }
        const out = await savePage(Object.assign({}, payload, { slug }));
        res.json({ ok: true, slug, item: entityToPlain(out.item) });
      } catch (error) { sendError(res, error); }
    }
  };
}

module.exports = { createPagesController };
