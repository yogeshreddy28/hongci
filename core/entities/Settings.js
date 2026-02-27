"use strict";

const { clone } = require("./_helpers");

class Settings {
  constructor(data) {
    const input = data && typeof data === "object" ? clone(data) : {};
    if (!input.donation || typeof input.donation !== "object") input.donation = {};
    if (!Array.isArray(input.donation.suggested_amounts)) input.donation.suggested_amounts = [];
    input.donation.suggested_amounts = input.donation.suggested_amounts.map(function (n) {
      const num = Number(n);
      return Number.isFinite(num) && num >= 0 ? num : 0;
    });
    this._data = input;
  }

  get donationPrompt() { return this._data.donation && this._data.donation.note ? this._data.donation.note : ""; }
  get upiId() { return this._data.donation && this._data.donation.upi_id ? this._data.donation.upi_id : ""; }
  get upiQrImage() { return this._data.donation && this._data.donation.upi_qr ? this._data.donation.upi_qr : ""; }
  get suggestedAmounts() { return (this._data.donation && this._data.donation.suggested_amounts) || []; }

  toJSON() { return clone(this._data); }
}

module.exports = { Settings };
