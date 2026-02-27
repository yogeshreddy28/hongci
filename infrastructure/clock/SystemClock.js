"use strict";

class SystemClock {
  nowIso() {
    return new Date().toISOString();
  }
}

module.exports = { SystemClock };
