const test = require('node:test'),
  assert = require('node:assert/strict');
const { createGame, Amount, HATS, ACHIEVEMENTS } = require('../game.js'),
  Secrets = require('../guests.js');
const funded = (extra = {}) =>
  createGame(
    {
      version: 9,
      levels: [1, ...Array(11).fill(0)],
      balance: 1e20,
      total: 1e20,
      pug: 9,
      home: 9,
      ...extra,
    },
    () => 0,
  );
function advance(g, ms, playing = true) {
  let r;
  for (let i = 0; i < ms; i += 1000) r = g.tickGuests(Math.min(1000, ms - i), playing, true);
  return r;
}
function spawn(g, kind) {
  const s = g.serialize();
  s.guestWait = { butterfly: 1e7, bee: 1e7, yuppi: 1e7, [kind]: 0 };
  const clone = createGame(s, () => 0);
  return { g: clone, a: clone.tickGuests(0, true, true).actors.find((a) => a.kind === kind) };
}
test('guest clocks pause in menus, while assets load and before Yuppi home gate', () => {
  const w = Secrets.fresh().guestWait,
    r = Secrets.create(w, () => 0);
  r.tick(1000, false, 9);
  assert.deepEqual(w, { butterfly: null, bee: null, yuppi: null });
  r.tick(1000, true, 9, false);
  assert.equal(w.yuppi, null);
  r.tick(1000, true, 8);
  assert.equal(w.yuppi, null);
  assert.equal(w.butterfly, 179000);
  r.tick(Infinity, true, 8);
  assert.equal(w.butterfly, 179000);
});
test('scheduler holds at most one insect and one Yuppi, including repeated developer calls', () => {
  const r = Secrets.create(Secrets.fresh().guestWait, () => 0);
  for (let i = 0; i < 100; i++) {
    r.force('butterfly');
    r.force('bee');
    r.force('yuppi');
  }
  assert.equal(r.tick(0, false, 9).actors.length, 2);
});
test('natural insects pay their fixed 10P/20P once without combo or coins', () => {
  for (const [kind, n] of [
    ['butterfly', 10],
    ['bee', 20],
  ]) {
    const { g, a } = spawn(funded(), kind),
      p = g.getState().power;
    g.claimBonus(8);
    const r = g.claimGuest(a.id);
    assert.equal(r.amount.compare(p.multiply(n)), 0);
    assert.equal(g.claimGuest(a.id), null);
    assert.equal(g.getState().guestStats[kind].caught, 1);
  }
});
test('insect reward is locked on spawn even after tool upgrade or hat change', () => {
  const { g, a } = spawn(funded(), 'bee'),
    p = g.getState().power;
  g.devTool(11, 100);
  assert.equal(g.claimGuest(a.id).amount.compare(p.multiply(20)), 0);
});
test('Yuppi pays only three 100P taps; fourth and expired/reloaded actors pay nothing', () => {
  const { g, a } = spawn(funded(), 'yuppi'),
    p = g.getState().power;
  for (let i = 0; i < 3; i++) assert.equal(g.claimGuest(a.id).amount.compare(p.multiply(100)), 0);
  assert.equal(g.claimGuest(a.id), null);
  assert.equal(createGame(g.serialize()).claimGuest(a.id), null);
  advance(g, 5000);
  assert.equal(g.claimGuest(a.id), null);
});
test('Yuppi net price/prize fixed at first unlock and never scales after upgrades', () => {
  const g = funded({ home: 8 });
  assert.equal(g.netOffer().visible, false);
  g.upgrade('home');
  const o = g.netOffer();
  g.devTool(11, 100);
  assert.equal(g.netOffer().price.compare(o.price), 0);
  assert.equal(g.netOffer().prize.compare(o.prize), 0);
  assert.equal(o.prize.compare(o.price.multiply(1.5)), 0);
});
test('net is one purchase, one catch, retained by reload and New life', () => {
  let g = funded({ pug: 15 });
  assert.equal(g.buyNet(), true);
  assert.equal(g.buyNet(), false);
  const o = g.netOffer();
  let x = spawn(g, 'yuppi');
  g = x.g;
  assert.equal(g.claimGuest(x.a.id).amount.compare(o.prize), 0);
  assert.ok(g.getState().hats.includes('yogurt'));
  assert.equal(g.claimGuest(x.a.id), null);
  x = spawn(g, 'yuppi');
  g = x.g;
  assert.equal(g.claimGuest(x.a.id).amount.compare(g.getState().power.multiply(100)), 0);
  assert.ok(g.newLife());
  const restored = createGame(g.serialize()).getState();
  assert.ok(restored.netBought && restored.yuppiCaught);
  assert.ok(restored.hats.includes('yogurt'));
});
test('missing a Yuppi flight never consumes the purchased net', () => {
  const g = funded();
  g.buyNet();
  const x = spawn(g, 'yuppi');
  advance(x.g, 5000);
  assert.equal(x.g.getState().yuppiCaught, false);
  assert.equal(x.g.getState().netBought, true);
});
test('all forced guests have zero reward, no counters, no hats, no net consumption', () => {
  const g = funded();
  g.buyNet();
  const before = g.getState();
  for (const kind of Object.keys(Secrets.TYPES)) {
    const a = g.devGuest(kind);
    g.tickGuests(0, true);
    const r = g.claimGuest(a.id);
    assert.ok(r.test);
    assert.equal(r.amount.compare(0), 0);
  }
  const after = g.getState();
  assert.equal(after.balance.compare(before.balance), 0);
  assert.equal(after.yuppiCaught, false);
  assert.equal(after.butterflies, 0);
  assert.equal(after.bees, 0);
  assert.deepEqual(after.guestStats, before.guestStats);
});
test('forced pirates do not unlock secret hat or album', () => {
  const g = funded();
  g.observeBird('pirate', true);
  g.chaseBird('pirate', true);
  assert.equal(g.getState().hats.includes('pirate'), false);
  assert.equal(g.getState().guestStats.pirate.seen, 0);
});
test('natural 50 butterflies and 100 bees unlock their hats exactly at target', () => {
  for (const [kind, target, hat] of [
    ['butterfly', 50, 'butterfly'],
    ['bee', 100, 'bee'],
  ]) {
    let g = funded();
    for (let i = 0; i < target; i++) {
      const x = spawn(g, kind);
      g = x.g;
      g.claimGuest(x.a.id);
      if (i < target - 1) assert.equal(g.getState().hats.includes(hat), false);
    }
    assert.ok(g.getState().hats.includes(hat));
  }
});
test('butterfly hat boosts only insect spawn rewards by 20%', () => {
  const g = funded({ hats: ['butterfly'], hat: 'butterfly' });
  const { g: h, a } = spawn(g, 'butterfly');
  assert.equal(h.claimGuest(a.id).amount.compare(h.getState().power.multiply(12)), 0);
  const y = spawn(g, 'yuppi');
  assert.equal(y.g.claimGuest(y.a.id).amount.compare(y.g.getState().power.multiply(100)), 0);
});
test('poop hat averages a manual-only bonus and can be removed', () => {
  const g = funded({ hats: ['poop'], hat: 'poop' }),
    p = g.getState().power;
  assert.equal(g.dig().compare(p.multiply(2)), 0);
  assert.equal(g.work(1).compare(0), 0);
  g.equipHat(null);
  assert.equal(g.dig().compare(p), 0);
});
test('big fart achievement requires >=99.5% actual opaque screen coverage', () => {
  const g = funded();
  assert.equal(g.markFartCoverage(994, 1000), false);
  assert.equal(g.markFartCoverage(995, 1000), true);
  assert.equal(g.markFartCoverage(1000, 1000), false);
  assert.ok(g.getState().hats.includes('poop'));
  assert.equal(g.markFartCoverage(Infinity, 1000), false);
});
test('one bed bonus applies, secret beds cannot be purchased and collection survives New life', () => {
  const g = funded({ pug: 15 }),
    p = g.getState().power;
  assert.ok(g.buyBed('box'));
  assert.equal(g.getState().power.compare(p.multiply(1.02)), 0);
  assert.ok(g.buyBed('stars'));
  assert.equal(g.getState().power.compare(p), 0);
  assert.equal(g.buyBed('paladin'), false);
  assert.equal(g.equipBed('paladin'), false);
  assert.ok(g.newLife());
  assert.ok(g.getState().beds.includes('box'));
  assert.equal(g.newLife(), false);
});
test('secret beds require real trophies/owned paladin; legacy grandfather gates give no trophy', () => {
  const g = createGame({
    version: 8,
    balance: 0,
    total: 0,
    pug: 14,
    home: 13,
    levels: [1, ...Array(11).fill(0)],
  });
  assert.equal(g.getState().beds.includes('raccoon'), false);
  assert.equal(g.getState().beds.includes('feathers'), false);
  const p = funded({ weapons: [1, 0, 0, 0, 0, 0, 0, 0, 1] });
  assert.ok(p.getState().beds.includes('paladin'));
});
test('new accounts need muscular stage; old king saves retain earned New life access', () => {
  const old = createGame({
    version: 8,
    balance: 0,
    total: 0,
    pug: 14,
    home: 13,
    levels: [1, ...Array(11).fill(0)],
  });
  assert.ok(old.canNewLife());
  assert.ok(old.newLife());
  assert.equal(old.newLife(), false);
  const n = funded({ pug: 14 });
  assert.equal(n.canNewLife(), false);
  n.upgrade('pug');
  assert.ok(n.canNewLife());
  assert.ok(n.newLife());
  n.devStages(14, 13);
  assert.equal(n.canNewLife(), false);
});
test('v2..v9 migrations retain money/purchases and roundtrip new fields', () => {
  for (let version = 2; version <= 9; version++) {
    const g = createGame({
      version,
      pug: 14,
      home: 13,
      balance: 1500,
      total: 1600,
      levels: [1, ...Array(11).fill(0)],
    });
    assert.equal(g.getState().balance.compare(1500), 0);
    assert.ok(g.getState().pug >= 14);
    assert.ok(g.getState().home >= 13);
    assert.deepEqual(createGame(g.serialize()).serialize(), g.serialize());
  }
});
test('new final tiers have exact +35% / +40% gain and beyond-cap saves obtain art free', () => {
  const g = funded({ pug: 14, home: 13 });
  assert.ok(Math.abs(g.getTrackGain('pug') - 0.35) < 1e-10);
  assert.ok(Math.abs(g.getTrackGain('home') - 0.4) < 1e-10);
  const old = createGame({
    version: 8,
    balance: 0,
    total: 0,
    pug: 20,
    home: 20,
    levels: [1, ...Array(11).fill(0)],
  });
  assert.equal(old.getState().pugAppearance, 15);
  assert.equal(old.getState().homeAppearance, 14);
});
test('hats, achievements and beds are uniquely identified', () => {
  assert.equal(new Set(HATS.map((h) => h.id)).size, 14);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  assert.equal(Secrets.BEDS.length, 9);
});
test('yogurt reward and bee expedition duration are captured at dispatch, not at claim', () => {
  const clock = 1000,
    g = funded({ helper: 1, hats: ['yogurt', 'bee'], hat: 'yogurt' }),
    normal = funded({ helper: 1 });
  const reward = g.expeditionOffer(900);
  assert.equal(reward.compare(normal.expeditionOffer(900).multiply(1.1)), 0);
  g.sendExpedition(900, clock);
  g.equipHat('bee');
  assert.equal(g.getState().expedition.ends, clock + 900000);
  assert.equal(g.getState().expedition.reward.compare(reward), 0);
  g.cancelExpedition(g.getState().expedition.ends, clock + 1);
  g.sendExpedition(900, clock);
  assert.equal(g.getState().expedition.ends, clock + 855000);
  assert.equal(g.getState().expedition.reward.compare(normal.expeditionOffer(900)), 0);
  g.equipHat('yogurt');
  assert.equal(g.getState().expedition.ends, clock + 855000);
});
test('expired insects never pay and natural album counters are saved', () => {
  const { g, a } = spawn(funded(), 'bee');
  advance(g, 8000);
  assert.equal(g.claimGuest(a.id), null);
  const saved = createGame(g.serialize()).getState();
  assert.equal(saved.guestStats.bee.seen, 1);
  assert.equal(saved.guestStats.bee.caught, 0);
});
test('hidden-item developer reveal changes visibility, never buys item or unlocks its gate', () => {
  const g = funded({ home: 0 });
  g.devRevealHidden();
  assert.equal(g.netOffer().visible, true);
  assert.equal(g.netOffer().unlocked, false);
  assert.equal(g.buyNet(), false);
  assert.deepEqual(g.getState().hats, []);
});
test('crafting a paladin immediately unlocks its achievement and secret bed', () => {
  const g = funded({ home: 14, weapons: [1, 0, 0, 0, 0, 0, 0, 3, 0] });
  assert.equal(g.getState().beds.includes('paladin'), false);
  assert.ok(g.mergeWeapon(7));
  assert.ok(g.getState().beds.includes('paladin'));
});
