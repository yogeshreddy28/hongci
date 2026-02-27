"use strict";

const { fs, path, ensureSafeKey } = require("./_yamlFs");

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

class FormSubmissionsStore {
  constructor(options) {
    this.contentRoot = options.contentRoot;
    this.baseDir = path.join(this.contentRoot, "submissions");
  }

  _filePath(eventId) {
    return path.join(this.baseDir, ensureSafeKey(eventId, "event id") + ".jsonl");
  }

  append(eventId, record) {
    fs.mkdirSync(this.baseDir, { recursive: true });
    const fp = this._filePath(eventId);
    fs.appendFileSync(fp, JSON.stringify(record) + "\n", "utf8");
    return { filePath: fp };
  }

  list(eventId) {
    const fp = this._filePath(eventId);
    try {
      const text = fs.readFileSync(fp, "utf8");
      return text
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          try { return JSON.parse(line); } catch (_e) { return null; }
        })
        .filter(Boolean);
    } catch (e) {
      if (e && e.code === "ENOENT") return [];
      throw e;
    }
  }

  toCSV(eventId) {
    const rows = this.list(eventId);
    const keys = [];
    rows.forEach((row) => {
      const answers = row && row.answers && typeof row.answers === "object" ? row.answers : {};
      Object.keys(answers).sort().forEach((k) => {
        if (keys.indexOf(k) === -1) keys.push(k);
      });
    });
    const headers = ["submitted_at", "event_id", "event_title"].concat(keys);
    const lines = [headers.map(csvEscape).join(",")];
    rows.forEach((row) => {
      const answers = row && row.answers && typeof row.answers === "object" ? row.answers : {};
      const vals = [row.submitted_at || "", row.event_id || eventId, row.event_title || ""];
      keys.forEach((k) => {
        const v = answers[k];
        vals.push(Array.isArray(v) ? v.join(" | ") : (v == null ? "" : v));
      });
      lines.push(vals.map(csvEscape).join(","));
    });
    return lines.join("\n");
  }
}

module.exports = { FormSubmissionsStore };
