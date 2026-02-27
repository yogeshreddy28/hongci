"use strict";

const { assertMonth, assertNonNegativeNumber, clone } = require("./_helpers");

class Report {
  constructor(data) {
    const input = data && typeof data === "object" ? clone(data) : {};
    input.month = assertMonth(input.month, "month");
    input.donations_received_total = assertNonNegativeNumber(input.donations_received_total || 0, "donationsTotal");
    input.expenses_used_total = assertNonNegativeNumber(input.expenses_used_total || 0, "expensesTotal");
    input.blood_units_collected = assertNonNegativeNumber(input.blood_units_collected || 0, "bloodUnitsCollected");
    input.books_distributed = assertNonNegativeNumber(input.books_distributed || 0, "booksDistributed");
    if (!Array.isArray(input.attachments)) input.attachments = [];
    this._data = input;
  }

  get id() { return this._data.month; }
  get month() { return this._data.month; }
  get donationsTotal() { return this._data.donations_received_total; }
  get expensesTotal() { return this._data.expenses_used_total; }
  get bloodUnitsCollected() { return this._data.blood_units_collected; }
  get booksDistributed() { return this._data.books_distributed; }
  get notes() { return this._data.notes_md || ""; }
  get attachments() { return this._data.attachments; }

  toJSON() { return clone(this._data); }
}

module.exports = { Report };
