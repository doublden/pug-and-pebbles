const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  crypto = require('node:crypto');
const base = path.join(__dirname, '..');
test('iPhone 15 Pro Max uses exact 1290×2796 backing canvas at DPR 3 and caps higher DPR', () => {
  const c = () => ({ width: 0, height: 0, getContext: () => ({ setTransform() {} }) }),
    canvas = c();
  canvas.getBoundingClientRect = () => ({ width: 430, height: 932 });
  const sandbox = {
    window: {},
    document: { createElement: c },
    PugExtras: class {},
    PugScene: class {},
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    performance: { now: () => 0 },
    devicePixelRatio: 3,
  };
  vm.runInNewContext(fs.readFileSync(path.join(base, 'world.js'), 'utf8'), sandbox);
  const w = new sandbox.window.PugWorld(canvas, { play() {} }, c());
  assert.equal(canvas.width, 1290);
  assert.equal(canvas.height, 2796);
  sandbox.devicePixelRatio = 5;
  w.resize();
  assert.equal(w.dpr, 3);
});
test('new artwork has alpha, bounded 2.8 MB payload and real 24-pose metadata', () => {
  const dir = path.join(base, 'assets-v8');
  let size = 0;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.webp'))) {
    const b = fs.readFileSync(path.join(dir, file));
    size += b.length;
    assert.equal(b.toString('ascii', 0, 4), 'RIFF');
    assert.equal(b.toString('ascii', 8, 12), 'WEBP');
    if (!file.startsWith('background')) assert.ok(b[20] & 16, file + ' alpha');
  }
  assert.ok(size < 2800000);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'muscle-poses.json')));
  assert.equal(Object.keys(meta).length, 24);
  for (const p of Object.values(meta)) {
    assert.ok(fs.existsSync(path.join(dir, p.sheet + '.webp')));
    assert.ok(p.cell >= 0 && p.cell < 4);
  }
});
test('four distinct fart and meow recordings are mono PCM; music is a five-second clip', () => {
  for (const files of [
    ['fart', 'fart-1', 'fart-2', 'fart-3'],
    ['meow-0', 'meow-1', 'meow-2', 'meow-3'],
  ]) {
    const hashes = [];
    for (const name of files) {
      const b = fs.readFileSync(path.join(base, 'sounds', name + '.wav'));
      assert.equal(b.toString('ascii', 0, 4), 'RIFF');
      assert.equal(b.toString('ascii', 8, 12), 'WAVE');
      assert.equal(b.readUInt16LE(22), 1);
      hashes.push(crypto.createHash('sha256').update(b).digest('hex'));
    }
    assert.equal(new Set(hashes).size, 4);
  }
  const music = fs.readFileSync(path.join(base, 'sounds/yuppi.wav'));
  assert.equal(music.readUInt32LE(24), 22050);
  assert.equal((music.length - 44) / 44100, 5);
});
test('public script order supplies guest rules, scene and UI before callers; PWA has all new modules', () => {
  const index = fs.readFileSync(path.join(base, 'index.html'), 'utf8'),
    sw = fs.readFileSync(path.join(base, 'sw.js'), 'utf8'),
    manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.webmanifest')));
  for (const [before, after] of [
    ['guests.js', 'game.js'],
    ['scene-v8.js', 'world.js'],
    ['secret-ui.js', 'app.js'],
    ['locale.js', 'locale-v8.js'],
  ])
    assert.ok(index.indexOf(before) < index.indexOf(after));
  for (const file of ['guests.js', 'scene-v8.js', 'secret-ui.js', 'locale-v8.js'])
    assert.ok(sw.includes(file));
  assert.equal(manifest.orientation, 'portrait');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.start_url.includes('0.8.0'));
  assert.equal(index.includes('href="AUDIO_CREDITS.md"'), false);
});
test('sixteen hours of natural event simulation stays bounded and developer forces replace previous guests', () => {
  const { create, fresh } = require('../guests.js'),
    r = create(fresh().guestWait, () => 0.5);
  for (let i = 0; i < 57600; i++) {
    const result = r.tick(1000, true, 9);
    assert.ok(result.actors.length <= 2);
  }
  for (let i = 0; i < 1000; i++) {
    r.force('bee');
    r.force('butterfly');
    r.force('yuppi');
    assert.equal(r.tick(0, false, 9).actors.length, 2);
  }
});
test('missing optional muscle art never blocks an old beyond-cap save from starting offline', async () => {
  const sandbox = { window: { requestIdleCallback: (f) => f() }, document: {}, PugIcons: {} };
  vm.runInNewContext(fs.readFileSync(path.join(base, 'world.js'), 'utf8'), sandbox);
  const proto = sandbox.window.PugWorld.prototype,
    fake = {
      state: { homeStage: 14, pugStage: 15 },
      image: () => Promise.resolve(),
      scene: { preloadPug: () => Promise.reject(Error('offline')), load() {} },
      artPath: proto.artPath,
      frame() {},
      toolImages: {},
    };
  await proto.load.call(fake);
  assert.equal(fake.ready, true);
});
test('entering combat clears the fullscreen saliva/cloud canvas before rendering the boss', () => {
  const calls = [],
    sandbox = { window: {}, PugBattleRender: { draw: () => calls.push('boss') } };
  vm.runInNewContext(fs.readFileSync(path.join(base, 'world.js'), 'utf8'), sandbox);
  sandbox.window.PugWorld.prototype.draw.call(
    {
      ctx: {},
      w: 430,
      h: 932,
      state: { homeStage: 0 },
      layout: () => ({}),
      background() {},
      bossActive: true,
      spitCtx: {
        clearRect: (x, y, w, h) => {
          assert.equal(w, 430);
          assert.equal(h, 932);
          calls.push('clear');
        },
      },
    },
    0,
  );
  assert.deepEqual(calls, ['clear', 'boss']);
});
