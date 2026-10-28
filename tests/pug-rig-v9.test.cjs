const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Rig = require('../pug-rig-v9.js');
test('missing rig art is throttled across animation frames and can retry after backoff', async () => {
  let calls = 0;
  const world = {
    state: { pugStage: 8 },
    images: {},
    loadingImages: new Map(),
    artRetryAt: new Map(),
    extras: { frames: new Map() },
    image() {
      calls++;
      return Promise.reject(Error('offline'));
    },
  };
  const rig = new Rig(world);
  for (let i = 0; i < 120; i++) await rig.preload(8).catch(() => {});
  assert.equal(calls, 1);
  rig.retryAt.set('healthy', 0);
  await rig.preload(8).catch(() => {});
  assert.equal(calls, 2);
});
test('visible tail and raised paw hit areas follow the articulated model', () => {
  for (const stage of [0, 8, 14, 15])
    for (const pose of ['idle', 'scratch', 'pawlick', 'sleep', 'rear']) {
      const world = {
        state: { pugStage: stage },
        reduced: false,
        activePose: () => pose,
        visiblePug: () => ({ pose }),
        poseProgress: () => 1,
        scene: {},
      };
      const rig = new Rig(world),
        l = { x: 15, y: 30, size: 250 },
        p = rig.measure(stage, pose, l, 4000);
      assert.equal(
        rig.hit(
          l.x + (p.tail.x - 0.08 * p.tail.scale) * l.size,
          l.y + (p.tail.y - 0.025) * l.size,
          l,
          4000,
        ),
        true,
      );
      if (p.frontLegIndex >= 0) {
        const a = p.legs[p.frontLegIndex],
          ex = a.x + Math.cos(a.upper) * a.length * 0.49,
          ey = a.y + Math.sin(a.upper) * a.length * 0.49,
          hx = ex + Math.cos(a.lower) * a.length * 0.51,
          hy = ey + Math.sin(a.lower) * a.length * 0.51;
        assert.equal(
          rig.hit(l.x + hx * l.size, l.y + hy * l.size, l, 4000),
          true,
          stage + ' ' + pose,
        );
      }
    }
});
test('ordinary body growth stays monotonic through the wealthy stages', () => {
  for (let i = 1; i < 15; i++) assert.ok(Rig.STAGES[i].width >= Rig.STAGES[i - 1].width);
});
const poses = [
  'idle',
  'look',
  'scratch',
  'yawn',
  'lick',
  'left',
  'pawlick',
  'splay',
  'sleep',
  'whistle',
  'back',
  'rear',
  'stretch',
]
  .flatMap((p) => (['idle', 'rear'].includes(p) ? [p] : ['mid-' + p, p]))
  .concat('tailchase');

test('all 16 pug forms and every motion keep the head joined to the torso without an exposed long neck', () => {
  let count = 0;
  for (let stage = 0; stage < 16; stage++)
    for (const pose of poses)
      for (const strength of [0, 0.25, 0.499, 0.501, 0.75, 1])
        for (const now of [0, 2900, 8200, 12500]) {
          const p = Rig.plan(stage, pose, now, strength);
          for (const rect of [p.body, p.head])
            for (const key of ['x', 'y', 'w', 'h'])
              assert.ok(Number.isFinite(rect[key]), `${stage} ${pose} ${key}`);
          assert.ok(p.head.w > 0 && p.head.h > 0 && p.body.w > 0 && p.body.h > 0);
          assert.ok(p.head.y + p.head.h >= p.body.y + 0.07, `${stage} ${pose} neck gap`);
          assert.ok(
            Math.abs(p.body.y + p.body.h - 0.94) < 1e-9,
            `${stage} ${pose} feet leave the ground`,
          );
          assert.ok(
            p.legs.every((l) => l.width > 0 && l.length > 0 && Number.isFinite(l.upper + l.lower)),
          );
          count++;
        }
  assert.equal(count, 9600);
});

