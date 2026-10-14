(function (root) {
  'use strict';
  // One tab owns simulation/save writes. Other open tabs remain passive observers.
  function create(storage, key, id, clock = Date.now) {
    const read = () => {
      try {
        return JSON.parse(storage.getItem(key) || 'null');
      } catch (_) {
        return null;
      }
    };
    const write = () => {
      try {
        storage.setItem(key, JSON.stringify({ id, updated: clock() }));
        return true;
      } catch (_) {
        return true;
      }
    };
    return {
      owns() {
        const s = read();
        return !s || s.id === id || clock() - s.updated > 40000;
      },
      claim(force = false) {
        if (force || this.owns()) return write();
        return false;
      },
      heartbeat() {
        const s = read();
        if (this.owns() && (!s || clock() - s.updated > 3000)) write();
      },
    };
  }
  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PugSession = api;
})(typeof window !== 'undefined' ? window : globalThis);
