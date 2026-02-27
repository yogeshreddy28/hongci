"use strict";

function createGetPageBySlug(deps) {
  const repo = deps.pageRepository;
  return async function GetPageBySlug(input) {
    const slug = input && input.slug;
    if (!slug) throw new Error("slug is required");
    return { item: await repo.get(String(slug)) };
  };
}

module.exports = { createGetPageBySlug };
