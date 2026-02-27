(function () {
  "use strict";

  function isDev() {
    var h = (window.location && window.location.hostname) || "";
    return h === "localhost" || h === "127.0.0.1";
  }

  function withCacheBust(url) {
    if (!isDev()) return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "v=" + Date.now();
  }

  async function fetchJSON(url) {
    var reqUrl = withCacheBust(url);
    console.log("[CMS] loading", reqUrl);
    var res = await fetch(reqUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch " + url + " (" + res.status + ")");
    return res.json();
  }

  function getSlug() {
    return document.body && document.body.dataset ? String(document.body.dataset.page || "").trim() : "";
  }

  function getByPath(root, pathExpr) {
    if (!pathExpr) return root;
    var normalized = String(pathExpr).replace(/\[(\d+)\]/g, ".$1");
    var parts = normalized.split(".");
    var cur = root;
    for (var i = 0; i < parts.length; i += 1) {
      var part = parts[i];
      if (!part) continue;
      if (cur == null) return undefined;
      if (Array.isArray(cur) && /^\d+$/.test(part)) {
        cur = cur[Number(part)];
      } else {
        cur = cur[part];
      }
    }
    return cur;
  }

  function setBindings(root, item) {
    root.querySelectorAll("[data-bind],[data-bind-text]").forEach(function (el) {
      var pathExpr = el.getAttribute("data-bind") || el.getAttribute("data-bind-text");
      var value = getByPath(item, pathExpr);
      if (value === undefined) return;
      el.textContent = value == null ? "" : String(value);
    });
    root.querySelectorAll("[data-bind-href]").forEach(function (el) {
      var value = getByPath(item, el.getAttribute("data-bind-href"));
      if (value === undefined) return;
      el.setAttribute("href", value == null ? "" : String(value));
    });
    root.querySelectorAll("[data-bind-src]").forEach(function (el) {
      var value = getByPath(item, el.getAttribute("data-bind-src"));
      if (value === undefined) return;
      el.setAttribute("src", value == null ? "" : String(value));
      if (el.tagName === "IMG") {
        var hasSrc = !!String(value == null ? "" : value).trim();
        var wrap = el.closest(".book-card-media");
        if (wrap) wrap.style.display = hasSrc ? "" : "none";
      }
    });
    root.querySelectorAll("[data-bind-attr]").forEach(function (el) {
      var expr = el.getAttribute("data-bind-attr");
      if (!expr) return;
      var idx = expr.lastIndexOf(":");
      if (idx <= 0) return;
      var pathExpr = expr.slice(0, idx);
      var attrName = expr.slice(idx + 1);
      var value = getByPath(item, pathExpr);
      if (value === undefined) return;
      el.setAttribute(attrName, value == null ? "" : String(value));
    });
    root.querySelectorAll("[data-bind-html]").forEach(function (el) {
      var value = getByPath(item, el.getAttribute("data-bind-html"));
      if (value === undefined) return;
      el.innerHTML = value == null ? "" : String(value);
    });
  }

  function renderRepeater(container, items) {
    if (!container || !Array.isArray(items)) return;
    var tpl = container.querySelector("template");
    if (!tpl || !tpl.content || !tpl.content.firstElementChild) return;
    Array.prototype.slice.call(container.children).forEach(function (child) {
      if (child === tpl) return;
      child.remove();
    });
    items.forEach(function (item) {
      var node = tpl.content.firstElementChild.cloneNode(true);
      setBindings(node, item || {});
      container.appendChild(node);
    });
  }

  function formatDateParts(input) {
    if (!input) return { month: "", day: "", year: "" };
    var d = new Date(input);
    if (Number.isNaN(d.getTime())) {
      var m = String(input).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) return { month: "", day: "", year: "" };
      d = new Date(m[1] + "-" + m[2] + "-" + m[3] + "T00:00:00Z");
    }
    return {
      month: d.toLocaleString("en-US", { month: "short" }),
      day: String(d.getDate()).padStart(2, "0"),
      year: String(d.getFullYear())
    };
  }

  function enrichEvents(items) {
    return (items || []).map(function (e) {
      var parts = formatDateParts(e.start_datetime || e.date);
      return {
        id: e.id || "",
        title: e.title || "",
        location: e.location || "",
        description: e.excerpt || e.description_md || e.description || "",
        href: e.register_url || e.registerUrl || "events.html",
        typeLabel: e.typeLabel || "Community Event",
        dateMonth: parts.month,
        dateDay: parts.day,
        dateYear: parts.year
      };
    });
  }

  function enrichBooks(items) {
    return (items || []).map(function (b) {
      var availableCount = b.available_count != null ? b.available_count : (b.availableCount != null ? b.availableCount : null);
      var sponsorAmount = b.sponsor_suggested_amount != null ? b.sponsor_suggested_amount : (b.sponsorSuggestedAmount != null ? b.sponsorSuggestedAmount : null);
      var badge = b.badge || b.status || (availableCount === 0 ? "Out of Stock" : "Limited");
      var requestHref = b.href || b.request_url || "books.html#request-book-form";
      return {
        title: b.title || "",
        description: b.description || "",
        coverImage: b.cover_image || b.coverImage || "",
        coverAlt: (b.title || "Book") + " cover",
        href: requestHref,
        requestLabel: "Request",
        badge: badge,
        availableText: (availableCount != null) ? ("Available: " + availableCount) : "",
        sponsorText: (sponsorAmount != null && sponsorAmount !== "") ? ("Suggested Sponsorship: ₹" + Number(sponsorAmount).toLocaleString("en-IN")) : ""
      };
    });
  }

  function enrichReports(items) {
    return (items || []).map(function (r) {
      return {
        month: r.month || "—",
        donations: "\u20B9" + Number(r.donations_received_total || 0).toLocaleString("en-IN"),
        expenses: "\u20B9" + Number(r.expenses_used_total || 0).toLocaleString("en-IN"),
        bloodUnits: String(Number(r.blood_units_collected || 0)),
        booksDistributed: String(Number(r.books_distributed || 0)),
        notes: r.notes_md || ""
      };
    });
  }

  async function run() {
    var slug = getSlug();
    if (!slug) return;

    try {
      if (slug === "events") {
        // Events page calendar is handled by dedicated static consumer hydrator (eventsCalendar.js).
      }

      if (slug === "book-seva") {
        var booksIndex = await fetchJSON("/content/books/index.json");
        var bookItems = enrichBooks(Array.isArray(booksIndex.items) ? booksIndex.items : []);
        if (bookItems.length) {
          renderRepeater(document.querySelector('[data-repeat="collections.books"]'), bookItems);
        }
        var select = document.getElementById("request-book");
        if (select && bookItems.length) {
          var firstOption = select.querySelector('option[value=""]');
          select.innerHTML = "";
          if (firstOption) select.appendChild(firstOption);
          bookItems.forEach(function (book) {
            var opt = document.createElement("option");
            opt.value = book.title || "";
            opt.textContent = book.title || "";
            select.appendChild(opt);
          });
        }
      }

      if (slug === "transparency") {
        var reportsIndex = await fetchJSON("/content/reports/index.json");
        var reportItems = enrichReports(Array.isArray(reportsIndex.items) ? reportsIndex.items : []);
        if (reportItems.length) {
          renderRepeater(document.querySelector('[data-repeat="collections.reports"]'), reportItems);
        }

        var lastUpdatedEl = document.querySelector("[data-transparency-last-updated]");
        if (lastUpdatedEl && reportsIndex.lastUpdated) {
          lastUpdatedEl.textContent = String(reportsIndex.lastUpdated);
        }

        var notesWrap = document.querySelector("[data-transparency-notes-wrap]");
        var notesList = document.querySelector('[data-repeat="collections.reportNotes"]');
        var reportNotesItems = reportItems
          .filter(function (r) { return r.notes && String(r.notes).trim(); })
          .map(function (r) { return { month: r.month, text: r.notes }; });

        var pageData = window.__CMS_PAGE_DATA || {};
        var pageSections = Array.isArray(pageData.sections) ? pageData.sections : [];
        var pageReportsSection = pageSections.find(function (s) {
          return s && String(s.id || "") === "reports";
        }) || {};
        var pageNotesItems = Array.isArray(pageReportsSection.items)
          ? pageReportsSection.items
              .filter(function (item) {
                return item && ((item.text && String(item.text).trim()) || (item.title && String(item.title).trim()));
              })
              .map(function (item, idx) {
                return {
                  month: item.title || ("Note " + (idx + 1)),
                  text: item.text || ""
                };
              })
          : [];

        var notesItems = pageNotesItems.concat(reportNotesItems);
        if (notesItems.length && notesList) {
          renderRepeater(notesList, notesItems);
          if (notesWrap) notesWrap.hidden = false;
        } else if (notesWrap) {
          notesWrap.hidden = true;
        }
      }
    } catch (err) {
      console.warn("[CMS] collection hydration failed", err);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
