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
  function match3(random = Math.random) {
    const size = 6;
    let elapsed = 0,
      points = 0,
      done = false,
      board = [],
      animation = null;
    const matches = () => {
      const out = new Set();
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = y * size + x,
            v = board[i];
          if (x <= size - 3 && v === board[i + 1] && v === board[i + 2]) {
            out.add(i);
            out.add(i + 1);
            out.add(i + 2);
          }
          if (y <= size - 3 && v === board[i + size] && v === board[i + size * 2]) {
            out.add(i);
            out.add(i + size);
            out.add(i + size * 2);
          }
        }
      return [...out];
    };
    const adjacent = (a, b) =>
      Number.isInteger(a) &&
      Number.isInteger(b) &&
      a >= 0 &&
      b >= 0 &&
      a < 36 &&
      b < 36 &&
      (Math.abs(a - b) === size ||
        (Math.floor(a / size) === Math.floor(b / size) && Math.abs(a - b) === 1));
    const moves = () => {
      for (let a = 0; a < 36; a++)
        for (const b of [a + 1, a + size])
          if (adjacent(a, b)) {
            [board[a], board[b]] = [board[b], board[a]];
            const yes = matches().length > 0;
            [board[a], board[b]] = [board[b], board[a]];
            if (yes) return true;
          }
      return false;
    };
    const fill = () => {
      for (let i = 0; i < 36; i++) {
        let choices = [0, 1, 2, 3, 4];
        const left = i % size >= 2 && board[i - 1] === board[i - 2] ? board[i - 1] : -1,
          up = i >= size * 2 && board[i - size] === board[i - size * 2] ? board[i - size] : -1;
        choices = choices.filter((v) => v !== left && v !== up);
        board[i] = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
      }
    };
    fill();
    if (!moves()) {
      board[0] = 0;
      board[1] = 1;
      board[2] = 0;
      board[7] = 0;
    }
    const settle = () => {
      const removed = new Set(animation.cells);
      for (let x = 0; x < size; x++) {
        const keep = [];
        for (let y = size - 1; y >= 0; y--) {
          const i = y * size + x;
          if (!removed.has(i)) keep.push(board[i]);
        }
        for (let y = size - 1; y >= 0; y--)
          board[y * size + x] =
            size - 1 - y < keep.length ? keep[size - 1 - y] : Math.min(4, Math.floor(random() * 5));
      }
      const cells = matches();
      if (cells.length) {
        points += cells.length;
        animation = { cells, start: elapsed };
      } else {
        animation = null;
        if (!moves()) {
          fill();
          if (!moves()) {
            board[0] = 0;
            board[1] = 1;
            board[2] = 0;
            board[7] = 0;
          }
        }
      }
    };
    return {
      swap(a, b) {
        if (done || animation || !adjacent(a, b)) return false;
        [board[a], board[b]] = [board[b], board[a]];
        const cells = matches();
        if (!cells.length) {
          [board[a], board[b]] = [board[b], board[a]];
          return false;
        }
        points += cells.length;
        animation = { cells, start: elapsed };
        return true;
      },
      tick(ms) {
        if (!done) {
          elapsed += Math.max(0, Math.min(100, ms));
          if (animation && elapsed - animation.start >= 260) settle();
          done = elapsed >= 45000;
        }
        return this.status();
      },
      status() {
        return {
          kind: 'match',
          board: [...board],
          points,
          elapsed,
          seconds: Math.ceil(Math.max(0, 45000 - elapsed) / 1000),
          done,
          score: Math.min(1, points / 90),
          animation: animation
            ? { ...animation, p: Math.min(1, (elapsed - animation.start) / 260) }
            : null,
        };
      },
    };
  }
  const api = { brush, catcher, match3 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PugMinigames = api;
})(typeof window !== 'undefined' ? window : globalThis);
