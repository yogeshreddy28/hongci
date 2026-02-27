"use strict";

const assert = require("assert");
const usecases = require("../core/usecases");
const { Page, Event, Book, Report, Settings } = require("../core/entities");

function makeRepo(initialMap, EntityCtor, idField) {
  const store = new Map(Object.entries(initialMap || {}));
  return {
    async list() { return Array.from(store.values()).map((v) => new EntityCtor(v)); },
    async get(id) { const v = store.get(String(id)); return v ? new EntityCtor(v) : null; },
    async save(entity) { const raw = entity.toJSON(); store.set(String(raw[idField]), raw); },
    async getUpdatedAt(id) { return store.has(String(id)) ? "2026-02-23T00:00:00.000Z" : null; },
    _store: store
  };
}

module.exports = (async function () {
  const pageRepo = makeRepo({ home: { slug: "home", title: "Home", blocks: [] } }, Page, "slug");
  const routes = {
    getBaseUrl() { return "http://127.0.0.1:8080"; },
    listPages() { return [{ slug: "home", title: "Home", file: "index.html", enabled: true }]; },
    findPageBySlug(slug) { return slug === "home" ? { slug: "home", enabled: true } : null; }
  };

  const listPages = usecases.createListPages({ pageRepository: pageRepo, pageRoutes: routes });
  const pagesOut = await listPages();
  assert.equal(pagesOut.items.length, 1);
  assert.equal(pagesOut.items[0].previewUrl, "http://127.0.0.1:8080/index.html");

  const getPage = usecases.createGetPageBySlug({ pageRepository: pageRepo });
  assert.equal((await getPage({ slug: "home" })).item.slug, "home");

  const savePage = usecases.createSavePage({ pageRepository: pageRepo, pageRoutes: routes });
  await savePage({ slug: "home", title: "Home Updated", blocks: [] });
  assert.equal(pageRepo._store.get("home").title, "Home Updated");
  await assert.rejects(() => savePage({ slug: "ghost", title: "Ghost", blocks: [] }), /Invalid page slug/);

  const eventRepo = makeRepo({ ev1: { id: "ev1", title: "Event 1", status: "upcoming" } }, Event, "id");
  const listEvents = usecases.createListEvents({ eventRepository: eventRepo });
  assert.equal((await listEvents()).items.length, 1);
  const saveEvent = usecases.createSaveEvent({ eventRepository: eventRepo });
  await saveEvent({ id: "ev2", title: "Event 2" });

  const bookRepo = makeRepo({ b1: { id: "b1", title: "Book", available_count: 1 } }, Book, "id");
  await usecases.createSaveBook({ bookRepository: bookRepo })({ id: "b2", title: "Book 2", available_count: 2 });

  const reportRepo = makeRepo({ "2026-02": { month: "2026-02", donations_received_total: 0, expenses_used_total: 0, blood_units_collected: 0, books_distributed: 0 } }, Report, "month");
  await usecases.createSaveReport({ reportRepository: reportRepo })({ month: "2026-03", donations_received_total: 1, expenses_used_total: 0, blood_units_collected: 0, books_distributed: 0 });

  const settingsStore = { value: { donation: { suggested_amounts: [101] } } };
  const settingsRepo = {
    async get() { return new Settings(settingsStore.value); },
    async save(entity) { settingsStore.value = entity.toJSON(); }
  };
  const getSettings = usecases.createGetSettings({ settingsRepository: settingsRepo });
  assert.deepEqual((await getSettings()).item.suggestedAmounts, [101]);
  const saveSettings = usecases.createSaveSettings({ settingsRepository: settingsRepo });
  await saveSettings({ donation: { suggested_amounts: [51, 101] } });
  assert.deepEqual(settingsStore.value.donation.suggested_amounts, [51, 101]);
})();
