(function () {
  "use strict";

  function normalizePath(path) {
    var raw = String(path || "");
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.charAt(0) !== "/") return "/" + raw.replace(/^\/+/, "");
    return raw;
  }

  function withCacheBust(url) {
    var host = window.location && window.location.hostname || "";
    var isDev = host === "localhost" || host === "127.0.0.1";
    if (!isDev) return url;
    var sep = url.indexOf("?") === -1 ? "?" : "&";
    return url + sep + "t=" + Date.now();
  }

  async function fetchText(path) {
    var url = normalizePath(path);
    var requestUrl = withCacheBust(url);
    console.log("[CMS] loading", requestUrl);
    var response = await fetch(requestUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch " + url + ": " + response.status);
    return response.text();
  }

  async function fetchJSON(path) {
    var text = await fetchText(path);
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error("JSON parse error for " + normalizePath(path) + ": " + (error && error.message ? error.message : "Invalid JSON") + " | " + text.slice(0, 200));
    }
  }

  async function fetchYAML(path) {
    if (!window.jsyaml) throw new Error("js-yaml not loaded");
    var text = await fetchText(path);
    try {
      return window.jsyaml.load(text);
    } catch (error) {
      throw new Error("YAML parse error for " + normalizePath(path) + ": " + (error && error.message ? error.message : "Invalid YAML") + " | " + text.slice(0, 200));
    }
  }

  async function fetchKnownPage(slug) {
    return fetchYAML("/content/pages/" + slug + ".yml");
  }

  async function fetchIndex() {
    return fetchJSON("/content/index.json");
  }

  async function fetchCollectionItems(collectionName) {
    var index = await fetchIndex();
    var ids = Array.isArray(index[collectionName]) ? index[collectionName] : [];
    var folder = "/content/" + collectionName + "/";
    var results = await Promise.all(
      ids.map(function (entry) {
        var p = String(entry || "");
        var path = /\.ya?ml$/i.test(p) ? (p.charAt(0) === "/" ? p : "/" + p.replace(/^\/+/, "")) : (folder + p + ".yml");
        return fetchYAML(path).catch(function (err) {
          console.warn("[CMS] failed", err);
          return null;
        });
      })
    );
    return results.filter(Boolean);
  }

  async function fetchSettings() {
    return fetchYAML("/content/settings.yml");
  }

  window.CMSContentLoader = {
    fetchText: fetchText,
    fetchJSON: fetchJSON,
    fetchYAML: fetchYAML,
    fetchKnownPage: fetchKnownPage,
    fetchIndex: fetchIndex,
    fetchCollectionItems: fetchCollectionItems,
    fetchSettings: fetchSettings
  };
})();
