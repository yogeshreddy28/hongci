"use strict";
const { entityToPlain, mapCollectionListItems, sendError } = require("./_helpers");
function createBooksController(deps) {
  return {
    list: async (req, res) => { try { const out = await deps.listBooks(); res.json({ ok: true, items: mapCollectionListItems(out.items) }); } catch (e) { sendError(res, e); } },
    get: async (req, res) => { try { const slug = String(req.params.slug || ""); const out = await deps.getBookById({ id: slug }); if (!out.item) return res.status(404).json({ ok:false,error:"Not found."}); res.json({ ok:true, item: entityToPlain(out.item), slug }); } catch (e) { sendError(res,e); } },
    save: async (req, res) => { try { const slug = String(req.params.slug || ""); const payload = req.body; if (!payload || typeof payload !== "object" || Array.isArray(payload)) return res.status(400).json({ok:false,error:"JSON object required."}); const out = await deps.saveBook(Object.assign({}, payload, { id: slug })); res.json({ ok:true, slug, item: entityToPlain(out.item) }); } catch (e) { sendError(res,e); } }
  };
}
module.exports = { createBooksController };
