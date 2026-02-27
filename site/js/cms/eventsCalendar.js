(function () {
  "use strict";

  function isDev() {
    var h = (window.location && window.location.hostname) || "";
    return h === "localhost" || h === "127.0.0.1";
  }

  function withBust(url) {
    if (!isDev()) return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "ts=" + Date.now();
  }

  function fetchJSON(url) {
    var reqUrl = withBust(url);
    console.log("[CMS][events] loading", reqUrl);
    return fetch(reqUrl, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("Failed to fetch " + url + " (" + res.status + ")");
      return res.json();
    });
  }

  function formatDateBadge(dateStr) {
    if (!dateStr) return { month: "", day: "", year: "" };
    var d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) {
      var m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) d = new Date(m[1] + "-" + m[2] + "-" + m[3] + "T00:00:00");
    }
    if (Number.isNaN(d.getTime())) return { month: "", day: "", year: "" };
    return {
      month: d.toLocaleString("en-US", { month: "short" }),
      day: String(d.getDate()).padStart(2, "0"),
      year: String(d.getFullYear())
    };
  }

  function normalizeItem(item) {
    var badge = formatDateBadge(item && item.date);
    return {
      id: item && item.id || "",
      title: item && item.title || "Untitled Event",
      location: item && item.location || "",
      description: item && item.description || "",
      registerUrl: item && item.register_url || "events.html#blood-donation-registration",
      category: item && item.category || "COMMUNITY EVENT",
      month: badge.month,
      day: badge.day,
      year: badge.year
    };
  }

  function renderCalendar(items) {
    var container = document.getElementById("event-calendar-list");
    if (!container) return;
    var template = container.querySelector("template");
    if (!template || !template.content || !template.content.firstElementChild) return;

    Array.prototype.slice.call(container.children).forEach(function (child) {
      if (child === template) return;
      child.remove();
    });

    if (!items.length) {
      var empty = document.createElement("p");
      empty.className = "admin-muted";
      empty.textContent = "No upcoming events.";
      container.appendChild(empty);
      return;
    }

    items.forEach(function (raw) {
      var item = normalizeItem(raw);
      var node = template.content.firstElementChild.cloneNode(true);
      var q = function (sel) { return node.querySelector(sel); };
      if (q("[data-bind='dateMonth']")) q("[data-bind='dateMonth']").textContent = item.month;
      if (q("[data-bind='dateDay']")) q("[data-bind='dateDay']").textContent = item.day;
      if (q("[data-bind='dateYear']")) q("[data-bind='dateYear']").textContent = item.year;
      if (q("[data-bind='typeLabel']")) q("[data-bind='typeLabel']").textContent = item.category;
      if (q("[data-bind='title']")) q("[data-bind='title']").textContent = item.title;
      if (q("[data-bind='location']")) q("[data-bind='location']").textContent = item.location;
      if (q("[data-bind='description']")) q("[data-bind='description']").textContent = item.description;
      if (q("[data-bind-href='href']")) q("[data-bind-href='href']").setAttribute("href", item.registerUrl);
      container.appendChild(node);
    });
  }

  function renderFeatured(items) {
    if (!items.length) return;
    var featured = items[0];
    var heading = document.querySelector(".featured-event-title");
    var desc = document.querySelector(".featured-event .board-copy");
    var cta = document.querySelector(".featured-event .form-actions .btn");
    var metas = document.querySelectorAll(".featured-event .featured-meta");
    var badge = formatDateBadge(featured.date);

    if (heading) heading.textContent = featured.title || heading.textContent;
    if (desc) desc.textContent = featured.description || desc.textContent;
    if (cta) cta.setAttribute("href", featured.register_url || "events.html#blood-donation-registration");
    if (metas && metas[0]) metas[0].innerHTML = "<strong>Date:</strong> " + [badge.month, badge.day + ",", badge.year].join(" ").replace(/\s+,/, ",");
    if (metas && metas[1]) metas[1].innerHTML = "<strong>Location:</strong> " + (featured.location || "");
    var kicker = document.querySelector(".featured-event .panel-kicker");
    if (kicker && featured.category) kicker.textContent = featured.category;
  }

  function sortAsc(items) {
    return items.slice().sort(function (a, b) {
      var ad = String(a && a.date || "");
      var bd = String(b && b.date || "");
      if (ad !== bd) return ad.localeCompare(bd);
      return String(a && a.title || "").localeCompare(String(b && b.title || ""));
    });
  }

  function run() {
    if (!(document.body && document.body.dataset && document.body.dataset.page === "events")) return;
    fetchJSON("/content/events/index.json")
      .then(function (data) {
        var items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
        var sorted = sortAsc(items);
        renderFeatured(sorted);
        renderCalendar(sorted);
      })
      .catch(function (err) {
        console.warn("[CMS][events] failed", err);
        renderCalendar([]);
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
