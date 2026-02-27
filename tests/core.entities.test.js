"use strict";

const assert = require("assert");
const { Page, Event, Book, Report, Settings } = require("../core/entities");

assert.throws(() => new Page({ title: "x", blocks: [] }), /slug is required/);
assert.throws(() => new Event({ title: "Event" }), /id is required/);
assert.throws(() => new Book({ id: "b1", title: "Book", available_count: -1 }), /non-negative/);
assert.throws(() => new Report({ month: "2026/02" }), /YYYY-MM/);

const page = new Page({ slug: "home", title: "Home", blocks: [] });
assert.equal(page.slug, "home");

const event = new Event({ id: "ev", title: "Event" });
assert.equal(event.status, "upcoming");

const book = new Book({ id: "b", title: "Book", available_count: 5, sponsor_suggested_amount: 10 });
assert.equal(book.availableCount, 5);
assert.equal(book.sponsorSuggestedAmount, 10);

const report = new Report({ month: "2026-02", donations_received_total: 0, expenses_used_total: 0, blood_units_collected: 0, books_distributed: 0 });
assert.equal(report.month, "2026-02");

const settings = new Settings({ donation: { suggested_amounts: [101, "501"] } });
assert.deepEqual(settings.suggestedAmounts, [101, 501]);
