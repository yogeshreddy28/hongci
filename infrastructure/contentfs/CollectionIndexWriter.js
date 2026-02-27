"use strict";

const { fs, path, readYAML, listYamlFiles } = require("./_yamlFs");

function ensureIsoDatePart(value) {
  if (!value) return "";
  const s = String(value);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

class CollectionIndexWriter {
  constructor(options) {
    this.contentRoot = options.contentRoot;
  }

  _writeIndex(dirName, payload) {
    const filePath = path.join(this.contentRoot, dirName, "index.json");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  }

  writeBooksIndex() {
    const dir = path.join(this.contentRoot, "books");
    const items = listYamlFiles(dir).map((file) => {
      const fp = path.join(dir, file);
      const data = readYAML(fp);
      return {
        id: data.id || file.replace(/\.ya?ml$/i, ""),
        title: data.title || "",
        category: data.category || "",
        description: data.description || "",
        cover_image: data.cover_image || data.coverImage || "",
        available_count: data.available_count != null ? data.available_count : (data.availableCount != null ? data.availableCount : 0),
        sponsor_suggested_amount: data.sponsor_suggested_amount != null ? data.sponsor_suggested_amount : (data.sponsorSuggestedAmount != null ? data.sponsorSuggestedAmount : null),
        href: "books.html#request-book-form"
      };
    });
    this._writeIndex("books", { ok: true, items, lastUpdated: new Date().toISOString() });
  }

  writeEventsIndex() {
    const dir = path.join(this.contentRoot, "events");
    const items = listYamlFiles(dir).map((file) => {
      const fp = path.join(dir, file);
      const data = readYAML(fp);
      return {
        id: data.id || file.replace(/\.ya?ml$/i, ""),
        title: data.title || "",
        start_datetime: data.start_datetime || data.startDateTime || "",
        end_datetime: data.end_datetime || data.endDateTime || "",
        date: ensureIsoDatePart(data.start_datetime || data.startDateTime || ""),
        location: data.location || "",
        description_md: data.description_md || data.description || "",
        excerpt: data.excerpt || data.description_md || data.description || "",
        register_url: data.register_url || data.registerUrl || "events.html",
        status: data.status || "upcoming",
        featured: !!data.featured,
        typeLabel: data.typeLabel || "Community Event"
      };
    });
    this._writeIndex("events", { ok: true, items, lastUpdated: new Date().toISOString() });
  }

  writeReportsIndex() {
    const dir = path.join(this.contentRoot, "reports");
    const items = listYamlFiles(dir).map((file) => {
      const fp = path.join(dir, file);
      const data = readYAML(fp);
      return {
        month: data.month || file.replace(/\.ya?ml$/i, ""),
        donations_received_total: Number(data.donations_received_total || 0),
        expenses_used_total: Number(data.expenses_used_total || 0),
        blood_units_collected: Number(data.blood_units_collected || 0),
        books_distributed: Number(data.books_distributed || 0),
        notes_md: data.notes_md || "",
        attachments: Array.isArray(data.attachments) ? data.attachments : []
      };
    });
    items.sort((a, b) => String(b.month).localeCompare(String(a.month)));
    this._writeIndex("reports", { ok: true, items, lastUpdated: new Date().toISOString() });
  }
}

module.exports = { CollectionIndexWriter };
