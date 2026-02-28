(function () {
  "use strict";

  var API_BASE = "/api";

  function qs(selector) {
    return document.querySelector(selector);
  }

  function qsa(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  async function api(path, options) {
    var res = await fetch(API_BASE + path, Object.assign({
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" }
    }, options || {}));

    var text = await res.text();
    var data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      data = { ok: false, error: text || "Invalid server response" };
    }

    if (!res.ok) {
      var err = new Error(data.error || ("HTTP " + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function apiUpload(path, formData) {
    var res = await fetch(API_BASE + path, {
      method: "POST",
      credentials: "same-origin",
      body: formData
    });
    var text = await res.text();
    var data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      data = { ok: false, error: text || "Invalid server response" };
    }
    if (!res.ok) {
      var err = new Error(data.error || ("HTTP " + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function setupLogout() {
    var mePill = qs("#me-pill");
    if (mePill) {
      mePill.textContent = "Open Access";
    }
    qsa("#logout-btn").forEach(function (btn) {
      btn.textContent = "Dashboard";
      btn.addEventListener("click", function () {
        window.location.href = "dashboard.html";
      });
    });
  }

  function setStatus(id, msg, isError) {
    var el = qs(id);
    if (!el) return;
    el.innerHTML = msg || "";
    el.style.color = isError ? "#b42318" : "";
  }

  function showToast(message, isError) {
    var el = document.getElementById("admin-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "admin-toast";
      el.setAttribute("style", "position:fixed;right:14px;bottom:14px;z-index:9999;background:#fff;border:1px solid rgba(107,30,30,.2);color:#1f2937;padding:10px 12px;border-radius:10px;box-shadow:0 8px 18px rgba(17,24,39,.08);font:600 13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:320px;");
      document.body.appendChild(el);
    }
    el.textContent = String(message || "");
    el.style.borderColor = isError ? "rgba(180,35,24,.35)" : "rgba(107,30,30,.2)";
    el.style.color = isError ? "#b42318" : "#1f2937";
    el.style.display = "block";
    clearTimeout(el.__hideTimer);
    el.__hideTimer = setTimeout(function () {
      el.style.display = "none";
    }, 2400);
  }

  function getParams() {
    var p = new URLSearchParams(window.location.search);
    return {
      type: p.get("type") || "",
      slug: p.get("slug") || "",
      id: p.get("id") || "",
      isNew: p.get("new") === "1"
    };
  }

  function escapeHTML(input) {
    return String(input == null ? "" : input)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function isNumericKey(part) {
    return /^\d+$/.test(String(part));
  }

  function getPath(obj, pathExpr) {
    if (!pathExpr) return obj;
    var parts = String(pathExpr).split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i += 1) {
      if (cur == null) return undefined;
      var p = parts[i];
      if (Array.isArray(cur) && isNumericKey(p)) {
        cur = cur[Number(p)];
      } else {
        cur = cur[p];
      }
    }
    return cur;
  }

  function setPath(obj, pathExpr, value) {
    var parts = String(pathExpr).split(".");
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i += 1) {
      var p = parts[i];
      var next = parts[i + 1];
      if (Array.isArray(cur) && isNumericKey(p)) {
        p = Number(p);
      }
      if (cur[p] == null) {
        cur[p] = isNumericKey(next) ? [] : {};
      }
      cur = cur[p];
    }
    var last = parts[parts.length - 1];
    if (Array.isArray(cur) && isNumericKey(last)) last = Number(last);
    cur[last] = value;
  }

  function parseFieldValue(field, rawValue, checkboxEl) {
    var type = field && field.type || "text";
    if (type === "bool") return !!(checkboxEl && checkboxEl.checked);
    if (type === "number") {
      if (rawValue === "") return "";
      var n = Number(rawValue);
      return Number.isFinite(n) ? n : rawValue;
    }
    return String(rawValue == null ? "" : rawValue);
  }

  async function initDashboardPage() {
    if (!qs("#collection-list")) return;
    setupLogout();

    var params = getParams();
    var type = params.type || "pages";
    var titleEl = qs("#collection-title");
    var helpEl = qs("#collection-help");
    var listEl = qs("#collection-list");

    if (titleEl) titleEl.textContent = type === "settings" ? "Settings" : (type.charAt(0).toUpperCase() + type.slice(1));
    if (helpEl) helpEl.textContent = type === "settings" ? "Open global site settings." : "Select an item to edit.";

    if (type === "settings") {
      listEl.innerHTML = '<div class="collection-row"><div><strong>Global Settings</strong><br><small>content/settings.yml</small></div><div></div><div><a class="admin-btn admin-btn-secondary" href="editor.html?type=settings">Edit</a></div></div>';
      return;
    }

    var head = qs(".admin-card-head");
    if (head && !qs("#collection-add-btn") && ["events", "books", "reports"].indexOf(type) !== -1) {
      var addBtn = document.createElement("button");
      addBtn.id = "collection-add-btn";
      addBtn.type = "button";
      addBtn.className = "admin-btn admin-btn-secondary";
      addBtn.textContent = "Add New";
      addBtn.addEventListener("click", function () {
        if (type === "events") {
          window.location.href = "editor.html?type=events&new=1";
          return;
        }
        var hint = type === "reports" ? "YYYY-MM (e.g. 2026-03)" : "slug-like id (e.g. community-event-2026-04-01)";
        var value = window.prompt("Enter " + hint);
        if (!value) return;
        var slug = String(value).trim();
        if (!slug) return;
        window.location.href = "editor.html?type=" + encodeURIComponent(type) + "&slug=" + encodeURIComponent(slug) + "&new=1";
      });
      head.appendChild(addBtn);
    }

    try {
      var res = await api("/" + encodeURIComponent(type), { method: "GET", headers: {} });
      var items = Array.isArray(res.items) ? res.items : [];
      if (!items.length) {
        listEl.innerHTML = '<p class="admin-muted">No items found.</p>';
        return;
      }

      listEl.innerHTML = items.map(function (item) {
        var slug = item.slug || item.id || item.month || "";
        var previewUrl = type === "pages" ? (item.previewUrl || "") : "";
        if (previewUrl) {
          previewUrl += (previewUrl.indexOf("?") === -1 ? "?" : "&") + "cmsPreview=1";
        }
        var pageEditorQuery = type === "pages"
          ? ('editor.html?type=' + encodeURIComponent(type) + '&id=' + encodeURIComponent(slug))
          : ('editor.html?type=' + encodeURIComponent(type) + '&slug=' + encodeURIComponent(slug));
        var actions = '<a class="admin-btn admin-btn-secondary" href="' + pageEditorQuery + '">Edit</a>';
        if (previewUrl) {
          actions += ' <a class="admin-btn admin-btn-secondary" href="' + escapeHTML(previewUrl) + '" target="_blank" rel="noopener">Open Public Page</a>';
        }
        if (type === "events") {
          actions += ' <button type="button" class="admin-btn admin-btn-secondary" data-delete-type="' + escapeHTML(type) + '" data-delete-slug="' + escapeHTML(slug) + '">Delete</button>';
        }
        return (
          '<div class="collection-row">' +
            '<div><strong>' + escapeHTML(item.title || slug) + '</strong><br><small>' + escapeHTML(slug) + '</small></div>' +
            '<div><small>' + escapeHTML(item.updatedAt || "") + '</small></div>' +
            '<div>' + actions + '</div>' +
          '</div>'
        );
      }).join("");

      if (!listEl.__deleteBound) {
        listEl.__deleteBound = true;
        listEl.addEventListener("click", async function (event) {
          var btn = event.target.closest("[data-delete-type][data-delete-slug]");
          if (!btn) return;
          var deleteType = btn.getAttribute("data-delete-type");
          var deleteSlug = btn.getAttribute("data-delete-slug");
          if (!deleteType || !deleteSlug) return;
          var ok = window.confirm("Delete '" + deleteSlug + "' from " + deleteType + "?");
          if (!ok) return;
          try {
            await api("/" + encodeURIComponent(deleteType) + "/" + encodeURIComponent(deleteSlug), {
              method: "DELETE",
              headers: {}
            });
            showToast("Deleted " + deleteSlug);
            btn.closest(".collection-row").remove();
          } catch (error) {
            setStatus("#dashboard-status", error.message || "Delete failed.", true);
            showToast(error.message || "Delete failed.", true);
          }
        });
      }
    } catch (error) {
      setStatus("#dashboard-status", error.message || "Failed to load collection.", true);
    }
  }

  function setJsonEditorValue(value) {
    var textarea = qs("#json-editor");
    if (!textarea) return;
    textarea.value = JSON.stringify(value, null, 2);
  }

  function getJsonEditorValue() {
    var textarea = qs("#json-editor");
    if (!textarea) return {};
    return JSON.parse(textarea.value || "{}");
  }

  function setYamlEditorValue(value) {
    var textarea = qs("#json-editor");
    if (!textarea) return;
    if (window.jsyaml && window.jsyaml.dump) {
      textarea.value = window.jsyaml.dump(value || {}, { lineWidth: 120, noRefs: true, quotingType: '"' });
    } else {
      textarea.value = JSON.stringify(value || {}, null, 2);
    }
  }

  function getYamlEditorValue() {
    var textarea = qs("#json-editor");
    if (!textarea) return {};
    var text = textarea.value || "";
    if (!window.jsyaml || !window.jsyaml.load) {
      return JSON.parse(text || "{}");
    }
    return window.jsyaml.load(text) || {};
  }

  function renderPageSchemaForm(schema, value) {
    var state = deepClone(value || {});

    function defaultForField(field) {
      if (field.type === "number") return 0;
      if (field.type === "bool") return false;
      if (field.type === "pageLink") return "";
      if (field.type === "select" && Array.isArray(field.options) && field.options.length) return field.options[0];
      return "";
    }

    function buildEmptyItem(itemSchema) {
      var item = {};
      (itemSchema.fields || []).forEach(function (field) {
        setPath(item, field.key, field.default != null ? field.default : defaultForField(field));
      });
      (itemSchema.repeaters || []).forEach(function (rep) {
        setPath(item, rep.key, []);
      });
      return item;
    }

    function renderField(field, absolutePath, currentValue) {
      var full = field.full ? " full" : "";
      var help = field.help ? '<small class="admin-muted">' + escapeHTML(field.help) + "</small>" : "";
      var required = field.required ? " required" : "";
      var invalid = field.required && (currentValue == null || currentValue === "") ? " data-invalid=\"1\"" : "";
      if (field.type === "textarea") {
        return '<label class="' + full + '"' + invalid + '><span>' + escapeHTML(field.label) + '</span><textarea data-bind-path="' + escapeHTML(absolutePath) + '" data-bind-type="' + escapeHTML(field.type) + '" rows="' + (field.rows || 4) + '"' + required + '>' + escapeHTML(currentValue == null ? "" : currentValue) + "</textarea>" + help + "</label>";
      }
      if (field.type === "select") {
        var opts = (field.options || []).map(function (opt) {
          var ov = typeof opt === "string" ? opt : opt.value;
          var ol = typeof opt === "string" ? opt : (opt.label || opt.value);
          return '<option value="' + escapeHTML(ov) + '"' + (String(ov) === String(currentValue == null ? "" : currentValue) ? " selected" : "") + ">" + escapeHTML(ol) + "</option>";
        }).join("");
        return '<label class="' + full + '"' + invalid + '><span>' + escapeHTML(field.label) + '</span><select data-bind-path="' + escapeHTML(absolutePath) + '" data-bind-type="' + escapeHTML(field.type) + '"' + required + ">" + opts + "</select>" + help + "</label>";
      }
      if (field.type === "pageLink") {
        var options = Array.isArray(field.options) ? field.options.slice() : [];
        var current = currentValue == null ? "" : String(currentValue);
        var isInternal = current === "" || options.indexOf(current) !== -1;
        var selectValue = isInternal ? current : "__custom__";
        var selectOpts = ['<option value=\"\">Select page</option>']
          .concat(options.map(function (opt) {
            return '<option value="' + escapeHTML(opt) + '"' + (opt === selectValue ? " selected" : "") + ">" + escapeHTML(opt) + "</option>";
          }))
          .concat(['<option value=\"__custom__\"' + (selectValue === "__custom__" ? " selected" : "") + ">Custom URL</option>"])
          .join("");
        return (
          '<label class="' + full + '"' + invalid + '><span>' + escapeHTML(field.label) + '</span>' +
          '<div class="link-field-stack">' +
          '<select data-bind-path="' + escapeHTML(absolutePath) + '" data-bind-type="pageLink"' + required + ">" + selectOpts + "</select>" +
          '<input data-bind-path="' + escapeHTML(absolutePath) + '" data-bind-type="pageLinkCustom" type="text" placeholder=\"https://... or /path\" value=\"' + escapeHTML(isInternal ? "" : current) + '\"' + (selectValue === "__custom__" ? "" : " style=\"display:none\"") + ">" +
          "</div>" + help + "</label>"
        );
      }
      if (field.type === "image") {
        var currentImg = currentValue == null ? "" : String(currentValue);
        var previewSrc = currentImg && !/^https?:\/\//i.test(currentImg) && currentImg.charAt(0) !== "/" ? ("/" + currentImg.replace(/^\/+/, "")) : currentImg;
        return (
          '<label class="' + full + '"' + invalid + '><span>' + escapeHTML(field.label) + '</span>' +
            '<div class="image-field">' +
              '<div class="image-field-preview-wrap">' +
                (previewSrc ? ('<img class="image-field-preview" src="' + escapeHTML(previewSrc) + '" alt="">') : '<div class="image-field-placeholder">No image</div>') +
              '</div>' +
              '<div class="image-field-controls">' +
                '<button type="button" class="admin-btn admin-btn-secondary" data-upload-button="1" data-bind-path="' + escapeHTML(absolutePath) + '">Upload Image</button>' +
                '<input type="file" accept=\"image/png,image/jpeg,image/webp\" data-upload-input=\"1\" data-bind-path="' + escapeHTML(absolutePath) + '" style=\"display:none\">' +
                '<label class="image-field-manual"><span>Advanced: manual path</span><input data-bind-path="' + escapeHTML(absolutePath) + '" data-bind-type="image" type="text" value="' + escapeHTML(currentImg) + '"></label>' +
              "</div>" +
            "</div>" +
            help +
          "</label>"
        );
      }
      if (field.type === "bool") {
        return '<label class="' + full + '"' + invalid + '><span>' + escapeHTML(field.label) + '</span><input data-bind-path="' + escapeHTML(absolutePath) + '" data-bind-type="bool" type="checkbox"' + (currentValue ? " checked" : "") + ">" + help + "</label>";
      }
      var inputType = (field.type === "number") ? "number" : ((field.type === "date" || field.type === "datetime") ? "text" : "text");
      return '<label class="' + full + '"' + invalid + '><span>' + escapeHTML(field.label) + '</span><input data-bind-path="' + escapeHTML(absolutePath) + '" data-bind-type="' + escapeHTML(field.type || "text") + '" type="' + inputType + '" value="' + escapeHTML(currentValue == null ? "" : currentValue) + '"' + required + ">" + help + "</label>";
    }

    function joinPath(base, key) {
      return base ? (base + "." + key) : key;
    }

    function renderGroups(groups, basePath) {
      if (!groups || !groups.length) return "";
      return groups.map(function (group) {
        var fieldsHtml = (group.fields || []).map(function (field) {
          var p = joinPath(basePath, field.key);
          return renderField(field, p, getPath(state, p));
        }).join("");
        return '<section class="schema-group"><h3>' + escapeHTML(group.title || "Section") + '</h3><div class="typed-grid">' + fieldsHtml + "</div></section>";
      }).join("");
    }

    function renderRepeaters(repeaters, basePath) {
      if (!repeaters || !repeaters.length) return "";
      return repeaters.map(function (rep) {
        var path = joinPath(basePath, rep.key);
        var items = getPath(state, path);
        if (!Array.isArray(items)) {
          items = [];
          setPath(state, path, items);
        }
        var itemsHtml = items.map(function (item, index) {
          var itemPath = path + "." + index;
          var innerGroups = renderGroups(rep.itemSchema.groups || [], itemPath);
          var innerFields = ((rep.itemSchema.fields || []).length ? ('<div class="typed-grid">' + rep.itemSchema.fields.map(function (field) {
            return renderField(field, joinPath(itemPath, field.key), getPath(state, joinPath(itemPath, field.key)));
          }).join("") + "</div>") : "");
          var nestedRepeaters = renderRepeaters(rep.itemSchema.repeaters || [], itemPath);
          return (
            '<div class="repeater-item">' +
              '<div class="repeater-item-head">' +
                '<strong>' + escapeHTML(rep.itemLabel || "Item") + " " + (index + 1) + '</strong>' +
                '<div class="repeater-item-actions">' +
                  '<button type="button" class="admin-icon-btn" title="Remove" aria-label="Remove item" data-repeater-action="remove" data-repeater-path="' + escapeHTML(path) + '" data-repeater-index="' + index + '">\u00D7</button>' +
                '</div>' +
              "</div>" +
              innerGroups + innerFields + nestedRepeaters +
            "</div>"
          );
        }).join("");

        return (
          '<section class="schema-group repeater-group">' +
            '<div class="repeater-head"><h3>' + escapeHTML(rep.label || rep.key) + '</h3>' +
            '<button type="button" class="admin-btn admin-btn-secondary" data-repeater-action="add" data-repeater-path="' + escapeHTML(path) + '">Add New ' + escapeHTML(rep.itemLabel || "Item") + '</button></div>' +
            (itemsHtml || '<p class="admin-muted">No items yet.</p>') +
          "</section>"
        );
      }).join("");
    }

    function findRepeaterSchema(repeaters, targetPath, basePath) {
      basePath = basePath || "";
      for (var i = 0; i < (repeaters || []).length; i += 1) {
        var rep = repeaters[i];
        var current = basePath ? (basePath + "." + rep.key) : rep.key;
        var normalizedCurrent = current.replace(/\.\d+(?=\.|$)/g, "");
        var normalizedTarget = String(targetPath || "").replace(/\.\d+(?=\.|$)/g, "");
        if (normalizedCurrent === normalizedTarget) return rep;
        var arr = getPath(state, current);
        if (Array.isArray(arr) && rep.itemSchema && rep.itemSchema.repeaters) {
          for (var idx = 0; idx < arr.length; idx += 1) {
            var found = findRepeaterSchema(rep.itemSchema.repeaters, targetPath, current + "." + idx);
            if (found) return found;
          }
        }
      }
      return null;
    }

    function rerender() {
      var mount = qs("#typed-fields");
      if (!mount) return;
      mount.className = "typed-fields schema-form";
      mount.innerHTML =
        '<div class="schema-header"><p class="admin-muted">Visual Editor for ' + escapeHTML(schema.title || "Page") + '.</p></div>' +
        renderGroups(schema.groups || [], "") +
        renderRepeaters(schema.repeaters || [], "");
      var yamlPanel = qs("#raw-yaml-panel");
      if (yamlPanel) setYamlEditorValue(state);
    }

    function handleInput(event) {
      var target = event.target;
      if (!target || !target.getAttribute) return;
      if (target.hasAttribute("data-upload-input")) {
        return;
      }
      var typeHint = target.getAttribute("data-bind-type") || "";
      if (typeHint === "pageLink") {
        var linkPath = target.getAttribute("data-bind-path");
        var customInput = target.parentNode ? target.parentNode.querySelector('input[data-bind-type="pageLinkCustom"]') : null;
        if (target.value === "__custom__") {
          if (customInput) {
            customInput.style.display = "";
            setPath(state, linkPath, String(customInput.value || ""));
          } else {
            setPath(state, linkPath, "");
          }
        } else {
          if (customInput) customInput.style.display = "none";
          setPath(state, linkPath, String(target.value || ""));
        }
        setYamlEditorValue(state);
        return;
      }
      if (typeHint === "pageLinkCustom") {
        var customPath = target.getAttribute("data-bind-path");
        setPath(state, customPath, String(target.value || ""));
        setYamlEditorValue(state);
        return;
      }
      var path = target.getAttribute("data-bind-path");
      if (!path) return;
      var type = target.getAttribute("data-bind-type") || "text";
      var field = { type: type };
      var value = parseFieldValue(field, target.value, target);
      setPath(state, path, value);
      var label = target.closest("label");
      if (label && label.hasAttribute("data-invalid")) {
        var invalid = (value == null || value === "");
        if (invalid) label.setAttribute("data-invalid", "1");
        else label.removeAttribute("data-invalid");
      }
      setYamlEditorValue(state);
    }

    function handleRepeaterAction(event) {
      var btn = event.target.closest("[data-repeater-action]");
      if (!btn) return false;
      var action = btn.getAttribute("data-repeater-action");
      var path = btn.getAttribute("data-repeater-path");
      var rep = findRepeaterSchema(schema.repeaters || [], path, "");
      var arr = getPath(state, path);
      if (!Array.isArray(arr)) {
        arr = [];
        setPath(state, path, arr);
      }
      if (action === "add") {
        if (rep && rep.max && arr.length >= rep.max) return true;
        arr.push(buildEmptyItem((rep && rep.itemSchema) || { fields: [] }));
      } else if (action === "remove") {
        var idx = Number(btn.getAttribute("data-repeater-index"));
        if (Number.isFinite(idx) && idx >= 0 && idx < arr.length) {
          if (rep && rep.min && arr.length <= rep.min) {
            setStatus("#editor-status", (rep.label || "List") + " requires at least " + rep.min + " item(s).", true);
            return true;
          }
          arr.splice(idx, 1);
        }
      }
      rerender();
      return true;
    }

    async function handleUploadAction(event) {
      var btn = event.target.closest("[data-upload-button]");
      if (btn) {
        event.preventDefault();
        var fileInput = btn.parentNode ? btn.parentNode.querySelector("[data-upload-input]") : null;
        if (fileInput) fileInput.click();
        return true;
      }

      var input = event.target;
      if (!input || !input.hasAttribute || !input.hasAttribute("data-upload-input")) return false;
      var file = input.files && input.files[0];
      if (!file) return true;

      var path = input.getAttribute("data-bind-path");
      var fd = new FormData();
      fd.append("file", file);
      try {
        setStatus("#editor-status", "Uploading image...");
        var res = await apiUpload("/upload", fd);
        setPath(state, path, res.url || "");
        rerender();
        showToast("Image uploaded successfully.");
        setStatus("#editor-status", "Image uploaded.");
      } catch (err) {
        showToast(err.message || "Upload failed.", true);
        setStatus("#editor-status", err.message || "Upload failed.", true);
      } finally {
        input.value = "";
      }
      return true;
    }

    function collectRepeaterCounts(nodeSchema, basePath, out) {
      (nodeSchema.repeaters || []).forEach(function (rep) {
        var repPath = joinPath(basePath, rep.key);
        var arr = getPath(state, repPath);
        out[repPath.replace(/\.\d+(?=\.|$)/g, "")] = Array.isArray(arr) ? arr.length : 0;
        if (Array.isArray(arr)) {
          for (var i = 0; i < arr.length; i += 1) {
            collectRepeaterCounts(rep.itemSchema || {}, repPath + "." + i, out);
          }
        }
      });
    }

    function validateSchemaNode(nodeSchema, basePath, errors) {
      (nodeSchema.groups || []).forEach(function (group) {
        (group.fields || []).forEach(function (field) {
          if (!field.required) return;
          var fieldPath = joinPath(basePath, field.key);
          var value = getPath(state, fieldPath);
          if (value == null || value === "") {
            errors.push((field.label || fieldPath) + " is required.");
          }
        });
      });

      (nodeSchema.fields || []).forEach(function (field) {
        if (!field.required) return;
        var fieldPath = joinPath(basePath, field.key);
        var value = getPath(state, fieldPath);
        if (value == null || value === "") {
          errors.push((field.label || fieldPath) + " is required.");
        }
      });

      (nodeSchema.repeaters || []).forEach(function (rep) {
        var repPath = joinPath(basePath, rep.key);
        var arr = getPath(state, repPath);
        if (!Array.isArray(arr)) arr = [];
        if (rep.min && arr.length < rep.min) {
          errors.push((rep.label || rep.key) + " requires at least " + rep.min + " item(s).");
        }
        if (rep.max && arr.length > rep.max) {
          errors.push((rep.label || rep.key) + " allows at most " + rep.max + " item(s).");
        }
        for (var i = 0; i < arr.length; i += 1) {
          validateSchemaNode(rep.itemSchema || {}, repPath + "." + i, errors);
        }
      });
    }

    function bindEvents() {
      var mount = qs("#typed-fields");
      if (!mount || mount.__schemaBound) return;
      mount.__schemaBound = true;
      mount.addEventListener("input", function (event) {
        if (handleRepeaterAction(event)) return;
        handleInput(event);
      });
      mount.addEventListener("change", function (event) {
        var target = event.target;
        if (target && target.hasAttribute && target.hasAttribute("data-upload-input")) {
          handleUploadAction(event);
          return;
        }
        if (handleRepeaterAction(event)) return;
        handleInput(event);
      });
      mount.addEventListener("click", function (event) {
        var uploadBtn = event.target && event.target.closest ? event.target.closest("[data-upload-button]") : null;
        if (uploadBtn) {
          event.preventDefault();
          var fileInput = uploadBtn.parentNode ? uploadBtn.parentNode.querySelector("[data-upload-input]") : null;
          if (fileInput) fileInput.click();
          return;
        }
        if (handleRepeaterAction(event)) {
          event.preventDefault();
        }
      });
    }

    bindEvents();
    rerender();

    return {
      mode: "typed-pages-schema",
      getValue: function () { return deepClone(state); },
      setValue: function (next) { state = deepClone(next || {}); rerender(); },
      getRepeaterCounts: function () {
        var counts = {};
        collectRepeaterCounts(schema, "", counts);
        return counts;
      },
      validate: function () {
        var errors = [];
        validateSchemaNode(schema, "", errors);
        return errors;
      }
    };
  }

  function renderTypedFields(type, item) {
    var mount = qs("#typed-fields");
    if (!mount) return { mode: "json" };
    mount.className = "typed-fields";
    mount.innerHTML = "";

    function field(label, name, value, options) {
      options = options || {};
      var full = options.full ? " full" : "";
      var typeAttr = options.type || "text";
      if (options.kind === "textarea") {
        return '<label class="' + full + '"><span>' + escapeHTML(label) + '</span><textarea name="' + escapeHTML(name) + '" rows="' + (options.rows || 4) + '">' + escapeHTML(value || "") + '</textarea></label>';
      }
      if (options.kind === "select") {
        var opts = (options.options || []).map(function (opt) {
          var selected = String(opt) === String(value || "") ? " selected" : "";
          return '<option value="' + escapeHTML(opt) + '"' + selected + '>' + escapeHTML(opt) + "</option>";
        }).join("");
        return '<label class="' + full + '"><span>' + escapeHTML(label) + '</span><select name="' + escapeHTML(name) + '">' + opts + "</select></label>";
      }
      if (options.kind === "checkbox") {
        return '<label class="' + full + '"><span>' + escapeHTML(label) + '</span><input name="' + escapeHTML(name) + '" type="checkbox"' + (value ? " checked" : "") + "></label>";
      }
      return '<label class="' + full + '"><span>' + escapeHTML(label) + '</span><input name="' + escapeHTML(name) + '" type="' + escapeHTML(typeAttr) + '" value="' + escapeHTML(value || "") + '"></label>';
    }

    if (type === "events") {
      mount.innerHTML =
        '<div class="typed-grid">' +
          field("ID", "id", item.id) +
          field("Title", "title", item.title) +
          field("Start Datetime (ISO)", "start_datetime", item.start_datetime, { type: "text" }) +
          field("End Datetime (ISO)", "end_datetime", item.end_datetime, { type: "text" }) +
          field("Location", "location", item.location, { full: true }) +
          field("Register URL", "register_url", item.register_url, { full: true }) +
          field("Status", "status", item.status || "upcoming", { kind: "select", options: ["upcoming", "past", "cancelled"] }) +
          field("Featured", "featured", !!item.featured, { kind: "checkbox" }) +
          field("Description (Markdown)", "description_md", item.description_md, { kind: "textarea", rows: 6, full: true }) +
        '</div>';
      return { mode: "typed-events" };
    }

    if (type === "books") {
      mount.innerHTML =
        '<div class="typed-grid">' +
          field("ID", "id", item.id) +
          field("Title", "title", item.title) +
          field("Category", "category", item.category, { kind: "select", options: ["Bhagavad Gita", "Upanishads", "Value-based", "Life guidance"] }) +
          field("Available Count", "available_count", item.available_count, { type: "number" }) +
          field("Sponsor Suggested Amount", "sponsor_suggested_amount", item.sponsor_suggested_amount, { type: "number" }) +
          field("Cover Image", "cover_image", item.cover_image, { full: true }) +
          field("Description", "description", item.description, { kind: "textarea", rows: 5, full: true }) +
        '</div>';
      return { mode: "typed-books" };
    }

    if (type === "reports") {
      mount.innerHTML =
        '<div class="typed-grid">' +
          field("Month (YYYY-MM)", "month", item.month) +
          field("Donations Received Total", "donations_received_total", item.donations_received_total, { type: "number" }) +
          field("Expenses Used Total", "expenses_used_total", item.expenses_used_total, { type: "number" }) +
          field("Blood Units Collected", "blood_units_collected", item.blood_units_collected, { type: "number" }) +
          field("Books Distributed", "books_distributed", item.books_distributed, { type: "number" }) +
          field("Notes (Markdown)", "notes_md", item.notes_md, { kind: "textarea", rows: 6, full: true }) +
        '</div>';
      return { mode: "typed-reports" };
    }

    return { mode: "json" };
  }

  function normalizeDateTimeLocal(value) {
    var v = String(value || "").trim();
    if (!v) return "";
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return v;
    return v;
  }

  function slugifyText(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function eventDateKey(value) {
    var s = String(value || "").trim();
    var m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    var d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      var y = d.getFullYear();
      var mo = String(d.getMonth() + 1).padStart(2, "0");
      var da = String(d.getDate()).padStart(2, "0");
      return [y, mo, da].join("-");
    }
    return "";
  }

  function generateEventIdFromData(eventObj) {
    var base = slugifyText(eventObj && eventObj.title);
    var date = eventDateKey(eventObj && eventObj.start_datetime);
    if (base && date) return base + "-" + date;
    if (base) return base;
    if (date) return "event-" + date;
    return "event-" + Date.now();
  }

  function generateFieldId() {
    return "f_" + Math.random().toString(36).slice(2, 8);
  }

  function slugifyFieldId(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function normalizeEventEditorState(item) {
    var state = deepClone(item || {});
    if (!state.id) state.id = "";
    if (!state.title) state.title = "";
    if (!state.start_datetime) state.start_datetime = "";
    if (!state.end_datetime) state.end_datetime = "";
    if (!state.location) state.location = "";
    if (!state.description_md) state.description_md = "";
    if (!state.register_url) state.register_url = "";
    if (!state.status) state.status = "upcoming";
    state.featured = !!state.featured;
    if (!state.form || typeof state.form !== "object") state.form = {};
    state.form.enabled = !!state.form.enabled;
    if (state.form.title == null) state.form.title = "";
    if (state.form.submit_label == null) state.form.submit_label = "";
    if (state.form.success_message == null) state.form.success_message = "";
    if (!Array.isArray(state.form.fields)) state.form.fields = [];
    state.form.fields = state.form.fields.map(function (f) {
      var out = Object.assign({}, f || {});
      if (!out.id) out.id = generateFieldId();
      if (!out.type) out.type = "text";
      if (out.type === "short_text") out.type = "text";
      if (out.type === "long_text") out.type = "textarea";
      if (out.type === "phone") out.type = "tel";
      if (out.type === "dropdown") out.type = "select";
      if (out.type === "time") out.type = "text";
      if (!out.label) out.label = "";
      out.required = !!out.required;
      if (!Array.isArray(out.options)) out.options = [];
      if (out.placeholder == null) out.placeholder = "";
      return out;
    });
    return state;
  }

  function renderEventFormFieldBuilder(field, index) {
    var choiceTypes = ["select", "radio", "checkbox"];
    var supportsOptions = choiceTypes.indexOf(field.type) !== -1;
    var typeOptions = ["text", "textarea", "number", "tel", "email", "select", "radio", "checkbox", "date"]
      .map(function (t) {
        return '<option value="' + escapeHTML(t) + '"' + (t === field.type ? " selected" : "") + ">" + escapeHTML(t) + "</option>";
      }).join("");
    return (
      '<div class="repeater-item event-form-builder-item" data-event-form-index="' + index + '">' +
        '<div class="repeater-item-head">' +
          '<strong>Field ' + (index + 1) + '</strong>' +
          '<div class="repeater-item-actions">' +
            '<button type="button" class="admin-icon-btn" data-event-form-action="up" title="Move up">\u2191</button>' +
            '<button type="button" class="admin-icon-btn" data-event-form-action="down" title="Move down">\u2193</button>' +
            '<button type="button" class="admin-icon-btn" data-event-form-action="remove" title="Remove">\u00D7</button>' +
          '</div>' +
        '</div>' +
        '<div class="typed-grid">' +
          '<label><span>Field Type</span><select data-event-form-field="type">' + typeOptions + "</select></label>" +
          '<label class="full"><span>Label</span><input type="text" data-event-form-field="label" value="' + escapeHTML(field.label || "") + '"></label>' +
          '<label><span>Required</span><input type="checkbox" data-event-form-field="required"' + (field.required ? " checked" : "") + "></label>" +
          '<label class="full"><span>Placeholder (optional)</span><input type="text" data-event-form-field="placeholder" value="' + escapeHTML(field.placeholder || "") + '"></label>' +
          '<label class="full"' + (supportsOptions ? "" : ' style="display:none"') + ' data-event-form-options-wrap="1"><span>Options (one per line)</span><textarea rows="4" data-event-form-field="options">' + escapeHTML((field.options || []).join("\\n")) + "</textarea></label>" +
        "</div>" +
        '<small class="admin-muted">Field ID: ' + escapeHTML(field.id) + '</small>' +
      "</div>"
    );
  }

  function renderEventsTypedEditor(item, options) {
    var mount = qs("#typed-fields");
    if (!mount) return null;
    var state = normalizeEventEditorState(item);
    var isNew = !!(options && options.isNew);
    var idAuto = isNew && !state.id;
    if (!state.id) state.id = generateEventIdFromData(state);

    function rerender() {
      var fieldsHtml = state.form.fields.map(renderEventFormFieldBuilder).join("") || '<p class="admin-muted">No form fields yet.</p>';
      mount.className = "typed-fields";
      mount.innerHTML =
        '<div class="schema-group"><h3>Event Details</h3><div class="typed-grid">' +
          '<label class="full"><span>Event ID (auto)</span><div class="event-id-row"><code id="event-id-display">' + escapeHTML(state.id || "—") + '</code><button type="button" class="admin-btn admin-btn-secondary" data-event-id-regenerate="1">Regenerate ID</button></div><input type="hidden" name="id" value="' + escapeHTML(state.id || "") + '"></label>' +
          '<label><span>Title</span><input name="title" type="text" value="' + escapeHTML(state.title || "") + '" required></label>' +
          '<label><span>Start Datetime</span><input name="start_datetime" type="text" value="' + escapeHTML(state.start_datetime || "") + '" required></label>' +
          '<label><span>End Datetime</span><input name="end_datetime" type="text" value="' + escapeHTML(state.end_datetime || "") + '"></label>' +
          '<label class="full"><span>Location</span><input name="location" type="text" value="' + escapeHTML(state.location || "") + '"></label>' +
          '<label class="full"><span>Register URL (optional)</span><input name="register_url" type="text" value="' + escapeHTML(state.register_url || "") + '"></label>' +
          '<label><span>Status</span><select name="status">' +
            ["upcoming", "past", "cancelled"].map(function (s) { return '<option value="' + s + '"' + (s === state.status ? " selected" : "") + ">" + s + "</option>"; }).join("") +
          '</select></label>' +
          '<label><span>Featured</span><input name="featured" type="checkbox"' + (state.featured ? " checked" : "") + '></label>' +
          '<label class="full"><span>Description (Markdown / Plain)</span><textarea name="description_md" rows="6">' + escapeHTML(state.description_md || "") + '</textarea></label>' +
        '</div></div>' +
        '<section class="schema-group repeater-group">' +
          '<div class="repeater-head"><h3>Registration Form Builder</h3><button type="button" class="admin-btn admin-btn-secondary" data-event-form-action="add">Add Field</button></div>' +
          '<div class="typed-grid">' +
            '<label><span>Enable Form</span><input type="checkbox" name="form.enabled"' + (state.form.enabled ? " checked" : "") + '></label>' +
            '<label class="full"><span>Form Title</span><input type="text" name="form.title" value="' + escapeHTML(state.form.title || "") + '"></label>' +
            '<label><span>Submit Button Label</span><input type="text" name="form.submit_label" value="' + escapeHTML(state.form.submit_label || "") + '"></label>' +
            '<label class="full"><span>Success Message</span><input type="text" name="form.success_message" value="' + escapeHTML(state.form.success_message || "") + '"></label>' +
          '</div>' +
          '<div id="event-form-fields-builder">' + fieldsHtml + '</div>' +
        '</section>' +
        '<section class="schema-group"><h3>Submissions</h3><div class="typed-grid"><label class="full"><span>Actions</span><div class="event-id-row"><button type="button" class="admin-btn admin-btn-secondary" data-submissions-load="1">Load Submissions</button><a class="admin-btn admin-btn-secondary" target="_blank" rel="noopener" href="/api/events/' + encodeURIComponent(state.id || "__new__") + '/submissions/export.csv" id="event-submissions-export">Export CSV</a></div></label><label class="full"><span>Recent Submissions</span><textarea id="event-submissions-view" rows="8" readonly></textarea></label></div></section>';
    }

    function collectTopLevelFromDom() {
      var form = qs("#editor-form");
      var fd = new FormData(form);
      state.title = String(fd.get("title") || "").trim();
      state.start_datetime = String(fd.get("start_datetime") || "").trim();
      state.end_datetime = String(fd.get("end_datetime") || "").trim();
      state.location = String(fd.get("location") || "").trim();
      state.register_url = String(fd.get("register_url") || "").trim();
      state.status = String(fd.get("status") || "upcoming");
      var featuredInput = form.querySelector('input[name="featured"]');
      state.featured = !!(featuredInput && featuredInput.checked);
      state.description_md = String(fd.get("description_md") || "").trim();
      var formEnabledInput = form.querySelector('input[name="form.enabled"]');
      state.form.enabled = !!(formEnabledInput && formEnabledInput.checked);
      state.form.title = String(fd.get("form.title") || "").trim();
      state.form.submit_label = String(fd.get("form.submit_label") || "").trim();
      state.form.success_message = String(fd.get("form.success_message") || "").trim();
      if (idAuto) state.id = generateEventIdFromData(state);
      var hiddenId = form.querySelector('input[name="id"]');
      if (hiddenId) hiddenId.value = state.id || "";
      var idDisplay = qs("#event-id-display");
      if (idDisplay) idDisplay.textContent = state.id || "—";
      var exportLink = qs("#event-submissions-export");
      if (exportLink) exportLink.setAttribute("href", "/api/events/" + encodeURIComponent(state.id || "__new__") + "/submissions/export.csv");
    }

    function syncFormFieldsFromDom() {
      var wrappers = qsa("#event-form-fields-builder [data-event-form-index]");
      state.form.fields = wrappers.map(function (row) {
        var idx = Number(row.getAttribute("data-event-form-index"));
        var base = state.form.fields[idx] || {};
        var typeEl = row.querySelector('[data-event-form-field=\"type\"]');
        var labelEl = row.querySelector('[data-event-form-field=\"label\"]');
        var requiredEl = row.querySelector('[data-event-form-field=\"required\"]');
        var placeholderEl = row.querySelector('[data-event-form-field=\"placeholder\"]');
        var optionsEl = row.querySelector('[data-event-form-field=\"options\"]');
        var type = (typeEl && typeEl.value) || "text";
        var label = (labelEl && labelEl.value) || "";
        var required = !!(requiredEl && requiredEl.checked);
        var placeholder = (placeholderEl && placeholderEl.value) || "";
        var optionsText = (optionsEl && optionsEl.value) || "";
        return {
          id: base.id || "",
          type: type,
          label: String(label),
          required: required,
          placeholder: String(placeholder),
          options: String(optionsText).split(/\\r?\\n/).map(function (s) { return s.trim(); }).filter(Boolean)
        };
      });
      var seen = Object.create(null);
      state.form.fields = state.form.fields.map(function (f) {
        var shouldAuto = !f.id || /^f_/.test(String(f.id));
        var baseId = (shouldAuto ? (slugifyFieldId(f.label) || "") : String(f.id)) || generateFieldId();
        var nextId = baseId;
        var n = 2;
        while (seen[nextId]) {
          nextId = baseId + "-" + n;
          n += 1;
        }
        seen[nextId] = true;
        f.id = nextId;
        return f;
      });
    }

    function addField() {
      state.form.fields.push({ id: "", type: "text", label: "", required: false, placeholder: "", options: [] });
      rerender();
    }

    function moveField(index, dir) {
      var next = index + dir;
      if (index < 0 || index >= state.form.fields.length || next < 0 || next >= state.form.fields.length) return;
      var tmp = state.form.fields[index];
      state.form.fields[index] = state.form.fields[next];
      state.form.fields[next] = tmp;
      rerender();
    }

    function removeField(index) {
      if (index < 0 || index >= state.form.fields.length) return;
      state.form.fields.splice(index, 1);
      rerender();
    }

    mount.__eventsTypedBound = false;
    rerender();

    if (!mount.__eventsTypedBound) {
      mount.__eventsTypedBound = true;
      mount.addEventListener("input", function (event) {
        var t = event.target;
        if (!t) return;
        if (t.closest && t.closest("#event-form-fields-builder")) {
          if (t.getAttribute && t.getAttribute("data-event-form-field") === "type") {
            var row = t.closest("[data-event-form-index]");
            var optionsWrap = row ? row.querySelector("[data-event-form-options-wrap]") : null;
            if (optionsWrap) optionsWrap.style.display = (["select", "radio", "checkbox"].indexOf(t.value) !== -1) ? "" : "none";
          }
          syncFormFieldsFromDom();
        }
        if (t.name) collectTopLevelFromDom();
      });
      mount.addEventListener("change", function (event) {
        var t = event.target;
        if (t && t.name) collectTopLevelFromDom();
        if (t && t.closest && t.closest("#event-form-fields-builder")) syncFormFieldsFromDom();
      });
      mount.addEventListener("click", async function (event) {
        var btn = event.target.closest("[data-event-form-action],[data-event-id-regenerate],[data-submissions-load]");
        if (!btn) return;
        event.preventDefault();
        collectTopLevelFromDom();
        syncFormFieldsFromDom();
        if (btn.hasAttribute("data-event-id-regenerate")) {
          state.id = generateEventIdFromData(state);
          idAuto = false;
          rerender();
          return;
        }
        if (btn.hasAttribute("data-submissions-load")) {
          if (!state.id) return setStatus("#editor-status", "Save event first to view submissions.", true);
          try {
            var res = await api("/events/" + encodeURIComponent(state.id) + "/submissions", { method: "GET", headers: {} });
            var out = qs("#event-submissions-view");
            if (out) out.value = JSON.stringify(res.items || [], null, 2);
            setStatus("#editor-status", "Loaded " + ((res.items || []).length) + " submission(s).");
          } catch (e) {
            setStatus("#editor-status", e.message || "Failed to load submissions.", true);
          }
          return;
        }
        var row = btn.closest("[data-event-form-index]");
        var idx = row ? Number(row.getAttribute("data-event-form-index")) : -1;
        var action = btn.getAttribute("data-event-form-action");
        if (action === "add") return addField();
        if (action === "remove") return removeField(idx);
        if (action === "up") return moveField(idx, -1);
        if (action === "down") return moveField(idx, 1);
      });
    }

    return {
      mode: "typed-events-builder",
      getValue: function () {
        collectTopLevelFromDom();
        syncFormFieldsFromDom();
        if (!state.title) throw new Error("Event title is required.");
        if (!state.start_datetime) throw new Error("Start Datetime is required.");
        if (!state.id) state.id = generateEventIdFromData(state);
        return deepClone(state);
      },
      setValue: function (nextItem) {
        state = normalizeEventEditorState(nextItem);
        if (!state.id) state.id = generateEventIdFromData(state);
        rerender();
      }
    };
  }

  function buildPayloadFromTyped(type, baseItem) {
    var form = qs("#editor-form");
    var fd = new FormData(form);

    if (type === "events") {
      return Object.assign({}, baseItem, {
        id: String(fd.get("id") || "").trim(),
        title: String(fd.get("title") || "").trim(),
        start_datetime: normalizeDateTimeLocal(fd.get("start_datetime")),
        end_datetime: normalizeDateTimeLocal(fd.get("end_datetime")) || null,
        location: String(fd.get("location") || "").trim(),
        description_md: String(fd.get("description_md") || "").trim(),
        register_url: String(fd.get("register_url") || "").trim(),
        status: String(fd.get("status") || "upcoming"),
        featured: form.querySelector('input[name="featured"]').checked
      });
    }

    if (type === "books") {
      var sponsorAmt = String(fd.get("sponsor_suggested_amount") || "").trim();
      return Object.assign({}, baseItem, {
        id: String(fd.get("id") || "").trim(),
        title: String(fd.get("title") || "").trim(),
        category: String(fd.get("category") || "").trim(),
        available_count: Number(fd.get("available_count") || 0),
        cover_image: String(fd.get("cover_image") || "").trim(),
        description: String(fd.get("description") || "").trim(),
        sponsor_suggested_amount: sponsorAmt ? Number(sponsorAmt) : null
      });
    }

    if (type === "reports") {
      return Object.assign({}, baseItem, {
        month: String(fd.get("month") || "").trim(),
        donations_received_total: Number(fd.get("donations_received_total") || 0),
        expenses_used_total: Number(fd.get("expenses_used_total") || 0),
        blood_units_collected: Number(fd.get("blood_units_collected") || 0),
        books_distributed: Number(fd.get("books_distributed") || 0),
        notes_md: String(fd.get("notes_md") || "").trim()
      });
    }

    if (type === "pages") {
      var next = Object.assign({}, baseItem);
      next.title = String(fd.get("title") || "").trim();
      next.meta = Object.assign({}, next.meta, {
        title: String(fd.get("meta.title") || "").trim(),
        description: String(fd.get("meta.description") || "").trim()
      });
      next.hero = Object.assign({}, next.hero, {
        label: String(fd.get("hero.label") || "").trim(),
        title: String(fd.get("hero.title") || "").trim(),
        subtitle: String(fd.get("hero.subtitle") || "").trim(),
        intro: String(fd.get("hero.intro") || "").trim(),
        image: String(fd.get("hero.image") || "").trim()
      });
      return next;
    }

    return getJsonEditorValue();
  }

  async function initEditorPage() {
    if (!qs("#editor-form")) return;
    setupLogout();

    var params = getParams();
    var type = params.type;
    var slug = params.slug || params.id;
    var titleEl = qs("#editor-title");
    var subtitleEl = qs("#editor-subtitle");
    var form = qs("#editor-form");
    var jsonWrap = qs("#json-editor-wrap");
    var rawYamlPanel = qs("#raw-yaml-panel");
    var currentItem = null;
    var mode = "json";
    var pageSchemaForm = null;
    var eventsTypedEditor = null;
    var rawYamlDirty = false;
    var initialPageRepeaterCounts = null;

    if (!type) {
      setStatus("#editor-status", "Missing ?type= query parameter.", true);
      return;
    }

    if (titleEl) titleEl.textContent = "Editor: " + type;
    if (subtitleEl) subtitleEl.textContent = type === "settings" ? "Global Settings" : (slug ? (type + " / " + slug) : type);

    try {
      var response;
      if (type === "settings") {
        response = await api("/settings", { method: "GET", headers: {} });
      } else {
        if (!slug) throw new Error("Missing slug for collection item.");
        response = await api("/" + encodeURIComponent(type) + "/" + encodeURIComponent(slug), { method: "GET", headers: {} });
      }
      currentItem = response.item || {};
      if (type === "pages") {
        var schemas = window.PageSchemas && window.PageSchemas.schemas || {};
        var pageSchema = schemas[slug];
        if (pageSchema) {
          pageSchemaForm = renderPageSchemaForm(pageSchema, currentItem);
          mode = pageSchemaForm.mode;
          initialPageRepeaterCounts = pageSchemaForm.getRepeaterCounts ? pageSchemaForm.getRepeaterCounts() : null;
          setYamlEditorValue(currentItem);
          setStatus("#editor-status", "Schema editor loaded. Raw YAML is available under Advanced Raw YAML.");
        } else {
          pageSchemaForm = null;
          mode = "json";
          initialPageRepeaterCounts = null;
          setStatus("#editor-status", "No schema yet. Use Raw YAML mode.");
          setYamlEditorValue(currentItem);
        }
      } else {
        if (type === "events") {
          eventsTypedEditor = renderEventsTypedEditor(currentItem, { isNew: false });
          mode = eventsTypedEditor ? eventsTypedEditor.mode : "json";
          setYamlEditorValue(currentItem);
        } else {
          setJsonEditorValue(currentItem);
          var typed = renderTypedFields(type, currentItem);
          mode = typed.mode;
        }
      }
      if (jsonWrap) jsonWrap.classList.toggle("is-hidden", false);
    } catch (error) {
      if ((params.isNew && error && error.status === 404 && type !== "settings" && slug) || (params.isNew && type === "events" && !slug)) {
        currentItem = type === "reports" ? { month: slug } : { id: slug || "", title: "" };
        if (type === "pages") currentItem = { slug: slug, title: slug };
        if (type === "pages") {
          var schemasNew = window.PageSchemas && window.PageSchemas.schemas || {};
          var pageSchemaNew = schemasNew[slug];
          if (pageSchemaNew) {
            pageSchemaForm = renderPageSchemaForm(pageSchemaNew, currentItem);
            mode = pageSchemaForm.mode;
            initialPageRepeaterCounts = pageSchemaForm.getRepeaterCounts ? pageSchemaForm.getRepeaterCounts() : null;
            setYamlEditorValue(currentItem);
          } else {
            setYamlEditorValue(currentItem);
          }
        } else if (type === "events") {
          eventsTypedEditor = renderEventsTypedEditor(currentItem, { isNew: true });
          mode = eventsTypedEditor ? eventsTypedEditor.mode : "json";
          setYamlEditorValue(currentItem);
        } else {
          setJsonEditorValue(currentItem);
          var typedNew = renderTypedFields(type, currentItem);
          mode = typedNew.mode;
        }
        setStatus("#editor-status", "Creating new " + type.slice(0, -1) + " entry. Fill fields and save.");
      } else {
        setStatus("#editor-status", error.message || "Failed to load item.", true);
        return;
      }
    }

    var yamlEditor = qs("#json-editor");
    if (yamlEditor) {
      yamlEditor.addEventListener("input", function () {
        rawYamlDirty = true;
      });
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      var payload;
      try {
        if (type === "pages") {
          var useRawYaml = !!(rawYamlPanel && rawYamlPanel.open && rawYamlDirty);
          if (useRawYaml) {
            payload = getYamlEditorValue();
          } else if (pageSchemaForm) {
            var validationErrors = pageSchemaForm.validate ? pageSchemaForm.validate() : [];
            if (validationErrors.length) {
              setStatus("#editor-status", validationErrors[0], true);
              return;
            }
            payload = pageSchemaForm.getValue();
          } else {
            payload = getYamlEditorValue();
          }
          payload.slug = slug;
        } else if (type === "events" && eventsTypedEditor) {
          payload = eventsTypedEditor.getValue();
        } else {
          payload = mode === "json" ? getJsonEditorValue() : buildPayloadFromTyped(type, currentItem);
        }
      } catch (error) {
        setStatus("#editor-status", type === "pages" ? "Invalid YAML. Please correct and try again." : "Invalid JSON. Please correct and try again.", true);
        return;
      }

      setStatus("#editor-status", "Saving...");
      try {
        if (type === "settings") {
          await api("/settings", { method: "PUT", body: JSON.stringify(payload) });
        } else if (type === "events" && params.isNew) {
          var createRes = await api("/events", { method: "POST", body: JSON.stringify(payload) });
          if (createRes && createRes.slug) {
            params.isNew = false;
            slug = createRes.slug;
            if (subtitleEl) subtitleEl.textContent = type + " / " + slug;
            var nextUrl = "editor.html?type=events&slug=" + encodeURIComponent(slug);
            if (window.history && window.history.replaceState) window.history.replaceState({}, "", nextUrl);
          }
        } else {
          await api("/" + encodeURIComponent(type) + "/" + encodeURIComponent(slug), {
            method: "PUT",
            body: JSON.stringify(payload)
          });
        }
        currentItem = payload;
        if (type === "pages") {
          rawYamlDirty = false;
          if (pageSchemaForm) pageSchemaForm.setValue(currentItem);
          if (pageSchemaForm && pageSchemaForm.getRepeaterCounts) {
            initialPageRepeaterCounts = pageSchemaForm.getRepeaterCounts();
          }
          setYamlEditorValue(currentItem);
        } else if (type === "events" && eventsTypedEditor) {
          eventsTypedEditor.setValue(currentItem);
          setYamlEditorValue(currentItem);
        } else {
          setJsonEditorValue(currentItem);
        }
        setStatus("#editor-status", "Saved successfully.");
      } catch (error) {
        setStatus("#editor-status", error.message || "Save failed.", true);
      }
    });
  }

  initDashboardPage();
  initEditorPage();
})();
