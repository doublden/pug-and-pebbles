const test = require('node:test'),
  assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path');
const M = require('../character-motion.js');
function near(a, b, eps = 0.001) {
  assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
}
test('birds fold continuous wings into a stable perch without any frame indices', () => {
  for (const phase of ['in', 'landed', 'out'])
    for (let p = 0; p <= 1; p += 0.001) {
      const motion = M.birdMotion({ phase, p, frameClock: p * 4000, lastPeckAge: 1000 });
      for (const v of Object.values(motion)) assert.ok(Number.isFinite(v));
      assert.ok(motion.fold >= 0 && motion.fold <= 1);
      assert.equal('frame' in motion, false);
    }
  const before = M.birdMotion({ phase: 'in', p: 1, frameClock: 2000, lastPeckAge: 1000 });
  const after = M.birdMotion({ phase: 'landed', p: 0, frameClock: 2000, lastPeckAge: 1000 });
  near(before.fold, after.fold);
  near(before.bob, after.bob);
});
test('peck movement returns smoothly, while the animation clock respects the supplied paused clock', () => {
  const bird = { phase: 'landed', p: 0, frameClock: 3500, lastPeckAge: 659.9 };
  const before = M.birdMotion(bird),
    after = M.birdMotion({ ...bird, lastPeckAge: 660 });
  near(before.head, after.head);
  assert.deepEqual(M.birdMotion(bird), M.birdMotion(bird));
  for (const age of [0, 55, 110, 220, 330, 500, 660, 1500])
    assert.ok(M.birdMotion({ ...bird, lastPeckAge: age }).head < 1);
});
test('boss attacks and guards use bounded continuous joint motion across every frame', () => {
  const scene = { started: 0, bossAttackAt: 1000, attackAt: 2000, hitAt: 3000, status: 'active' };
  for (let t = 0; t < 6000; t += 1000 / 120) {
    const p = M.bossMotion(scene, t);
    for (const v of Object.values(p)) assert.ok(Number.isFinite(v));
    assert.ok(p.attack >= 0 && p.attack <= 1);
    assert.ok(p.guard >= 0 && p.guard <= 1);
  }
  near(M.bossMotion(scene, 1639.99).attack, M.bossMotion(scene, 1640).attack);
  near(M.bossMotion(scene, 2499.99).guard, M.bossMotion(scene, 2500).guard);
  assert.equal(M.bossMotion(scene, 1300, true).attack, 0);
  const won = M.bossMotion({ ...scene, status: 'won' }, 4000);
  assert.equal(won.attack, 0);
  assert.equal(won.guard, 0);
  assert.equal(won.fallen, 1);
});
test('full-body frame dissolves are absent from the new character rendering path', () => {
  const source = fs.readFileSync(path.join(__dirname, '../character-motion.js'), 'utf8');
  assert.doesNotMatch(source, /globalAlpha\s*=\s*1\s*-\s*(mix|blend)/);
  assert.match(source, /actor\.kind === 'bee' \? 7 : 0/);
});
test('generated rig sheets use alpha and bounded four-column layouts', () => {
  for (const name of ['birds-rig', 'boss-raccoon-rig', 'boss-crow-rig']) {
    const root = path.join(__dirname, '../assets-motion-v9', name);
    const meta = JSON.parse(fs.readFileSync(root + '.json'));
    assert.equal(meta.cell, 384);
    assert.equal(meta.columns, 4);
    const data = fs.readFileSync(root + '.webp');
    assert.equal(data.toString('ascii', 0, 4), 'RIFF');
    assert.ok(data[20] & 16);
    assert.ok(data.length < 650000);
    for (const p of meta.parts) {
      assert.ok(p.bounds[2] > 20);
      assert.ok(p.bounds[3] > 20);
      assert.ok(p.aspect > 0 && p.aspect < 6);
    }
  }
});
test('helper pauses its local clock and changes burst speed without changing existing phase', () => {
  const vm = require('node:vm'),
    sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../extras.js'), 'utf8'), sandbox);
  const world = { state: { helperTier: 0 }, reduced: false, uiPaused: false };
  const helper = new sandbox.window.PugExtras(world);
  helper.frame = () => ({ canvas: {}, x: 0, y: 0, w: 100, h: 100 });
  helper.metalFrame = () => null;
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
  helper.rig(ctx, 0, 430, 932, false);
  helper.rig(ctx, 50, 430, 932, false);
  assert.equal(helper.helperMotionTime, 50);
  assert.equal(helper.helperWorkTime, 50);
  world.uiPaused = true;
  helper.rig(ctx, 100, 430, 932, false);
  assert.equal(helper.helperMotionTime, 50);
  world.uiPaused = false;
  helper.rig(ctx, 150, 430, 932, false);
  assert.equal(helper.helperWorkTime, 100);
  world.state.helperBurstActive = true;
  helper.rig(ctx, 200, 430, 932, false);
  assert.equal(helper.helperMotionTime, 150);
  assert.equal(helper.helperWorkTime, 200);
});
test('all five friends and both insect rigs have complete alpha cells with bounded payload', () => {
  for (const [name, cols, parts] of [
    ['friends-rig', 5, 10],
    ['insects-rig', 3, 6],
  ]) {
    const file = path.join(__dirname, '../assets-motion-v9', name),
      meta = JSON.parse(fs.readFileSync(file + '.json'));
    assert.equal(meta.columns, cols);
    assert.equal(meta.parts.length, parts);
    const b = fs.readFileSync(file + '.webp');
    assert.ok(b[20] & 16);
    assert.ok(b.length < 600000);
    assert.equal(b.readUIntLE(24, 3) + 1, cols * 384);
    assert.equal(b.readUIntLE(27, 3) + 1, 768);
  }
});
