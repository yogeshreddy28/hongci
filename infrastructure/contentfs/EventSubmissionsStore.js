"use strict";

const { fs, path, ensureSafeKey } = require("./_yamlFs");

function csvEscape(value) {
  var s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

class EventSubmissionsStore {
  constructor(options) {
    this.contentRoot = options.contentRoot;
    this.baseDir = path.join(this.contentRoot, "submissions");
  }

  _filePath(eventId) {
    return path.join(this.baseDir, ensureSafeKey(eventId, "event id") + ".jsonl");
  }

  ensureDir() {
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  append(eventId, record) {
    this.ensureDir();
    var filePath = this._filePath(eventId);
    fs.appendFileSync(filePath, JSON.stringify(record) + "\n", "utf8");
    return { filePath };
  }

  list(eventId) {
    var filePath = this._filePath(eventId);
    try {
      var text = fs.readFileSync(filePath, "utf8");
      return text
        .split(/\r?\n/)
        .filter(Boolean)
        .map(function (line) {
          try { return JSON.parse(line); } catch (_e) { return null; }
        })
        .filter(Boolean);
    } catch (e) {
      if (e && e.code === "ENOENT") return [];
      throw e;
    }
  }

  toCSV(eventId) {
    var rows = this.list(eventId);
    var fieldIds = [];
    rows.forEach(function (row) {
      var answers = row && row.answers && typeof row.answers === "object" ? row.answers : {};
      Object.keys(answers).forEach(function (k) {
        if (fieldIds.indexOf(k) === -1) fieldIds.push(k);
      });
    });
    var headers = ["eventId", "submittedAt"].concat(fieldIds);
    var lines = [headers.map(csvEscape).join(",")];
    rows.forEach(function (row) {
      var answers = row && row.answers && typeof row.answers === "object" ? row.answers : {};
      var vals = [row.eventId || eventId, row.submittedAt || ""];
      fieldIds.forEach(function (k) {
        var v = answers[k];
        if (Array.isArray(v)) vals.push(v.join(" | "));
        else vals.push(v == null ? "" : v);
      });
      lines.push(vals.map(csvEscape).join(","));
    });
    return lines.join("\n");
  }
}

module.exports = { EventSubmissionsStore };
