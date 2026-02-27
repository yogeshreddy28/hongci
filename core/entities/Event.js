"use strict";

const { assertNonEmpty, clone } = require("./_helpers");

class Event {
  constructor(data) {
    const input = data && typeof data === "object" ? clone(data) : {};
    input.id = assertNonEmpty(input.id, "id");
    input.title = assertNonEmpty(input.title || input.id, "title");
    if (input.status == null) input.status = "upcoming";
    this._data = input;
  }

  get id() { return this._data.id; }
  get title() { return this._data.title; }
  get date() { return this._data.start_datetime || this._data.date || null; }
  get location() { return this._data.location || ""; }
  get description() { return this._data.description_md || this._data.description || ""; }
  get status() { return this._data.status; }
  get registerUrl() { return this._data.register_url || this._data.registerUrl || ""; }

  toJSON() { return clone(this._data); }
}

module.exports = { Event };
