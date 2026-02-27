"use strict";

function assertNonEmpty(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(field + " is required");
  }
  return value.trim();
}

function assertNonNegativeNumber(value, field) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(field + " must be a non-negative number");
  }
  return num;
}

function assertMonth(value, field) {
  const v = assertNonEmpty(value, field);
  if (!/^\d{4}-\d{2}$/.test(v)) throw new Error(field + " must be YYYY-MM");
  return v;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

module.exports = {
  assertNonEmpty,
  assertNonNegativeNumber,
  assertMonth,
  clone
};
