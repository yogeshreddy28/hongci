"use strict";

const { fs, path, readYAML, listYamlFiles } = require("./_yamlFs");

function toDateOnly(value) {
  if (!value) return "";
  const s = String(value);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

function normalizeEvent(filePath, fileName) {
  const data = readYAML(filePath) || {};
  const id = data.id || fileName.replace(/\.ya?ml$/i, "");
  return {
    id,
    title: data.title || id,
    start_datetime: data.start_datetime || data.startDateTime || "",
    end_datetime: data.end_datetime || data.endDateTime || "",
    date: toDateOnly(data.start_datetime || data.startDateTime || data.date || ""),
    location: data.location || "",
    description: data.description_md || data.description || data.excerpt || "",
    register_url: data.register_url || data.registerUrl || "events.html#blood-donation-registration",
    category: data.category || data.typeLabel || "COMMUNITY EVENT",
    status: data.status || "upcoming",
    featured: !!data.featured,
    form: data.form && typeof data.form === "object" ? data.form : undefined
  };
}

function compareByDateAsc(a, b) {
  const ad = String(a.date || "");
  const bd = String(b.date || "");
  if (ad && bd && ad !== bd) return ad.localeCompare(bd);
  return String(a.title || "").localeCompare(String(b.title || ""));
}

function buildEventsIndex(options) {
  const contentRoot = options.contentRoot;
  const eventsDir = path.join(contentRoot, "events");
  const outFile = path.join(eventsDir, "index.json");
  const items = listYamlFiles(eventsDir)
    .map((file) => normalizeEvent(path.join(eventsDir, file), file))
    .sort(compareByDateAsc);

  fs.mkdirSync(eventsDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(items, null, 2), "utf8");
  return { filePath: outFile, count: items.length, items };
}

module.exports = { buildEventsIndex };
