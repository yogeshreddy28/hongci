"use strict";

function createListPages(deps) {
  const pageRoutes = deps.pageRoutes;
  const pageRepository = deps.pageRepository;
  return async function ListPages() {
    const routes = pageRoutes.listPages().filter(function (p) { return p && p.enabled !== false; });
    const baseUrl = String(pageRoutes.getBaseUrl() || "").replace(/\/+$/, "");
    const items = [];
    for (const route of routes) {
      const slug = String(route.slug || "");
      const updatedAt = await pageRepository.getUpdatedAt(slug);
      items.push({
        slug,
        id: slug,
        title: route.title || slug,
        file: route.file || (slug + ".html"),
        enabled: route.enabled !== false,
        contentPath: "/content/pages/" + slug + ".yml",
        previewUrl: baseUrl ? (baseUrl + "/" + (route.file || (slug + ".html"))) : null,
        updatedAt
      });
    }
    return { items };
  };
}

module.exports = { createListPages };
