(function () {
  "use strict";

  function isDev() {
    var h = (window.location && window.location.hostname) || "";
    return h === "localhost" || h === "127.0.0.1";
  }

  function isPreview() {
    try {
      return new URLSearchParams(window.location.search).get("cmsPreview") === "1";
    } catch (e) {
      return false;
    }
  }

  function getSlug() {
    return document.body && document.body.dataset ? String(document.body.dataset.page || "").trim() : "";
  }

  function withCacheBust(url) {
    if (!isDev()) return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "v=" + Date.now();
  }

  async function fetchYaml(url) {
    if (!window.jsyaml) throw new Error("js-yaml not loaded");
    var reqUrl = withCacheBust(url);
    console.log("[CMS] loading", reqUrl);
    var res = await fetch(reqUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch " + url + " (" + res.status + ")");
    var text = await res.text();
    try {
      return window.jsyaml.load(text) || {};
    } catch (err) {
      throw new Error("YAML parse error for " + url + ": " + (err && err.message ? err.message : String(err)));
    }
  }

  function getByPath(root, pathExpr) {
    if (!pathExpr) return root;
    var parts = String(pathExpr).split(".");
    var cur = root;
    for (var i = 0; i < parts.length; i += 1) {
      if (cur == null) return undefined;
      var part = parts[i];
      if (Array.isArray(cur)) {
        if (/^\d+$/.test(part)) {
          cur = cur[Number(part)];
          continue;
        }
        // Support array of sections addressed by id: sections.pillars.items
        var found = null;
        for (var j = 0; j < cur.length; j += 1) {
          var candidate = cur[j];
          if (candidate && String(candidate.id || "") === part) {
            found = candidate;
            break;
          }
        }
        cur = found;
        continue;
      }
      cur = cur[part];
    }
    return cur;
  }

  function setText(el, value) {
    if (!el) return;
    el.textContent = value == null ? "" : String(value);
  }

  function setAttr(el, attr, value) {
    if (!el || !attr) return;
    if (value == null) return;
    el.setAttribute(attr, String(value));
  }

  function setHref(el, value) {
    if (!el) return;
    if (value == null) return;
    el.setAttribute("href", String(value));
  }

  function hydrateNode(root, data) {
    if (!root) return;

    var textNodes = root.querySelectorAll("[data-cms-text]");
    textNodes.forEach(function (el) {
      var pathExpr = el.getAttribute("data-cms-text");
      var value = getByPath(data, pathExpr);
      if (value === undefined) return;
      setText(el, value);
    });

    var attrNodes = root.querySelectorAll("[data-cms-attr]");
    attrNodes.forEach(function (el) {
      var expr = el.getAttribute("data-cms-attr") || "";
      var idx = expr.lastIndexOf(":");
      if (idx === -1) return;
      var pathExpr = expr.slice(0, idx);
      var attr = expr.slice(idx + 1);
      var value = getByPath(data, pathExpr);
      if (value === undefined) return;
      setAttr(el, attr, value);
    });

    var linkNodes = root.querySelectorAll("[data-cms-link]");
    linkNodes.forEach(function (el) {
      var pathExpr = el.getAttribute("data-cms-link");
      var value = getByPath(data, pathExpr);
      if (value === undefined) return;
      setHref(el, value);
    });

    var repeatNodes = root.querySelectorAll("[data-cms-repeat]");
    repeatNodes.forEach(function (container) {
      if (container.__cmsHydratedRepeat) return;
      var listPath = container.getAttribute("data-cms-repeat");
      var items = getByPath(data, listPath);
      if (!Array.isArray(items)) return;
      var tpl = container.querySelector("template");
      var templateEl = null;
      if (tpl) templateEl = tpl;
      if (!templateEl) {
        templateEl = container.querySelector(".cms-template");
      }
      if (!templateEl) return;

      var fragmentParent;
      var clones = [];
      items.forEach(function (item) {
        var node;
        if (templateEl.tagName && templateEl.tagName.toLowerCase() === "template") {
          node = templateEl.content.firstElementChild ? templateEl.content.firstElementChild.cloneNode(true) : null;
        } else {
          node = templateEl.cloneNode(true);
          node.classList.remove("cms-template");
          node.removeAttribute("hidden");
          node.style.display = "";
        }
        if (!node) return;
        hydrateNode(node, item || {});
        clones.push(node);
      });

      Array.prototype.slice.call(container.children).forEach(function (child) {
        if (child === templateEl) return;
        if (child.tagName && child.tagName.toLowerCase() === "template") return;
        child.remove();
      });
      clones.forEach(function (node) { container.appendChild(node); });
      container.__cmsHydratedRepeat = true;
    });
  }

  // Compatibility bridge for existing home page data-* selectors while migrating to universal data-cms-* markup.
  function hydrateLegacySelectors(page) {
    if (!page || typeof page !== "object") return;
    var hero = page.hero || {};
    var about = page.about || {};
    var impact = page.impact || {};
    var event = page.event || {};
    var brand = page.brand || {};
    var left = about.left || {};
    var right = about.right || {};

    function setAllText(selector, value) {
      if (value === undefined) return;
      document.querySelectorAll(selector).forEach(function (el) { el.textContent = value == null ? "" : String(value); });
    }
    function setAllAttr(selector, attr, value) {
      if (value === undefined) return;
      document.querySelectorAll(selector).forEach(function (el) { el.setAttribute(attr, String(value)); });
    }

    setAllText('[data-community="title"]', hero.title);
    setAllText('[data-community="tagline"]', hero.tagline);
    setAllText('[data-community="aboutLeftTitle"]', left.title);
    setAllText('[data-community="aboutLeftText"]', left.text);
    setAllText('[data-community="aboutRightTitle"]', right.title);
    setAllText('[data-community="aboutRightText"]', right.text);

    ["bloodUnits", "volunteers", "books", "families"].forEach(function (key) {
      if (impact[key] === undefined) return;
      var formatted = Number.isFinite(Number(impact[key])) ? new Intl.NumberFormat().format(Number(impact[key])) : String(impact[key]);
      setAllText('[data-impact="' + key + '"]', formatted);
    });

    setAllAttr('[data-hero-image]', 'src', hero.image);
    setAllAttr('[data-watermark-seal]', 'src', brand.sealImage);
    setAllText('[data-event-title]', event.title);
    setAllText('[data-event-location]', event.location);
    setAllAttr('[data-event-register]', 'href', event.registerUrl);
  }

  function showBadge(slug) {
    if (!isDev() && !isPreview()) return;
    var badge = document.getElementById("cms-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "cms-badge";
      badge.setAttribute("style", "position:fixed;top:10px;right:10px;z-index:9999;background:#fff;border:1px solid rgba(107,30,30,.22);color:#6b1e1e;padding:4px 8px;border-radius:999px;font:600 12px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 4px 12px rgba(17,24,39,.06)");
      document.body.appendChild(badge);
    }
    badge.textContent = (isPreview() ? "PREVIEW MODE • " : "") + "CMS: LOADED " + slug;
  }

  async function hydratePage() {
    var slug = getSlug();
    if (!slug) return;
    console.log("[CMS] slug", slug);
    try {
      var page = await fetchYaml("/content/pages/" + slug + ".yml");
      hydrateNode(document, page);
      hydrateLegacySelectors(page);
      showBadge(slug);
    } catch (err) {
      console.warn("[CMS] failed", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydratePage);
  } else {
    hydratePage();
  }
})();
