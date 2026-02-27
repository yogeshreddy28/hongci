(function () {
  "use strict";

  var data = window.SITE_DATA || {};
  var community = data.community || {};
  var pillars = Array.isArray(data.pillars) ? data.pillars : [];
  var impact = data.impact || {};
  var nextEvent = data.nextEvent || {};
  var transparency = data.transparency || {};
  var assets = data.assets || {};

  function formatNumber(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return new Intl.NumberFormat().format(number);
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function setText(selector, value) {
    var el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  function setTextsFromDataAttribute(selectorPrefix, values) {
    Object.keys(values).forEach(function (key) {
      var el = document.querySelector('[' + selectorPrefix + '="' + key + '"]');
      if (el && typeof values[key] === "string") {
        el.textContent = values[key];
      }
    });
  }

  function renderPillars() {
    var grid = document.getElementById("pillars-grid");
    if (!grid) return;

    grid.innerHTML = "";

    pillars.forEach(function (pillar) {
      var card = document.createElement("article");
      card.className = "board-panel pillar-card";

      var icon = document.createElement("div");
      icon.className = "pillar-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = pillar.icon || "•";

      var title = document.createElement("h3");
      title.textContent = pillar.title || "Pillar";

      var text = document.createElement("p");
      text.className = "board-copy";
      text.textContent = pillar.text || "";

      card.appendChild(icon);
      card.appendChild(title);
      card.appendChild(text);
      grid.appendChild(card);
    });
  }

  function injectImpactCounters() {
    var keys = ["bloodUnits", "volunteers", "books", "families"];
    keys.forEach(function (key) {
      var target = document.querySelector('[data-impact="' + key + '"]');
      if (target) {
        target.textContent = formatNumber(impact[key] || 0);
      }
    });
  }

  function setupEventDetails() {
    setText("[data-event-label]", nextEvent.label || "Upcoming Event");
    setText("[data-event-title]", nextEvent.title || "Blood Donation Camp");
    setText("[data-event-location]", nextEvent.location || "Location to be announced");

    var registerLink = document.querySelector("[data-event-register]");
    if (registerLink && typeof nextEvent.registerUrl === "string" && nextEvent.registerUrl.trim()) {
      registerLink.setAttribute("href", nextEvent.registerUrl);
    }
  }

  function setCountdownValues(parts) {
    Object.keys(parts).forEach(function (name) {
      var el = document.querySelector('[data-time="' + name + '"]');
      if (el) el.textContent = pad(parts[name]);
    });
  }

  function applyOptionalImage(selector, src) {
    var nodes = document.querySelectorAll(selector);
    if (!nodes.length) return;

    nodes.forEach(function (img) {
      if (!(img instanceof HTMLImageElement)) return;

      if (typeof src !== "string" || !src.trim()) {
        img.classList.add("is-hidden");
        return;
      }

      img.addEventListener("error", function () {
        img.classList.add("is-hidden");
      });
      img.addEventListener("load", function () {
        img.classList.remove("is-hidden");
      });
      img.src = src;
    });
  }

  function setupSmoothScroll() {
    var links = document.querySelectorAll("[data-scroll-target]");
    links.forEach(function (link) {
      link.addEventListener("click", function (event) {
        var selector = link.getAttribute("data-scroll-target");
        if (!selector) return;
        var target = document.querySelector(selector);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function setupCountdown() {
    var statusEl = document.querySelector("[data-event-status]");
    var countdownEl = document.querySelector("[data-countdown]");
    var eventDate = new Date(nextEvent.startsAt);

    if (!countdownEl) return;

    if (!nextEvent.startsAt || Number.isNaN(eventDate.getTime())) {
      setCountdownValues({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      if (statusEl) statusEl.textContent = "Event date will be announced soon.";
      return;
    }

    function render() {
      var now = Date.now();
      var distance = eventDate.getTime() - now;

      if (distance <= 0) {
        setCountdownValues({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (statusEl) statusEl.textContent = "Event completed / stay tuned";
        countdownEl.classList.add("is-ended");
        return false;
      }

      var totalSeconds = Math.floor(distance / 1000);
      var days = Math.floor(totalSeconds / 86400);
      var hours = Math.floor((totalSeconds % 86400) / 3600);
      var minutes = Math.floor((totalSeconds % 3600) / 60);
      var seconds = totalSeconds % 60;

      setCountdownValues({
        days: days,
        hours: hours,
        minutes: minutes,
        seconds: seconds
      });

      if (statusEl) statusEl.textContent = "Registration open";
      countdownEl.classList.remove("is-ended");
      return true;
    }

    var active = render();
    if (!active) return;

    var timer = window.setInterval(function () {
      var keepRunning = render();
      if (!keepRunning) {
        window.clearInterval(timer);
      }
    }, 1000);
  }

  function formatCurrency(value, currencyCode) {
    if (value === null || value === undefined || value === "") return "—";
    var number = Number(value);
    if (!Number.isFinite(number)) return "—";

    if ((currencyCode || "").toUpperCase() === "INR") {
      return "\u20B9" + new Intl.NumberFormat("en-IN").format(number);
    }

    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode || "USD",
      maximumFractionDigits: 0
    }).format(number);
  }

  function formatScalar(value) {
    if (value === null || value === undefined || value === "") return "—";
    var number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return new Intl.NumberFormat().format(number);
  }

  function renderTransparencyPage() {
    var tableBody = document.querySelector("[data-transparency-table-body]");
    var lastUpdatedEl = document.querySelector("[data-transparency-last-updated]");
    if (!tableBody && !lastUpdatedEl) return;

    var monthly = Array.isArray(transparency.monthly) ? transparency.monthly : [];
    var currency = transparency.currency || "INR";

    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = transparency.lastUpdated || "—";
    }

    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (!monthly.length) {
      var emptyRow = document.createElement("tr");
      ["—", formatCurrency(0, currency), formatCurrency(0, currency), "0", "0"].forEach(function (text) {
        var cell = document.createElement("td");
        cell.textContent = text;
        emptyRow.appendChild(cell);
      });
      tableBody.appendChild(emptyRow);
    } else {
      monthly.forEach(function (item) {
        var row = document.createElement("tr");
        var cells = [
          item.month || "—",
          formatCurrency(item.donationsTotal, currency),
          formatCurrency(item.expensesTotal, currency),
          formatScalar(item.bloodUnits),
          formatScalar(item.booksDistributed)
        ];
        cells.forEach(function (text) {
          var cell = document.createElement("td");
          cell.textContent = text;
          row.appendChild(cell);
        });
        tableBody.appendChild(row);
      });
    }

    var notesWrap = document.querySelector("[data-transparency-notes-wrap]");
    var notesList = document.querySelector("[data-transparency-notes-list]");
    if (!notesWrap || !notesList) return;

    notesList.innerHTML = "";
    var notesItems = monthly.filter(function (item) {
      return item && typeof item.notes === "string" && item.notes.trim();
    });

    if (!notesItems.length) {
      notesWrap.hidden = true;
      return;
    }

    notesWrap.hidden = false;
    notesItems.forEach(function (item) {
      var li = document.createElement("li");
      var month = document.createElement("span");
      month.className = "note-month";
      month.textContent = item.month || "—";

      var text = document.createElement("span");
      text.textContent = item.notes.trim();

      li.appendChild(month);
      li.appendChild(text);
      notesList.appendChild(li);
    });
  }

  setTextsFromDataAttribute("data-community", community);
  renderPillars();
  injectImpactCounters();
  setupEventDetails();
  applyOptionalImage("[data-hero-image]", assets.heroImage);
  applyOptionalImage("[data-watermark-seal]", assets.watermarkSeal);
  setupSmoothScroll();
  setupCountdown();
  renderTransparencyPage();
})();
