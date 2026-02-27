"use strict";

const { assertNonEmpty, clone } = require("./_helpers");

class Page {
  constructor(data) {
    const input = data && typeof data === "object" ? clone(data) : {};
    input.slug = assertNonEmpty(input.slug, "slug");
    input.title = assertNonEmpty(input.title || input.slug, "title");
    if (input.blocks != null && !Array.isArray(input.blocks)) {
      throw new Error("blocks must be an array");
    }
    if (!Array.isArray(input.blocks)) input.blocks = [];
    this._data = input;
  }

  get slug() { return this._data.slug; }
  get title() { return this._data.title; }
  get blocks() { return this._data.blocks; }
  get updatedAt() { return this._data.updatedAt || null; }

  toJSON() { return clone(this._data); }
}

module.exports = { Page };
