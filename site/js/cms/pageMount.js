(function () {
  "use strict";

  function isDevHost() {
    var host = (window.location && window.location.hostname) || "";
    return host === "localhost" || host === "127.0.0.1";
  }

  function getSlug() {
    return document.body && document.body.dataset ? String(document.body.dataset.page || "").trim() : "";
  }

  function pageYamlUrl(slug) {
    var url = "/content/pages/" + encodeURIComponent(slug) + ".yml";
    if (isDevHost()) {
      url += (url.indexOf("?") === -1 ? "?" : "&") + "v=" + Date.now();
    }
    return url;
  }

  async function fetchYamlObject(url) {
    if (!window.jsyaml || typeof window.jsyaml.load !== "function") {
      throw new Error("js-yaml is not loaded");
    }
    console.log("[CMS] loading", url);
    var res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to fetch " + url + " (" + res.status + ")");
    }
    var text = await res.text();
    try {
      return window.jsyaml.load(text) || {};
    } catch (err) {
      throw new Error("YAML parse error for " + url + ": " + (err && err.message ? err.message : String(err)));
    }
  }

  function setText(selector, value) {
    if (value == null || value === "") return;
    var nodes = document.querySelectorAll(selector);
    nodes.forEach(function (node) {
      node.textContent = String(value);
    });
  }

  function setAttr(selector, attr, value) {
    if (value == null || value === "") return;
    var nodes = document.querySelectorAll(selector);
    nodes.forEach(function (node) {
      if (node && typeof node.setAttribute === "function") {
        node.setAttribute(attr, String(value));
      }
    });
  }

  function formatNumber(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return null;
    return new Intl.NumberFormat().format(n);
  }

  function hydrateFromYaml(page) {
    if (!page || typeof page !== "object") return;

    var hero = page.hero || {};
    var about = page.about || {};
    var aboutLeft = about.left || {};
    var aboutRight = about.right || {};
    var impact = page.impact || {};
    var event = page.event || {};
    var brand = page.brand || {};

    setText('[data-community="title"]', hero.title);
    setText('[data-community="tagline"]', hero.tagline);
    setText('[data-community="aboutLeftTitle"]', aboutLeft.title);
    setText('[data-community="aboutLeftText"]', aboutLeft.text);
    setText('[data-community="aboutRightTitle"]', aboutRight.title);
    setText('[data-community="aboutRightText"]', aboutRight.text);

    var bloodUnits = formatNumber(impact.bloodUnits);
    var volunteers = formatNumber(impact.volunteers);
    var books = formatNumber(impact.books);
    var families = formatNumber(impact.families);
    if (bloodUnits != null) setText('[data-impact="bloodUnits"]', bloodUnits);
    if (volunteers != null) setText('[data-impact="volunteers"]', volunteers);
    if (books != null) setText('[data-impact="books"]', books);
    if (families != null) setText('[data-impact="families"]', families);

    setAttr("[data-hero-image]", "src", hero.image);
    setAttr("[data-watermark-seal]", "src", brand.sealImage);

    setText("[data-event-title]", event.title);
    setText("[data-event-location]", event.location);
    setAttr("[data-event-register]", "href", event.registerUrl);

    if (event.title && !event.registerUrl) {
      setText("[data-event-status]", "Details will be announced soon.");
    }
  }

  function showBadge(slug) {
    if (!isDevHost() || !document.body) return;
    var badge = document.getElementById("cms-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "cms-badge";
      badge.setAttribute(
        "style",
        "position:fixed;top:10px;right:10px;z-index:9999;background:#fff;border:1px solid rgba(107,30,30,.22);color:#6b1e1e;padding:4px 8px;border-radius:999px;font:600 12px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 4px 12px rgba(17,24,39,.06)"
      );
      document.body.appendChild(badge);
    }
    badge.textContent = "CMS: LOADED " + slug;
  }

  async function mountHydration() {
    var slug = getSlug();
    if (!slug) return;
    console.log("[CMS] slug", slug);
    try {
      var page = await fetchYamlObject(pageYamlUrl(slug));
      hydrateFromYaml(page);
      showBadge(slug);
    } catch (err) {
      console.warn("[CMS] failed", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountHydration);
  } else {
    mountHydration();
  }
})();
