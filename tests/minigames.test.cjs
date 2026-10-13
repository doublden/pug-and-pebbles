const test = require('node:test'),
  assert = require('node:assert/strict');
const { brush, catcher } = require('../minigames.js');
test('brush ignores tapping and slow motion, caps jumps and requires coverage', () => {
  const b = brush();
  b.move(100, 100, 0, 390, 500);
  for (let i = 1; i <= 20; i++) b.move(100, 100, i * 50, 390, 500);
  assert.equal(b.score(390), 0);
  b.move(101, 100, 1050, 390, 500);
  assert.equal(b.score(390), 0);
  b.move(340, 100, 1100, 390, 500);
  assert.ok(b.score(390) < 0.01);
});
test('brush ends after 20 seconds and refuses further input', () => {
  const b = brush();
  for (let i = 0; i < 200; i++) b.tick(100);
  assert.ok(b.status().done);
  assert.equal(b.move(200, 200, 20001, 390, 500), false);
});
test('catcher perfect run has exactly 24 food items and max score one', () => {
  const c = catcher(() => 0.5);
  c.select(2);
  let s;
  for (let i = 0; i < 400; i++) {
    s = c.tick(100);
    if (s.done) break;
  }
  assert.equal(s.caught, 24);
  assert.equal(s.missed, 0);
  assert.equal(s.score, 1);
  assert.ok(s.perfect);
  assert.deepEqual(c.tick(100), s);
});
test('three missed food items end run; invalid lane does not change bowl', () => {
  const c = catcher(() => 0.9);
  c.select(99);
  assert.equal(c.status().lane, 0);
  let s;
  for (let i = 0; i < 150; i++) {
    s = c.tick(100);
    if (s.done) break;
  }
  assert.equal(s.missed, 3);
  assert.equal(s.caught, 0);
  assert.ok(s.done);
  assert.equal(s.perfect, false);
});
