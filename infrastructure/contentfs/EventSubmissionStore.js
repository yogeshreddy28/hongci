"use strict";

const { fs, path } = require("./_yamlFs");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

class EventSubmissionStore {
  constructor(options) {
    this.baseDir = path.join(options.contentRoot, "submissions", "events");
  }

  _filePath(eventId) {
    return path.join(this.baseDir, String(eventId) + ".jsonl");
  }

  append(eventId, record) {
    const fp = this._filePath(eventId);
    ensureDir(path.dirname(fp));
    const line = JSON.stringify(record) + "\n";
    fs.appendFileSync(fp, line, "utf8");
    return { filePath: fp };
  }

  list(eventId) {
    const fp = this._filePath(eventId);
    try {
      const text = fs.readFileSync(fp, "utf8");
      return text.split(/\r?\n/).filter(Boolean).map((line) => {
        try { return JSON.parse(line); } catch (_e) { return null; }
      }).filter(Boolean);
    } catch (e) {
      if (e && e.code === "ENOENT") return [];
      throw e;
    }
  }

  exportCsv(eventId) {
    const rows = this.list(eventId);
    const keys = new Set(["eventId", "submittedAt"]);
    rows.forEach((row) => {
      Object.keys((row && row.answers) || {}).forEach((k) => keys.add(k));
    });
    const cols = Array.from(keys);
    const header = cols.map(csvEscape).join(",");
    const lines = rows.map((row) => {
      const data = Object.assign({ eventId: row.eventId, submittedAt: row.submittedAt }, row.answers || {});
      return cols.map((c) => csvEscape(data[c])).join(",");
    });
    return [header].concat(lines).join("\n");
  }
}

module.exports = { EventSubmissionStore };
