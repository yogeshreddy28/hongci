(function () {
  "use strict";

  var API_BASE = "http://localhost:5050/api";
  var selectedEvent = null;
  var eventsCache = [];
  var cssEscape = (window.CSS && window.CSS.escape) ? window.CSS.escape.bind(window.CSS) : function (s) {
    return String(s).replace(/[^a-zA-Z0-9_-]/g, function (ch) { return "\\" + ch; });
  };

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

  function fetchEvents() {
    return fetchJSON(API_BASE + "/events?full=1")
      .then(function (data) {
        var items = Array.isArray(data && data.items) ? data.items : [];
        return items;
      })
      .catch(function (apiErr) {
        console.warn("[eventsCalendar] API fetch failed, falling back to static index", apiErr);
        return fetchJSON("/content/events/index.json").then(function (data) {
          if (Array.isArray(data)) return data.map(function (item) {
            return {
              id: item.id,
              title: item.title,
              start_datetime: item.date,
              location: item.location,
              description_md: item.description,
              register_url: item.register_url,
              status: "upcoming",
              featured: false,
              category: item.category
            };
          });
          if (data && Array.isArray(data.items)) return data.items;
          return [];
        });
      });
  }

  function toDateObj(v) {
    if (!v) return null;
    var d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
    var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      d = new Date(m[1] + "-" + m[2] + "-" + m[3] + "T00:00:00");
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
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
    var s = String(item.description_md || item.description || "");
    return s.replace(/[*_`#>-]/g, "").replace(/\s+/g, " ").trim();
  }

  function normalizeEvent(item) {
    var badge = formatDateBadge(item.start_datetime || item.date);
    return {
      id: item.id || "",
      title: item.title || "Untitled Event",
      start_datetime: item.start_datetime || item.date || "",
      location: item.location || "",
      description: plainDescription(item),
      status: item.status || "upcoming",
      featured: !!item.featured,
      registerUrl: item.register_url || item.registerUrl || "",
      category: item.category || "COMMUNITY EVENT",
      form: item.form && typeof item.form === "object" ? item.form : null,
      dateMonth: badge.month,
      dateDay: badge.day,
      dateYear: badge.year
    };
  }

  function sortEvents(items) {
    return items.slice().sort(function (a, b) {
      var ad = String(a.start_datetime || a.date || "");
      var bd = String(b.start_datetime || b.date || "");
      if (ad !== bd) return ad.localeCompare(bd);
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }

  function getUpcoming(items) {
    return items.filter(function (it) { return String(it.status || "upcoming") !== "past" && String(it.status || "upcoming") !== "cancelled"; });
  }

  function renderFeatured(items) {
    if (!items.length) return;
    var featured = items.filter(function (e) { return e.featured; })[0] || items[0];
    var heading = document.querySelector(".featured-event-title");
    var desc = document.querySelector(".featured-event .board-copy");
    var cta = document.querySelector(".featured-event .form-actions .btn");
    var metas = document.querySelectorAll(".featured-event .featured-meta");
    var kicker = document.querySelector(".featured-event .panel-kicker");
    var badge = formatDateBadge(featured.start_datetime);
    if (heading) heading.textContent = featured.title || heading.textContent;
    if (desc) desc.textContent = featured.description || desc.textContent;
    if (cta) {
      cta.setAttribute("href", featured.registerUrl || "#blood-donation-registration");
      cta.setAttribute("data-event-select", featured.id || "");
    }
    if (metas && metas[0]) metas[0].innerHTML = "<strong>Date:</strong> " + [badge.month, badge.day + ",", badge.year].join(" ").replace(/\s+,/, ",");
    if (metas && metas[1]) metas[1].innerHTML = "<strong>Location:</strong> " + (featured.location || "");
    if (kicker && featured.category) kicker.textContent = featured.category;
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
      var empty = document.createElement("p");
      empty.className = "admin-muted";
      empty.textContent = "No upcoming events.";
      container.appendChild(empty);
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
        a.setAttribute("href", event.registerUrl || "#blood-donation-registration");
        a.setAttribute("data-event-select", event.id || "");
      }
      container.appendChild(node);
    });
  }

  function findEventById(id) {
    for (var i = 0; i < eventsCache.length; i += 1) if (eventsCache[i].id === id) return eventsCache[i];
    return null;
  }

  function fieldInputHtml(field) {
    var id = "evf_" + field.id;
    var req = field.required ? " required" : "";
    var ph = field.placeholder ? ' placeholder="' + String(field.placeholder).replace(/"/g, "&quot;") + '"' : "";
    if (field.type === "long_text") return '<textarea id="' + id + '" name="' + field.id + '" rows="4"' + req + ph + '></textarea>';
    if (field.type === "number") return '<input id="' + id + '" name="' + field.id + '" type="number"' + req + ph + '>';
    if (field.type === "phone") return '<input id="' + id + '" name="' + field.id + '" type="tel"' + req + ph + '>';
    if (field.type === "email") return '<input id="' + id + '" name="' + field.id + '" type="email"' + req + ph + '>';
    if (field.type === "date") return '<input id="' + id + '" name="' + field.id + '" type="date"' + req + '>';
    if (field.type === "time") return '<input id="' + id + '" name="' + field.id + '" type="time"' + req + '>';
    if (field.type === "dropdown") {
      var opts = ['<option value="">Select</option>'].concat((field.options || []).map(function (opt) { return '<option>' + String(opt).replace(/</g, "&lt;") + '</option>'; })).join("");
      return '<select id="' + id + '" name="' + field.id + '"' + req + '>' + opts + '</select>';
    }
    if (field.type === "radio") {
      return '<div class="event-dyn-options">' + (field.options || []).map(function (opt, idx) {
        var rid = id + '_' + idx;
        return '<label for="' + rid + '"><input id="' + rid + '" type="radio" name="' + field.id + '" value="' + String(opt).replace(/"/g, "&quot;") + '"' + req + '> ' + String(opt).replace(/</g, "&lt;") + '</label>';
      }).join("") + '</div>';
    }
    if (field.type === "checkbox") {
      return '<div class="event-dyn-options">' + (field.options || []).map(function (opt, idx) {
        var cid = id + '_' + idx;
        return '<label for="' + cid + '"><input id="' + cid + '" type="checkbox" name="' + field.id + '" value="' + String(opt).replace(/"/g, "&quot;") + '"> ' + String(opt).replace(/</g, "&lt;") + '</label>';
      }).join("") + '</div>';
    }
    return '<input id="' + id + '" name="' + field.id + '" type="text"' + req + ph + '>';
  }

  function renderEventForm(event) {
    var form = document.getElementById("blood-donation-form");
    if (!form) return;
    var grid = form.querySelector(".form-grid");
    var statusEl = document.getElementById("blood-form-status");
    var submitBtn = form.querySelector('.form-actions .btn-primary');
    var secondaryBtn = form.querySelector('.form-actions .btn-secondary');
    var heading = document.getElementById("registration-form");
    if (heading && event) heading.textContent = (event.form && event.form.title) || (event.title ? (event.title + " Registration") : heading.textContent);

    if (!event || !event.form || !event.form.enabled) {
      selectedEvent = event || null;
      if (grid) {
        grid.innerHTML = '<div class="form-field form-field-full"><p class="board-copy">Registration not available for this event.</p></div>';
      }
      if (submitBtn) {
        submitBtn.textContent = "Registration Unavailable";
        submitBtn.disabled = true;
      }
      if (secondaryBtn) secondaryBtn.style.display = "none";
      if (statusEl) statusEl.textContent = event ? "Please contact organizers for registration." : "Select an event to register.";
      form.setAttribute("data-dynamic-event-id", event && event.id ? event.id : "");
      form.setAttribute("data-dynamic-enabled", "0");
      return;
    }

    selectedEvent = event;
    if (grid) {
      var html = '<input type="hidden" name="__eventId" value="' + String(event.id).replace(/"/g, "&quot;") + '">';
      (event.form.fields || []).forEach(function (field) {
        html += '<div class="form-field' + ((field.type === "long_text" || field.type === "dropdown" || field.type === "radio" || field.type === "checkbox") ? ' form-field-full' : '') + '">' +
          '<label for="evf_' + field.id + '">' + (field.label || field.id) + (field.required ? ' *' : '') + '</label>' +
          fieldInputHtml(field) +
          '</div>';
      });
      grid.innerHTML = html;
    }
    if (submitBtn) {
      submitBtn.textContent = "Submit Registration";
      submitBtn.disabled = false;
    }
    if (secondaryBtn) secondaryBtn.style.display = "";
    if (statusEl) statusEl.textContent = "Selected: " + event.title;
    form.setAttribute("data-dynamic-event-id", event.id);
    form.setAttribute("data-dynamic-enabled", "1");
  }

  function collectAnswers(form, event) {
    var answers = {};
    var errors = [];
    (event.form.fields || []).forEach(function (field) {
      var nodes = form.querySelectorAll('[name="' + cssEscape(field.id) + '"]');
      if (!nodes || !nodes.length) {
        if (field.required) errors.push(field.label + " is required.");
        return;
      }
      var value;
      if (field.type === "checkbox") {
        value = Array.prototype.slice.call(nodes).filter(function (n) { return n.checked; }).map(function (n) { return n.value; });
      } else if (field.type === "radio") {
        var checked = Array.prototype.slice.call(nodes).find(function (n) { return n.checked; });
        value = checked ? checked.value : "";
      } else {
        value = nodes[0].value;
      }
      if (field.required) {
        var empty = (Array.isArray(value) ? value.length === 0 : String(value || "").trim() === "");
        if (empty) errors.push(field.label + " is required.");
      }
      answers[field.id] = value;
    });
    return { answers: answers, errors: errors };
  }

  function bindRegisterClicks() {
    var root = document.querySelector("main.notice-board");
    if (!root || root.__eventsRegisterBound) return;
    root.__eventsRegisterBound = true;
    root.addEventListener("click", function (event) {
      var link = event.target.closest('[data-event-select]');
      if (!link) return;
      var id = link.getAttribute("data-event-select");
      var ev = findEventById(id);
      if (!ev) return;
      event.preventDefault();
      renderEventForm(ev);
      var target = document.getElementById("blood-donation-registration");
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function bindDynamicSubmit() {
    var form = document.getElementById("blood-donation-form");
    if (!form || form.__dynamicSubmitBound) return;
    form.__dynamicSubmitBound = true;
    form.addEventListener("submit", function (event) {
      var enabled = form.getAttribute("data-dynamic-enabled") === "1";
      var eventId = form.getAttribute("data-dynamic-event-id") || "";
      if (!enabled || !eventId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      var current = findEventById(eventId);
      if (!current || !current.form || !current.form.enabled) return;
      var statusEl = document.getElementById("blood-form-status");
      var result = collectAnswers(form, current);
      if (result.errors.length) {
        if (statusEl) statusEl.textContent = result.errors[0];
        return;
      }
      if (statusEl) statusEl.textContent = "Submitting...";
      fetch(API_BASE + "/events/" + encodeURIComponent(eventId) + "/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: eventId, submittedAt: new Date().toISOString(), answers: result.answers })
      }).then(function (res) {
        return res.text().then(function (text) {
          var data = {};
          try { data = text ? JSON.parse(text) : {}; } catch (_e) { data = {}; }
          if (!res.ok) throw new Error((data && data.error) || ("HTTP " + res.status));
          return data;
        });
      }).then(function () {
        if (statusEl) statusEl.textContent = "Registration submitted successfully.";
        form.reset();
        renderEventForm(current);
      }).catch(function (err) {
        if (statusEl) statusEl.textContent = err.message || "Submission failed.";
      });
    }, true);
  }

  function run() {
    if (!isEventsPage()) return;
    bindRegisterClicks();
    bindDynamicSubmit();
    fetchEvents().then(function (items) {
      var normalized = sortEvents(items.map(normalizeEvent));
      var upcoming = getUpcoming(normalized);
      eventsCache = normalized;
      renderFeatured(upcoming.length ? upcoming : normalized);
      renderCalendar(upcoming);
      if (upcoming.length) {
        var initial = upcoming.filter(function (e) { return e.featured; })[0] || upcoming[0];
        renderEventForm(initial);
      }
    }).catch(function (err) {
      console.warn("[eventsCalendar] failed", err);
      renderCalendar([]);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
