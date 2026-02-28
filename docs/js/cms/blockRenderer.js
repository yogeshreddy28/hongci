(function () {
  "use strict";

  function escapeHTML(input) {
    return String(input == null ? "" : input)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function markdownToBasicHTML(markdown) {
    var text = String(markdown || "").replace(/\r\n/g, "\n");
    var lines = text.split("\n");
    var html = [];
    var inList = false;

    function closeList() {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
    }

    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) {
        closeList();
        return;
      }

      if (/^###\s+/.test(line)) {
        closeList();
        html.push("<h3>" + escapeHTML(line.replace(/^###\s+/, "")) + "</h3>");
        return;
      }
      if (/^##\s+/.test(line)) {
        closeList();
        html.push("<h2>" + escapeHTML(line.replace(/^##\s+/, "")) + "</h2>");
        return;
      }
      if (/^#\s+/.test(line)) {
        closeList();
        html.push("<h1>" + escapeHTML(line.replace(/^#\s+/, "")) + "</h1>");
        return;
      }

      if (/^[-*]\s+/.test(line)) {
        if (!inList) {
          html.push("<ul>");
          inList = true;
        }
        html.push("<li>" + escapeHTML(line.replace(/^[-*]\s+/, "")) + "</li>");
        return;
      }

      closeList();
      html.push("<p>" + escapeHTML(line) + "</p>");
    });

    closeList();
    return html.join("");
  }

  function renderDivider(block) {
    var spacing = block && block.spacing ? String(block.spacing) : "md";
    var size = spacing === "sm" ? "0.2rem" : spacing === "lg" ? "1rem" : "0.5rem";
    return '<div class="divider" aria-hidden="true" style="margin:' + size + ' 0;"></div>';
  }

  function renderHero(block) {
    if (!block) return "";
    var primary = block.primary_cta || {};
    var secondary = block.secondary_cta || {};
    var heading = block.heading || block.title || "";
    var subheading = block.subheading || block.subtitle || "";
    return [
      '<section class="report-section cms-block cms-hero-block">',
      '<p class="section-label">Content Block</p>',
      '<h2 class="page-title" style="font-size:clamp(1.6rem,3vw,2.2rem)">' + escapeHTML(heading) + "</h2>",
      subheading ? '<p class="report-intro">' + escapeHTML(subheading) + "</p>" : "",
      '<div class="form-actions">',
      primary.label ? '<a class="btn btn-primary" href="' + escapeHTML(primary.href || "#") + '">' + escapeHTML(primary.label) + "</a>" : "",
      secondary.label ? '<a class="btn btn-secondary" href="' + escapeHTML(secondary.href || "#") + '">' + escapeHTML(secondary.label) + "</a>" : "",
      "</div>",
      "</section>"
    ].join("");
  }

  function renderRichText(block) {
    var heading = block && (block.title || block.heading);
    var body = block && (block.markdown || block.body);
    return '<section class="report-section cms-block">' +
      (heading ? ('<h2>' + escapeHTML(heading) + '</h2>') : '') +
      '<div class="cms-richtext">' + markdownToBasicHTML(body) + "</div></section>";
  }

  function renderQuote(block) {
    if (!block) return "";
    return [
      '<section class="report-section cms-block">',
      '<div class="note-box">',
      '<p style="font-family: var(--font-display); font-size:1.05rem;">“' + escapeHTML(block.text || "") + '”</p>',
      (block.author || block.source)
        ? '<p class="note-line">' + [block.author, block.source].filter(Boolean).map(escapeHTML).join(" • ") + "</p>"
        : "",
      "</div>",
      "</section>"
    ].join("");
  }

  function renderCardGrid(block) {
    var cards = Array.isArray(block && block.cards) ? block.cards : [];
    var cardsHTML = cards.map(function (card) {
      return [
        '<article class="mini-event-card">',
        card.title ? '<p class="panel-kicker">' + escapeHTML(card.title) + "</p>" : "",
        card.description ? '<p class="board-copy">' + escapeHTML(card.description) + "</p>" : "",
        card.cta_label ? '<a class="btn btn-secondary" href="' + escapeHTML(card.cta_href || "#") + '">' + escapeHTML(card.cta_label) + "</a>" : "",
        "</article>"
      ].join("");
    }).join("");

    return [
      '<section class="report-section cms-block">',
      block && block.heading ? '<h2>' + escapeHTML(block.heading) + "</h2>" : "",
      '<div class="mini-events-grid">' + cardsHTML + "</div>",
      "</section>"
    ].join("");
  }

  function renderMetrics(block) {
    var items = Array.isArray(block && block.items) ? block.items : [];
    var itemsHTML = items.map(function (item) {
      return '<article class="impact-stat"><p class="impact-value">' + escapeHTML(item.value || "0") + '</p><p class="impact-label">' + escapeHTML(item.label || "") + "</p></article>";
    }).join("");
    return '<section class="report-section cms-block"><div class="impact-strip">' + itemsHTML + "</div></section>";
  }

  async function renderBookList(block, loader) {
    var books = await loader.fetchCollectionItems("books").catch(function () { return []; });
    var maxItems = Number(block && (block.max_items != null ? block.max_items : block.limit));
    if (!Number.isFinite(maxItems) || maxItems <= 0) maxItems = 4;
    var categoryFilter = block && block.category ? String(block.category) : "";
    var ctaLabel = (block && (block.cta_label || block.ctaLabel)) || "";
    var ctaHref = (block && (block.cta_href || block.ctaHref)) || "#request-book-form";

    var filtered = books.filter(function (item) {
      if (!categoryFilter || categoryFilter === "all") return true;
      return String(item.category || "").toLowerCase() === categoryFilter.toLowerCase();
    }).slice(0, maxItems);

    if (!filtered.length) return "";

    var cards = filtered.map(function (item) {
      var availabilityRaw = item.available_count != null ? item.available_count : item.availableCount;
      var availability = typeof availabilityRaw === "number" ? availabilityRaw : Number(availabilityRaw);
      var sponsorRaw = item.sponsor_suggested_amount != null ? item.sponsor_suggested_amount : item.sponsorSuggestedAmount;
      var sponsor = Number(sponsorRaw);
      var badge = item.badge || item.status || (Number.isFinite(availability) ? (availability > 0 ? "Limited" : "Out") : "");
      return [
        '<article class="book-card">',
        '<div class="book-card-head">',
        '<h3>' + escapeHTML(item.title || "Book") + "</h3>",
        (badge ? ('<span class="badge">' + escapeHTML(String(badge)) + "</span>") : ""),
        "</div>",
        item.description ? '<p class="board-copy">' + escapeHTML(item.description) + "</p>" : "",
        item.category ? '<p class="note-line">' + escapeHTML(item.category) + "</p>" : "",
        Number.isFinite(availability) ? '<p class="note-line">Available: ' + escapeHTML(String(availability)) + "</p>" : "",
        Number.isFinite(sponsor) ? '<p class="note-line">Suggested sponsor: ₹' + escapeHTML(String(sponsor)) + "</p>" : "",
        ctaLabel ? '<a class="inline-link" href="' + escapeHTML(ctaHref) + '">' + escapeHTML(ctaLabel) + "</a>" : "",
        "</article>"
      ].join("");
    }).join("");

    return [
      '<section class="report-section cms-block">',
      block && (block.heading || block.title) ? '<h2>' + escapeHTML(block.heading || block.title) + "</h2>" : "",
      '<div class="book-grid">' + cards + "</div>",
      "</section>"
    ].join("");
  }

  async function renderReportTable(block, loader) {
    var reports = await loader.fetchCollectionItems("reports").catch(function () { return []; });
    if (!reports.length) {
      return [
        '<section class="report-section cms-block">',
        block && block.heading ? '<h2>' + escapeHTML(block.heading) + "</h2>" : "",
        '<div class="table-wrap"><table class="report-table"><thead><tr><th>Month</th><th>Donations</th><th>Expenses</th><th>Blood Units</th><th>Books</th></tr></thead>',
        '<tbody><tr><td>—</td><td>₹0</td><td>₹0</td><td>0</td><td>0</td></tr></tbody></table></div>',
        "</section>"
      ].join("");
    }

    reports.sort(function (a, b) {
      return String(b.month || "").localeCompare(String(a.month || ""));
    });

    var rows = reports.map(function (item) {
      function val(n, isCurrency) {
        if (n == null || n === "") return "—";
        var num = Number(n);
        if (!Number.isFinite(num)) return "—";
        return isCurrency ? ("\u20B9" + num.toLocaleString("en-IN")) : num.toLocaleString();
      }

      return [
        "<tr>",
        "<td>" + escapeHTML(item.month || "—") + "</td>",
        "<td>" + escapeHTML(val(item.donations_received_total, true)) + "</td>",
        "<td>" + escapeHTML(val(item.expenses_used_total, true)) + "</td>",
        "<td>" + escapeHTML(val(item.blood_units_collected, false)) + "</td>",
        "<td>" + escapeHTML(val(item.books_distributed, false)) + "</td>",
        "</tr>"
      ].join("");
    }).join("");

    var notes = reports.filter(function (item) {
      return item && item.notes_md;
    }).map(function (item) {
      return '<li><span class="note-month">' + escapeHTML(item.month || "—") + "</span><span>" + escapeHTML(String(item.notes_md || "")) + "</span></li>";
    }).join("");

    return [
      '<section class="report-section cms-block">',
      block && block.heading ? '<h2>' + escapeHTML(block.heading) + "</h2>" : "",
      '<div class="table-wrap"><table class="report-table"><thead><tr><th>Month</th><th>Donations</th><th>Expenses</th><th>Blood Units</th><th>Books</th></tr></thead><tbody>' + rows + "</tbody></table></div>",
      notes ? ('<div class="divider" aria-hidden="true"></div><h3>Notes</h3><ul class="notes-list">' + notes + "</ul>") : "",
      "</section>"
    ].join("");
  }

  async function renderEventList(block, loader) {
    var events = await loader.fetchCollectionItems("events").catch(function () { return []; });
    var mode = block && block.filter || "upcoming";
    var maxItems = Number(block && block.max_items);
    if (!Number.isFinite(maxItems) || maxItems <= 0) maxItems = 3;

    var filtered = events.filter(function (item) {
      if (mode === "all") return true;
      if (mode === "featured") return Boolean(item.featured);
      return (item.status || "upcoming") === "upcoming";
    }).slice(0, maxItems);

    if (!filtered.length) return "";

    var rows = filtered.map(function (item) {
      var date = String(item.start_datetime || item.month || "").slice(0, 10) || "—";
      var parts = date.split("-");
      var monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      var monthText = parts.length === 3 ? (monthNames[(Number(parts[1]) || 1) - 1] || "—") : "—";
      var dayText = parts.length === 3 ? (parts[2] || "—") : "—";
      var yearText = parts.length === 3 ? (parts[0] || "—") : "—";

      return [
        '<article class="event-item">',
        '<div class="event-date"><span class="event-date-month">' + escapeHTML(monthText) + '</span><span class="event-date-day">' + escapeHTML(dayText) + '</span><span class="event-date-year">' + escapeHTML(yearText) + "</span></div>",
        '<div class="event-details"><p class="panel-kicker">' + escapeHTML(item.type || item.status || "Event") + '</p><h3>' + escapeHTML(item.title || "") + '</h3><p class="event-meta-line">' + escapeHTML(item.location || "—") + '</p><p class="event-description">' + escapeHTML(item.description_md || "") + "</p></div>",
        '<div class="event-action">' + (item.register_url ? '<a class="btn btn-secondary" href="' + escapeHTML(item.register_url) + '">Register</a>' : "") + "</div>",
        "</article>"
      ].join("");
    }).join("");

    return [
      '<section class="report-section cms-block">',
      block && block.heading ? '<h2>' + escapeHTML(block.heading) + "</h2>" : "",
      '<div class="event-calendar-list">' + rows + "</div>",
      "</section>"
    ].join("");
  }

  async function renderDonationPrompt(block, loader) {
    var settings = await loader.fetchSettings().catch(function () { return {}; });
    var donation = settings && settings.donation ? settings.donation : {};
    var useGlobal = !block || block.use_global_settings !== false;
    var upiId = useGlobal ? donation.upi_id : (block.override_upi_id || donation.upi_id);
    var amounts = useGlobal ? donation.suggested_amounts : (block.override_amounts || donation.suggested_amounts || []);
    var qr = useGlobal ? donation.upi_qr : (block.override_qr_image || donation.upi_qr);

    var normalizedAmounts = Array.isArray(amounts) ? amounts.map(function (amt) {
      if (amt && typeof amt === "object" && "amount" in amt) return amt.amount;
      return amt;
    }).filter(function (amt) {
      return amt !== null && amt !== undefined && amt !== "";
    }) : [];

    var chips = normalizedAmounts.map(function (amt) {
      return '<span class="badge">' + escapeHTML(String(amt)) + "</span>";
    }).join(" ");

    return [
      '<section class="report-section cms-block">',
      '<div class="info-box">',
      block && block.heading ? '<h3>' + escapeHTML(block.heading) + "</h3>" : '<h3>Donation Support</h3>',
      block && block.body ? '<div class="board-copy">' + markdownToBasicHTML(block.body) + "</div>" : "",
      upiId ? '<p class="key-value-line"><span>UPI ID:</span> <strong>' + escapeHTML(upiId) + "</strong></p>" : "",
      qr ? '<p class="note-line">QR: ' + escapeHTML(qr) + "</p>" : "",
      chips ? '<p class="note-line">Suggested: ' + chips + "</p>" : "",
      "</div>",
      "</section>"
    ].join("");
  }

  async function renderBlock(block, loader) {
    if (!block || typeof block !== "object") return "";
    var type = block.type || block._type || block.block || block.name;

    switch (type) {
      case "hero":
        return renderHero(block);
      case "richtext":
        return renderRichText(block);
      case "quote":
        return renderQuote(block);
      case "card_grid":
        return renderCardGrid(block);
      case "metrics":
        return renderMetrics(block);
      case "book_list":
        return renderBookList(block, loader);
      case "event_list":
        return renderEventList(block, loader);
      case "report_table":
        return renderReportTable(block, loader);
      case "donation_prompt":
        return renderDonationPrompt(block, loader);
      case "divider":
        return renderDivider(block);
      default:
        return "";
    }
  }

  async function renderBlocks(blocks, loader) {
    var htmlChunks = [];
    for (var i = 0; i < blocks.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      htmlChunks.push(await renderBlock(blocks[i], loader));
    }
    return htmlChunks.join("");
  }

  window.CMSBlockRenderer = {
    renderBlocks: renderBlocks
  };
})();
