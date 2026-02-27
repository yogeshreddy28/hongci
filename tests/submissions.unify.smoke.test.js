"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { FormSubmissionsStore } = require("../infrastructure/contentfs/FormSubmissionsStore");
const { EventSubmissionsStore } = require("../infrastructure/contentfs/EventSubmissionsStore");

function readFile(fp) {
  return fs.readFileSync(fp, "utf8");
}

(function run() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hongci-submissions-"));
  const contentRoot = path.join(tmpRoot, "content");
  fs.mkdirSync(contentRoot, { recursive: true });

  const formStore = new FormSubmissionsStore({ contentRoot });
  const eventStore = new EventSubmissionsStore({ contentRoot });

  const eventId = "test-event-2026-03-08";
  formStore.append(eventId, {
    event_id: eventId,
    event_title: "Test Event",
    submitted_at: "2026-03-08T10:00:00.000Z",
    answers: { name: "Alice", phone: "9876543210" },
    client: { user_agent: "test", referrer: "http://127.0.0.1:8080/events.html" }
  });

  const expectedFile = path.join(contentRoot, "submissions", eventId + ".jsonl");
  assert(fs.existsSync(expectedFile), "submission file was not created in unified submissions path");

  const viaForms = formStore.list(eventId);
  const viaEvents = eventStore.list(eventId);
  assert.strictEqual(viaForms.length, 1, "forms store should read one row");
  assert.strictEqual(viaEvents.length, 1, "event store should read same unified row");
  assert.strictEqual(viaEvents[0].event_id || viaEvents[0].eventId, eventId);

  const csv = formStore.toCSV(eventId);
  assert(csv.includes("submitted_at,event_id,event_title"), "forms CSV should include stable headers");
  assert(csv.includes("Alice"), "forms CSV should include row values");

  const raw = readFile(expectedFile);
  assert(raw.includes("\"event_id\":\"" + eventId + "\""), "raw jsonl should include event_id");

  console.log("Smoke OK: unified submissions storage + CSV export");
})();

