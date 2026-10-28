const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const hats = require('../hat-attachments-v9.js');
const game = require('../game.js');
const base = path.join(__dirname, '..');

test('every owned/secret hat has explicit wearing openings for all three perspectives', () => {
  assert.deepEqual(Object.keys(hats.FITS).sort(), game.HATS.map((h) => h.id).sort());
  for (const [id, views] of Object.entries(hats.FITS)) {
    assert.equal(views.length, 3, id);
    for (const [x, y, span] of views) {
      assert.ok(x > 0 && x < 1 && y > 0.5 && y < 1, id);
      assert.ok(span >= 0.65 && span <= 1, id);
    }
  }
});

test('repacked hat atlas preserves complete silhouettes inside strict safe cells', () => {
  const report = JSON.parse(fs.readFileSync(path.join(base, 'assets-v9/hats-atlas.json')));
  assert.equal(report.cell, 360);
  assert.equal(report.results.length, 3);
  for (const result of report.results) {
    assert.equal(result.figures.length, 10);
    const buffer = fs.readFileSync(path.join(base, 'assets-v9/hats-' + result.view + '.webp'));
    assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');
    assert.equal(buffer.toString('ascii', 12, 16), 'VP8X');
    assert.ok(buffer[20] & 16, 'alpha preserved');
    assert.equal(buffer.readUIntLE(24, 3) + 1, 1440);
    assert.equal(buffer.readUIntLE(27, 3) + 1, 1080);
    for (const figure of result.figures) {
      assert.ok(figure.packed.width <= 330 && figure.packed.height <= 330);
      assert.ok(figure.pixels > 10000, result.view + ' ' + figure.index);
    }
  }
  // This is the actual source regression: the old equal-grid crop lost the lower band.
  const carrot = report.results[0].figures[0].source;
  assert.ok(carrot.top + carrot.height > 1086 / 3);
});

test('crown attachment follows continuous head turns, scales and mirroring without drifting', () => {
  let checks = 0;
  for (const id of Object.keys(hats.FITS))
    for (const perspective of hats.VIEWS)
      for (const size of [18, 80, 190, 420])
        for (const tilt of [-0.55, -0.16, 0, 0.16, 0.55])
          for (const mirror of [false, true]) {
            const mount = { x: 157, y: 82, w: size, tilt, perspective, mirror };
            const fit = hats.layout(id, mount, 'sleep', { w: 320, h: 250 });
            assert.ok(fit && fit.bounds.every((p) => Number.isFinite(p.x + p.y)));
            assert.ok(
              Math.abs(fit.bandPoint.x - mount.x + Math.sin(tilt) * mount.w * 0.014) < 1e-10,
            );
            assert.ok(
              Math.abs(fit.bandPoint.y - mount.y - Math.cos(tilt) * mount.w * 0.014) < 1e-10,
            );
            assert.ok(fit.topPoint.y < fit.bandPoint.y);
            checks++;
          }
  assert.equal(checks, 1680);
  assert.equal(hats.layout('unknown', { x: 0, y: 0, w: 80 }, 'idle', { w: 10, h: 10 }), null);
  assert.equal(hats.layout('cap', { x: 0, y: 0, w: 0 }, 'idle', { w: 10, h: 10 }), null);
});

test('rear cap chooses the forward-projecting brim view; rig perspective overrides pose labels', () => {
  assert.equal(hats.viewFor('rear'), 'back');
  assert.equal(hats.VIEW_POSE.back, 'rear');
  assert.equal(hats.viewFor('mid-back'), 'side');
  assert.equal(hats.viewFor('sleep', { perspective: 'back' }), 'back');
  assert.equal(hats.viewFor('rear', { perspective: 'front' }), 'front');
});
