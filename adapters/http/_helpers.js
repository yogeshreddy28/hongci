"use strict";

function entityToPlain(item) {
  if (!item) return item;
  return typeof item.toJSON === "function" ? item.toJSON() : item;
}

function mapCollectionListItems(items) {
  return (items || []).map(function (entity) {
    const raw = entityToPlain(entity) || {};
    return {
      slug: raw.slug || raw.id || raw.month || "",
      title: raw.title || raw.month || raw.slug || raw.id || "",
      id: raw.id || raw.slug || raw.month || "",
      month: raw.month || null,
      updatedAt: raw.updatedAt || null
    };
  });
}

function sendError(res, error) {
  const msg = error && error.message ? error.message : "Server error";
  if (error && error.code === "INVALID_PAGE_SLUG") {
    return res.status(404).json({ ok: false, error: "Invalid page slug" });
  }
  if (/required|Invalid slug|Invalid .*slug/i.test(msg)) {
    return res.status(400).json({ ok: false, error: msg });
  }
  if (/not found/i.test(msg)) {
    return res.status(404).json({ ok: false, error: msg });
  }
  return res.status(500).json({ ok: false, error: msg });
}

module.exports = {
  entityToPlain,
  mapCollectionListItems,
  sendError
};
