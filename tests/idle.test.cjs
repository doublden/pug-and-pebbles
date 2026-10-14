const test = require('node:test'),
  assert = require('node:assert/strict'),
  { create, choose, TYPES } = require('../idle.js');
function advance(r, ms, active = true) {
  let out;
  for (let n = 0; n < ms; n += 100) out = r.tick(Math.min(100, ms - n), active);
  return out;
}
test('idle scenes wait ten seconds and any touch restarts the wait', () => {
  const r = create(() => 0.1);
  assert.equal(advance(r, 9900).event, null);
  assert.equal(advance(r, 100).event.kind, 'sleep');
  r.touch();
  assert.equal(advance(r, 9900).event, null);
  assert.ok(advance(r, 100).event);
});
test('modals/background cancel idle scenes and require a new full wait', () => {
  const r = create(() => 0.1);
  r.force('pee');
  assert.equal(r.tick(100, true).event.kind, 'pee');
  assert.equal(advance(r, 20000, false).event, null);
  assert.equal(advance(r, 9900).event, null);
  assert.ok(advance(r, 100).event);
});
test('rare toilet scene has probability 0.2%, normal scenes sum to 99.8%', () => {
  assert.ok(Math.abs(TYPES.reduce((a, b) => a + b.weight, 0) - 100) < 1e-10);
  assert.equal(choose(() => 0.9979).kind, 'zoomies');
  assert.equal(choose(() => 0.9981).kind, 'pee');
});
test('scene ends, touch cancels, developer force rejects unknown scenes', () => {
  const r = create(() => 0.1);
  r.force('pee');
  assert.equal(advance(r, 9400).event.kind, 'pee');
  assert.equal(advance(r, 100).event, null);
  r.force('sleep');
  r.touch();
  assert.equal(r.tick(100, true).event, null);
  assert.equal(r.force('other'), false);
});
