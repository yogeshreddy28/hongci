"use strict";

const { Page } = require("../entities/Page");

function createSavePage(deps) {
  const repo = deps.pageRepository;
  const pageRoutes = deps.pageRoutes;
  return async function SavePage(input) {
    const slug = String((input && input.slug) || "").trim();
    if (!slug) throw new Error("slug is required");
    const route = pageRoutes.findPageBySlug(slug);
    if (!route) {
      const err = new Error("Invalid page slug");
      err.code = "INVALID_PAGE_SLUG";
      throw err;
    }
    const entity = new Page(input);
    await repo.save(entity);
    return { item: entity };
  };
}

module.exports = { createSavePage };
