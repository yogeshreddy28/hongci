(function () {
  "use strict";

  function isDev() {
    var h = (window.location && window.location.hostname) || "";
    return h === "localhost" || h === "127.0.0.1";
  }

  function isPreview() {
    try {
      return new URLSearchParams(window.location.search).get("cmsPreview") === "1";
    } catch (_e) {
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
    var normalized = String(pathExpr).replace(/\[(\d+)\]/g, ".$1");
    var parts = normalized.split(".");
    var cur = root;
    for (var i = 0; i < parts.length; i += 1) {
      var part = parts[i];
      if (!part) continue;
      if (cur == null) return undefined;
      if (Array.isArray(cur)) {
        if (/^\d+$/.test(part)) {
          cur = cur[Number(part)];
          continue;
        }
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
    if (!el || value === undefined) return;
    el.textContent = value == null ? "" : String(value);
  }

  function setHTML(el, value) {
    if (!el || value === undefined) return;
    el.innerHTML = value == null ? "" : String(value);
  }

  function setAttr(el, attr, value) {
    if (!el || !attr || value === undefined) return;
    el.setAttribute(attr, value == null ? "" : String(value));
  }

  function hydrateBindings(root, data) {
    if (!root) return;

    root.querySelectorAll("[data-bind]").forEach(function (el) {
      var pathExpr = el.getAttribute("data-bind");
      var value = getByPath(data, pathExpr);
      if (value === undefined) return;
      setText(el, value);
    });

    root.querySelectorAll("[data-bind-text]").forEach(function (el) {
      var pathExpr = el.getAttribute("data-bind-text");
      var value = getByPath(data, pathExpr);
      if (value === undefined) return;
      setText(el, value);
    });

    root.querySelectorAll("[data-bind-html]").forEach(function (el) {
      var pathExpr = el.getAttribute("data-bind-html");
      var value = getByPath(data, pathExpr);
      if (value === undefined) return;
      setHTML(el, value);
    });

    root.querySelectorAll("[data-bind-src]").forEach(function (el) {
      var pathExpr = el.getAttribute("data-bind-src");
      var value = getByPath(data, pathExpr);
      if (value === undefined) return;
      setAttr(el, "src", value);
    });

    root.querySelectorAll("[data-bind-href]").forEach(function (el) {
      var pathExpr = el.getAttribute("data-bind-href");
      var value = getByPath(data, pathExpr);
      if (value === undefined) return;
      setAttr(el, "href", value);
    });

    // Backward compatibility while pages are migrated.
    root.querySelectorAll("[data-cms-text]").forEach(function (el) {
      if (el.hasAttribute("data-bind") || el.hasAttribute("data-bind-text")) return;
      var pathExpr = el.getAttribute("data-cms-text");
      var value = getByPath(data, pathExpr);
      if (value === undefined) return;
      setText(el, value);
    });
    root.querySelectorAll("[data-cms-link]").forEach(function (el) {
      if (el.hasAttribute("data-bind-href")) return;
      var pathExpr = el.getAttribute("data-cms-link");
      var value = getByPath(data, pathExpr);
      if (value === undefined) return;
      setAttr(el, "href", value);
    });
    root.querySelectorAll("[data-cms-attr]").forEach(function (el) {
      if (el.hasAttribute("data-bind-src")) return;
      var expr = el.getAttribute("data-cms-attr") || "";
      var idx = expr.lastIndexOf(":");
      if (idx < 0) return;
      var pathExpr = expr.slice(0, idx);
      var attr = expr.slice(idx + 1);
      var value = getByPath(data, pathExpr);
      if (value === undefined) return;
      setAttr(el, attr, value);
    });
  }

  function hydrateRepeaters(root, data) {
    if (!root) return;
    root.querySelectorAll("[data-repeat]").forEach(function (container) {
      var pathExpr = container.getAttribute("data-repeat");
      var items = getByPath(data, pathExpr);
      if (!Array.isArray(items)) return;

      var tpl = container.querySelector("template");
      if (!tpl) return;

      Array.prototype.slice.call(container.children).forEach(function (child) {
        if (child === tpl) return;
        child.remove();
      });

      items.forEach(function (item) {
        var first = tpl.content.firstElementChild;
        if (!first) return;
        var node = first.cloneNode(true);
        hydrateBindings(node, item || {});
        hydrateRepeaters(node, item || {});
        container.appendChild(node);
      });
    });
  }

  function findSection(page, id) {
    var sections = Array.isArray(page && page.sections) ? page.sections : [];
    for (var i = 0; i < sections.length; i += 1) {
      if (sections[i] && String(sections[i].id || "") === id) return sections[i];
    }
    return null;
  }

  function hydrateHomeCompatibility(page) {
    if (!page || getSlug() !== "home") return;
    var hero = page.hero || {};
    var highlightsSection = findSection(page, "highlights") || {};
    var about = page.about || {};
    var aboutLeft = (highlightsSection.left && typeof highlightsSection.left === "object") ? highlightsSection.left : (about.left || {});
    var aboutRight = (highlightsSection.right && typeof highlightsSection.right === "object") ? highlightsSection.right : (about.right || {});
    var impact = page.impact || {};
    var event = page.event || {};
    var brand = page.brand || {};

    function setAllText(selector, value) {
      if (value === undefined) return;
      document.querySelectorAll(selector).forEach(function (el) { setText(el, value); });
    }
    function setAllAttr(selector, attr, value) {
      if (value === undefined) return;
      document.querySelectorAll(selector).forEach(function (el) { setAttr(el, attr, value); });
    }

    setAllText('[data-community="title"]', hero.title);
    setAllText('[data-community="tagline"]', hero.tagline || hero.subtitle);
    setAllText('[data-community="aboutLeftTitle"]', aboutLeft.title);
    setAllText('[data-community="aboutLeftText"]', aboutLeft.text);
    setAllText('[data-community="aboutRightTitle"]', aboutRight.title);
    setAllText('[data-community="aboutRightText"]', aboutRight.text);
    setAllAttr('[data-hero-image]', "src", hero.image);
    setAllAttr('[data-watermark-seal]', "src", brand.sealImage);
    setAllText("[data-event-title]", event.title);
    setAllText("[data-event-location]", event.location);
    setAllAttr("[data-event-register]", "href", event.registerUrl);

    ["bloodUnits", "volunteers", "books", "families"].forEach(function (key) {
      var value = impact[key];
      if (value === undefined) return;
      var formatted = Number.isFinite(Number(value)) ? new Intl.NumberFormat().format(Number(value)) : value;
      setAllText('[data-impact="' + key + '"]', formatted);
    });

    // Hero CTAs (existing UI)
    var ctaWrap = document.querySelector(".hero-actions");
    if (ctaWrap && Array.isArray(hero.ctas) && hero.ctas.length) {
      ctaWrap.innerHTML = "";
      hero.ctas.forEach(function (cta) {
        var a = document.createElement("a");
        var style = String(cta && cta.style || "secondary").toLowerCase();
        a.className = "btn " + (style === "primary" ? "btn-primary" : "btn-secondary");
        if (cta && cta.href) a.setAttribute("href", cta.href);
        if (a.getAttribute("href") && /#/.test(a.getAttribute("href"))) {
          a.setAttribute("data-scroll-target", a.getAttribute("href"));
        }
        a.textContent = cta && cta.label ? cta.label : "Action";
        ctaWrap.appendChild(a);
      });
    }

    // Pillars + highlights + impact labels from sections[] if present
    var pillars = findSection(page, "pillars");
    var pillarsGrid = document.getElementById("pillars-grid");
    if (pillars && pillarsGrid && Array.isArray(pillars.items) && pillars.items.length) {
      pillarsGrid.innerHTML = "";
      pillars.items.forEach(function (item) {
        var card = document.createElement("article");
        card.className = "board-panel pillar-card";
        card.innerHTML =
          '<div class="pillar-icon" aria-hidden="true"></div>' +
          '<h3></h3>' +
          '<p class="board-copy"></p>';
        var iconEl = card.querySelector(".pillar-icon");
        if (iconEl) iconEl.textContent = item.icon || "•";
        setText(card.querySelector("h3"), item.title);
        setText(card.querySelector(".board-copy"), item.text);
        pillarsGrid.appendChild(card);
      });
      var head = pillarsGrid.closest(".container");
      if (head) {
        setText(head.querySelector(".section-head .section-label"), pillars.label);
        setText(head.querySelector(".section-head h2"), pillars.title);
      }
    }

    if (highlightsSection && (highlightsSection.title !== undefined || highlightsSection.label !== undefined)) {
      var highlightsContainer = document.querySelector(".editorial-columns");
      var highlightsShell = highlightsContainer && highlightsContainer.closest(".container");
      if (highlightsShell) {
        setText(highlightsShell.querySelector(".section-head .section-label"), highlightsSection.label);
        setText(highlightsShell.querySelector(".section-head h2"), highlightsSection.title);
      }
    }

    var impactSection = findSection(page, "impact");
    if (impactSection && Array.isArray(impactSection.stats)) {
      impactSection.stats.forEach(function (stat) {
        if (!stat || !stat.key) return;
        if (stat.value !== undefined) {
          var target = document.querySelector('[data-impact="' + stat.key + '"]');
          if (target) {
            var formatted = Number.isFinite(Number(stat.value)) ? new Intl.NumberFormat().format(Number(stat.value)) : stat.value;
            setText(target, formatted);
          }
        }
      });
    }
  }

  function hydrateStructuredPages(page) {
    var slug = getSlug();
    if (!page || !Array.isArray(page.sections)) return;

    if (slug === "philosophy") {
      var proseInner = document.querySelector(".prose-inner");
      var items = page.sections[0] && page.sections[0].items;
      if (proseInner && Array.isArray(items) && items.length) {
        var existing = proseInner.querySelectorAll(".prose-section");
        existing.forEach(function (n) { n.remove(); });
        proseInner.querySelectorAll(".divider").forEach(function (n) { n.remove(); });
        var closing = proseInner.querySelector(".closing-line");
        items.forEach(function (item, idx) {
          var section = document.createElement("section");
          section.className = "prose-section";
          section.innerHTML = "<h2></h2><p></p>";
          setText(section.querySelector("h2"), item.title);
          setText(section.querySelector("p"), item.text);
          proseInner.insertBefore(section, closing);
          if (idx < items.length - 1) {
            var divider = document.createElement("div");
            divider.className = "divider";
            divider.setAttribute("aria-hidden", "true");
            proseInner.insertBefore(divider, closing);
          }
        });
      }
    }

    if (slug === "volunteer") {
      var roleList = document.querySelector(".role-list");
      var roleSection = findSection(page, "roles");
      if (roleList && roleSection && Array.isArray(roleSection.items)) {
        setText(roleList.closest(".report-section") && roleList.closest(".report-section").querySelector("h2"), roleSection.title);
        roleList.innerHTML = "";
        roleSection.items.forEach(function (item) {
          var li = document.createElement("li");
          li.className = "role-item";
          li.textContent = item.title || "";
          roleList.appendChild(li);
        });
      }

      var volunteerFormSection = findSection(page, "volunteer-form");
      var formWrap = document.querySelector("#volunteer-form-title") && document.querySelector("#volunteer-form-title").closest(".report-section");
      if (volunteerFormSection && formWrap) {
        setText(formWrap.querySelector("h2"), volunteerFormSection.title);
        var fields = volunteerFormSection.fields || {};
        var nameField = fields.name || {};
        var whatsappField = fields.whatsapp || {};
        var skillsField = fields.skills || {};
        var availabilityField = fields.availability || {};
        setText(formWrap.querySelector('label[for="volunteer-name"]'), nameField.label);
        setAttr(formWrap.querySelector("#volunteer-name"), "placeholder", nameField.placeholder);
        setText(formWrap.querySelector('label[for="volunteer-whatsapp"]'), whatsappField.label);
        setAttr(formWrap.querySelector("#volunteer-whatsapp"), "placeholder", whatsappField.placeholder);
        setText(formWrap.querySelector('label[for="volunteer-skills"]'), skillsField.label);
        setAttr(formWrap.querySelector("#volunteer-skills"), "placeholder", skillsField.placeholder);
        setText(formWrap.querySelector('label[for="volunteer-availability"]'), availabilityField.label);
        setAttr(formWrap.querySelector("#volunteer-availability"), "placeholder", availabilityField.placeholder);

        var actions = volunteerFormSection.actions || {};
        if (actions.primary) setText(formWrap.querySelector(".form-actions .btn-primary"), actions.primary.label);
        if (actions.secondary) {
          setText(formWrap.querySelector(".form-actions .btn-secondary"), actions.secondary.label);
          setAttr(formWrap.querySelector(".form-actions .btn-secondary"), "href", actions.secondary.href);
        }
        if (volunteerFormSection.note !== undefined) setText(formWrap.querySelector(".form-note"), volunteerFormSection.note);
        if (volunteerFormSection.groupInviteUrl !== undefined) {
          var cfgNode = document.getElementById("volunteer-group-link-config");
          if (cfgNode) cfgNode.setAttribute("data-group-link", String(volunteerFormSection.groupInviteUrl || ""));
        }
      }
    }

    if (slug === "charity-support") {
      var donationUse = findSection(page, "donation-use");
      var useSection = document.querySelector("#where-donations-used") && document.querySelector("#where-donations-used").closest(".report-section");
      if (donationUse && useSection) {
        setText(useSection.querySelector("h2"), donationUse.title);
        var list = useSection.querySelector(".two-column-list");
        if (list && Array.isArray(donationUse.items) && donationUse.items.length) {
          list.innerHTML = "";
          donationUse.items.forEach(function (item) {
            var li = document.createElement("li");
            li.textContent = item.title || "";
            list.appendChild(li);
          });
        }
        if (donationUse.note !== undefined) {
          setText(useSection.querySelector(".note-line"), donationUse.note);
        }
      }

      var methodsSection = findSection(page, "donation-methods");
      var methodsWrap = document.querySelector("#donation-methods") && document.querySelector("#donation-methods").closest(".report-section");
      if (methodsSection && methodsWrap) {
        setText(methodsWrap.querySelector("h2"), methodsSection.title);
        if (methodsSection.upi) {
          var upiWrap = methodsWrap.querySelector("#upi-qr-title") && methodsWrap.querySelector("#upi-qr-title").closest(".info-box");
          if (upiWrap) {
            setText(upiWrap.querySelector("h3"), methodsSection.upi.title);
            setText(upiWrap.querySelector(".board-copy"), methodsSection.upi.scanText);
            var kv = upiWrap.querySelector(".key-value-line");
            if (kv) {
              setText(kv.querySelector("span"), methodsSection.upi.upiLabel);
              setText(kv.querySelector("strong"), methodsSection.upi.upiId);
            }
            setText(upiWrap.querySelector(".note-line"), methodsSection.upi.helperText);
            var qrImg = upiWrap.querySelector("img[data-bind-src], img");
            var qrPlaceholder = upiWrap.querySelector(".qr-placeholder");
            if (qrImg && methodsSection.upi.qrImage !== undefined) {
              var src = String(methodsSection.upi.qrImage || "");
              if (src) {
                qrImg.src = src;
                qrImg.style.display = "";
                if (qrPlaceholder) qrPlaceholder.style.display = "none";
              } else {
                qrImg.removeAttribute("src");
                qrImg.style.display = "none";
                if (qrPlaceholder) qrPlaceholder.style.display = "";
              }
            }
          }
        }
        if (methodsSection.bank) {
          var bankWrap = methodsWrap.querySelector("#bank-transfer-title") && methodsWrap.querySelector("#bank-transfer-title").closest(".info-box");
          if (bankWrap) {
            setText(bankWrap.querySelector("h3"), methodsSection.bank.title);
            var rows = bankWrap.querySelectorAll(".key-value-grid > div");
            var fields = Array.isArray(methodsSection.bank.fields) ? methodsSection.bank.fields : [];
            for (var r = 0; r < rows.length; r += 1) {
              var rowData = fields[r] || {};
              setText(rows[r].querySelector("dt"), rowData.label);
              setText(rows[r].querySelector("dd"), rowData.value);
            }
          }
        }
      }

      var integritySection = findSection(page, "integrity-note");
      var integrityWrap = document.querySelector("#integrity-note") && document.querySelector("#integrity-note").closest(".integrity-box");
      if (integritySection && integrityWrap) {
        setText(integrityWrap.querySelector("h2"), integritySection.title);
        var integrityText = integritySection.items && integritySection.items[0] ? integritySection.items[0].text : undefined;
        if (integrityText !== undefined) setText(integrityWrap.querySelector("p"), integrityText);
      }
    }

    if (slug === "mission") {
      var goalsSection = findSection(page, "annual-goals");
      var goalsWrap = document.querySelector("#annual-goals") && document.querySelector("#annual-goals").closest(".report-section");
      if (goalsSection && goalsWrap) {
        setText(goalsWrap.querySelector("h2"), goalsSection.title);
        var goalsList = goalsWrap.querySelector(".goals-list");
        if (goalsList && Array.isArray(goalsSection.items) && goalsSection.items.length) {
          goalsList.innerHTML = "";
          goalsSection.items.forEach(function (item) {
            var li = document.createElement("li");
            var value = item.text == null ? "" : String(item.text);
            li.innerHTML = escapeHTML(item.title || "") + (value ? ' <span class="goal-num">' + escapeHTML(value) + "</span>" : "");
            goalsList.appendChild(li);
          });
        }
      }

      var fundsSection = findSection(page, "funds");
      var fundsWrap = document.querySelector("#fund-usage") && document.querySelector("#fund-usage").closest(".report-section");
      if (fundsSection && fundsWrap) {
        setText(fundsWrap.querySelector("h2"), fundsSection.title);
        var ol = fundsWrap.querySelector(".structured-sections");
        if (ol && Array.isArray(fundsSection.items) && fundsSection.items.length) {
          ol.innerHTML = "";
          fundsSection.items.forEach(function (item) {
            var li = document.createElement("li");
            var h3 = document.createElement("h3");
            h3.textContent = item.title || "";
            li.appendChild(h3);
            var ul = document.createElement("ul");
            ul.className = "sub-list";
            String(item.text || "").split(/\s*,\s*/).filter(Boolean).forEach(function (part) {
              var sub = document.createElement("li");
              sub.textContent = part;
              ul.appendChild(sub);
            });
            li.appendChild(ul);
            ol.appendChild(li);
          });
        }
      }

      var sourcingSection = findSection(page, "book-sourcing");
      var sourcingWrap = document.querySelector("#book-sourcing") && document.querySelector("#book-sourcing").closest(".report-section");
      if (sourcingSection && sourcingWrap) {
        setText(sourcingWrap.querySelector("h2"), sourcingSection.title);
        var blocks = sourcingWrap.querySelectorAll(".report-block");
        if (blocks.length >= 2 && Array.isArray(sourcingSection.items)) {
          for (var b = 0; b < blocks.length && b < sourcingSection.items.length; b += 1) {
            var item = sourcingSection.items[b] || {};
            setText(blocks[b].querySelector(".report-lead"), item.title);
            var ulDot = blocks[b].querySelector(".dot-list");
            if (ulDot) {
              ulDot.innerHTML = "";
              String(item.text || "").split(/\s*,\s*/).filter(Boolean).forEach(function (part) {
                var liDot = document.createElement("li");
                liDot.textContent = part;
                ulDot.appendChild(liDot);
              });
            }
          }
        }
        if (sourcingSection.note !== undefined) {
          var notes = sourcingWrap.querySelectorAll(".note-line");
          if (notes.length) setText(notes[notes.length - 1], sourcingSection.note);
        }
      }

      var campSection = findSection(page, "camp-structure");
      var campWrap = document.querySelector("#camp-structure") && document.querySelector("#camp-structure").closest(".report-section");
      if (campSection && campWrap) {
        setText(campWrap.querySelector("h2"), campSection.title);
        var campOl = campWrap.querySelector(".structured-sections");
        if (campOl && Array.isArray(campSection.items) && campSection.items.length) {
          campOl.innerHTML = "";
          campSection.items.forEach(function (item) {
            var liCamp = document.createElement("li");
            var h3Camp = document.createElement("h3");
            h3Camp.textContent = item.title || "";
            liCamp.appendChild(h3Camp);
            var ulCamp = document.createElement("ul");
            ulCamp.className = "sub-list";
            String(item.text || "").split(/\s*,\s*/).filter(Boolean).forEach(function (part) {
              var subCamp = document.createElement("li");
              subCamp.textContent = part;
              ulCamp.appendChild(subCamp);
            });
            liCamp.appendChild(ulCamp);
            campOl.appendChild(liCamp);
          });
        }
      }

      var tsSection = findSection(page, "transparency-statement");
      var tsWrap = document.querySelector("#transparency-statement") && document.querySelector("#transparency-statement").closest(".transparency-box");
      if (tsSection && tsWrap) {
        setText(tsWrap.querySelector("h2"), tsSection.title);
        var tsText = tsSection.items && tsSection.items[0] ? tsSection.items[0].text : undefined;
        if (tsText !== undefined) setText(tsWrap.querySelector("p"), tsText);
      }
    }

    if (slug === "events") {
      var eventsSec = findSection(page, "events");
      var eventsWrap = document.querySelector("#event-calendar-title") && document.querySelector("#event-calendar-title").closest(".report-section");
      if (eventsSec && eventsWrap) {
        setText(eventsWrap.querySelector("h2"), eventsSec.title);
        setText(eventsWrap.querySelector(".calendar-intro"), eventsSec.label);
      }
    }

    if (slug === "book-seva") {
      var booksSec = findSection(page, "books");
      var booksWrap = document.querySelector("#available-books") && document.querySelector("#available-books").closest(".report-section");
      if (booksSec && booksWrap) {
        setText(booksWrap.querySelector("h2"), booksSec.title);
      }
    }

    if (slug === "transparency") {
      var reportsSec = findSection(page, "reports");
      var monthlyWrap = document.querySelector("#monthly-summary-title") && document.querySelector("#monthly-summary-title").closest(".report-section");
      if (reportsSec && monthlyWrap) {
        setText(monthlyWrap.querySelector("h2"), reportsSec.title);
      }
    }
  }

  function escapeHTML(input) {
    return String(input == null ? "" : input)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  async function run() {
    var slug = getSlug();
    if (!slug) return;
    console.log("[CMS] slug", slug);
    try {
      var page = await fetchYaml("/content/pages/" + slug + ".yml");
      hydrateBindings(document, page);
      hydrateRepeaters(document, page);
      hydrateHomeCompatibility(page);
      hydrateStructuredPages(page);
      showBadge(slug);
      window.__CMS_PAGE_DATA = page;
    } catch (err) {
      console.warn("[CMS] failed", err);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
