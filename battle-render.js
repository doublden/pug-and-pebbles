(function () {
  'use strict';
  const sequences = {
    attack: [2, 3, 4, 5],
    alt: [9, 10, 4, 5],
    guard: [6, 7, 6, 0],
    boss: [2, 3, 4, 5],
  };
  function pose(scene, hero, now) {
    if (scene.status === 'won') return { frame: 11, lean: 0 };
    const age = now - (hero ? scene.guardAt : scene.bossAttackAt);
    if (age >= 0 && age < 560) {
      const frames = hero
        ? sequences.guard
        : scene.bossVariant
          ? scene.index === 1
            ? [9, 4, 3, 5]
            : sequences.alt
          : sequences.boss;
      return {
        frame: frames[Math.min(3, Math.floor(age / 140))],
        lean: Math.sin((age / 560) * Math.PI) * (hero ? -0.015 : 0.035),
      };
    }
    const swing = now - scene.attackAt;
    if (swing >= 0 && swing < 460)
      return {
        frame: hero
          ? (scene.variant ? sequences.alt : sequences.attack)[Math.min(3, Math.floor(swing / 115))]
          : swing < 190
            ? 6
            : swing < 350
              ? 8
              : 7,
        lean: Math.sin((swing / 460) * Math.PI) * (hero ? 0.035 : -0.015),
      };
    return { frame: Math.floor((now - scene.started) / 650) % 2, lean: 0 };
  }
  function layout(w, h) {
    const size = Math.min(w * 0.56, h * 0.31),
      base = h * 0.715;
    return {
      hero: { x: w * 0.005, y: base - size * 0.9375, size },
      boss: { x: w * 0.49, y: base - size * 0.9375, size: size * 0.9 },
    };
  }
  function draw(world, now) {
    const scene = world.battle;
    if (!scene) return;
    const c = world.ctx,
      w = world.w,
      h = world.h,
      l = layout(w, h);
    c.save();
    c.fillStyle = 'rgba(27,17,10,.22)';
    c.fillRect(0, 0, w, h);
    for (const hero of [true, false]) {
      const p = pose(scene, hero, now),
        box = hero ? l.hero : l.boss,
        key = hero ? 'pug-' + scene.group : PugBattleRules.BOSSES[scene.index].id;
      if (scene.renderMode !== 'legacy' && hero && world.rig?.drawCombat(c, scene, box, now))
        continue;
      if (
        scene.renderMode !== 'legacy' &&
        !hero &&
        window.PugCharacterMotion?.drawBoss(world, c, scene, box, now)
      )
        continue;
      const image = world.images['battle-' + key];
      if (!image) continue;
      const size = box.size,
        bob = world.reduced ? 0 : Math.sin((now - scene.started) / 340) * (size * 0.004),
        dx = world.reduced ? 0 : p.lean * w;
      c.save();
      c.translate(box.x + dx, box.y + bob);
      c.fillStyle = 'rgba(0,0,0,.24)';
      c.beginPath();
      c.ellipse(size * 0.5, size * 0.95, size * 0.33, size * 0.055, 0, 0, Math.PI * 2);
      c.fill();
      c.drawImage(
        image,
        (p.frame % 4) * 320,
        Math.floor(p.frame / 4) * 320,
        320,
        320,
        0,
        0,
        size,
        size,
      );
      if (hero) {
        const hand = scene.metadata.sheets[key].hands[p.frame],
          weapon = world.images['weapon-' + scene.weapon];
        if (weapon && hand) {
          const age = now - scene.attackAt,
            active = age >= 0 && age < 460,
            guard = now - scene.guardAt < 560;
          let angle = guard
            ? 0.8
            : active
              ? -1.0 + Math.sin(Math.min(1, age / 370) * Math.PI) * 2.5
              : -0.65;
          c.save();
          c.translate((hand[0] / 320) * size, (hand[1] / 320) * size);
          c.rotate(angle);
          const length = size * 0.47,
            width = length * 0.23;
          // All native weapon art has its tip down; rotate around the grip for a blade pointing up.
          c.rotate(Math.PI);
          c.drawImage(weapon, -width * 0.5, -length * 0.15, width, length);
          c.restore();
          // The grip is tucked under the same opaque paw, with no second hand/head layer.
          const r = 11,
            sx = (p.frame % 4) * 320 + hand[0] - r,
            sy = Math.floor(p.frame / 4) * 320 + hand[1] - r;
          c.drawImage(
            image,
            sx,
            sy,
            r * 2,
            r * 2,
            ((hand[0] - r) / 320) * size,
            ((hand[1] - r) / 320) * size,
            ((r * 2) / 320) * size,
            ((r * 2) / 320) * size,
          );
        }
      }
      c.restore();
    }
    const flash = now - scene.hitAt;
    if (!world.reduced && flash >= 0 && flash < 180) {
      c.strokeStyle = `rgba(255,222,104,${1 - flash / 180})`;
      c.lineWidth = 2;
      c.beginPath();
      const x = w * 0.63,
        y = h * 0.61;
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7;
        c.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
        c.lineTo(x + Math.cos(a) * (15 + flash * 0.06), y + Math.sin(a) * (15 + flash * 0.06));
      }
      c.stroke();
    }
    c.restore();
  }
  window.PugBattleRender = { draw, pose, layout };
})();
