(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
  const smooth = (v) => {
    v = clamp(v);
    return v * v * (3 - 2 * v);
  };
  const pulse = (v, center, radius) => smooth(1 - Math.abs(v - center) / radius);
  const easeWindow = (v, start, end, ramp) =>
    smooth((v - start) / ramp) * (1 - smooth((v - end + ramp) / ramp));
  const lerp = (a, b, p) => a + (b - a) * p;
  function birdMotion(b, reduced = false) {
    const time = reduced ? 0 : Math.max(0, b.frameClock || 0);
    const flight = b.phase !== 'landed';
    const fold =
      b.phase === 'in'
        ? 1 - smooth((b.p - 0.78) / 0.22)
        : b.phase === 'out'
          ? smooth(b.p / 0.13)
          : 0;
    const age = Math.max(0, b.lastPeckAge || 0);
    const peck = !flight && age < 660 ? Math.sin((Math.PI * age) / 660) ** 2 : 0;
    return {
      fold: reduced ? (flight ? 0.7 : 0) : fold,
      flap: reduced ? 0 : Math.sin(time / 125) * 0.8,
      head: peck * 0.88 + (reduced ? 0 : Math.sin(time / 1300) * 0.035),
      peck,
      blink: reduced ? 0 : pulse(time % 6200, 3400, 130),
      bob: reduced ? 0 : flight ? Math.sin(time / 250) * 1.6 * fold : peck * 1.3,
      breath: reduced ? 0 : Math.sin(time / 1050) * 0.008,
    };
  }
  function bossMotion(scene, now, reduced = false) {
    const attackAge = Math.max(0, now - scene.bossAttackAt);
    const defendAge = Math.max(0, now - scene.attackAt);
    const attack = attackAge < 640 ? Math.sin((Math.PI * attackAge) / 640) ** 2 : 0;
    const guard = defendAge < 500 ? Math.sin((Math.PI * defendAge) / 500) ** 2 : 0;
    const age = Math.max(0, now - scene.started);
    const won = scene.status === 'won';
    return {
      attack: reduced || won ? 0 : attack,
      windup: reduced || won ? 0 : easeWindow(attackAge, 0, 320, 130),
      high: scene.bossVariant ? 1 : 0,
      guard: reduced || won ? 0 : guard,
      breath: reduced ? 0 : Math.sin(age / 650) * 0.008,
      head: reduced ? 0 : Math.sin(age / 2200) * 0.045 - attack * 0.06 + guard * 0.1,
      bob: reduced ? 0 : Math.sin(age / 870) * 0.003,
      fallen: won ? smooth((now - (scene.wonAt ?? scene.hitAt ?? now)) / 720) : 0,
      blink: reduced ? 0 : pulse(age % 7100, 3900, 150),
    };
  }
  function part(world, key, index, cols, rows) {
    return world.extras?.frame(key, index, cols, rows);
  }
  function paint(c, f, x, y, w, h) {
    if (!f) return;
    h ??= (w * f.h) / f.w;
    c.drawImage(f.canvas, f.x, f.y, f.w, f.h, x, y, w, h);
  }
  function setCanvas(canvas, w, h) {
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, w, h);
    c.imageSmoothingEnabled = true;
    return c;
  }
  function drawBird(world, canvas, bird) {
    if (!world.images.motionBirdRig) return false;
    const row = bird.type === 'crow' ? 0 : bird.type === 'pirate' ? 2 : 1;
    const body = part(world, 'motionBirdRig', row * 4, 4, 3);
    const head = part(world, 'motionBirdRig', row * 4 + 1, 4, 3);
    const wing = part(world, 'motionBirdRig', row * 4 + 2, 4, 3);
    const far = part(world, 'motionBirdRig', row * 4 + 3, 4, 3);
    if (![body, head, wing, far].every(Boolean)) return false;
    const c = setCanvas(canvas, 256, 384),
      m = birdMotion(bird, world.reduced);
    const bw = 174,
      bh = (bw * body.h) / body.w,
      x = 26,
      y = 346 - bh + m.bob;
    c.save();
    c.translate(128, 346);
    c.rotate(m.peck * 0.12);
    c.translate(-128, -346);
    const rootX = x + bw * 0.67,
      rootY = y + bh * 0.26;
    const wingDraw = (f, front) => {
      if (m.fold < 0.015) return;
      c.save();
      c.translate(rootX + (front ? 0 : 8), rootY + (front ? 1 : -2));
      c.rotate((front ? -0.15 : -0.38) + m.flap * (front ? 1 : 0.75) * m.fold);
      c.scale(1, 0.1 + m.fold * 0.9);
      const ww = front ? 147 : 119,
        hh = (ww * f.h) / f.w;
      paint(c, f, -ww * 0.91, -hh * 0.87, ww, hh);
      c.restore();
    };
    wingDraw(far, false);
    c.save();
    c.translate(x + bw * 0.5, 346 + m.bob);
    c.scale(1 + m.breath, 1 + m.breath);
    paint(c, body, -bw * 0.5, -bh, bw, bh);
    c.restore();
    wingDraw(wing, true);
    const hw = bird.type === 'pirate' ? 90 : 85,
      hh = (hw * head.h) / head.w;
    c.save();
    c.translate(x + bw * 0.88, y + bh * (0.23 + m.peck * 0.15));
    c.rotate(m.head);
    const hx = -hw * 0.3,
      hy = -hh * 0.78;
    paint(c, head, hx, hy, hw, hh);
    if (bird.type !== 'pirate' && m.blink > 0.01) {
      const ex = hx + hw * 0.6,
        ey = hy + hh * 0.29,
        rx = hw * 0.065,
        ry = hh * 0.07;
      c.save();
      c.beginPath();
      c.ellipse(ex, ey, rx, ry, 0, 0, TAU);
      c.clip();
      c.drawImage(
        head.canvas,
        head.x + head.w * 0.51,
        head.y + head.h * 0.12,
        head.w * 0.18,
        head.h * 0.12,
        ex - rx,
        ey - ry,
        rx * 2,
        ry * 2 * m.blink,
      );
      c.restore();
    }
    c.restore();
    c.restore();
    return true;
  }
  function drawInsect(world, c, actor, time) {
    const row = actor.kind === 'bee' ? 1 : 0;
    if (!world.images.motionInsectRig) return false;
    const body = part(world, 'motionInsectRig', row * 3, 3, 2);
    const wing = part(world, 'motionInsectRig', row * 3 + 1, 3, 2);
    const far = part(world, 'motionInsectRig', row * 3 + 2, 3, 2);
    if (![body, wing, far].every(Boolean)) return false;
    const flap = world.reduced ? 0.6 : 0.18 + Math.abs(Math.sin(time / (row ? 34 : 100))) * 0.82;
    const bob = world.reduced ? 0 : Math.sin(time / 380) * 3;
    const bx = row ? 97 : 122,
      by = (row ? 105 : 143) + bob,
      bw = row ? 112 : 82,
      bh = (bw * body.h) / body.w;
    const wx = row ? 144 : 171,
      wy = (row ? 164 : 202) + bob;
    const wingDraw = (f, back) => {
      c.save();
      c.translate(wx, wy);
      c.rotate((back ? 0.12 : -0.13) + Math.sin(time / 300) * 0.035);
      c.scale(flap * (back ? 0.7 : 1), 1);
      const ww = row ? 109 : 150,
        hh = (ww * f.h) / f.w;
      paint(c, f, -ww * 0.9, -hh * 0.83, ww, hh);
      c.restore();
    };
    wingDraw(far, true);
    wingDraw(wing, false);
    paint(c, body, bx, by, bw, bh);
    return true;
  }
  function drawGuest(world, canvas, actor, now) {
    const c = setCanvas(canvas, 256, 256);
    const time = world.reduced ? 0 : Math.max(0, actor.elapsed || 0);
    c.save();
    if (!actor.fromLeft) {
      c.translate(256, 0);
      c.scale(-1, 1);
    }
    if (actor.kind !== 'yuppi') {
      if (drawInsect(world, c, actor, time)) {
        c.restore();
        return true;
      }
      // The old sheet contains a clipped butterfly at cell 6; the first complete bee is cell 7.
      const f = part(world, 'insects', actor.kind === 'bee' ? 7 : 0, 4, 3);
      if (!f) {
        c.restore();
        return false;
      }
      const scale = Math.min(230 / f.w, 204 / f.h),
        w = f.w * scale,
        h = f.h * scale;
      c.translate(128, 128 + Math.sin(time / 350) * 2);
      c.rotate(Math.sin(time / 450) * 0.025);
      paint(c, f, -w / 2, -h / 2, w, h);
      c.restore();
      return true;
    }
    const f = part(world, 'yuppi', 0, 3, 2);
    if (!f) {
      c.restore();
      return false;
    }
    const scale = Math.min(246 / f.w, 210 / f.h),
      w = f.w * scale,
      h = f.h * scale;
    c.translate(128, 132 + Math.sin(time / 210) * 2);
    c.rotate(Math.sin(time / 450) * 0.02);
    // One coherent painting is gently deformed in strips: no whole-character frame swaps.
    for (let i = 0; i < 24; i++) {
      const sw = f.w / 24,
        sx = f.x + i * sw,
        px = i / 24;
      const dy = world.reduced ? 0 : Math.sin(time / 260 + px * 3) * 1.1 * (1 - px);
      c.drawImage(
        f.canvas,
        sx,
        f.y,
        sw + 0.5,
        f.h,
        -w / 2 + (i * w) / 24,
        -h / 2 + dy,
        w / 24 + 0.5,
        h,
      );
    }
    const blink = pulse(time % 4400, 2100, 155);
    const miss = now < (world.scene?.missUntil || 0);
    if (blink > 0 || miss) {
      const expression = part(world, 'yuppi', miss ? 4 : 2, 3, 2);
      if (expression) {
        c.save();
        c.globalAlpha = miss ? 1 : blink;
        c.beginPath();
        c.ellipse(w * 0.275, -h * 0.28, w * 0.12, h * 0.15, 0, 0, TAU);
        if (miss) c.ellipse(w * 0.29, -h * 0.02, w * 0.06, h * 0.12, 0, 0, TAU);
        c.clip();
        paint(c, expression, -w / 2, -h / 2, w, h);
        c.restore();
      }
    }
    c.restore();
    return true;
  }

  function drawFriend(world, element, coin) {
    if (!element || !world.images.motionFriends) return false;
    const index = Math.max(0, Math.min(4, Math.floor(coin.pet || 0)));
    const face = part(world, 'motionFriends', index, 5, 2);
    const closed = part(world, 'motionFriends', index + 5, 5, 2);
    if (!face || !closed) return false;
    let canvas = element.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
      element.append(canvas);
      element.style.backgroundImage = 'none';
    }
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, 256, 256);
    const time = world.reduced ? 0 : Math.max(0, (coin.p || 0) * (coin.duration || 8000));
    const gold = c.createLinearGradient(20, 10, 235, 250);
    gold.addColorStop(0, '#fff3a2');
    gold.addColorStop(0.28, '#efb82f');
    gold.addColorStop(0.55, '#f9d76a');
    gold.addColorStop(0.8, '#b87716');
    gold.addColorStop(1, '#74420e');
    c.fillStyle = gold;
    c.strokeStyle = '#6f420c';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(128, 128, 121, 0, TAU);
    c.fill();
    c.stroke();
    c.strokeStyle = '#fff2a6';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(128, 128, 113, 0, TAU);
    c.stroke();
    c.strokeStyle = '#925615';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(128, 128, 106, 0, TAU);
    c.stroke();
    c.fillStyle = '#987437';
    c.beginPath();
    c.arc(128, 128, 103, 0, TAU);
    c.fill();
    c.save();
    c.translate(128, 177);
    c.rotate(Math.sin(time / 1200 + index * 0.5) * 0.035);
    c.scale(1 + Math.sin(time / 900) * 0.006, 1 + Math.sin(time / 900) * 0.008);
    const width = 215,
      height = Math.min(208, (width * face.h) / face.w),
      x = -width * 0.5,
      y = -height * 0.79;
    paint(c, face, x, y, width, height);
    const eyeY = [0.48, 0.48, 0.43, 0.43, 0.53][index],
      blink = pulse(time % (4100 + index * 330), 2300, 155);
    if (blink > 0) {
      c.save();
      c.globalAlpha = blink;
      c.beginPath();
      c.ellipse(0, y + height * eyeY, width * 0.31, height * 0.073, 0, 0, TAU);
      c.clip();
      paint(c, closed, x, y, width, height);
      c.restore();
    }
    c.restore();
    c.strokeStyle = '#74450f';
    c.fillStyle = '#d8ac3b';
    c.lineWidth = 2;
    for (const side of [-1, 1])
      for (let i = 0; i < 5; i++) {
        const angle = ((35 + i * 16) / 180) * Math.PI;
        const x = 128 + side * Math.cos(angle) * 108,
          y = 128 + Math.sin(angle) * 108;
        c.save();
        c.translate(x, y);
        c.rotate(side * (angle - 0.5));
        c.beginPath();
        c.ellipse(0, 0, 5, 10, side * 0.6, 0, TAU);
        c.fill();
        c.stroke();
        c.restore();
      }
    const ribbon = c.createLinearGradient(0, 212, 0, 245);
    ribbon.addColorStop(0, '#73773b');
    ribbon.addColorStop(1, '#323c24');
    c.fillStyle = ribbon;
    c.strokeStyle = '#e8c15e';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(63, 210);
    c.quadraticCurveTo(128, 236, 193, 210);
    c.lineTo(187, 237);
    c.quadraticCurveTo(128, 258, 69, 237);
    c.closePath();
    c.fill();
    c.stroke();
    return true;
  }

  function drawBoss(world, c, scene, box, now) {
    const key = scene.index === 1 ? 'motionCrowBoss' : 'motionRaccoonBoss';
    if (!world.images[key]) return false;
    const f = Array.from({ length: 8 }, (_, i) => part(world, key, i, 4, 2));
    if (f.some((v) => !v)) return false;
    const target = bossMotion(scene, now, world.reduced),
      size = box.size;
    const previous = world.characterBossMotion;
    let m = target;
    if (!world.reduced && previous?.scene === scene) {
      const blend = 1 - Math.exp(-Math.max(0, Math.min(80, now - previous.at)) / 45);
      m = Object.fromEntries(
        Object.keys(target).map((key) => [key, lerp(previous.motion[key], target[key], blend)]),
      );
    }
    world.characterBossMotion = { scene, at: now, motion: m };
    c.save();
    c.translate(box.x, box.y);
    c.fillStyle = 'rgba(0,0,0,.22)';
    c.beginPath();
    c.ellipse(size * 0.5, size * 0.95, size * 0.32, size * 0.05, 0, 0, TAU);
    c.fill();
    c.translate(size * 0.5, size * 0.94);
    c.translate(-m.attack * size * 0.12 + m.guard * size * 0.025, size * m.bob);
    c.rotate(m.fallen * 0.9);
    c.scale(1, 1 - m.fallen * 0.13);
    const torsoW = size * 0.47,
      torsoH = size * 0.66;
    const torsoY = -torsoH;
    const shoulderX = size * 0.09,
      shoulderY = -size * 0.56;
    const nearHand = {
      x: -size * (0.14 + m.attack * (0.3 - m.high * 0.04) - m.guard * 0.07),
      y:
        -size *
        (0.47 + m.guard * 0.21 - m.attack * (0.03 + m.high * 0.08) + m.windup * m.high * 0.3),
    };
    const farHand = {
      x: -size * (0.2 + m.attack * 0.08 + m.guard * 0.08),
      y: -size * (0.53 + m.guard * 0.16),
    };
    function limb(upper, lower, shoulder, hand, flip) {
      const dx = hand.x - shoulder.x,
        dy = hand.y - shoulder.y;
      const distance = Math.max(size * 0.02, Math.hypot(dx, dy));
      const upperLength = size * 0.26,
        lowerLength = size * 0.26;
      const reach = Math.min(distance, upperLength + lowerLength - size * 0.005);
      const target = {
        x: shoulder.x + (dx / distance) * reach,
        y: shoulder.y + (dy / distance) * reach,
      };
      const mid = { x: (shoulder.x + target.x) / 2, y: (shoulder.y + target.y) / 2 };
      const bend = Math.sqrt(Math.max(0, upperLength * upperLength - (reach * reach) / 4));
      const normal = { x: -dy / distance, y: dx / distance };
      const direction = normal.y < 0 ? -1 : 1;
      const elbow = {
        x: mid.x + normal.x * bend * direction,
        y: mid.y + normal.y * bend * direction,
      };
      const drawLink = (image, from, to, paw) => {
        const start = paw
          ? scene.index === 1
            ? [0.8, 0.2]
            : [0.19, 0.82]
          : scene.index === 0 && flip
            ? [0.78, 0.18]
            : [0.24, 0.2];
        const end = paw
          ? scene.index === 1
            ? [0.17, 0.85]
            : [0.8, 0.2]
          : scene.index === 0 && flip
            ? [0.17, 0.84]
            : [0.79, 0.84];
        const sx = (end[0] - start[0]) * image.w,
          sy = (end[1] - start[1]) * image.h;
        const ax = to.x - from.x,
          ay = to.y - from.y;
        const scale = Math.hypot(ax, ay) / Math.hypot(sx, sy);
        c.save();
        c.translate(from.x, from.y);
        c.rotate(Math.atan2(ay, ax) - Math.atan2(sy, sx));
        c.scale(scale, scale);
        paint(c, image, -start[0] * image.w, -start[1] * image.h, image.w, image.h);
        c.restore();
      };
      drawLink(upper, shoulder, elbow, false);
      // Hide the native cut edge at the elbow under a small matching fur/feather joint.
      c.save();
      c.beginPath();
      c.arc(elbow.x, elbow.y, size * 0.082, 0, TAU);
      c.clip();
      const jointTexture = upper,
        patch = size * 0.2;
      c.drawImage(
        jointTexture.canvas,
        jointTexture.x + jointTexture.w * 0.42,
        jointTexture.y + jointTexture.h * 0.42,
        jointTexture.w * 0.25,
        jointTexture.h * 0.25,
        elbow.x - patch * 0.5,
        elbow.y - patch * 0.5,
        patch,
        patch,
      );
      c.restore();
      drawLink(lower, elbow, target, true);
    }
    // Tail stays behind the torso and has a softly delayed follow-through.
    c.save();
    c.translate(size * 0.16, -size * 0.23);
    c.rotate(world.reduced ? 0 : Math.sin((now - scene.started) / 1150) * 0.065);
    paint(c, f[6], -size * 0.02, -size * 0.29, size * 0.36);
    c.restore();
    limb(f[4], f[5], { x: -shoulderX * 0.6, y: shoulderY + size * 0.025 }, farHand, true);
    c.save();
    c.scale(1 + m.breath, 1 + m.breath);
    paint(c, f[0], -torsoW * 0.5, torsoY, torsoW, torsoH);
    c.restore();
    const headW = size * 0.5,
      headH = (headW * f[1].h) / f[1].w;
    c.save();
    c.translate(-size * 0.025, -size * 0.64 + m.guard * size * 0.025);
    c.rotate(m.head);
    paint(c, f[1], -headW * 0.5, -headH * 0.77, headW, headH);
    if (m.blink > 0) {
      c.save();
      c.globalAlpha = m.blink;
      c.beginPath();
      c.ellipse(-headW * 0.07, -headH * 0.34, headW * 0.27, headH * 0.12, -0.1, 0, TAU);
      c.clip();
      paint(c, f[7], -headW * 0.5, -headH * 0.77, headW, headH);
      c.restore();
    }
    c.restore();
    limb(f[2], f[3], { x: shoulderX, y: shoulderY }, nearHand, false);
    c.restore();
    return true;
  }
  const api = {
    clamp,
    smooth,
    pulse,
    easeWindow,
    birdMotion,
    bossMotion,
    drawBird,
    drawGuest,
    drawFriend,
    drawBoss,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PugCharacterMotion = api;
})(typeof window !== 'undefined' ? window : globalThis);
