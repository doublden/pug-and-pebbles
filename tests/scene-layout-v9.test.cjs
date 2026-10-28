const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function sceneClass() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scene-v8.js'), 'utf8'), sandbox);
  return sandbox.window.PugScene;
}

function worldClass() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../world.js'), 'utf8'), sandbox);
  return sandbox.window.PugWorld;
}

test('all 15 displayed homes have bed anchors on the floor, including palace and Dubai', () => {
  const Scene = sceneClass();
  assert.equal(Scene.bedFloors.length, 15);
  const baselines = new Set();
  for (const [width, height] of [
    [430, 932],
    [375, 812],
    [390, 844],
    [393, 852],
    [360, 800],
    [412, 915],
  ]) {
    for (let stage = 0; stage < 15; stage++) {
      const scene = new Scene({ w: width, h: height, state: { homeStage: stage } });
      const bed = scene.bedLayout();
      assert.ok(bed.x >= 0 && bed.x + bed.w <= width, `home ${stage} horizontal floor placement`);
      assert.ok(
        bed.y >= height * 0.39 && bed.base <= height * 0.6,
        `home ${stage} must stay below architecture`,
      );
      assert.ok(Math.abs(bed.y + bed.h - bed.base) < 1e-8, `home ${stage} exact floor contact`);
      baselines.add(Number((bed.base / height).toFixed(3)));
      if (stage >= 13)
        assert.ok(bed.y > height * 0.46, 'late-home beds must be below sofa/wall line');
    }
  }
  assert.ok(baselines.size >= 5, 'locations need individually inspected floors');
});

test('sleep travel returns to the exact original layout and settles inside the selected bed', () => {
  const Scene = sceneClass();
  for (let stage = 0; stage < 15; stage++) {
    const world = {
      w: 430,
      h: 932,
      state: { homeStage: stage, bed: 'stars' },
      idleEvent: { kind: 'sleep', elapsed: 0, duration: 10000 },
    };
    const scene = new Scene(world);
    const start = { x: -27.95, y: 500, size: 226.395, base: 726.395 };
    assert.deepEqual({ ...scene.sleepLayout(start) }, start);
    world.idleEvent.elapsed = 5000;
    const sleeping = scene.sleepLayout(start),
      bed = scene.bedLayout();
    assert.equal(sleeping.base, bed.base);
    assert.ok(sleeping.x >= bed.x && sleeping.x + sleeping.size <= bed.x + bed.w);
    world.idleEvent.elapsed = 10000;
    assert.deepEqual({ ...scene.sleepLayout(start) }, start);
  }
});

test('bed layout remains finite for out-of-range location values from legacy cosmetic selections', () => {
  const Scene = sceneClass();
  for (const stage of [-20, undefined, 1000]) {
    const scene = new Scene({ w: 430, h: 932, state: { homeStage: stage } });
    assert.ok(Object.values(scene.bedLayout()).every(Number.isFinite));
  }
});

test('only palace and Dubai food shrink by 10 percent, including height-capped artwork and tap bounds', () => {
  const proto = worldClass().prototype;
  for (const [w, h] of [
    [430, 932],
    [375, 812],
  ])
    for (const f of [
      { w: 700, h: 440 },
      { w: 400, h: 1400 },
    ]) {
      const fake = {
        w,
        h,
        state: { foodStage: 13, homeStage: 13 },
        foodFrame: () => f,
        ready: true,
      };
      fake.foodLayout = (stage = 13) => proto.foodLayout.call(fake, stage, w, h);
      for (const stage of [12, 13, 14]) {
        const l = fake.foodLayout(stage),
          extent = [0.81, 0.85, 0.87][stage - 12];
        const originalScale = Math.min((w * extent * 1.21) / f.w, (h * 0.47) / f.h);
        const ratio = stage >= 13 ? 0.9 : 1;
        assert.ok(Math.abs(l.w - f.w * originalScale * ratio) < 1e-8);
        assert.ok(Math.abs(l.h - f.h * originalScale * ratio) < 1e-8);
        assert.equal(l.base, h * 0.665);
      }
      const l = fake.foodLayout();
      assert.equal(proto.hitFood.call(fake, l.x + l.w + 13, l.base - 2), true);
      assert.equal(proto.hitFood.call(fake, l.x + l.w + 15, l.base - 2), false);
    }
});

test('sleep bubble follows the animated nose attachment, including the muscular pug', () => {
  const proto = worldClass().prototype;
  for (let stage = 0; stage < 16; stage++) {
    let ellipse;
    const c = {
      save() {},
      restore() {},
      beginPath() {},
      fill() {},
      stroke() {},
      ellipse(...v) {
        ellipse = v;
      },
    };
    const fake = {
      ctx: c,
      state: { pugStage: stage },
      idleEvent: { kind: 'sleep', elapsed: 400 },
      uiPaused: false,
      lastSnore: 5000,
      rig: { ready: () => true, noseAnchor: () => ({ x: 17, y: 31 }) },
    };
    const layout = { x: 100, y: 200, size: 250 };
    proto.drawIdle.call(fake, 5000, layout);
    const radius = 250 * (0.055 + 0.014 * Math.sin(1));
    assert.ok(Math.abs(ellipse[0] - 17) < radius && Math.abs(ellipse[1] - 31) < radius);
  }
});
