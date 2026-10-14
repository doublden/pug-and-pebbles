(function (root) {
  'use strict';
  function create() {
    let taps = [],
      last = -Infinity;
    const status = (now) => {
      if (now - last >= 500) taps = [];
      else taps = taps.filter((t) => now - t < 1000);
      const rate = taps.length;
      const tier = rate >= 8 ? 3 : rate >= 5 ? 2 : rate >= 3 ? 1 : 0;
      return { rate, tier, multiplier: 1 + [0, 0.05, 0.1, 0.2][tier] };
    };
    return {
      tap(now) {
        if (now - last >= 500) taps = [];
        taps.push(now);
        last = now;
        return status(now);
      },
      status,
      reset() {
        taps = [];
        last = -Infinity;
      },
    };
  }
  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PugCombo = api;
})(typeof window !== 'undefined' ? window : globalThis);
