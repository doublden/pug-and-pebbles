const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const { createGame, Amount } = require('../game.js'),
  { create } = require('../combo.js'),
  { match3 } = require('../minigames.js');
const funded = (extra = {}) =>
  createGame({
    version: 5,
    balance: { m: 1, e: 18 },
    total: { m: 1, e: 18 },
    pug: 8,
    home: 5,
    helper: 3,
    levels: [1, ...Array(11).fill(1)],
    ...extra,
  });
test('bulk buying has the same cost and levels as repeated singles', () => {
  for (const kind of ['tool', 'helper']) {
    const a = funded({ balance: { m: 1, e: 20 }, total: { m: 1, e: 20 } }),
      b = createGame(a.serialize()),
      i = kind === 'tool' ? 2 : 0,
      q = a.quote(kind, i, 10);
    assert.equal(a.buyBulk(kind, i, 10), 10);
    for (let n = 0; n < 10; n++)
      assert.equal(
        kind === 'tool' ? b.buyTool(i) : kind === 'helper' ? b.buyHelper() : b.upgrade(kind),
        true,
      );
    assert.equal(a.getState().balance.compare(b.getState().balance), 0);
    assert.deepEqual(a.getState().levels, b.getState().levels);
    assert.equal(q.count, 10);
  }
});
test('maximum quote buys every affordable upgrade and never overruns currency', () => {
  for (const kind of ['tool', 'helper']) {
    const g = funded({ balance: { m: 1, e: 5 }, total: { m: 1, e: 5 } }),
      q = g.quote(kind, 1, 'max');
    assert.ok(q.count > 0);
    assert.ok(q.cost.compare(g.getState().balance) <= 0);
    assert.equal(g.buyBulk(kind, 1, 'max'), q.count);
    assert.equal(g.quote(kind, 1, 'max').count, 0);
  }
});
test('enormous maximum quotes run in bounded time with scientific wallets', () => {
  const g = funded({ balance: { m: 1, e: 10000 }, total: { m: 1, e: 10000 } });
  const begin = performance.now();
  assert.ok(g.quote('tool', 1, 'max').count > 10000);
  assert.ok(performance.now() - begin < 500);
});
test('expedition reward is fixed, passive income stops, manual digging continues', () => {
  const g = funded(),
    offer = g.expeditionOffer(900),
    bank = g.getState().balance;
  assert.equal(g.sendExpedition(900, 1000), true);
  assert.equal(g.sendExpedition(3600, 1000), false);
  assert.equal(g.work(1).m, 0);
  assert.ok(g.dig().m > 0);
  assert.equal(g.claimExpedition(900999).m, 0);
  g.buyHelper();
  const restored = createGame(g.serialize());
  assert.equal(restored.getState().expedition.reward.compare(offer), 0);
  assert.equal(restored.claimExpedition(99999999).compare(offer), 0);
  assert.equal(restored.claimExpedition(999999999).m, 0);
  assert.ok(restored.work(1).m > 0);
});
test('new life cancels expedition but retains collections; resetting creates fresh scene state', () => {
  const g = funded({ pug: 14 });
  g.sendExpedition(10800, 1000);
  assert.equal(g.newLife(), true);
  assert.equal(g.getState().expedition, null);
  assert.equal(g.getState().helper, 0);
  assert.equal(createGame().getState().pugStage, 0);
});
test('combo tiers cap at twenty percent and exactly half-second pause resets', () => {
  const c = create();
  for (let n = 0; n < 20; n++) c.tap(n * 40);
  assert.equal(c.status(760).multiplier, 1.2);
  assert.equal(c.status(1260).rate, 0);
  assert.equal(c.tap(1260).tier, 0);
  const g = createGame();
  assert.equal(g.dig(8, 1.2).compare(9.6), 0);
  assert.equal(g.dig(8, 1.21).m, 0);
});
test('match three starts without matches, rejects nonadjacent swaps, timer caps reward', () => {
  const m = match3(() => 0.37),
    s = m.status();
  for (let i = 0; i < 36; i++) {
    if (i % 6 < 4) assert.ok(!(s.board[i] === s.board[i + 1] && s.board[i] === s.board[i + 2]));
    if (i < 24) assert.ok(!(s.board[i] === s.board[i + 6] && s.board[i] === s.board[i + 12]));
  }
  assert.equal(m.swap(0, 35), false);
  for (let n = 0; n < 450; n++) m.tick(100);
  assert.equal(m.status().done, true);
  assert.ok(m.status().score <= 1);
  assert.equal(m.swap(0, 1), false);
});
test('match reward and cooldown survive reload and cannot be replayed for duplicate income', () => {
  const g = funded();
  assert.equal(g.beginMini('match', 1000), true);
  const r = g.finishMini('match', 1);
  assert.ok(r.m > 0);
  assert.equal(g.finishMini('match', 1).m, 0);
  const h = createGame(g.serialize());
  assert.ok(h.miniStatus('match', 1000).seconds > 0);
  assert.equal(h.beginMini('match', 1000), false);
});
test('excavator can render all phases without the missing Canvas ellipse argument regression', () => {
  const sandbox = { window: {}, PugGame: { HATS: [] } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../extras.js'), 'utf8'), sandbox);
  const world = { state: { homeStage: 1 }, images: {}, reduced: false, uiPaused: false };
  const extras = new sandbox.window.PugExtras(world);
  extras.frame = () => ({ canvas: { width: 300, height: 250 } });
  let ellipses = 0;
  const ctx = {
    save() {},
    restore() {},
    drawImage() {},
    beginPath() {},
    fill() {},
    ellipse(...a) {
      assert.equal(a.length, 7);
      ellipses++;
    },
  };
  for (let t = 0; t < 35000; t += 30) extras.helper(ctx, t, 390, 844, 1);
  assert.ok(ellipses > 0);
});
test('two tabs cannot simultaneously generate passive income or overwrite an active minigame', () => {
  let now = 1000;
  const map = new Map(),
    storage = { getItem: (k) => map.get(k) || null, setItem: (k, v) => map.set(k, v) },
    sessions = require('../session.js'),
    a = sessions.create(storage, 'session', 'A', () => now),
    b = sessions.create(storage, 'session', 'B', () => now);
  a.claim();
  assert.equal(a.owns(), true);
  assert.equal(b.claim(), false);
  assert.equal(b.owns(), false);
  b.claim(true);
  assert.equal(b.owns(), true);
  assert.equal(a.owns(), false);
  now += 5000;
  b.heartbeat();
  assert.equal(a.owns(), false);
  now += 41000;
  assert.equal(a.claim(), true);
  assert.equal(b.owns(), false);
});
test('bird head anchors follow sleeping, upright and mirrored pug poses', () => {
  const sandbox = { window: {}, performance: { now: () => 1000 } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../world.js'), 'utf8'), sandbox);
  const proto = sandbox.window.PugWorld.prototype;
  const fake = {
    state: { pugStage: 0, hat: null },
    reduced: true,
    images: {},
    activePose() {
      return this.pose;
    },
    pose: 'idle',
    prepare(p) {
      return { head: p === 'sleep' ? { x: 0.82, y: 0.7, w: 0.3 } : { x: 0.52, y: 0.18, w: 0.44 } };
    },
    layout() {
      return { x: 20, y: 300, size: 200 };
    },
    extras: {
      frame() {
        return null;
      },
    },
    currentHead: proto.currentHead,
    visiblePug: proto.visiblePug,
    poseProgress: proto.poseProgress,
    poseFrame: proto.poseFrame,
  };
  sandbox.PugGame = { HATS: [] };
  const sitting = proto.birdAnchor.call(fake, 2);
  fake.pose = 'sleep';
  const sleeping = proto.birdAnchor.call(fake, 2);
  assert.ok(sleeping.y > sitting.y + 80);
  assert.ok(sleeping.x > sitting.x);
  fake.pose = 'back';
  fake.idleEvent = { kind: 'backlook', elapsed: 1500, duration: 5000 };
  fake.reduced = false;
  const upright = proto.birdAnchor.call(fake, 2);
  assert.ok(upright.y < sleeping.y);
});
test('articulated rig draws the chassis at full opacity throughout digging and driving', () => {
  const sandbox = { window: {}, PugGame: { HATS: [] } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../extras.js'), 'utf8'), sandbox);
  const extras = new sandbox.window.PugExtras({
    images: { helperRig: {} },
    state: { homeStage: 1 },
    uiPaused: false,
    reduced: false,
  });
  const chassis = {},
    localPart = {};
  extras.frame = (key, index) => ({
    canvas: index === 0 ? chassis : localPart,
    x: 0,
    y: 0,
    w: 240,
    h: 200,
  });
  let draws = 0,
    chassisDraws = 0;
  const alphaStack = [];
  const ctx = {
    globalAlpha: 1,
    save() {
      alphaStack.push(this.globalAlpha);
    },
    restore() {
      this.globalAlpha = alphaStack.pop() ?? 1;
    },
    translate() {},
    rotate() {},
    scale() {},
    beginPath() {},
    rect() {},
    clip() {},
    fill() {},
    stroke() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    drawImage(...a) {
      // The chassis must never flicker; local eyelid/mouth masks may blend independently.
      if (a[0] === chassis) {
        assert.equal(this.globalAlpha, 1);
        chassisDraws++;
      }
      assert.ok(this.globalAlpha >= 0 && this.globalAlpha <= 1);
      assert.ok(a.slice(1).every(Number.isFinite));
      draws++;
    },
    ellipse(...a) {
      assert.equal(a.length, 7);
    },
  };
  for (let t = 0; t < 35000; t += 30) extras.helper(ctx, t, 390, 844, 1);
  assert.ok(draws > 4000);
  assert.equal(chassisDraws, Math.ceil(35000 / 30));
  assert.equal(alphaStack.length, 0);
});
