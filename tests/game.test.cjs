const test = require('node:test'),
  assert = require('node:assert/strict');
const {
  Amount,
  createGame,
  toolPower,
  price,
  trackPrice,
  PUG_BOOST,
  HOME_BOOST,
  TOOLS,
} = require('../game.js');
const funded = (value = 1e15, overrides = {}) =>
  createGame({
    version: 4,
    balance: new Amount(value).toJSON(),
    total: new Amount(value).toJSON(),
    clicks: 0,
    levels: [1, ...Array(11).fill(0)],
    pug: 0,
    home: 0,
    ...overrides,
  });
test('cheap lid arrives in 8 taps; teaspoon costs 30 resources and tools stay sequential', () => {
  const g = createGame();
  for (let i = 0; i < 7; i++) g.dig();
  assert.equal(g.buyTool(1), false);
  g.dig();
  assert.equal(g.buyTool(2), false);
  assert.equal(g.buyTool(1), true);
  for (let i = 0; i < 23; i++) g.dig();
  assert.equal(g.buyTool(2), false);
  g.dig();
  assert.equal(g.buyTool(2), true);
  assert.equal(g.dig().compare(2), 0);
  assert.equal(g.getState().clicks, 33);
});
test('spoons and spade retain original 2, 3, 5 yields; wooden spoon gives 4', () => {
  const g = funded();
  for (let i = 1; i <= 5; i++) {
    assert.equal(g.buyTool(i), true);
    assert.equal(g.getState().power.compare([1, 1.3, 2, 3, 4, 5][i]), 0);
  }
});
test('spending preserves total and cannot overdraw', () => {
  const g = funded(8);
  g.buyTool(1);
  assert.equal(g.buyTool(1), false);
  assert.equal(g.getState().total.compare(8), 0);
  assert.equal(g.getState().balance.compare(0), 0);
  assert.equal(g.upgrade('pug'), false);
});
test('25th tool level doubles normal growth', () => {
  assert.ok(Math.abs(toolPower(2, 25).toNumber() / toolPower(2, 24).toNumber() - 2.15) < 1e-10);
  assert.ok(price(30, 25).compare(price(30, 24)) > 0);
});
test('strongest owned tool remains equipped', () => {
  const g = funded();
  g.buyTool(1);
  for (let i = 0; i < 10; i++) g.buyTool(2);
  g.buyTool(3);
  assert.equal(g.getState().tool, 2);
});
test('pug and home independently improve yield', () => {
  const g = funded();
  g.upgrade('pug');
  assert.equal(g.getState().pugStage, 1);
  assert.equal(g.getState().homeStage, 0);
  assert.ok(Math.abs(g.dig().toNumber() - 1.08) < 1e-10);
  g.upgrade('home');
  assert.ok(Math.abs(g.dig().toNumber() - 1.1556) < 1e-10);
});
test('healthy purchase switches to stage 8 and survives reload', () => {
  const g = funded(310000, { pug: 7 });
  assert.equal(g.upgrade('pug'), true);
  assert.equal(g.getState().balance.compare(0), 0);
  assert.equal(g.getState().pugStage, 8);
  assert.equal(createGame(g.serialize()).getState().pugStage, 8);
  assert.ok(g.getAchievements().find((a) => a.id === 'healthy').unlocked);
});
test('all v2 stages and tool purchases retain balances and never reduce old production', () => {
  const oldPug = [1, 1.04, 1.1, 1.2, 1.35, 1.6, 1.9, 2.3, 2.8, 3.5],
    oldHome = [1, 1.03, 1.08, 1.15, 1.25, 1.4, 1.6, 1.9, 2.3, 3];
  for (let pug = 0; pug < 10; pug++)
    for (let home = 0; home < 10; home++) {
      const g = funded(98765, { version: 2, pug, home, levels: [1, 4, 2, 1, 0, 0, 0, 0, 0, 0] });
      assert.equal(g.restoreStatus, 'migrated');
      const s = g.getState();
      assert.equal(s.pug, pug === 0 ? 0 : pug === 1 ? 2 : pug === 2 ? 4 : pug + 5);
      assert.equal(s.home, home === 0 ? 0 : home === 1 ? 4 : home === 2 ? 5 : home + 4);
      assert.ok(
        PUG_BOOST[s.pug] * HOME_BOOST[s.home] >= oldPug[pug] * oldHome[home] - 1e-10,
      );
      assert.equal(s.balance.compare(98765), 0);
      assert.equal(s.levels[2], 4);
      assert.equal(s.levels[5], 1);
      assert.equal(s.levels[1], 1);
      assert.equal(s.levels[4], 1);
      assert.deepEqual(createGame(g.serialize()).serialize(), g.serialize());
    }
});
test('draft v3 saves map 13 pug / 12 homes once, preserving or increasing production', () => {
  const p = [1, 1.04, 1.1, 1.12, 1.14, 1.17, 1.2, 1.35, 1.6, 1.9, 2.3, 2.8, 3.5],
    h = [1, 1.01, 1.03, 1.08, 1.11, 1.15, 1.25, 1.4, 1.6, 1.9, 2.3, 3];
  for (let pug = 0; pug < 13; pug++)
    for (let home = 0; home < 12; home++) {
      const g = funded(100, { version: 3, pug, home, levels: [1, 2, 1, 0, 0, 0, 0, 0, 0, 0] });
      assert.ok(g.getState().power.toNumber() >= 3 * p[pug] * h[home] - 1e-8);
      assert.equal(g.getState().pug, pug === 0 ? 0 : pug === 1 ? 2 : pug + 2);
      assert.equal(g.getState().home, home === 0 ? 0 : home === 1 ? 2 : home + 2);
      assert.deepEqual(createGame(g.serialize()).serialize(), g.serialize());
    }
});
test('legacy infinite upgrades preserve boost counts', () => {
  const g = funded(1e25, { version: 2, pug: 25, home: 28 });
  assert.equal(g.getState().pug, 30);
  assert.equal(g.getState().home, 32);
  assert.ok(
    g.getState().power.toNumber() >= 3.5 * 1.05 ** 16 * 3 * 1.04 ** 19,
  );
});
test('trillion-priced royalty still allows further upgrades', () => {
  assert.equal(trackPrice(13, 'pug').compare(20e12), 0);
  assert.equal(trackPrice(12, 'home').compare(49e12), 0);
  const g = funded(1e18, { pug: 14, home: 13 });
  assert.ok(g.upgrade('pug'));
  assert.ok(g.upgrade('home'));
  assert.equal(g.getState().pugStage, 14);
  assert.equal(g.getState().homeStage, 13);
  assert.equal(g.getState().pug, 15);
});
test('scientific numbers retain enormous currency and power', () => {
  const a = Amount.log(400);
  assert.equal(a.add(a).m, 2);
  assert.equal(a.subtract(a).compare(0), 0);
  assert.equal(JSON.parse(JSON.stringify(a)).e, 400);
  const g = funded(1, {
    balance: { m: 1, e: 9000 },
    total: { m: 1, e: 9000 },
    levels: [1, 1, 15000, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  });
  assert.ok(g.getState().power.e > 308);
  assert.ok(g.buyTool(2));
  assert.ok(g.getState().balance.e >= 8999);
});
test('save snapshots are isolated and roundtrip unchanged', () => {
  const g = funded();
  g.buyTool(1);
  g.buyTool(2);
  g.upgrade('pug');
  g.dig(3);
  assert.deepEqual(
    createGame(JSON.parse(JSON.stringify(g.serialize()))).serialize(),
    g.serialize(),
  );
  const s = g.getState();
  s.levels[2] = 999;
  s.achievements.length = 0;
  assert.equal(g.getState().levels[2], 1);
  assert.ok(g.getState().achievements.includes('spoon'));
});
test('bad saves and commands cannot corrupt currency', () => {
  for (const save of [
    null,
    { version: 2, balance: { m: -1, e: 0 }, total: { m: 1, e: 0 } },
    { version: 4, balance: { m: 9, e: 8 }, total: { m: 1, e: 0 } },
  ])
    assert.equal(createGame(save).getState().balance.compare(0), 0);
  const g = createGame();
  for (const i of [-1, 0, 1.2, 100, NaN]) assert.equal(g.buyTool(i), false);
  assert.equal(g.upgrade('other'), false);
  assert.equal(g.dig(Infinity).compare(0), 0);
  assert.equal(g.dig(0).compare(0), 0);
  assert.equal(g.dig(9).compare(0), 0);
});
test('fractional leftover below one persists', () => {
  const g = funded(110.08);
  g.upgrade('pug');
  assert.ok(Math.abs(createGame(g.serialize()).getState().balance.toNumber() - 0.08) < 1e-9);
});
test('achievements award once, sneeze/fart add no income', () => {
  const g = createGame();
  g.dig();
  assert.deepEqual(g.takeAchievements(), ['first']);
  g.dig();
  assert.deepEqual(g.takeAchievements(), []);
  const before = g.getState();
  for (let i = 0; i < 100; i++) g.sneeze();
  g.fart();
  assert.equal(g.getState().balance.compare(before.balance), 0);
  assert.equal(g.getState().clicks, before.clicks);
  assert.deepEqual(g.takeAchievements(), ['sneezer']);
  g.claimBonus(8);
  assert.deepEqual(g.takeAchievements(), ['friend', 'jackpot']);
  assert.equal(g.claimBonus(7), false);
});
test('developer tools mark test progress and unlock prerequisite tools', () => {
  const g = createGame();
  g.devGrant(1e12);
  g.devStages(8, 7);
  g.devTool(6, 25);
  assert.ok(g.getState().testMode);
  assert.ok(
    g
      .getState()
      .levels.slice(1, 6)
      .every((n) => n >= 1),
  );
  assert.ok(g.dig(800).compare(0) > 0);
  assert.equal(g.dig(801).compare(0), 0);
  assert.equal(createGame(g.serialize()).restoreStatus, 'restored');
});