test('sleep, stretch and turn geometry stays continuous without paper-thin held intermediate poses', () => {
  for (let stage = 0; stage < 16; stage++)
    for (const pose of ['sleep', 'stretch', 'back', 'rear', 'left']) {
      const a = Rig.plan(stage, pose, 4000, 0.49999),
        b = Rig.plan(stage, pose, 4000, 0.50001);
      for (const part of ['body', 'head'])
        for (const key of ['x', 'y', 'w', 'h'])
          assert.ok(
            Math.abs(a[part][key] - b[part][key]) < 0.001,
            `${stage} ${pose} ${part}.${key} pops`,
          );
      assert.ok(Math.abs(a.tail.x - b.tail.x) < 0.001 && Math.abs(a.tail.y - b.tail.y) < 0.001);
      if (['back', 'rear', 'left'].includes(pose)) {
        for (let s = 0; s <= 1; s += 0.05)
          assert.ok(
            Rig.plan(stage, pose, 4000, s).head.w > 0.3,
            'turns must retain natural head thickness',
          );
        const mid = Rig.plan(stage, 'mid-' + pose, 4000, 1);
        assert.ok(
          mid.head.w > 0.4 && mid.body.w > 0.35,
          'held intermediate drawings must remain full-bodied',
        );
      }
    }
  assert.equal(Rig.plan(8, 'back', 4000, 0).view, 'front');
  assert.equal(Rig.plan(8, 'back', 4000, 0.5).view, 'side');
  assert.equal(Rig.plan(8, 'back', 4000, 1).view, 'back');
});

test('lying transition blends only the torso while legs fold and the face remains a single drawing', () => {
  for (const pose of ['sleep', 'stretch'])
    for (const strength of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      const p = Rig.plan(8, pose, 4000, strength);
      assert.equal(p.bodyLayers.length, 2);
      assert.ok(Math.abs(p.bodyLayers.reduce((n, b) => n + b.alpha, 0) - 1) < 1e-9);
      assert.deepEqual(
        p.bodyLayers.map((b) => b.part),
        [0, 3],
      );
      assert.ok(p.legAlpha >= 0 && p.legAlpha <= 1);
      assert.equal(p.head.part, 1);
    }
  assert.equal(Rig.plan(8, 'sleep', 4000, 1).legAlpha, 0);
  assert.equal(Rig.plan(8, 'sleep', 4000, 1).blink, 1);
});

test('reduced motion freezes body, head and tail while keeping the sleeping eyes closed', () => {
  for (let stage = 0; stage < 16; stage++)
    for (const pose of poses) {
      const a = Rig.plan(stage, pose, 1000, 1, true),
        b = Rig.plan(stage, pose, 17000, 1, true);
      assert.deepEqual(a, b);
      if (pose === 'sleep') assert.equal(a.blink, 1);
    }
});

test('paw-licking and scratching reach the mouth and ear with fixed-length forelegs', () => {
  for (let stage = 0; stage < 16; stage++)
    for (const [pose, index, target] of [
      ['pawlick', 1, { x: 0.65, y: 0.39 }],
      ['scratch', 0, { x: 0.24, y: 0.2 }],
    ])
      for (const now of [0, 2400, 4000, 7100]) {
        const p = Rig.plan(stage, pose, now, 1),
          leg = p.legs[index];
        const elbow = {
          x: leg.x + Math.cos(leg.upper) * leg.length * 0.49,
          y: leg.y + Math.sin(leg.upper) * leg.length * 0.49,
        };
        const hand = {
          x: elbow.x + Math.cos(leg.lower) * leg.length * 0.51,
          y: elbow.y + Math.sin(leg.lower) * leg.length * 0.51,
        };
        assert.ok(
          Math.hypot(hand.x - target.x, hand.y - target.y) < 0.025,
          `${stage} ${pose} misses its target`,
        );
        assert.ok(
          Math.abs(Math.hypot(elbow.x - leg.x, elbow.y - leg.y) - leg.length * 0.49) < 1e-9,
        );
        assert.ok(
          Math.abs(Math.hypot(hand.x - elbow.x, hand.y - elbow.y) - leg.length * 0.51) < 1e-9,
        );
        assert.equal(p.frontLegIndex, index);
      }
});

test('all four body families have 12 isolated components inside atlas cells and corrected arm-free torsos', () => {
  const meta = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets-pug-v9/parts.json')));
  for (const family of Rig.FAMILIES) {
    const parts = meta[family];
    assert.equal(parts.length, 12);
    assert.ok(fs.existsSync(path.join(__dirname, '../assets-pug-v9', family + '.webp')));
    assert.equal(parts[0].source.asset, 'torso-correction-v9');
    for (let i = 0; i < 12; i++) {
      const p = parts[i],
        left = (i % 3) * 512,
        top = Math.floor(i / 3) * 512;
      assert.ok(
        p.x >= left && p.y >= top && p.x + p.w <= left + 512 && p.y + p.h <= top + 512,
        `${family} component ${i} crosses its cell`,
      );
    }
  }
});
