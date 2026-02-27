(function () {
  "use strict";

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeType(type) {
    var t = String(type || "text").toLowerCase();
    var map = {
      short_text: "text",
      long_text: "textarea",
      phone: "tel",
      dropdown: "select"
    };
    return map[t] || t;
  }

  function fieldInputHtml(field) {
    var id = "evf_" + field.id;
    var type = normalizeType(field.type);
    var req = field.required ? " required" : "";
    var ph = field.placeholder ? ' placeholder="' + escapeHTML(field.placeholder) + '"' : "";
    var options = Array.isArray(field.options) ? field.options : [];

    if (type === "textarea") {
      return '<textarea id="' + id + '" name="' + escapeHTML(field.id) + '" rows="4"' + req + ph + '></textarea>';
    }
    if (type === "select") {
      var opts = ['<option value="">Select</option>'].concat(options.map(function (opt) {
        return '<option value="' + escapeHTML(opt) + '">' + escapeHTML(opt) + "</option>";
      })).join("");
      return '<select id="' + id + '" name="' + escapeHTML(field.id) + '"' + req + ">" + opts + "</select>";
    }
    if (type === "radio") {
      return '<div class="event-dyn-options">' + options.map(function (opt, idx) {
        var rid = id + "_" + idx;
        return '<label for="' + rid + '"><input id="' + rid + '" type="radio" name="' + escapeHTML(field.id) + '" value="' + escapeHTML(opt) + '"' + req + "> " + escapeHTML(opt) + "</label>";
      }).join("") + "</div>";
    }
    if (type === "checkbox") {
      return '<div class="event-dyn-options">' + options.map(function (opt, idx) {
        var cid = id + "_" + idx;
        return '<label for="' + cid + '"><input id="' + cid + '" type="checkbox" name="' + escapeHTML(field.id) + '" value="' + escapeHTML(opt) + '"> ' + escapeHTML(opt) + "</label>";
      }).join("") + "</div>";
    }
    var safeType = ["text", "number", "tel", "email", "date", "time"].indexOf(type) !== -1 ? type : "text";
    return '<input id="' + id + '" name="' + escapeHTML(field.id) + '" type="' + safeType + '"' + req + ph + ">";
  }

  function renderForm(containerEl, eventItem, submitUrlBase) {
    if (!containerEl) return null;
    var submitUrl = (submitUrlBase || "http://localhost:5050/api/forms/submit").replace(/\/+$/, "");
    var fields = (eventItem && eventItem.form && Array.isArray(eventItem.form.fields)) ? eventItem.form.fields : [];
    var html = '' +
      '<form class="notice-form" data-event-dynamic-form novalidate>' +
      '<div class="form-grid">';
    fields.forEach(function (field) {
      var type = normalizeType(field.type);
      var full = ["textarea", "select", "radio", "checkbox"].indexOf(type) !== -1;
      html += '<div class="form-field' + (full ? " form-field-full" : "") + '">' +
        '<label for="evf_' + escapeHTML(field.id) + '">' + escapeHTML(field.label || field.id) + (field.required ? " *" : "") + "</label>" +
        fieldInputHtml(field) +
      "</div>";
    });
    html += '</div><div class="form-actions">' +
      '<button type="submit" class="btn btn-primary">' + escapeHTML((eventItem && eventItem.form && eventItem.form.submit_label) || "Register") + "</button>" +
      '</div><p class="status-message" aria-live="polite" data-event-form-status></p></form>';
    containerEl.innerHTML = html;

    var formEl = containerEl.querySelector("form[data-event-dynamic-form]");
    var statusEl = containerEl.querySelector("[data-event-form-status]");
    if (!formEl) return null;

    formEl.addEventListener("submit", function (event) {
      event.preventDefault();
      var result = collectAnswers(formEl, eventItem);
      if (result.errors && result.errors.length) {
        if (statusEl) statusEl.textContent = result.errors[0];
        return;
      }
      if (statusEl) statusEl.textContent = "Submitting...";
      fetch(submitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventItem.id,
          event_title: eventItem.title || "",
          submitted_at: new Date().toISOString(),
          answers: result.answers || {},
          client: {
            user_agent: navigator.userAgent,
            referrer: window.location.href
          }
        })
      }).then(function (res) {
        return res.text().then(function (text) {
          var data = {};
          try { data = text ? JSON.parse(text) : {}; } catch (_e) {}
          if (!res.ok) throw new Error((data && data.error) || ("HTTP " + res.status));
          return data;
        });
      }).then(function () {
        if (statusEl) statusEl.textContent = (eventItem.form && eventItem.form.success_message) || "Thanks. We will contact you.";
        var controls = formEl.querySelectorAll("input, select, textarea, button");
        Array.prototype.forEach.call(controls, function (el) { el.disabled = true; });
      }).catch(function (err) {
        if (statusEl) statusEl.textContent = err && err.message ? err.message : "Submission failed.";
      });
    });

    return formEl;
  }

  function collectAnswers(formEl, eventItem) {
    var out = { answers: {}, errors: [] };
    var fields = (eventItem && eventItem.form && Array.isArray(eventItem.form.fields)) ? eventItem.form.fields : [];
    fields.forEach(function (field) {
      var type = normalizeType(field.type);
      var nodes = formEl.querySelectorAll('[name="' + String(field.id).replace(/"/g, '\\"') + '"]');
      var value;
      if (!nodes.length) {
        if (field.required) out.errors.push((field.label || field.id) + " is required.");
        return;
      }
      if (type === "checkbox") {
        value = Array.prototype.slice.call(nodes).filter(function (n) { return n.checked; }).map(function (n) { return n.value; });
      } else if (type === "radio") {
        var checked = Array.prototype.slice.call(nodes).find(function (n) { return n.checked; });
        value = checked ? checked.value : "";
      } else {
        value = nodes[0].value;
      }
      if (field.required) {
        var empty = Array.isArray(value) ? value.length === 0 : String(value || "").trim() === "";
        if (empty) out.errors.push((field.label || field.id) + " is required.");
      }
      if (type === "tel" && String(value || "").trim()) {
        var digits = String(value).replace(/\D/g, "");
        if (digits.length < 10) out.errors.push((field.label || field.id) + " must be at least 10 digits.");
      }
      out.answers[field.id] = value;
    });
    return out;
  }

  window.EventFormRenderer = {
    normalizeType: normalizeType,
    renderFormInto: function (formEl, eventItem) {
      var grid = formEl && formEl.querySelector ? formEl.querySelector(".form-grid") : null;
      if (!grid) return null;
      var tmp = document.createElement("div");
      var rendered = renderForm(tmp, eventItem, "http://localhost:5050/api/forms/submit");
      if (!rendered) return null;
      var newGrid = tmp.querySelector(".form-grid");
      var newActions = tmp.querySelector(".form-actions");
      var newStatus = tmp.querySelector("[data-event-form-status]");
      grid.innerHTML = newGrid ? newGrid.innerHTML : "";
      var oldActions = formEl.querySelector(".form-actions");
      if (oldActions && newActions) oldActions.innerHTML = newActions.innerHTML;
      var oldStatus = formEl.querySelector("#blood-form-status");
      if (oldStatus && newStatus) oldStatus.textContent = newStatus.textContent;
      return formEl;
    },
    renderForm: renderForm,
    collectAnswers: collectAnswers
  };
})();
