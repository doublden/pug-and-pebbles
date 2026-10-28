(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const FAMILIES = Object.freeze(['skinny', 'healthy', 'round', 'muscle']);
  const STAGES = Object.freeze(
    Array.from({ length: 16 }, (_, i) =>
      Object.freeze({
        family: i < 6 ? 'skinny' : i < 9 ? 'healthy' : i < 15 ? 'round' : 'muscle',
        width:
          i < 6
            ? 0.75 + i * 0.035
            : i < 9
              ? 0.94 + (i - 6) * 0.03
              : i < 15
                ? 1.05 + (i - 9) * 0.035
                : 1,
        dirt: i < 4 ? [1, 0.63, 0.34, 0.12][i] : 0,
        collar: i >= 13 && i <= 14,
        crown: i === 14,
      }),
    ),
  );
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (v) => {
    v = clamp(v);
    return v * v * (3 - 2 * v);
  };
  const mix = (a, b, p) => a + (b - a) * p;
  const pulse = (t, center, width) => smooth(1 - Math.abs(t - center) / width);
  const basePose = (pose) => String(pose || 'idle').replace(/^mid-/, '');
  // Open/closed drawings have slightly different eyelid placement. Align each eye locally,
  // never dissolve a second head over the first or leave the bottom of an iris exposed.
  const EYES = Object.freeze({
    skinny: [
      [0.405, 0.545, 0.397, 0.565],
      [0.78, 0.466, 0.79, 0.49],
    ],
    healthy: [
      [0.4, 0.568, 0.408, 0.581],
      [0.78, 0.479, 0.788, 0.495],
    ],
    round: [
      [0.417, 0.535, 0.4, 0.551],
      [0.793, 0.46, 0.798, 0.474],
    ],
    muscle: [
      [0.437, 0.56, 0.438, 0.581],
      [0.793, 0.46, 0.79, 0.493],
    ],
  });
  function plan(stage, pose, now, strength = 1, reduced = false) {
    const spec = STAGES[clamp(Math.round(stage), 0, 15)];
    const p = basePose(pose),
      t = reduced ? 0 : now / 1000;
    const q = p === 'idle' ? 0 : smooth(strength) * (String(pose).startsWith('mid-') ? 0.28 : 1);
    const lying = p === 'sleep' || p === 'stretch';
    const rearIntent = p === 'back' || p === 'rear';
    const chasing = p === 'tailchase';
    const sideIntent = p === 'left' || chasing;
    const breath = Math.sin(t * (p === 'sleep' ? mix(1.55, 1.05, q) : 1.55));
    const lie = lying ? q : 0;
    // Keep a natural profile thickness; use the actual side drawing between front and back.
    // The projection never collapses into a paper-thin held intermediate pose.
    const projection = rearIntent || sideIntent ? 0.7 + 0.3 * Math.abs(Math.cos(q * Math.PI)) : 1;
    const view = rearIntent
      ? q < 0.28
        ? 'front'
        : q < 0.72
          ? 'side'
          : 'back'
      : sideIntent && q >= 0.45
        ? 'side'
        : 'front';
    const bw = 0.72 * spec.width;
    const bh = (spec.family === 'muscle' ? 0.61 : 0.56) * (1 + breath * 0.006);
    const front = { x: 0.5 - bw / 2, y: 0.94 - bh, w: bw, h: bh };
    const lieTarget = {
      x: 0.035,
      y: p === 'stretch' ? 0.58 : 0.6,
      w: 0.94,
      h: p === 'stretch' ? 0.36 : 0.34,
    };
    const turnW = mix(bw, 0.52 * spec.width, q) * projection;
    const turnH = mix(bh, 0.61, q);
    const rect = lying
      ? {
          x: mix(front.x, lieTarget.x, lie),
          y: mix(front.y, lieTarget.y, lie),
          w: mix(front.w, lieTarget.w, lie),
          h: mix(front.h, lieTarget.h, lie),
        }
      : rearIntent
        ? { x: 0.5 - turnW / 2, y: 0.94 - turnH, w: turnW, h: turnH }
        : { ...front };
    const torsoMix = lying ? smooth((lie - 0.42) / 0.16) : chasing ? smooth((q - 0.4) / 0.2) : 0;
    const body = {
      ...rect,
      part: lying
        ? torsoMix >= 0.5
          ? 3
          : 0
        : chasing && q > 0.5
          ? 11
          : rearIntent && q >= 0.65
            ? 4
            : 0,
    };
    const bodyLayers = lying
      ? [
          { ...rect, part: 0, alpha: 1 - torsoMix },
          { ...rect, part: 3, alpha: torsoMix },
        ]
      : chasing
        ? [
            { ...rect, part: 0, alpha: 1 - torsoMix },
            { ...rect, part: 11, alpha: torsoMix },
          ]
        : [{ ...body, alpha: 1 }];
    const headTargetW = rearIntent ? 0.46 : sideIntent ? 0.49 : 0.58;
    const headTargetH = rearIntent ? 0.46 * 0.61 : sideIntent ? 0.49 * 0.79 : 0.58 * 0.77;
    const nativeHw = mix(mix(0.58, headTargetW, rearIntent || sideIntent ? q : 0), 0.405, lie);
    const hh = mix(
      mix(0.58 * 0.77, headTargetH, rearIntent || sideIntent ? q : 0),
      0.405 * 0.77,
      lie,
    );
    const hw = nativeHw * projection;
    const hx = mix(0.51 + (sideIntent ? q * 0.05 : 0), 0.745, lie);
    const uprightBottom = rearIntent ? rect.y + mix(0.105, 0.13, q) : front.y + 0.105;
    const bottom = mix(uprightBottom, 0.89, lie);
    const tilt = reduced
      ? 0
      : 0.018 +
        Math.sin(t * 0.48) * 0.011 +
        (p === 'look' ? Math.sin(t * 0.65) * 0.1 * q : 0) +
        (p === 'scratch' ? Math.sin(t * 13) * 0.017 * q : 0) +
        (p === 'pawlick' ? -0.15 * q : 0) +
        (p === 'stretch' ? 0.13 * q : 0) +
        (rearIntent ? Math.sin(t * 0.6) * 0.045 * q : 0);
    const head = {
      x: hx - hw / 2,
      y: bottom - hh,
      w: hw,
      h: hh,
      tilt,
      perspective: view,
      part: view === 'back' ? 6 : view === 'side' ? 5 : 1,
    };
    const shoulders = [0.5 - bw * 0.21, 0.5 + bw * 0.23];
    const legs = shoulders.map((x, i) => ({
      x: mix(x, 0.6 + i * 0.13, lie),
      y: mix(front.y + 0.13, 0.76, lie),
      length: mix(0.94 - (front.y + 0.13), 0.24, lie),
      width: spec.family === 'muscle' ? 0.18 : 0.15,
      upper: mix(Math.PI / 2 + (i ? -0.02 : 0.025), 0.9, lie),
      lower: mix(Math.PI / 2, 0.5, lie),
      part: i ? 9 : 8,
    }));
    if (p === 'splay')
      legs.forEach((l, i) => {
        l.upper += (i ? -0.26 : 0.26) * q;
        l.lower += (i ? -0.22 : 0.22) * q;
      });
    function reach(leg, goal, amount, elbowSide) {
      const upper = leg.length * 0.49,
        lower = leg.length * 0.51;
      const rest = {
        x: leg.x + Math.cos(leg.upper) * upper + Math.cos(leg.lower) * lower,
        y: leg.y + Math.sin(leg.upper) * upper + Math.sin(leg.lower) * lower,
      };
      const target = { x: mix(rest.x, goal.x, amount), y: mix(rest.y, goal.y, amount) };
      const dx = target.x - leg.x,
        dy = target.y - leg.y;
      const distance = clamp(
        Math.hypot(dx, dy),
        Math.abs(upper - lower) + 0.00001,
        upper + lower - 0.00001,
      );
      const bend = Math.acos(
        clamp(
          (upper * upper + distance * distance - lower * lower) / (2 * upper * distance),
          -1,
          1,
        ),
      );
      leg.upper = Math.atan2(dy, dx) + elbowSide * bend;
      const elbow = {
        x: leg.x + Math.cos(leg.upper) * upper,
        y: leg.y + Math.sin(leg.upper) * upper,
      };
      leg.lower = Math.atan2(target.y - elbow.y, target.x - elbow.x);
    }
    if (p === 'scratch')
      reach(
        legs[0],
        { x: 0.24 + Math.sin(t * 14 + 0.7) * 0.006, y: 0.2 + Math.sin(t * 14) * 0.013 },
        q,
        -1,
      );
    if (p === 'pawlick') reach(legs[1], { x: 0.65, y: 0.39 + Math.sin(t * 6) * 0.008 }, q, 1);
    if (chasing)
      legs.forEach((leg, i) => {
        leg.x = mix(leg.x, 0.57 + i * 0.12, q);
        leg.y = mix(leg.y, 0.49, q);
        leg.length = mix(leg.length, 0.29, q);
        leg.upper = mix(leg.upper, 1.2 + Math.sin(t * 9 + i * Math.PI) * 0.7, q);
        leg.lower = mix(leg.lower, 0.9 + Math.cos(t * 9 + i * Math.PI) * 0.45, q);
      });
    const frontLegIndex = p === 'pawlick' ? 1 : p === 'scratch' ? 0 : -1;
    const legAlpha = lying
      ? 1 - smooth((lie - 0.16) / 0.24)
      : rearIntent
        ? q < 0.65
          ? projection
          : 0
        : 1;
    const blink = reduced ? 0 : Math.max(pulse(t % 5.6, 2.9, 0.16), pulse(t % 11.2, 9.1, 0.13));
    return {
      spec,
      stage,
      pose: p,
      q,
      t,
      body,
      bodyLayers,
      torsoMix,
      head,
      legs,
      legAlpha,
      frontLegIndex,
      lie,
      rear: view === 'back',
      view,
      breath,
      tail: {
        x: mix(
          front.x + 0.05,
          rearIntent ? 0.53 : lying ? 0.14 : front.x + 0.05,
          rearIntent ? q : lie,
        ),
        y: mix(0.76, rearIntent ? 0.72 : 0.8, rearIntent ? q : lie),
        scale: rearIntent ? projection : 1,
      },
      blink: p === 'sleep' ? Math.max(blink, q) : blink,
      yawn: p === 'yawn' ? q * (0.5 - 0.5 * Math.cos(((t % 4.8) / 4.8) * TAU)) : 0,
      tongue: ['lick', 'pawlick'].includes(p) ? q * Math.max(0, Math.sin(t * 7)) : 0,
      wag: reduced ? 0 : Math.sin(t * (p === 'splay' ? 8 : 3.2)) * (p === 'splay' ? 0.18 : 0.045),
    };
  }
  class Rig {
    constructor(world) {
      this.world = world;
      this.requests = new Map();
      this.familyOrder = [];
      this.coats = new Map();
      this.retryAt = new Map();
    }
    ready(stage) {
      return !!this.world.images['pug-rig-' + STAGES[clamp(stage, 0, 15)].family];
    }
    preload(stage) {
      const family = STAGES[clamp(stage, 0, 15)].family;
      const key = 'pug-rig-' + family;
      if (this.world.images[key]) return Promise.resolve();
      if (
        performance.now() <
        Math.max(this.world.artRetryAt?.get(key) || 0, this.retryAt.get(family) || 0)
      )
        return Promise.reject(new Error('Rig artwork temporarily unavailable'));
      if (this.requests.has(family)) return this.requests.get(family);
      const promise = this.world
        .image(key, 'assets-pug-v9/' + family + '.webp')
        .then(() => {
          this.familyOrder = [...this.familyOrder.filter((f) => f !== family), family];
          // Keep current and recent family only; thumbnails can reload a dropped family.
          while (this.familyOrder.length > 2) {
            const old = this.familyOrder.shift();
            if (old === STAGES[clamp(this.world.state.pugStage, 0, 15)].family) {
              this.familyOrder.push(old);
              continue;
            }
            delete this.world.images['pug-rig-' + old];
            this.world.loadingImages.delete('pug-rig-' + old);
            this.requests.delete(old);
            for (const k of this.world.extras.frames.keys())
              if (k.startsWith('pug-rig-' + old + '-')) this.world.extras.frames.delete(k);
          }
        })
        .catch((error) => {
          this.requests.delete(family);
          this.retryAt.set(family, performance.now() + 30000);
          throw error;
        });
      this.requests.set(family, promise);
      return promise;
    }
    part(stage, index) {
      return this.world.extras.frame('pug-rig-' + STAGES[clamp(stage, 0, 15)].family, index, 3, 4);
    }
    strength(pose, now) {
      if (basePose(pose) === 'idle') return 0;
      if (basePose(pose) === 'back' && this.world.scene?.farting) {
        const a = this.world.scene.farting;
        return Math.min(1, (now - a.start) / 650, (1100 - (now - a.last)) / 400);
      }
      if (basePose(this.world.activePose?.()) === basePose(pose))
        return this.world.poseProgress?.(now) ?? 1;
      return 1;
    }
    measure(stage, pose, l, now = performance.now()) {
      const p = plan(stage, pose, now, this.strength(pose, now), this.world.reduced);
      if (this.world.idleEvent?.kind === 'hiccup') {
        const e = this.world.idleEvent,
          kick = this.world.reduced ? 0 : pulse((e.elapsed || 0) % 1400, 400, 150);
        p.pose = 'hiccup';
        p.yawn = 0;
        p.head.tilt += kick * 0.085;
        p.head.y -= kick * 0.015;
      }
      const h = p.head,
        pivot = { x: h.x + h.w / 2, y: h.y + h.h * 0.82 };
      const pt = (x, y) => ({
        x:
          l.x +
          (pivot.x + (x - pivot.x) * Math.cos(h.tilt) - (y - pivot.y) * Math.sin(h.tilt)) * l.size,
        y:
          l.y +
          (pivot.y + (x - pivot.x) * Math.sin(h.tilt) + (y - pivot.y) * Math.cos(h.tilt)) * l.size,
      });
      const crown = pt(h.x + h.w * 0.52, h.y + h.h * 0.105);
      const nose = pt(h.x + h.w * (p.view === 'side' ? 0.86 : 0.61), h.y + h.h * 0.59);
      const head = {
        ...crown,
        w: h.w * (p.view === 'side' ? 0.6 : 0.72) * l.size,
        tilt: h.tilt,
        perspective: p.view,
      };
      return {
        ...p,
        headRect: h,
        head,
        nose,
        bounds: {
          x: l.x + 0.02 * l.size,
          y: l.y + Math.max(-0.05, h.y) * l.size,
          w: l.size * 0.98,
          h: l.size * (1 - Math.max(-0.05, h.y)),
        },
        normalizedHead: {
          x: (head.x - l.x) / l.size,
          y: (head.y - l.y) / l.size,
          w: head.w / l.size,
          tilt: head.tilt,
        },
      };
    }
    paint(ctx, stage, index, x, y, w, h) {
      const f = this.part(stage, index);
      if (!f) return false;
      ctx.drawImage(f.canvas, f.x, f.y, f.w, f.h, x, y, w, h ?? (w * f.h) / f.w);
      return true;
    }
    leg(ctx, stage, l) {
      const f = this.part(stage, l.part);
      if (!f) return;
      const upper = l.length * 0.49,
        lower = l.length * 0.51;
      const end = { x: l.x + Math.cos(l.upper) * upper, y: l.y + Math.sin(l.upper) * upper };
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.upper - Math.PI / 2);
      ctx.drawImage(
        f.canvas,
        f.x,
        f.y,
        f.w,
        f.h * 0.53,
        -l.width / 2,
        -0.015,
        l.width,
        upper + 0.03,
      );
      ctx.restore();
      ctx.save();
      ctx.translate(end.x, end.y);
      ctx.rotate(l.lower - Math.PI / 2);
      ctx.drawImage(
        f.canvas,
        f.x,
        f.y + f.h * 0.46,
        f.w,
        f.h * 0.54,
        -l.width / 2,
        -0.02,
        l.width,
        lower + 0.02,
      );
      ctx.restore();
      // A small fur cap covers the two cropped limb edges at the moving elbow.
      ctx.save();
      ctx.translate(end.x, end.y);
      ctx.beginPath();
      ctx.ellipse(0, 0, l.width * 0.43, l.width * 0.43, 0, 0, TAU);
      ctx.clip();
      ctx.drawImage(
        f.canvas,
        f.x,
        f.y + f.h * 0.31,
        f.w,
        f.h * 0.22,
        -l.width * 0.48,
        -l.width * 0.48,
        l.width * 0.96,
        l.width * 0.96,
      );
      ctx.restore();
    }
    face(ctx, stage, p) {
      const h = p.headRect;
      ctx.save();
      ctx.translate(h.x + h.w / 2, h.y + h.h * 0.82);
      ctx.rotate(h.tilt);
      const x = -h.w / 2,
        y = -h.h * 0.82;
      const sleepingHead = p.pose === 'sleep' && p.q > 0.95 && p.view === 'front';
      this.paint(ctx, stage, sleepingHead ? 2 : h.part, x, y, h.w, h.h);
      const eyelid = Math.max(p.blink, (p.yawn || 0) * 0.9);
      if (p.view === 'front' && eyelid > 0 && !sleepingHead) {
        for (const [ox, oy, cx, cy] of EYES[STAGES[stage].family]) {
          ctx.save();
          ctx.globalAlpha *= eyelid;
          ctx.beginPath();
          ctx.ellipse(x + h.w * ox, y + h.h * oy, h.w * 0.105, h.h * 0.12, -0.12, 0, TAU);
          ctx.clip();
          this.paint(ctx, stage, 2, x + (ox - cx) * h.w, y + (oy - cy) * h.h, h.w, h.h);
          ctx.restore();
        }
      }
      if (p.view === 'front' && p.yawn > 0.03) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(
          x + h.w * 0.61,
          y + h.h * 0.76,
          h.w * 0.225,
          h.h * 0.25 * Math.max(0.16, p.yawn),
          0,
          0,
          TAU,
        );
        ctx.clip();
        this.paint(ctx, stage, 10, x, y - h.h * 0.01, h.w, h.h);
        ctx.restore();
      }
      if (p.view !== 'back' && p.tongue > 0.05) {
        ctx.save();
        ctx.fillStyle = '#cf8490';
        ctx.strokeStyle = '#a96772';
        ctx.lineWidth = 0.002;
        ctx.beginPath();
        ctx.ellipse(
          x + h.w * 0.6,
          y + h.h * 0.81,
          h.w * 0.038,
          h.h * 0.07 * p.tongue,
          -0.1,
          0,
          TAU,
        );
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      if (p.pose === 'whistle' && p.q > 0.1) {
        ctx.save();
        ctx.globalAlpha *= p.q;
        ctx.fillStyle = '#332c2b';
        ctx.strokeStyle = '#8d7a71';
        ctx.lineWidth = 0.003;
        ctx.beginPath();
        ctx.ellipse(
          x + h.w * 0.61,
          y + h.h * 0.78,
          h.w * 0.038,
          h.h * (0.027 + 0.004 * Math.sin(p.t * 5)),
          0,
          0,
          TAU,
        );
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
    coat(ctx, stage, p) {
      if (!p.spec.dirt) return;
      this.coats ||= new Map();
      for (const layer of p.bodyLayers) {
        if (layer.alpha <= 0.001) continue;
        const key = stage + ':' + layer.part;
        let patch = this.coats.get(key);
        if (!patch) {
          const frame = this.part(stage, layer.part);
          if (!frame) continue;
          patch = document.createElement('canvas');
          patch.width = Math.ceil(frame.w);
          patch.height = Math.ceil(frame.h);
          const c = patch.getContext('2d');
          c.fillStyle = '#715b3e';
          for (let i = 0; i < 21; i++) {
            const u = 0.15 + ((i * 0.173) % 0.7),
              v = 0.2 + ((i * 0.229) % 0.57);
            c.beginPath();
            c.ellipse(
              patch.width * u,
              patch.height * v,
              patch.width * (0.014 + (i % 3) * 0.006),
              patch.height * (0.022 + (i % 4) * 0.008),
              i,
              0,
              TAU,
            );
            c.fill();
          }
          // Clip the mud to this torso's real fur silhouette, never its rectangular bounds.
          c.globalCompositeOperation = 'destination-in';
          c.drawImage(
            frame.canvas,
            frame.x,
            frame.y,
            frame.w,
            frame.h,
            0,
            0,
            patch.width,
            patch.height,
          );
          this.coats.set(key, patch);
          while (this.coats.size > 8) this.coats.delete(this.coats.keys().next().value);
        }
        ctx.save();
        ctx.globalAlpha *= p.spec.dirt * 0.33 * layer.alpha;
        ctx.drawImage(patch, layer.x, layer.y, layer.w, layer.h);
        ctx.restore();
      }
    }
    collar(ctx, p) {
      if (!p.spec.collar) return;
      const h = p.headRect,
        x = h.x + h.w * 0.5,
        y = h.y + h.h * 0.88;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(h.tilt);
      const g = ctx.createLinearGradient(0, -0.012, 0, 0.04);
      g.addColorStop(0, '#a82e27');
      g.addColorStop(1, '#5e151b');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#d8ad48';
      ctx.lineWidth = 0.008;
      ctx.beginPath();
      ctx.ellipse(0, 0, h.w * 0.34, 0.035, 0, 0.08, Math.PI - 0.08);
      ctx.lineTo(-h.w * 0.34, -0.017);
      ctx.ellipse(0, -0.017, h.w * 0.34, 0.02, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (p.view !== 'back') {
        const gold = ctx.createRadialGradient(-0.008, 0.047, 0.001, 0, 0.055, 0.04);
        gold.addColorStop(0, '#ffe7a1');
        gold.addColorStop(0.5, '#c99730');
        gold.addColorStop(1, '#73501f');
        ctx.fillStyle = gold;
        ctx.beginPath();
        ctx.arc(0, 0.052, 0.035, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#efd783';
        ctx.lineWidth = 0.003;
        ctx.stroke();
        ctx.fillStyle = '#775322';
        ctx.beginPath();
        ctx.ellipse(0, 0.06, 0.012, 0.01, 0, 0, TAU);
        ctx.fill();
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc((i - 1) * 0.011, 0.042 - Math.abs(i - 1) * 0.003, 0.005, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    crown(ctx, head) {
      const w = head.w * 0.72;
      ctx.save();
      ctx.translate(head.x, head.y - head.w * 0.03);
      ctx.rotate(head.tilt);
      const g = ctx.createLinearGradient(-w / 2, -w * 0.45, w / 2, 0);
      g.addColorStop(0, '#a96f24');
      g.addColorStop(0.5, '#ffe9a0');
      g.addColorStop(1, '#b17d23');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#765426';
      ctx.lineWidth = Math.max(0.5, w * 0.025);
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(-w * 0.55, -w * 0.43);
      ctx.lineTo(-w * 0.25, -w * 0.25);
      ctx.lineTo(0, -w * 0.58);
      ctx.lineTo(w * 0.25, -w * 0.25);
      ctx.lineTo(w * 0.55, -w * 0.43);
      ctx.lineTo(w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#a42c35';
      ctx.fillRect(-w / 2, -w * 0.1, w, w * 0.09);
      ctx.restore();
    }
    draw(ctx, stage, pose, l, now = performance.now(), options = {}) {
      if (!this.ready(stage)) {
        this.preload(stage).catch(() => {});
        return null;
      }
      const p = this.measure(stage, pose, l, now);
      ctx.save();
      ctx.globalAlpha *= options.alpha ?? 1;
      ctx.translate(l.x, l.y);
      ctx.scale(l.size, l.size);
      const b = p.body;
      const paintTail = () => {
        ctx.save();
        ctx.translate(p.tail.x, p.tail.y);
        ctx.rotate(p.wag);
        ctx.scale(p.tail.scale, 1);
        this.paint(ctx, stage, 7, -0.2, -0.14, 0.24, 0.23);
        ctx.restore();
      };
      if (b.part !== 4) paintTail();
      for (const layer of p.bodyLayers) {
        ctx.save();
        ctx.globalAlpha *= layer.alpha;
        if (p.pose === 'tailchase' && layer.part === 11) {
          ctx.beginPath();
          ctx.rect(layer.x - 0.05, layer.y - 0.05, layer.w + 0.1, layer.h * 0.76);
          ctx.clip();
        }
        this.paint(ctx, stage, layer.part, layer.x, layer.y, layer.w, layer.h);
        ctx.restore();
      }
      if (p.pose === 'tailchase' && p.torsoMix > 0.01) {
        ctx.save();
        ctx.globalAlpha *= p.torsoMix;
        for (let i = 0; i < 2; i++)
          this.leg(ctx, stage, {
            x: 0.35 + i * 0.25,
            y: 0.69,
            length: 0.25,
            width: 0.165,
            upper: Math.PI / 2 + Math.sin(p.t * 9 + i * Math.PI) * 0.45,
            lower: Math.PI / 2 + Math.cos(p.t * 9 + i * Math.PI) * 0.27,
            part: i ? 9 : 8,
          });
        ctx.restore();
      }
      this.coat(ctx, stage, p);
      if (b.part === 4) paintTail();
      if (p.legAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha *= p.legAlpha;
        p.legs.forEach((leg, i) => {
          if (i !== p.frontLegIndex) this.leg(ctx, stage, leg);
        });
        ctx.restore();
      }
      this.collar(ctx, p);
      this.face(ctx, stage, p);
      if (p.frontLegIndex >= 0 && p.legAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha *= p.legAlpha;
        this.leg(ctx, stage, p.legs[p.frontLegIndex]);
        ctx.restore();
      }
      ctx.restore();
      if (options.withHat !== false) {
        ctx.save();
        ctx.globalAlpha *= options.alpha ?? 1;
        const id = this.world.state.hat;
        if (id && root.HatAttachmentsV9)
          p.hat = root.HatAttachmentsV9.draw(ctx, id, p.head, pose, now, this.world.extras);
        else if (p.spec.crown) this.crown(ctx, p.head);
        ctx.restore();
      }
      return p;
    }
    noseAnchor(now, l) {
      return this.measure(
        this.world.state.pugStage,
        this.world.visiblePug?.(now).pose || 'idle',
        l,
        now,
      ).nose;
    }
    hit(x, y, l, now = performance.now()) {
      const p = this.measure(
        this.world.state.pugStage,
        this.world.visiblePug?.(now).pose || 'idle',
        l,
        now,
      );
      const h = p.headRect,
        b = p.body,
        u = (x - l.x) / l.size,
        v = (y - l.y) / l.size;
      const ellipse = (cx, cy, rx, ry) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1;
      const hp = { x: h.x + h.w / 2, y: h.y + h.h * 0.82 },
        dx = u - hp.x,
        dy = v - hp.y;
      const hu = hp.x + dx * Math.cos(h.tilt) + dy * Math.sin(h.tilt),
        hv = hp.y - dx * Math.sin(h.tilt) + dy * Math.cos(h.tilt);
      const headHit =
        ((hu - h.x - h.w * 0.5) / (h.w * 0.5)) ** 2 + ((hv - h.y - h.h * 0.5) / (h.h * 0.5)) ** 2 <=
        1;
      const capsule = (a, z, r) => {
        const dx = z.x - a.x,
          dy = z.y - a.y,
          k = clamp(((u - a.x) * dx + (v - a.y) * dy) / (dx * dx + dy * dy || 1));
        return Math.hypot(u - a.x - dx * k, v - a.y - dy * k) <= r;
      };
      const limbHit =
        p.legAlpha > 0.05 &&
        p.legs.some((a) => {
          const elbow = {
            x: a.x + Math.cos(a.upper) * a.length * 0.49,
            y: a.y + Math.sin(a.upper) * a.length * 0.49,
          };
          const hand = {
            x: elbow.x + Math.cos(a.lower) * a.length * 0.51,
            y: elbow.y + Math.sin(a.lower) * a.length * 0.51,
          };
          return capsule(a, elbow, a.width * 0.55) || capsule(elbow, hand, a.width * 0.55);
        });
      return (
        headHit ||
        ellipse(b.x + b.w * 0.5, b.y + b.h * 0.5, b.w * 0.5, b.h * 0.5) ||
        ellipse(p.tail.x - 0.08 * p.tail.scale, p.tail.y - 0.025, 0.125 * p.tail.scale, 0.13) ||
        limbHit
      );
    }
    drawCombat(ctx, scene, box, now) {
      const stage = scene.rigStage ?? this.world.state.pugStage;
      if (!this.ready(stage)) {
        this.preload(stage).catch(() => {});
        return false;
      }
      const t = now / 1000,
        attackAge = now - scene.attackAt,
        guardAge = now - scene.guardAt;
      const targetSwing =
        attackAge >= 0 && attackAge < 460 ? Math.sin((attackAge / 460) * Math.PI) : 0;
      const targetGuard =
        guardAge >= 0 && guardAge < 560 ? Math.sin((guardAge / 560) * Math.PI) : 0;
      if (!this.combat || this.combat.scene !== scene || now < this.combat.at)
        this.combat = { scene, at: now, swing: 0, guard: 0 };
      const follow = this.world.reduced
        ? 1
        : 1 - Math.exp(-Math.min(80, Math.max(0, now - this.combat.at)) / 45);
      this.combat.swing += (targetSwing - this.combat.swing) * follow;
      this.combat.guard += (targetGuard - this.combat.guard) * follow;
      this.combat.at = now;
      const swing = this.combat.swing,
        guard = this.combat.guard;
      const victory = scene.status === 'won' ? 1 : 0;
      const size = box.size;
      ctx.save();
      ctx.translate(
        box.x + swing * size * 0.025,
        box.y - (this.world.reduced ? 0 : victory * Math.abs(Math.sin(t * 7)) * size * 0.012),
      );
      ctx.scale(size, size);
      ctx.fillStyle = '#20180c35';
      ctx.beginPath();
      ctx.ellipse(0.49, 0.945, 0.35, 0.04, 0, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.translate(0.31, 0.7);
      ctx.rotate(Math.sin(t * 3) * 0.025);
      this.paint(ctx, stage, 7, -0.19, -0.12, 0.21, 0.21);
      ctx.restore();
      this.paint(ctx, stage, 11, 0.16, 0.38, 0.62, 0.55);
      const head = {
        x: 0.53,
        y: 0.13,
        w: 0.44,
        h: 0.35,
        tilt: -swing * 0.075 + guard * 0.06,
        part: 5,
      };
      this.leg(ctx, stage, {
        x: 0.35,
        y: 0.44,
        length: 0.25,
        width: 0.13,
        upper: mix(0.7 - guard * 0.4, -1.0, victory),
        lower: mix(-0.1 - guard * 0.8, -1.3, victory),
        part: 8,
      });
      this.face(ctx, stage, { headRect: head, view: 'side', blink: 0, yawn: 0, tongue: 0 });
      const arm = {
        x: 0.66,
        y: 0.48,
        length: 0.33,
        width: STAGES[stage].family === 'muscle' ? 0.18 : 0.145,
        upper: mix(mix(0.8, -0.8, swing) - guard * 0.5, -1.25, victory),
        lower: mix(mix(-0.5, 0.8, swing) - guard * 0.6, -0.8, victory),
        part: 9,
      };
      this.leg(ctx, stage, arm);
      const elbow = {
        x: arm.x + Math.cos(arm.upper) * arm.length * 0.49,
        y: arm.y + Math.sin(arm.upper) * arm.length * 0.49,
      };
      const hand = {
        x: elbow.x + Math.cos(arm.lower) * arm.length * 0.51,
        y: elbow.y + Math.sin(arm.lower) * arm.length * 0.51,
      };
      const weapon = this.world.images['weapon-' + scene.weapon];
      if (weapon) {
        const grips = [
            [0.39, 0.81],
            [0.5, 0.82],
            [0.5, 0.52],
            [0.5, 0.78],
            [0.49, 0.76],
            [0.55, 0.52],
            [0.49, 0.81],
            [0.49, 0.81],
            [0.49, 0.81],
          ],
          grip = grips[scene.weapon] || grips[0];
        ctx.save();
        ctx.translate(hand.x, hand.y);
        ctx.rotate(0.35 + swing * 1.5 - guard * 0.8);
        ctx.drawImage(weapon, -0.1 * grip[0], -0.46 * grip[1], 0.1, 0.46);
        ctx.restore();
        const paw = this.part(stage, 9);
        if (paw) {
          ctx.save();
          ctx.translate(hand.x, hand.y);
          ctx.rotate(arm.lower - Math.PI / 2);
          ctx.drawImage(
            paw.canvas,
            paw.x,
            paw.y + paw.h * 0.79,
            paw.w,
            paw.h * 0.21,
            -arm.width / 2,
            -0.035,
            arm.width,
            0.075,
          );
          ctx.restore();
        }
      }
      ctx.restore();
      return true;
    }
  }
  Rig.STAGES = STAGES;
  Rig.FAMILIES = FAMILIES;
  Rig.plan = plan;
  if (typeof module !== 'undefined' && module.exports) module.exports = Rig;
  else root.PugRigV9 = Rig;
})(typeof window !== 'undefined' ? window : globalThis);
