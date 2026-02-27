(function () {
  "use strict";

  var API_BASE = "http://localhost:5050/api";
  var API_INDEX_URL = API_BASE + "/events/index";
  var selectedEvent = null;
  var eventsCache = [];

  function isEventsPage() {
    return document.body && document.body.dataset && document.body.dataset.page === "events";
  }

  function isDev() {
    var h = (window.location && window.location.hostname) || "";
    return h === "localhost" || h === "127.0.0.1";
  }

  function withBust(url) {
    if (!isDev()) return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "ts=" + Date.now();
  }

  function fetchJSON(url) {
    return fetch(withBust(url), { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("Failed to fetch " + url + " (" + res.status + ")");
      return res.json();
    });
  }

  function loadEvents() {
    return fetchJSON(API_INDEX_URL)
      .catch(function (apiErr) {
        console.warn("[eventsMount] API index failed, fallback static json", apiErr);
        return fetchJSON("/content/events/index.json");
      })
      .then(function (data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.items)) return data.items;
        return [];
      });
  }

  function toDateObj(v) {
    if (!v) return null;
    var d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
    var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    d = new Date(m[1] + "-" + m[2] + "-" + m[3] + "T00:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function formatDateBadge(v) {
    var d = toDateObj(v);
    if (!d) return { month: "", day: "", year: "" };
    return {
      month: d.toLocaleString("en-US", { month: "short" }),
      day: String(d.getDate()).padStart(2, "0"),
      year: String(d.getFullYear())
    };
  }

  function plainDescription(item) {
    return String(item.description_md || item.description || "")
      .replace(/[*_`#>-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeEvent(item) {
    var dt = item.start_datetime || item.startDateTime || item.date || "";
    var badge = formatDateBadge(dt);
    return {
      id: item.id || "",
      title: item.title || "Untitled Event",
      start_datetime: dt,
      end_datetime: item.end_datetime || item.endDateTime || "",
      location: item.location || "",
      description: plainDescription(item),
      register_url: item.register_url || item.registerUrl || "",
      status: item.status || "upcoming",
      featured: !!item.featured,
      category: item.category || item.typeLabel || "COMMUNITY EVENT",
      form: item.form && typeof item.form === "object" ? item.form : null,
      dateMonth: badge.month,
      dateDay: badge.day,
      dateYear: badge.year
    };
  }

  function sortEvents(items) {
    return items.slice().sort(function (a, b) {
      var as = String(a.status || "upcoming");
      var bs = String(b.status || "upcoming");
      var aPast = as === "past";
      var bPast = bs === "past";
      if (aPast !== bPast) return aPast ? 1 : -1;
      if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
      var ad = String(a.start_datetime || "");
      var bd = String(b.start_datetime || "");
      if (!aPast) return ad.localeCompare(bd);
      return bd.localeCompare(ad);
    });
  }

  function getVisibleEvents(items) {
    return items.filter(function (e) { return String(e.status || "upcoming") !== "cancelled"; });
  }

  function getUpcomingEvents(items) {
    return items.filter(function (e) { return String(e.status || "upcoming") !== "past" && String(e.status || "upcoming") !== "cancelled"; });
  }

  function renderFeatured(items) {
    if (!items.length) return;
    var featured = items.find(function (e) { return e.featured; }) || items[0];
    var heading = document.querySelector(".featured-event-title");
    var desc = document.querySelector(".featured-event .board-copy");
    var cta = document.querySelector(".featured-event .form-actions .btn");
    var metas = document.querySelectorAll(".featured-event .featured-meta");
    var kicker = document.querySelector(".featured-event .panel-kicker");
    var badge = formatDateBadge(featured.start_datetime);
    if (heading) heading.textContent = featured.title;
    if (desc) desc.textContent = featured.description || desc.textContent;
    if (cta) {
      cta.setAttribute("href", featured.register_url || "#event-registration");
      cta.setAttribute("data-event-select", featured.id || "");
    }
    if (metas && metas[0]) metas[0].innerHTML = "<strong>Date:</strong> " + [badge.month, badge.day + ",", badge.year].join(" ").replace(/\s+,/, ",");
    if (metas && metas[1]) metas[1].innerHTML = "<strong>Location:</strong> " + (featured.location || "");
    if (kicker) kicker.textContent = featured.category;
  }

  function renderCalendar(items) {
    var container = document.getElementById("event-calendar-list");
    if (!container) return;
    var template = container.querySelector("template");
    var templateNode = template && template.content && template.content.firstElementChild;
    Array.prototype.slice.call(container.children).forEach(function (child) {
      if (child === template) return;
      child.remove();
    });
    if (!templateNode) return;

    if (!items.length) {
      var p = document.createElement("p");
      p.className = "admin-muted";
      p.textContent = "No upcoming events.";
      container.appendChild(p);
      return;
    }

    items.forEach(function (event) {
      var node = templateNode.cloneNode(true);
      var q = function (sel) { return node.querySelector(sel); };
      if (q("[data-bind='dateMonth']")) q("[data-bind='dateMonth']").textContent = event.dateMonth;
      if (q("[data-bind='dateDay']")) q("[data-bind='dateDay']").textContent = event.dateDay;
      if (q("[data-bind='dateYear']")) q("[data-bind='dateYear']").textContent = event.dateYear;
      if (q("[data-bind='typeLabel']")) q("[data-bind='typeLabel']").textContent = event.category;
      if (q("[data-bind='title']")) q("[data-bind='title']").textContent = event.title;
      if (q("[data-bind='location']")) q("[data-bind='location']").textContent = event.location;
      if (q("[data-bind='description']")) q("[data-bind='description']").textContent = event.description;
      var a = q("[data-bind-href='href']");
      if (a) {
        a.setAttribute("href", event.register_url || "#event-registration");
        a.setAttribute("data-event-select", event.id || "");
      }
      container.appendChild(node);
    });
  }

  function findEventById(id) {
    for (var i = 0; i < eventsCache.length; i += 1) {
      if (eventsCache[i].id === id) return eventsCache[i];
    }
    return null;
  }

  function renderSelectedEventForm(eventItem) {
    var section = document.getElementById("event-registration");
    var heading = document.getElementById("event-registration-title");
    var meta = document.getElementById("event-registration-meta");
    var mount = document.getElementById("event-registration-form");
    if (!section || !heading || !mount) return;
    selectedEvent = eventItem || null;

    if (eventItem && eventItem.form && eventItem.form.title) heading.textContent = eventItem.form.title;
    else if (eventItem && eventItem.title) heading.textContent = eventItem.title + " Registration";

    if (!eventItem || !eventItem.form || !eventItem.form.enabled) {
      if (meta) {
        meta.textContent = eventItem ? ((eventItem.location ? eventItem.location + " • " : "") + (eventItem.description || "")) : "Select an event to register.";
      }
      mount.innerHTML = '<div class="notice-form"><p class="status-message">Registration not available for this event.</p></div>';
      return;
    }

    if (meta) {
      var parts = [];
      if (eventItem.start_datetime) {
        var d = toDateObj(eventItem.start_datetime);
        parts.push(d ? d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric" }) : eventItem.start_datetime);
      }
      if (eventItem.location) parts.push(eventItem.location);
      if (eventItem.description) parts.push(eventItem.description);
      meta.textContent = parts.join(" • ");
    }
    if (window.EventFormRenderer && typeof window.EventFormRenderer.renderForm === "function") {
      window.EventFormRenderer.renderForm(mount, eventItem, API_BASE + "/forms/submit");
    } else {
      mount.innerHTML = '<p class="status-message">Form renderer unavailable.</p>';
    }
  }

  function bindRegisterClicks() {
    var root = document.querySelector("main.notice-board");
    if (!root || root.__eventsRegisterBound) return;
    root.__eventsRegisterBound = true;
    root.addEventListener("click", function (event) {
      var link = event.target.closest("[data-event-select]");
      if (!link) return;
      var id = link.getAttribute("data-event-select");
      var ev = findEventById(id);
      if (!ev) return;
      event.preventDefault();
      renderSelectedEventForm(ev);
      var target = document.getElementById("event-registration");
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function run() {
    if (!isEventsPage()) return;
    bindRegisterClicks();
    loadEvents().then(function (items) {
      var normalized = sortEvents(items.map(normalizeEvent));
      eventsCache = normalized;
      var visible = getVisibleEvents(normalized);
      var upcoming = getUpcomingEvents(normalized);
      renderFeatured(upcoming.length ? upcoming : visible);
      renderCalendar(visible);
      var initial = (upcoming.find(function (e) { return e.featured; }) || upcoming[0] || visible.find(function (e) { return e.featured; }) || visible[0] || null);
      if (initial) renderSelectedEventForm(initial);
    }).catch(function (err) {
      console.warn("[eventsMount] failed", err);
      renderCalendar([]);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
