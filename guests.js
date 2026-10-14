(function (root) {
  'use strict';
  const HOME = 9;
  const TYPES = Object.freeze({
    butterfly: { min: 180000, max: 300000, reward: 10, life: 9000 },
    bee: { min: 240000, max: 420000, reward: 20, life: 8000 },
    yuppi: { min: 1200000, max: 2100000, reward: 100, life: 4300 },
  });
  const GUESTS = Object.freeze(['crow', 'sparrow', 'pirate', 'butterfly', 'bee', 'yuppi']);
  const BEDS = Object.freeze(
    [
      { id: 'box', home: 2, cost: 900, bonus: 'tap', factor: 1.02 },
      { id: 'socks', home: 3, cost: 4500, bonus: 'cooldown', factor: 0.97 },
      { id: 'moss', home: 4, cost: 20000, bonus: 'birdLoss', factor: 0.95 },
      { id: 'pumpkin', home: 6, cost: 120000, bonus: 'catch', factor: 1.05 },
      { id: 'stars', home: 8, cost: 1200000, bonus: 'helper', factor: 1.04 },
      { id: 'velvet', home: 10, cost: 15000000, bonus: 'expedition', factor: 1.04 },
      { id: 'raccoon', award: 'raccoon', bonus: 'birdLoss', factor: 0.9 },
      { id: 'feathers', award: 'crowboss', bonus: 'insect', factor: 1.05 },
      { id: 'paladin', award: 'paladin', bonus: 'helper', factor: 1.06 },
    ].map(Object.freeze),
  );
  function fresh() {
    return {
      guestWait: { butterfly: null, bee: null, yuppi: null },
      guestStats: Object.fromEntries(GUESTS.map((id) => [id, { seen: 0, caught: 0 }])),
      netPrice: null,
      netPrize: null,
      netBought: false,
      yuppiCaught: false,
      bigFart: 0,
      butterflies: 0,
      bees: 0,
      helperPets: 0,
      beds: [],
      bed: null,
      hiddenRevealed: false,
      newLifeUnlocked: false,
      newLifeFloor: 15,
    };
  }
  function create(waits, random = Math.random) {
    let serial = 0;
    const active = new Map();
    const make = (kind, test = false) => {
      const t = TYPES[kind],
        actor = {
          id: ++serial,
          kind,
          elapsed: 0,
          life: t.life,
          sky: kind === 'yuppi' ? 0.32 + random() * 0.09 : 0.31 + random() * 0.27,
          fromLeft: random() < 0.5,
          phase: random() * Math.PI * 2,
          paid: 0,
          test,
        };
      active.set(actor.id, actor);
      return actor;
    };
    return {
      tick(delta, playing, home, ready = true) {
        const spawned = [];
        if (!playing || !ready)
          return { actors: [...active.values()].map((a) => ({ ...a })), spawned };
        const dt = Math.min(1000, Math.max(0, Number.isFinite(delta) ? delta : 0));
        for (const [id, a] of active) {
          a.elapsed += dt;
          if (a.elapsed >= a.life) active.delete(id);
        }
        for (const kind of Object.keys(TYPES)) {
          if (kind === 'yuppi' && home < HOME) continue;
          const t = TYPES[kind];
          if (waits[kind] === null) waits[kind] = t.min + random() * (t.max - t.min);
          waits[kind] = Math.max(0, waits[kind] - dt);
          const busy = [...active.values()].some((a) =>
            kind === 'yuppi' ? a.kind === 'yuppi' : a.kind !== 'yuppi',
          );
          if (waits[kind] === 0 && !busy) {
            spawned.push({ ...make(kind) });
            waits[kind] = t.min + random() * (t.max - t.min);
          }
        }
        return { actors: [...active.values()].map((a) => ({ ...a })), spawned };
      },
      force(kind) {
        if (!TYPES[kind]) return null;
        for (const [id, a] of active)
          if (kind === 'yuppi' ? a.kind === kind : a.kind !== 'yuppi') active.delete(id);
        return { ...make(kind, true) };
      },
      get(id) {
        return active.get(id);
      },
      remove(id) {
        return active.delete(id);
      },
      clear() {
        active.clear();
      },
    };
  }
  function position(a, w, h) {
    const p = Math.min(1, a.elapsed / a.life),
      size = a.kind === 'yuppi' ? Math.min(w * 0.32, 155) : a.kind === 'bee' ? 56 : 68;
    return {
      x: (a.fromLeft ? -size : w + size) + (a.fromLeft ? 1 : -1) * (w + size * 2) * p,
      y: h * a.sky + Math.sin(p * Math.PI * 4 + a.phase) * (a.kind === 'yuppi' ? 5 : h * 0.035),
      size,
      angle: Math.sin(p * Math.PI * 3) * 0.08,
    };
  }
  const api = { HOME, TYPES, GUESTS, BEDS, fresh, create, position };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PugGuests = api;
})(typeof window === 'undefined' ? globalThis : window);
