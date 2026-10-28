const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
const B = require('../battle-rules.js'),
  I = require('../inventory-rules.js');
function setup(options = {}) {
  const elements = new Map(),
    requests = [],
    fetches = [],
    messages = [],
    rigCalls = [];
  let starts = 0;
  const metadata = {
    sheets: { 'pug-healthy': { hands: Array.from({ length: 12 }, () => [160, 160]) } },
  };
  const element = (id) => {
    if (id === 'boss-rig-preview' && !elements.has(id)) return null;
    if (!elements.has(id))
      elements.set(id, {
        id,
        style: {},
        hidden: false,
        classList: { add() {}, remove() {} },
        addEventListener() {},
        focus() {},
        close() {
          this.open = false;
        },
        showModal() {
          this.open = true;
        },
      });
    return elements.get(id);
  };
  const world = {
    images: {},
    loadingImages: new Map(),
    artRetryAt: new Map(),
    setIdle() {},
    state: { pugStage: 8 },
    rig: {
      async preload(stage) {
        rigCalls.push(stage);
        if (options.rigFails) throw Error('offline rig');
      },
      ready() {
        return !options.rigFails;
      },
      drawCombat() {
        throw Error('legacy fight changed model');
      },
    },
  };
  world.image = async (key, url) => {
    requests.push({ key, url });
    if (options.deferBoss && key === 'motionRaccoonBoss') await options.deferBoss;
    if (options.imageFails?.(key)) throw Error('offline ' + key);
    world.images[key] = { key };
  };
  element('boss-image').parentNode = {
    append(canvas) {
      elements.set(canvas.id, canvas);
    },
  };
  const state = { pug: 8, pugAppearance: 8, pugStage: 8, weaponEquipped: 1 };
  const game = {
    getState: () => state,
    startBoss() {
      starts++;
      return true;
    },
    bossOffer: () => options.offer || null,
  };
  const words = () => ({
    loading: 'Loading',
    bossLoadError: 'Load error',
    bossNames: ['Raccoon', 'Crow'],
    weaponNames: ['Stick', 'Spoon'],
    bossAdvice: 'Use {weapon}',
  });
  const sandbox = {
    window: {},
    document: {
      getElementById: element,
      createElement() {
        return {
          style: {},
          setAttribute() {},
          getContext: () => ({ setTransform() {}, clearRect() {} }),
        };
      },
    },
    performance: { now: () => 1000 },
    PugBattleRules: B,
    PugInventoryRules: I,
    PugCharacterMotion: {
      drawBoss() {
        if (options.preview) return true;
        throw Error('legacy fight changed boss');
      },
    },
    fetch: async (url) => {
      fetches.push(url);
      return { ok: !options.fetchFails, json: async () => metadata };
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../battle-ui.js'), 'utf8'), sandbox);
  const ui = new sandbox.window.PugBattleUI({
    world,
    getGame: () => game,
    words,
    isActive: () => true,
    changed() {},
    sound: { unlock() {}, setBattle() {}, play() {} },
    toast: (t) => messages.push(t),
    format: () => '',
  });
  ui.index = 0;
  return {
    ui,
    world,
    game,
    words,
    elements,
    element,
    requests,
    fetches,
    messages,
    rigCalls,
    sandbox,
    starts: () => starts,
  };
}
test('ready layered fights load new rigs and weapon without any old combat metadata or atlases', async () => {
  const x = setup();
  await x.ui.start();
  assert.equal(x.starts(), 1);
  assert.equal(x.ui.active, true);
  assert.equal(x.world.battle.renderMode, 'rig');
  assert.equal(x.world.battle.rigStage, 8);
  assert.deepEqual(x.rigCalls, [8]);
  assert.deepEqual(x.fetches, []);
  assert.ok(x.requests.some((r) => r.key === 'motionRaccoonBoss'));
  assert.ok(x.requests.some((r) => r.key === 'weapon-1'));
  assert.ok(!x.requests.some((r) => r.url.startsWith('battle-v7/')));
});
test('offline new rig falls back once to legacy assets and locks the complete fight to that renderer', async () => {
  const x = setup({ rigFails: true });
  await x.ui.start();
  assert.equal(x.starts(), 1);
  assert.equal(x.world.battle.renderMode, 'legacy');
  assert.deepEqual(x.fetches, ['battle-v7/frames.json']);
  assert.ok(x.requests.some((r) => r.key === 'battle-pug-healthy'));
  assert.ok(x.requests.some((r) => r.key === 'battle-raccoon'));
  const draws = [];
  x.world.ctx = new Proxy(
    {},
    {
      get: (_, key) => (key === 'drawImage' ? (...a) => draws.push(a) : () => {}),
      set: () => true,
    },
  );
  x.world.w = 430;
  x.world.h = 932;
  // Late optional artwork must not replace either participant halfway through a fallback fight.
  x.world.rig.ready = () => true;
  x.world.images.motionRaccoonBoss = {};
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../battle-render.js'), 'utf8'),
    x.sandbox,
  );
  x.sandbox.window.PugBattleRender.draw(x.world, 1000);
  assert.ok(draws.length >= 2);
});
test('failure of both paths leaves the game outside battle and reports loading failure', async () => {
  const x = setup({ rigFails: true, fetchFails: true });
  await x.ui.start();
  assert.equal(x.starts(), 0);
  assert.equal(x.ui.active, false);
  assert.equal(x.ui.loading, false);
  assert.deepEqual(x.messages, ['Load error']);
  assert.equal(x.world.bossActive, undefined);
});
test('closing a pending battle menu prevents delayed artwork from starting the fight', async () => {
  let done;
  const waiting = new Promise((resolve) => (done = resolve)),
    x = setup({ deferBoss: waiting });
  const start = x.ui.start();
  x.ui.closeMenu();
  done();
  await start;
  assert.equal(x.starts(), 0);
  assert.equal(x.ui.active, false);
  assert.equal(x.ui.loading, false);
});
test('boss menu uses the new coherent model and hides its old preview when switching to an unavailable boss', () => {
  const x = setup({
    preview: true,
    offer: { hp: 200, damage: 2, recommendedWeapon: 1, won: false, reward: 10 },
  });
  x.world.images.motionRaccoonBoss = {};
  x.ui.renderMenu();
  assert.equal(x.element('boss-image').hidden, true);
  assert.equal(
    x.element('boss-image').src,
    undefined,
    'ready rig must not request an obsolete sprite sheet',
  );
  const portrait = x.element('boss-rig-preview');
  assert.ok(portrait);
  assert.equal(portrait.hidden, false);
  assert.doesNotMatch(
    portrait.style.cssText,
    /display:block/,
    'inline display would override HTML hidden',
  );
  x.ui.index = 1;
  x.world.artRetryAt.set('motionCrowBoss', 100000);
  x.ui.renderMenu();
  assert.equal(portrait.hidden, true);
  assert.equal(x.element('boss-image').hidden, false);
  assert.equal(x.element('boss-image').src, 'battle-v7/crow.webp');
  assert.deepEqual(x.requests, []);
});
