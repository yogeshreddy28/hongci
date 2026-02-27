"use strict";

const { assertNonEmpty, assertNonNegativeNumber, clone } = require("./_helpers");

class Book {
  constructor(data) {
    const input = data && typeof data === "object" ? clone(data) : {};
    input.id = assertNonEmpty(input.id, "id");
    input.title = assertNonEmpty(input.title || input.id, "title");
    const countValue = input.available_count != null ? input.available_count : input.availableCount;
    if (countValue == null) input.available_count = 0;
    else input.available_count = assertNonNegativeNumber(countValue, "availableCount");

    const sponsor = input.sponsor_suggested_amount != null ? input.sponsor_suggested_amount : input.sponsorSuggestedAmount;
    if (sponsor != null && sponsor !== "") {
      input.sponsor_suggested_amount = assertNonNegativeNumber(sponsor, "sponsorSuggestedAmount");
    }
    this._data = input;
  }

  get id() { return this._data.id; }
  get title() { return this._data.title; }
  get category() { return this._data.category || ""; }
  get availableCount() { return this._data.available_count; }
  get sponsorSuggestedAmount() { return this._data.sponsor_suggested_amount ?? null; }
  get coverImage() { return this._data.cover_image || this._data.coverImage || ""; }
  get description() { return this._data.description || ""; }

  toJSON() { return clone(this._data); }
}

module.exports = { Book };
