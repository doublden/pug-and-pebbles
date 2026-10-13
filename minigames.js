(function (root) {
  'use strict';
  // Pure simulations share active time with their UI; leaving the page pauses play.
  function brush() {
    let elapsed = 0,
      distance = 0,
      last = null,
      cells = new Set(),
      done = false;
    return {
      tick(ms) {
        elapsed += Math.max(0, Math.min(100, ms));
        done = done || elapsed >= 20000;
        return this.status();
      },
      move(x, y, time, width, height) {
        if (done || !Number.isFinite(x + y + time) || width <= 0 || height <= 0) return false;
        this.width = width * 14;
        const inside =
          x >= width * 0.12 && x <= width * 0.88 && y >= height * 0.12 && y <= height * 0.88;
        let shed = false;
        if (last && inside) {
          const dt = time - last.time,
            d = Math.hypot(x - last.x, y - last.y);
          if (dt > 0 && dt <= 200 && d / dt > 0.12) {
            distance += Math.min(d, width * 0.12);
            cells.add(
              Math.min(5, Math.floor((x / width) * 6)) +
                '-' +
                Math.min(5, Math.floor((y / height) * 6)),
            );
            shed = true;
          }
        }
        last = inside ? { x, y, time } : null;
        done = distance >= width * 14 && cells.size >= 12;
        return shed;
      },
      release() {
        last = null;
      },
      status() {
        return {
          kind: 'brush',
          elapsed,
          seconds: Math.ceil(Math.max(0, 20000 - elapsed) / 1000),
          progress: Math.min(1, distance / Math.max(1, this.width || 1)),
          distance,
          cells: cells.size,
          done,
        };
      },
      score(width) {
        return Math.min(1, distance / (width * 14)) * Math.min(1, cells.size / 12);
      },
    };
  }
  function catcher(random = Math.random) {
    let elapsed = 0,
      next = 500,
      serial = 0,
      lane = 0,
      caught = 0,
      missed = 0,
      items = [],
      done = false;
    return {
      select(value) {
        if (Number.isInteger(value) && value >= 0 && value < 4) lane = value;
      },
      tick(ms) {
        if (done) return this.status();
        elapsed += Math.max(0, Math.min(100, ms));
        if (serial < 24 && elapsed >= next) {
          const travel = 2600 - serial * 20;
          items.push({ id: ++serial, lane: Math.floor(random() * 4), start: elapsed, travel });
          next += 1150;
        }
        for (const item of items)
          if (!item.finished && elapsed >= item.start + item.travel) {
            item.finished = true;
            if (lane === item.lane) caught++;
            else missed++;
          }
        items = items.filter((i) => !i.finished);
        done = missed >= 3 || (serial === 24 && !items.length);
        return this.status();
      },
      status() {
        return {
          kind: 'catch',
          elapsed,
          lane,
          caught,
          missed,
          done,
          items: items.map((i) => ({ ...i, p: Math.min(1, (elapsed - i.start) / i.travel) })),
          score: caught / 24,
          perfect: done && caught === 24 && missed === 0,
        };
      },
    };
  }
  const api = { brush, catcher };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PugMinigames = api;
})(typeof window !== 'undefined' ? window : globalThis);
