const test = require('node:test'),
  assert = require('node:assert/strict');
const { createGame, Amount, HATS, newLifeBoost, IDLE_KINDS } = require('../game.js');
const { create: bonuses, choose } = require('../bonuses.js');
const { create: birds } = require('../birds.js');
const funded = (overrides = {}) =>
  createGame({
    version: 5,
    balance: { m: 1, e: 18 },
    total: { m: 1, e: 18 },
    pug: 8,
    home: 7,
    levels: [1, 1, 1, ...Array(9).fill(0)],
    ...overrides,
  });
test('v4 saves preserve purchases and receive empty v5 collections exactly once', () => {
  const old = {
    version: 4,
    balance: { m: 1.999, e: 2 },
    total: { m: 3, e: 5 },
    pug: 4,
    home: 5,
    levels: [1, 1, 3, 1, 1, 2, ...Array(6).fill(0)],
  };
  const g = createGame(old);
  assert.equal(g.getState().balance.compare(199.9), 0);
  assert.equal(g.getState().pug, 4);
  assert.deepEqual(g.getState().levels, old.levels);
  assert.deepEqual(g.getState().hats, []);
  assert.equal(g.serialize().version, 5);
  assert.deepEqual(createGame(g.serialize()).serialize(), g.serialize());
});
test('ten hats: six gated purchases and four event-only unlocks', () => {
  assert.equal(HATS.length, 10);
  const g = funded({ pug: 0 });
  assert.equal(g.buyHat('carrot'), false);
  g.devStages(3, 0);
  assert.equal(g.buyHat('carrot'), true);
  const balance = g.getState().balance;
  assert.equal(g.buyHat('carrot'), false);
  assert.equal(g.getState().balance.compare(balance), 0);
  for (const h of HATS.slice(6)) assert.equal(g.buyHat(h.id), false);
});
test('only equipped hat applies a bonus; removing and restoring work', () => {
  const g = funded();
  const before = g.getState().power;
  g.buyHat('carrot');
  assert.equal(g.getState().power.compare(before.multiply(1.05)), 0);
  g.buyHat('frog');
  assert.equal(g.getState().power.compare(before), 0);
  g.equipHat('carrot');
  assert.equal(g.getState().power.compare(before.multiply(1.05)), 0);
  assert.equal(g.equipHat('pirate'), false);
  g.equipHat(null);
  assert.equal(g.getState().power.compare(before), 0);
  assert.deepEqual(createGame(g.serialize()).getState().hats, ['carrot', 'frog']);
});
test('pirate hat requires an actual pirate chase, other birds do not unlock it', () => {
  const g = funded();
  g.chaseBird('sparrow');
  g.chaseBird('crow');
  assert.equal(g.getState().hats.includes('pirate'), false);
  g.chaseBird('pirate');
  assert.ok(g.getState().hats.includes('pirate'));
  assert.ok(g.getState().achievements.includes('pirate'));
  g.chaseBird('pirate');
  assert.equal(g.getState().hats.filter((h) => h === 'pirate').length, 1);
});
test('big sneeze requires at least 99.5% actually opaque coverage, never lifetime sneeze count', () => {
  const g = funded();
  for (let i = 0; i < 200; i++) g.sneeze();
  assert.equal(g.getState().hats.includes('umbrella'), false);
  assert.equal(g.markCoverage(98, 100), false);
  assert.equal(g.markCoverage(994, 1000), false);
  assert.ok(g.markCoverage(995, 1000));
  assert.ok(g.getState().hats.includes('umbrella'));
});
test('all five observed idle scenes unlock wizard; duplicates and unknown scenes do nothing', () => {
  const g = funded();
  g.seeIdle('unknown');
  for (const kind of IDLE_KINDS.slice(0, 4)) g.seeIdle(kind);
  assert.equal(g.getState().hats.includes('nightcap'), false);
  g.seeIdle('sleep');
  g.seeIdle('pee');
  assert.ok(g.getState().hats.includes('nightcap'));
  assert.equal(g.getState().idleSeen.length, 5);
});
test('helper is gated and costs grow; autonomous income does not count as taps', () => {
  const g = funded({ pug: 3 });
  assert.equal(g.buyHelper(), false);
  g.devStages(4, 7);
  const cost = g.getHelperPrice();
  assert.equal(cost.compare(500), 0);
  assert.ok(g.buyHelper());
  assert.equal(g.getHelperPrice().compare(675), 0);
  const before = g.getState(),
    amount = g.work(1);
  assert.equal(amount.compare(before.power.multiply(0.15)), 0);
  assert.equal(g.getState().clicks, before.clicks);
  assert.equal(g.getState().balance.compare(before.balance.add(amount)), 0);
  assert.equal(g.work(-1).compare(0), 0);
  assert.equal(g.work(Infinity).compare(0), 0);
});
test('helper frame income is capped at one active second and ignores golden multipliers', () => {
  const g = funded();
  g.buyHelper();
  const normal = g.getState().helperRate;
  g.claimBonus(8);
  assert.equal(g.work(60).compare(normal), 0);
  g.buyHat('cap');
  assert.equal(g.getState().helperRate.compare(normal.multiply(1.1)), 0);
});
test('mini-game consumes saved cooldown on start, so reload and cancellation cannot farm rewards', () => {
  const g = funded();
  assert.ok(g.beginMini('brush', 1000));
  g.cancelMini();
  assert.equal(g.beginMini('brush', 2000), false);
  const reload = createGame(g.serialize());
  assert.equal(reload.beginMini('brush', 2000), false);
  assert.equal(reload.finishMini('brush', 1).compare(0), 0);
  assert.ok(reload.beginMini('brush', 601000));
});
test('mini-game rewards are bounded and use power at start, never boosted power after upgrades', () => {
  const g = funded();
  const p = g.getState().power;
  g.beginMini('brush', 0);
  g.upgrade('pug');
  g.devTool(11, 100);
  assert.equal(g.finishMini('brush', 1000).compare(p.multiply(30)), 0);
  assert.equal(g.finishMini('brush', 1).compare(0), 0);
  const g2 = funded();
  g2.beginMini('catch', 0);
  assert.equal(g2.finishMini('catch', 0.5).compare(g2.getState().power.multiply(10)), 0);
});
test('perfect catch unlocks saucepan; failed and partial runs never unlock it', () => {
  const g = funded();
  g.beginMini('catch', 0);
  g.finishMini('catch', 0.9, true);
  assert.equal(g.getState().hats.includes('pan'), false);
  g.beginMini('catch', 600000);
  g.finishMini('catch', 1, true);
  assert.ok(g.getState().hats.includes('pan'));
});
test('new life requires king, resets run and preserves collection, lifetime totals and cooldowns', () => {
  const g = funded();
  assert.equal(g.newLife(), false);
  g.devStages(14, 13);
  g.buyHat('carrot');
  g.buyHelper();
  g.chaseBird('pirate');
  g.beginMini('catch', 1000);
  g.cancelMini();
  const before = g.getState();
  assert.ok(g.newLife());
  const after = g.getState();
  assert.equal(after.balance.compare(0), 0);
  assert.equal(after.pug, 0);
  assert.equal(after.home, 0);
  assert.equal(after.helper, 0);
  assert.deepEqual(after.levels, [1, ...Array(11).fill(0)]);
  assert.deepEqual(after.hats, before.hats);
  assert.equal(after.total.compare(before.total), 0);
  assert.equal(after.miniNext.catch, before.miniNext.catch);
  assert.equal(after.lives, 1);
  assert.ok(after.achievements.includes('king'));
  assert.ok(after.achievements.includes('newlife'));
  assert.equal(g.newLife(), false);
});
test('new life has small diminishing bonus and finite +20% ceiling', () => {
  assert.equal(newLifeBoost(0), 1);
  assert.ok(newLifeBoost(1) > 1.019 && newLifeBoost(1) < 1.02);
  assert.ok(newLifeBoost(2) - newLifeBoost(1) < newLifeBoost(1) - 1);
  assert.ok(newLifeBoost(100000) <= 1.2);
});
test('frog extends coin time, pirate adds just one percentage point to x8', () => {
  const b = bonuses(() => 0.5);
  b.configure({ longBonus: true });
  b.force(2);
  b.catch(1);
  assert.equal(b.tick(0, true, 390, 844).seconds, 33);
  let count = 0;
  for (let i = 0; i < 10000; i++) if (choose(() => (i + 0.5) / 10000, true).value === 8) count++;
  assert.equal(count, 400);
});
test('winter hat caps loss at 85% of one tap', () => {
  const g = funded();
  g.buyHat('ushanka');
  const p = g.getState().power;
  assert.equal(g.birdPeck().compare(p.multiply(0.85)), 0);
});
