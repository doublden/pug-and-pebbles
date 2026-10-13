(function (root) {
  'use strict';
  const TYPES = Object.freeze({
    crow: { row: 0, pecks: 6, interval: 1250, size: 98 },
    sparrow: { row: 2, pecks: 4, interval: 1600, size: 78 },
    pirate: { row: 4, pecks: 4, interval: 1600, size: 82 },
  });
  function choose(random = Math.random) {
    if (random() < 0.4) return 'crow';
    return random() < 0.005 ? 'pirate' : 'sparrow';
  }
  function curve(a, b, c, d, p) {
    const q = 1 - p;
    return q * q * q * a + 3 * q * q * p * b + 3 * q * p * p * c + p * p * p * d;
  }
  function position(bird, anchor, width, height) {
    const sign = bird.fromLeft ? 1 : -1,
      fromX = bird.fromLeft ? -110 : width + 110,
      fromY = height * bird.sky;
    if (bird.phase === 'in') {
      const p = bird.p;
      return {
        x: curve(fromX, width * (bird.fromLeft ? 0.12 : 0.88), anchor.x - sign * 85, anchor.x, p),
        y: curve(fromY, height * 0.1, anchor.y - 135, anchor.y, p),
        angle: sign * (1 - p) * 10,
      };
    }
    if (bird.phase === 'out') {
      const p = bird.p;
      return {
        x: curve(
          anchor.x,
          anchor.x + sign * 110,
          width * (bird.fromLeft ? 0.85 : 0.15),
          bird.fromLeft ? width + 110 : -110,
          p,
        ),
        y: curve(anchor.y, anchor.y - 80, height * 0.13, fromY, p),
        angle: sign * p * 10,
      };
    }
    return { x: anchor.x, y: anchor.y, angle: 0 };
  }
  function create(random = Math.random) {
    let clock = 0,
      next = 90000,
      bird = null,
      serial = 0,
      speed = 1,
      peckFactor = 1;
    const make = (type) => {
      const start = clock,
        flight = 1800 + random() * 800;
      return {
        id: ++serial,
        type,
        target: Math.floor(random() * 3),
        fromLeft: random() < 0.5,
        sky: 0.1 + random() * 0.2,
        start,
        flight,
        arrival: start + flight,
        interval: TYPES[type].interval * peckFactor,
        count: 0,
        lastPeck: -1,
        nextPeck: start + flight + 950,
      };
    };
    return {
      tick(delta, eligible) {
        if (eligible) clock += Math.max(0, Math.min(1000, delta));
        if (!bird && eligible && clock >= next) {
          bird = make(choose(random));
          next = clock + (110000 + random() * 80000) / speed;
        }
        let pecks = 0,
          spawned = false;
        if (bird) {
          spawned = !bird.announced;
          bird.announced = true;
          const type = TYPES[bird.type];
          while (eligible && clock >= bird.nextPeck && bird.count < type.pecks) {
            bird.count++;
            pecks++;
            bird.lastPeck = bird.nextPeck;
            bird.nextPeck += bird.interval;
          }
          const depart = bird.arrival + 950 + (type.pecks - 1) * bird.interval + 1200;
          if (clock >= depart + 1800) bird = null;
          else {
            const phase = clock < bird.arrival ? 'in' : clock >= depart ? 'out' : 'landed',
              p =
                phase === 'in'
                  ? (clock - bird.start) / bird.flight
                  : phase === 'out'
                    ? (clock - depart) / 1800
                    : 0,
              flaps = [0, 1, 2, 1];
            bird = {
              ...bird,
              phase,
              p,
              frameClock: clock,
              lastPeckAge: clock - bird.lastPeck,
              pose:
                phase === 'landed'
                  ? clock - bird.lastPeck < 220
                    ? 5
                    : clock - bird.lastPeck < 450
                      ? 6
                      : 4
                  : phase === 'in' && p > 0.9
                    ? 3
                    : flaps[Math.floor(clock / 110) % 4],
            };
          }
        }
        return { bird: bird ? { ...bird } : null, pecks, spawned };
      },
      chase(id) {
        if (!bird || bird.id !== id) return null;
        const old = { ...bird };
        bird = null;
        return old;
      },
      force(type) {
        if (!TYPES[type]) return false;
        bird = make(type);
        next = clock + (110000 + random() * 80000) / speed;
        return true;
      },
      configure(options = {}) {
        peckFactor = options.slowPeck ? 1.2 : 1;
      },
      setSpeed(value) {
        speed = [1, 3, 10].includes(value) ? value : 1;
        next = Math.min(next, clock + 90000 / speed);
      },
      getClock() {
        return clock;
      },
    };
  }
  const api = { TYPES, choose, position, create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PugBirds = api;
})(typeof window !== 'undefined' ? window : globalThis);
