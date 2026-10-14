(function (root) {
  'use strict';
  const TYPES = Object.freeze(
    [
      { kind: 'sleep', weight: 30, duration: 8000 },
      { kind: 'whistle', weight: 20, duration: 7500 },
      { kind: 'backlook', weight: 20, duration: 8500 },
      { kind: 'stretch', weight: 14.8, duration: 6500 },
      { kind: 'hiccup', weight: 8, duration: 4200 },
      { kind: 'zoomies', weight: 7, duration: 5400 },
      { kind: 'pee', weight: 0.2, duration: 9500 },
    ].map(Object.freeze),
  );
  function choose(random = Math.random) {
    let n = random() * 100;
    for (const t of TYPES) {
      if (n < t.weight) return t;
      n -= t.weight;
    }
    return TYPES[TYPES.length - 1];
  }
  function create(random = Math.random) {
    let clock = 0,
      untouched = 0,
      next = 10000,
      event = null,
      serial = 0;
    return {
      tick(delta, playing) {
        let spawned = false;
        if (!playing) {
          untouched = 0;
          event = null;
          next = clock + 10000;
          return { event: null, spawned };
        }
        const dt = Math.min(1000, Math.max(0, delta));
        clock += dt;
        untouched += dt;
        if (event && clock >= event.start + event.duration) event = null;
        if (!event && untouched >= 10000 && clock >= next) {
          const type = choose(random);
          event = { ...type, id: ++serial, start: clock };
          next = clock + type.duration + 8000 + random() * 10000;
          spawned = true;
        }
        return { event: event ? { ...event, elapsed: clock - event.start } : null, spawned };
      },
      touch() {
        untouched = 0;
        event = null;
        next = clock + 10000;
      },
      force(kind) {
        const type = TYPES.find((t) => t.kind === kind);
        if (!type) return false;
        event = { ...type, id: ++serial, start: clock };
        untouched = 10000;
        next = clock + type.duration + 8000;
        return true;
      },
    };
  }
  const api = { TYPES, choose, create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PugIdle = api;
})(typeof window !== 'undefined' ? window : globalThis);
