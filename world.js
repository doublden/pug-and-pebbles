(function () {
  'use strict';
  class World {
    constructor(canvas, sound, slobber) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.slobber = slobber;
      this.spitCtx = slobber?.getContext('2d');
      this.sound = sound;
      this.images = {};
      this.loadingImages = new Map();
      this.extras = new PugExtras(this);
      this.coverageCanvas = document.createElement('canvas');
      this.coverageCanvas.width = 64;
      this.coverageCanvas.height = 96;
      this.frames = new Map();
      this.toolImages = {};
      this.foodFrames = new Map();
      this.backgroundFrames = new Map();
      this.state = { pugStage: 0, homeStage: 0 };
      this.pose = 'idle';
      this.idleEvent = null;
      this.returning = null;
      this.uiPaused = false;
      this.lastSnore = 0;
      this.poseStart = 0;
      this.poseEnd = 0;
      this.nextPose = performance.now() + 6000;
      this.particles = [];
      this.feathers = [];
      this.drops = [];
      this.hit = null;
      this.sneezeAt = -1000;
      this.transition = null;
      this.hasState = false;
      this.ready = false;
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.resize = () => {
        this.w = innerWidth;
        this.h = innerHeight;
        this.dpr = Math.min(devicePixelRatio || 1, 2);
        this.backgroundFrames.clear();
        for (const c of [canvas, slobber].filter(Boolean)) {
          c.width = this.w * this.dpr;
          c.height = this.h * this.dpr;
          c.getContext('2d').setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }
      };
      addEventListener('resize', this.resize);
      this.resize();
    }
    image(key, src) {
      if (this.images[key]) return Promise.resolve();
      if (this.loadingImages.has(key)) return this.loadingImages.get(key);
      const promise = new Promise((ok, no) => {
        const i = new Image();
        i.onload = () => {
          this.images[key] = i;
          ok();
        };
        i.onerror = () => {
          this.loadingImages.delete(key);
          no(new Error(src));
        };
        i.src = src;
      });
      this.loadingImages.set(key, promise);
      return promise;
    }
    async load(progress = () => {}) {
      const homes = [
          'backgrounds',
          'poverty',
          'early',
          'poverty',
          'homes',
          'homes',
          'early',
          'backgrounds',
          'homes',
          'homes',
          'backgrounds',
          'homes',
          'homes',
          'backgrounds',
        ],
        files = {
          backgrounds: 'backgrounds-mobile-v5.webp',
          homes: 'homes-middle-mobile-v5.webp',
          early: 'homes-early-mobile-v5.webp',
          poverty: 'homes-poverty-mobile-v5.webp',
        },
        home = homes[this.state.homeStage],
        critical = [
          [home, files[home]],
          ['food', 'food-mobile-v5.webp'],
          ['idle', 'pug-idle-mobile-v5.webp'],
        ];
      if ([1, 3].includes(this.state.pugStage))
        critical.push(['pugsEarly', 'pugs-early-mobile-v5.webp']);
      let finished = 0;
      progress(0);
      await Promise.all(
        critical.map(async ([key, file]) => {
          await this.image(key, file);
          progress(Math.round((++finished / critical.length) * 100));
        }),
      );
      this.ready = true;
      this.frame(0);
      const extra = [
        ...Object.entries(files),
        ['pugsEarly', 'pugs-early-mobile-v5.webp'],
        ['birds', 'birds-mobile-v5.webp'],
        ['birdMid', 'birds-mid-mobile-v5.webp'],
        ['hats', 'hats-v5.webp'],
        ['hatsSide', 'hats-side-v5.webp'],
        ['hatsBack', 'hats-back-v5.webp'],
        ['rear', 'pug-rear-v5.webp'],
        ['kingHats', 'pug-king-hats-v5.webp'],
        ['helper', 'vasiliy-v4.webp'],
        ['helperRig', 'vasiliy-rig-v5.webp'],
        ...[
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
          'stretch',
        ].flatMap((p) => [
          [p, `pug-${p}-mobile-v5.webp`],
          ['mid-' + p, `pug-${p}-mid-mobile-v5.webp`],
        ]),
      ];
      this.catalog = Object.fromEntries(extra);
      this.extraLoad = (async () => {
        for (const [key, file] of extra.filter(
          ([k]) =>
            !['look', 'scratch', 'yawn', 'lick', 'left', 'pawlick', 'splay'].includes(k) &&
            !k.startsWith('mid-'),
        )) {
          await new Promise((resolve) =>
            (window.requestIdleCallback || ((f) => setTimeout(f, 0)))(resolve, { timeout: 500 }),
          );
          try {
            await this.image(key, file);
          } catch (_) {
            /* The core scene remains playable; an online reload can retry optional art. */
          }
        }
      })();
      for (const [key, svg] of Object.entries(PugIcons)) {
        const i = new Image();
        i.onload = () => (this.toolImages[key] = i);
        i.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
      }
    }
    prepare(pose, stage) {
      if (!this.images[pose]) pose = 'idle';
      const kingHat = stage === 14 && this.state.hat && this.images.kingHats;

      const key = pose + '-' + stage + (kingHat ? '-hat' : '');
      if (this.frames.has(key)) return this.frames.get(key);
      const mid = pose.startsWith('mid-'),
        special = mid || ['sleep', 'whistle', 'back', 'rear', 'stretch'].includes(pose),
        early = !special && this.images.pugsEarly && (stage === 1 || stage === 3),
        sprite = kingHat
          ? PugExtras.kingPoses.indexOf(pose)
          : early
            ? (stage === 1 ? 0 : 8) +
              ['idle', 'look', 'scratch', 'yawn', 'lick', 'left', 'pawlick', 'splay'].indexOf(pose)
            : special
              ? stage
              : stage === 0
                ? 0
                : stage === 2
                  ? 1
                  : stage - 2,
        img = kingHat ? this.images.kingHats : early ? this.images.pugsEarly : this.images[pose],
        col = sprite % 4,
        row = Math.floor(sprite / 4),
        sx = Math.round((col * img.width) / 4),
        w = Math.round(((col + 1) * img.width) / 4) - sx,
        rows = kingHat
          ? [0, 1, 2, 3, 4, 5, 6].map((y) => (y * img.height) / 6)
          : pose === 'sleep'
            ? [350, 558, 763, 978, 1254].map((y) => (y / 1254) * img.height)
            : [0, 1, 2, 3, 4].map((y) => (y * img.height) / 4),
        sy = Math.round(rows[row]),
        rawH = Math.round(rows[row + 1]) - sy,
        pad = Math.ceil(w * 0.1),
        padY = Math.ceil(w * 0.1),
        raw = document.createElement('canvas');
      raw.width = w + pad * 2;
      raw.height = rawH + padY * 2;
      const rc = raw.getContext('2d', { willReadFrequently: true });
      if (mid) {
        const top = Math.max(0, sy - padY);
        rc.drawImage(img, sx, top, w, sy + rawH - top, pad, padY - (sy - top), w, sy + rawH - top);
      } else rc.drawImage(img, pad - sx, padY - sy);
      const pixels = rc.getImageData(0, 0, raw.width, raw.height);
      PugSprites.isolate(pixels.data, raw.width, raw.height, mid ? 100 : 40);
      rc.putImageData(pixels, 0, 0);
      let bottom = 0;
      for (let y = 0; y < raw.height; y++)
        for (let x = 0; x < raw.width; x++)
          if (pixels.data[(y * raw.width + x) * 4 + 3] > 40) bottom = Math.max(bottom, y);
      const canvas = document.createElement('canvas');
      canvas.width = raw.width;
      canvas.height = w + padY * 2;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const scale = kingHat ? 1.2 : 1;
      ctx.drawImage(
        raw,
        (pad + w * 0.5) * (1 - scale),
        Math.round(padY + w * 0.94 - bottom * scale),
        raw.width * scale,
        raw.height * scale,
      );
      const normalized = ctx.getImageData(0, 0, canvas.width, canvas.height),
        alpha = new Uint8Array(canvas.width * canvas.height);
      for (let i = 0; i < alpha.length; i++) alpha[i] = normalized.data[i * 4 + 3];
      const frame = { canvas, alpha, cellWidth: w, cellHeight: w, pad, padY };
      frame.head = this.extras.head(normalized, w, pad, padY, pose, kingHat ? -1 : stage);
      this.frames.set(key, frame);
      if (this.frames.size > 48) this.frames.delete(this.frames.keys().next().value);
      return frame;
    }
    setState(state) {
      if (
        this.hasState &&
        (state.pugStage !== this.state.pugStage || state.homeStage !== this.state.homeStage)
      ) {
        this.transition = { from: { ...this.state }, start: performance.now() };
        this.pose = 'idle';
        this.poseEnd = 0;
        this.nextPose = performance.now() + 5000;
      }
      this.hasState = true;
      this.state = state;
    }
    cell(ctx, img, index, cols, rows, x, y, w, h) {
      const sw = img.width / cols,
        sh = img.height / rows;
      ctx.drawImage(img, (index % cols) * sw, Math.floor(index / cols) * sh, sw, sh, x, y, w, h);
    }
    background(ctx, stage, w, h) {
      const mapping = [
          ['backgrounds', 0, 2, 2],
          ['poverty', 0, 2, 1],
          ['early', 0, 2, 1],
          ['poverty', 1, 2, 1],
          ['homes', 0, 3, 2],
          ['homes', 1, 3, 2],
          ['early', 1, 2, 1],
          ['backgrounds', 1, 2, 2],
          ['homes', 2, 3, 2],
          ['homes', 3, 3, 2],
          ['backgrounds', 2, 2, 2],
          ['homes', 4, 3, 2],
          ['homes', 5, 3, 2],
          ['backgrounds', 3, 2, 2],
        ],
        a = this.images[mapping[stage][0]]
          ? mapping[stage]
          : Object.values(mapping).find((m) => this.images[m[0]]),
        img = this.images[a[0]],
        sw = img.width / a[2],
        sh = img.height / a[3];
      if (w >= h) {
        const scale = Math.max(w / sw, h / sh),
          dw = sw * scale,
          dh = sh * scale;
        this.cell(ctx, img, a[1], a[2], a[3], -(dw - w) * 0.5, -(dh - h) * 0.45, dw, dh);
        return;
      }
      const key = stage + '-' + w + '-' + h;
      let frame = this.backgroundFrames.get(key);
      if (!frame) {
        frame = document.createElement('canvas');
        frame.width = w;
        frame.height = h;
        const c = frame.getContext('2d'),
          scale = Math.max(w / sw, (h * 0.86) / sh),
          dw = sw * scale,
          dh = sh * scale,
          sx = (a[1] % a[2]) * sw,
          sy = Math.floor(a[1] / a[2]) * sh,
          left = -(dw - w) * 0.5,
          top = h * 0.02,
          upper = top + dh * 0.25,
          lower = top + dh * 0.9;
        // Show a wider part of the original panorama; only sky and nearest ground extend vertically.
        c.drawImage(img, sx, sy, sw, sh * 0.25, left, 0, dw, upper);
        c.drawImage(img, sx, sy + sh * 0.25, sw, sh * 0.65, left, upper, dw, lower - upper);
        c.drawImage(img, sx, sy + sh * 0.9, sw, sh * 0.1, left, lower, dw, h - lower);
        this.backgroundFrames.set(key, frame);
        if (this.backgroundFrames.size > 3)
          this.backgroundFrames.delete(this.backgroundFrames.keys().next().value);
      }
      ctx.drawImage(frame, 0, 0, w, h);
    }
    foodFrame(stage) {
      if (this.foodFrames.has(stage)) return this.foodFrames.get(stage);
      const img = this.images.food,
        sx = Math.round(((stage % 4) * img.width) / 4),
        sy = Math.round((Math.floor(stage / 4) * img.height) / 4),
        w = Math.round((((stage % 4) + 1) * img.width) / 4) - sx,
        h = Math.round(((Math.floor(stage / 4) + 1) * img.height) / 4) - sy,
        pad = 24,
        canvas = document.createElement('canvas');
      canvas.width = w + pad * 2;
      canvas.height = h + pad * 2;
      const c = canvas.getContext('2d', { willReadFrequently: true });
      c.drawImage(img, pad - sx, pad - sy);
      const pixels = c.getImageData(0, 0, canvas.width, canvas.height);
      PugSprites.isolate(pixels.data, canvas.width, canvas.height);
      c.putImageData(pixels, 0, 0);
      let minX = canvas.width,
        minY = canvas.height,
        maxX = 0,
        maxY = 0;
      for (let y = 0; y < canvas.height; y++)
        for (let x = 0; x < canvas.width; x++)
          if (pixels.data[(y * canvas.width + x) * 4 + 3] > 24) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
      const f = { canvas, x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
      this.foodFrames.set(stage, f);
      return f;
    }
    foodLayout(stage = this.state.homeStage, w = this.w, h = this.h) {
      const f = this.foodFrame(stage),
        portrait = w < h,
        extent = [
          0.51, 0.52, 0.53, 0.54, 0.55, 0.56, 0.57, 0.6, 0.64, 0.68, 0.72, 0.77, 0.81, 0.85,
        ][stage],
        width = portrait
          ? w * extent
          : Math.min(w * (0.22 + stage * 0.012), h * (0.4 + stage * 0.037)),
        scale = Math.min(width / f.w, (h * (portrait ? 0.47 : 0.75)) / f.h),
        dw = f.w * scale,
        dh = f.h * scale,
        cx = w * (portrait ? 0.67 : 0.7),
        base = h * (portrait ? 0.735 : 0.9);
      return { x: cx - dw / 2, y: base - dh, w: dw, h: dh, cx, base, f };
    }
    food(ctx, stage, w, h, now = 0, alpha = 1) {
      const l = this.foodLayout(stage, w, h),
        age = this.hit ? (now - this.hit.start) / 220 : 2,
        jiggle = !this.reduced && age >= 0 && age < 1 ? Math.sin(age * Math.PI * 5) * (1 - age) : 0;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(l.cx, l.base);
      ctx.rotate(jiggle * 0.015);
      ctx.drawImage(
        l.f.canvas,
        l.f.x,
        l.f.y,
        l.f.w,
        l.f.h,
        -l.w / 2 + jiggle * 2,
        -l.h + jiggle,
        l.w,
        l.h,
      );
      if (stage === 1) {
        ctx.fillStyle = '#98683f';
        ctx.strokeStyle = '#72472d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(l.w * 0.1, -l.h * 0.57, l.w * 0.035, l.w * 0.027, -0.3, 0, 7);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    hitFood(x, y) {
      if (!this.ready) return false;
      const l = this.foodLayout(),
        pad = 14;
      return x >= l.x - pad && x <= l.x + l.w + pad && y >= l.y - pad && y <= l.base + pad;
    }
    birdFrame(type, pose) {
      const row = PugBirds.TYPES[type].row + Math.floor(pose / 4),
        key = 'bird-' + row + '-' + (pose % 4);
      if (this.frames.has(key)) return this.frames.get(key);
      const img = this.images.birds,
        bounds = [0, 340, 550, 865, 1060, 1320, 1536],
        sy = (bounds[row] / 1536) * img.height,
        h = ((bounds[row + 1] - bounds[row]) / 1536) * img.height,
        w = img.width / 4,
        canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const c = canvas.getContext('2d', { willReadFrequently: true });
      c.drawImage(img, (pose % 4) * w, sy, w, h, 0, 0, w, h);
      const pixels = c.getImageData(0, 0, w, h);
      PugSprites.isolate(pixels.data, w, Math.floor(h));
      c.putImageData(pixels, 0, 0);
      const f = { canvas, anchor: ([286, 203, 278, 180, 240, 204][row] / 1536) * img.height };
      this.frames.set(key, f);
      if (this.frames.size > 48) this.frames.delete(this.frames.keys().next().value);
      return f;
    }
    birdMidFrame(type, pose) {
      const row = PugBirds.TYPES[type].row + Math.floor(pose / 4),
        key = 'birdmid-' + type + '-' + pose;
      if (this.frames.has(key)) return this.frames.get(key);
      const img = this.images.birdMid;
      if (!img) return null;
      const w = Math.round(img.width / 4),
        bounds = [0, 325, 545, 846, 1060, 1324, 1536].map((y) =>
          Math.round((y / 1536) * img.height),
        ),
        h = bounds[row + 1] - bounds[row],
        canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const c = canvas.getContext('2d', { willReadFrequently: true });
      c.drawImage(img, (-pose % 4) * w, -bounds[row]);
      const pixels = c.getImageData(0, 0, w, h);
      PugSprites.isolate(pixels.data, w, h);
      c.putImageData(pixels, 0, 0);
      let bottom = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (pixels.data[(y * w + x) * 4 + 3] > 40) bottom = Math.max(bottom, y);
      const f = { canvas, anchor: bottom };
      this.frames.set(key, f);
      if (this.frames.size > 48) this.frames.delete(this.frames.keys().next().value);
      return f;
    }
    drawBird(canvas, b) {
      if (!this.images.birds) return;
      if (canvas.width !== 256 || canvas.height !== 384) {
        canvas.width = 256;
        canvas.height = 384;
      }
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, 256, 384);
      const render = (pose, alpha, mid = false) => {
        const f = mid ? this.birdMidFrame(b.type, pose) : this.birdFrame(b.type, pose);
        if (!f) return;
        const scale = 256 / f.canvas.width;
        c.globalAlpha = alpha;
        c.drawImage(f.canvas, 0, 346 - f.anchor * scale, 256, f.canvas.height * scale);
      };
      if (b.phase === 'in' && b.p > 0.85) {
        const mix = Math.min(1, (b.p - 0.85) / 0.15);
        render(3, 1 - mix);
        render(4, mix);
        return;
      }
      if (!this.images.birdMid) {
        render(b.pose, 1);
        return;
      }
      const flight = [
          { pose: 0 },
          { pose: 0, mid: true },
          { pose: 1 },
          { pose: 1, mid: true },
          { pose: 2 },
          { pose: 2, mid: true },
          { pose: 1 },
          { pose: 0, mid: true },
        ],
        peck = [
          { pose: 4 },
          { pose: 5, mid: true },
          { pose: 5 },
          { pose: 6, mid: true },
          { pose: 6 },
          { pose: 4, mid: true },
          { pose: 4 },
        ],
        cycle = b.phase === 'landed' ? peck : flight,
        phase =
          b.phase === 'landed'
            ? Math.min(cycle.length - 1, Math.max(0, b.lastPeckAge / 75))
            : (b.frameClock / 55) % cycle.length,
        a = Math.floor(phase),
        mix = phase - a,
        f = cycle[a],
        g = cycle[(a + 1) % cycle.length];
      render(f.pose, 1 - mix, f.mid);
      render(g.pose, mix, g.mid);
    }
    currentHead(now = performance.now()) {
      const pose = this.activePose(),
        stage = this.state.pugStage;
      const head = (p) => this.prepare(p, stage).head;
      const blend = (a, b, p) => ({
        x: a.x + (b.x - a.x) * p,
        y: a.y + (b.y - a.y) * p,
        w: a.w + (b.w - a.w) * p,
      });
      let p = this.reduced
        ? 1
        : this.idleEvent
          ? Math.min(
              1,
              this.idleEvent.elapsed / 600,
              (this.idleEvent.duration - this.idleEvent.elapsed) / 600,
            )
          : pose === 'idle'
            ? 1
            : Math.min(1, (now - this.poseStart) / 550, (this.poseEnd - now) / 550);
      p = Math.max(0, p);
      let h;
      if (pose === 'idle') h = head('idle');
      else if (this.images['mid-' + pose])
        h =
          p < 0.5
            ? blend(head('idle'), head('mid-' + pose), p * 2)
            : blend(head('mid-' + pose), head(pose), (p - 0.5) * 2);
      else h = blend(head('idle'), head(pose), p);
      if (pose === 'back' && p === 1 && this.images.rear)
        h = blend(head('rear'), head('back'), (1 + Math.cos(now / 1100)) / 2);
      if (this.idleEvent && ['pee', 'backlook'].includes(this.idleEvent.kind) && !this.reduced) {
        const turn = (1 - Math.cos((this.idleEvent.elapsed / 1500) * Math.PI)) / 2;
        h = { ...h, x: h.x + (1 - h.x - h.x) * turn };
      }
      return { head: h, pose };
    }
    birdAnchor(target) {
      const l = target === 2 ? this.layout() : this.foodLayout();
      if (target === 2) {
        const { head, pose } = this.currentHead(),
          i = PugGame.HATS.findIndex((h) => h.id === this.state.hat);
        const hat =
          i >= 0 ? this.extras.frame(pose === 'back' ? 'hatsSide' : 'hats', i, 4, 3) : null;
        const above = hat
          ? (((head.w * hat.h) / hat.w) * (hat.mount?.y || 0.98)) / (hat.mount?.span || 1)
          : 0.045;
        return { x: l.x + l.size * head.x, y: l.y + l.size * (head.y - above) };
      }
      return {
        x: l.x + l.w * (target === 0 ? 0.5 : 0.76),
        y: l.y + l.h * (target === 0 ? 0.07 : 0.25),
      };
    }
    burstBird(type, x, y) {
      const now = performance.now();
      for (let i = 0; i < 20; i++)
        this.feathers.push({
          x,
          y,
          start: now,
          dx: this.reduced ? 0 : (Math.random() - 0.5) * 200,
          dy: this.reduced ? 0 : -30 - Math.random() * 140,
          angle: Math.random() * 6,
          r: 3 + Math.random() * 5,
          color: type === 'crow' ? '#343b42' : '#b68e64',
          life: 650 + Math.random() * 450,
        });
      this.feathers = this.feathers.slice(-60);
    }
    lost(text, x, y) {
      this.particles.push({ text, x, y, start: performance.now(), negative: true });
    }
    foodFocus() {
      const l = this.foodLayout();
      return { x: l.cx, y: l.y + l.h * 0.55 };
    }
    dog(ctx, stage, pose, x, y, size, alpha = 1) {
      const f = this.prepare(pose, stage);
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.drawImage(
        f.canvas,
        x - (f.pad / f.cellWidth) * size,
        y - (f.padY / f.cellWidth) * size,
        (size * f.canvas.width) / f.cellWidth,
        (size * f.canvas.height) / f.cellWidth,
      );
      ctx.restore();
      ctx.globalAlpha = alpha;
      this.extras.hat(ctx, this.state.hat, { x, y, size }, pose, performance.now(), f.head);
      ctx.globalAlpha = 1;
      return f;
    }
    idleReady() {
      return ['sleep', 'whistle', 'back', 'stretch'].every((p) => this.images[p]);
    }
    setIdle(event) {
      if (this.idleEvent?.kind === 'pee' && !event) {
        this.returning = { from: this.layout(), start: performance.now() };
        this.sound.play('return');
      }
      this.idleEvent = event;
      if (event) this.pose = 'idle';
    }
    activePose() {
      const e = this.idleEvent;
      return e ? (e.kind === 'pee' || e.kind === 'backlook' ? 'back' : e.kind) : this.pose;
    }
    layout(now = performance.now()) {
      const portrait = this.w < this.h,
        size = portrait
          ? Math.min(this.w * 0.65, this.h * 0.4)
          : Math.min(this.w * 0.43, this.h * 0.68),
        base = portrait ? this.h * 0.79 : this.h * 0.91,
        x = portrait ? -this.w * 0.055 : this.w * 0.018;
      let l = {
        x,
        y: base - size + (this.reduced ? 0 : Math.sin(now / 950) * size * 0.003),
        size,
        base,
      };
      if (this.idleEvent?.kind === 'pee') {
        const p = this.reduced ? 1 : Math.min(1, this.idleEvent.elapsed / 1800),
          ease = 1 - (1 - p) ** 3,
          targetSize = size * 0.56;
        l = {
          x: x + (this.w * 0.27 - x) * ease,
          size: size + (targetSize - size) * ease,
          base: base + (this.h * 0.58 - base) * ease,
        };
        l.y = l.base - l.size - (this.reduced ? 0 : Math.sin(p * Math.PI * 9) * 4 * (1 - p));
      }
      if (this.returning) {
        const p = Math.min(1, (now - this.returning.start) / 260),
          f = this.returning.from,
          ease = 1 - (1 - p) ** 3;
        l = {
          x: f.x + (l.x - f.x) * ease,
          y: f.y + (l.y - f.y) * ease - (this.reduced ? 0 : Math.sin(p * Math.PI) * 25),
          size: f.size + (l.size - f.size) * ease,
          base: f.base + (l.base - f.base) * ease,
        };
        if (p >= 1) this.returning = null;
      }
      return l;
    }
    hitHelper(x, y) {
      const b = this.extras.helperBounds;
      return !!b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    }
    hitPug(px, py) {
      if (!this.ready) return false;
      const l = this.layout(),
        f = this.prepare(this.activePose(), this.state.pugStage),
        x = Math.floor(((px - l.x) / l.size) * f.cellWidth + f.pad),
        y = Math.floor(((py - l.y) / l.size) * f.cellWidth + f.padY);
      return (
        x >= 0 &&
        y >= 0 &&
        x < f.canvas.width &&
        y < f.canvas.height &&
        f.alpha[y * f.canvas.width + x] > 18
      );
    }
    animatePose(pose, now = performance.now()) {
      if (this.reduced) return;
      if (!this.images[pose] && this.catalog?.[pose]) {
        this.nextPose = now + 5000;
        Promise.all([
          this.image(pose, this.catalog[pose]),
          this.image('mid-' + pose, this.catalog['mid-' + pose]),
        ])
          .then(() => {
            if (!this.uiPaused) {
              const regular = ['look', 'scratch', 'yawn', 'lick', 'left', 'pawlick', 'splay'];
              this.recentPoses = [
                ...(this.recentPoses || []).filter((p) => p !== pose),
                pose,
              ].slice(-2);
              for (const old of regular)
                if (!this.recentPoses.includes(old)) {
                  delete this.images[old];
                  delete this.images['mid-' + old];
                  this.loadingImages.delete(old);
                  this.loadingImages.delete('mid-' + old);
                }
              this.animatePose(pose, performance.now());
            }
          })
          .catch(() => {});
        return;
      }
      if (!this.images[pose]) return;
      this.pose = pose;
      this.poseStart = now;
      this.poseEnd =
        now +
        (pose === 'scratch'
          ? 2500
          : pose === 'yawn'
            ? 3300
            : pose === 'pawlick'
              ? 3400
              : pose === 'splay'
                ? 4200
                : 2300);
      this.nextPose = this.poseEnd + 6000 + Math.random() * 10000;
      if (pose === 'scratch') this.sound.play('scratch');
      else if (['look', 'left', 'lick'].includes(pose) && Math.random() < 0.35)
        this.sound.play('pet');
    }
    fart() {
      this.animatePose(Math.random() < 0.5 ? 'left' : 'look');
      this.sound.play('fart', Math.floor(Math.random() * 4));
    }
    sneeze() {
      const now = performance.now(),
        l = this.layout();
      this.sneezeCombo = now - this.sneezeAt < 550 ? Math.min(12, (this.sneezeCombo || 0) + 1) : 1;
      this.sneezeAt = now;
      this.sound.play('sneeze');
      for (let i = 0; i < 18; i++)
        this.drops.push({
          start: now,
          fromX: l.x + l.size * 0.5,
          fromY: l.y + l.size * 0.34,
          x: Math.random(),
          y: Math.random(),
          r:
            Math.min(this.w, this.h) * (0.09 + Math.random() * 0.09) * (1 + this.sneezeCombo * 0.2),
          stretch: 1 + Math.random() * 0.5,
          angle: Math.random() * Math.PI,
          shape: Math.floor(Math.random() * 3),
          life: 950 + Math.random() * 100,
        });
      this.drops = this.drops.slice(-220);
    }
    motionDog(ctx, stage, pose, l, p, alpha = 1) {
      if (p === 1 && !this.reduced && ['scratch', 'pawlick', 'lick'].includes(pose))
        p =
          0.82 + 0.18 * (0.5 + 0.5 * Math.sin(performance.now() / (pose === 'scratch' ? 95 : 180)));
      if (pose === 'back' && this.images.rear && p === 1) {
        const turn = (1 + Math.cos(performance.now() / 1100)) / 2;
        this.dog(ctx, stage, 'rear', l.x, l.y, l.size, alpha * (1 - turn));
        this.dog(ctx, stage, 'back', l.x, l.y, l.size, alpha * turn);
        return;
      }
      const mid = 'mid-' + pose,
        hasMid = this.images[mid];
      if (!hasMid) {
        this.dog(ctx, stage, 'idle', l.x, l.y, l.size, alpha * (1 - p));
        this.dog(ctx, stage, pose, l.x, l.y, l.size, alpha * p);
        return;
      }
      const sequence = p * 2,
        a = sequence < 1 ? 'idle' : mid,
        b = sequence < 1 ? mid : pose,
        mix = sequence % 1;
      if (sequence >= 2) {
        this.dog(ctx, stage, pose, l.x, l.y, l.size, alpha);
        return;
      }
      const ease = mix * mix * (3 - 2 * mix);
      this.dog(ctx, stage, a, l.x, l.y, l.size, alpha * (1 - ease));
      this.dog(ctx, stage, b, l.x, l.y, l.size, alpha * ease);
    }
    spitCoverage(now = performance.now()) {
      const c = this.coverageCanvas.getContext('2d', { willReadFrequently: true });
      c.clearRect(0, 0, 64, 96);
      for (const d of this.drops) {
        const age = now - d.start;
        if (age < 100 || age > d.life) continue;
        c.save();
        c.translate(d.x * 64, d.y * 96);
        c.scale(64 / this.w, 96 / this.h);
        c.rotate(d.angle);
        c.globalAlpha = Math.min(1, (d.life - age) / 160) * 0.96;
        c.fillStyle = '#e0eee7';
        c.beginPath();
        this.dropPath(c, d);
        c.fill();
        c.restore();
      }
      const pixels = c.getImageData(0, 0, 64, 96).data;
      let opaque = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] >= 250) opaque++;
      return { covered: opaque, total: 64 * 96 };
    }
    dig(key, text, x, y) {
      if (this.reduced) return;
      const now = performance.now();
      this.hit = { key, x, y, start: now };
      this.particles.push({ text, x, y, start: now });
      this.particles = this.particles.slice(-16);
    }
    draw(now) {
      const c = this.ctx,
        w = this.w,
        h = this.h,
        s = this.state,
        l = this.layout(now),
        tr = this.transition,
        mix = tr ? Math.min(1, (now - tr.start) / 900) : 1;
      this.background(c, s.homeStage, w, h);
      if (tr && mix < 1 && tr.from.homeStage !== s.homeStage) {
        c.globalAlpha = 1 - mix;
        this.background(c, tr.from.homeStage, w, h);
        c.globalAlpha = 1;
      }
      this.food(
        c,
        s.homeStage,
        w,
        h,
        now,
        tr && mix < 1 && tr.from.homeStage !== s.homeStage ? mix : 1,
      );
      if (tr && mix < 1 && tr.from.homeStage !== s.homeStage)
        this.food(c, tr.from.homeStage, w, h, now, 1 - mix);
      c.fillStyle = '#17120e24';
      c.beginPath();
      c.ellipse(
        l.x + l.size * 0.5,
        l.base - l.size * 0.07,
        l.size * 0.32,
        l.size * 0.03,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
      if (!this.uiPaused && !this.idleEvent && !this.reduced && now > this.nextPose) {
        const poses = ['look', 'scratch', 'yawn', 'lick', 'left', 'pawlick', 'splay'].filter(
          (p) => this.catalog?.[p],
        );
        if (poses.length) this.animatePose(poses[Math.floor(Math.random() * poses.length)], now);
      }
      if (now > this.poseEnd) this.pose = 'idle';
      const active = this.activePose(),
        e = this.idleEvent;
      const sn = (now - this.sneezeAt) / 440;
      c.save();
      if (sn >= 0 && sn < 1 && !this.reduced) {
        c.translate(l.x + l.size * 0.5, l.y + l.size * 0.6);
        c.rotate(Math.sin(sn * Math.PI * 3) * 0.024);
        c.scale(1 + Math.sin(sn * Math.PI) * 0.015, 1 - Math.sin(sn * Math.PI) * 0.025);
        c.translate(-l.x - l.size * 0.5, -l.y - l.size * 0.6);
      }
      if (tr && mix < 1 && tr.from.pugStage !== s.pugStage)
        this.dog(c, tr.from.pugStage, 'idle', l.x, l.y, l.size, 1 - mix);
      const weight = tr && mix < 1 && tr.from.pugStage !== s.pugStage ? mix : 1;
      if (e) {
        const p = this.reduced ? 1 : Math.min(1, e.elapsed / 600, (e.duration - e.elapsed) / 600);
        if (e.kind === 'pee' || e.kind === 'backlook') {
          const turn = this.reduced ? 0 : (1 - Math.cos((e.elapsed / 1500) * Math.PI)) / 2;
          this.motionDog(c, s.pugStage, active, l, Math.max(0, p), weight * (1 - turn));
          c.save();
          c.translate(l.x + l.size * 0.5, 0);
          c.scale(-1, 1);
          c.translate(-l.x - l.size * 0.5, 0);
          this.motionDog(c, s.pugStage, active, l, Math.max(0, p), weight * turn);
          c.restore();
        } else this.motionDog(c, s.pugStage, active, l, Math.max(0, p), weight);
      } else if (this.pose === 'idle') this.dog(c, s.pugStage, 'idle', l.x, l.y, l.size, weight);
      else {
        const p = Math.max(
          0,
          Math.min(1, (now - this.poseStart) / 550, (this.poseEnd - now) / 550),
        );
        this.motionDog(c, s.pugStage, this.pose, l, p, weight);
      }

      c.restore();
      this.drawIdle(now, l);
      this.extras.helper(c, now, w, h, s.expedition ? 0 : s.helper);
      if (tr && mix < 1 && !this.reduced) {
        c.strokeStyle = `rgba(245,225,157,${(1 - mix) * 0.65})`;
        c.lineWidth = 3;
        c.beginPath();
        c.ellipse(
          l.x + l.size * 0.5,
          l.y + l.size * 0.55,
          l.size * (0.24 + mix * 0.2),
          l.size * (0.3 + mix * 0.2),
          0,
          0,
          Math.PI * 2,
        );
        c.stroke();
      }
      if (mix >= 1) this.transition = null;
      if (this.hit) {
        const p = (now - this.hit.start) / 320;
        if (p < 1) {
          const { key, x, y } = this.hit;
          if (key !== 'paw' && this.toolImages[key]) {
            const z = Math.min(w * 0.24, 120);
            c.save();
            c.translate(x, y);
            c.rotate(-0.7 + Math.sin(p * Math.PI) * 1.2);
            c.drawImage(this.toolImages[key], -z * 0.7, -z * 0.7, z, z);
            c.restore();
          }
          for (let i = 0; i < 5; i++) {
            c.fillStyle = s.homeStage === 13 ? '#e2b957' : '#b17e4e';
            c.globalAlpha = 1 - p;
            c.beginPath();
            c.arc(x + (i - 2) * p * 28, y - p * 60 + p * p * 95, 3, 0, 7);
            c.fill();
          }
          c.globalAlpha = 1;
        } else this.hit = null;
      }
      this.particles = this.particles.filter((p) => now - p.start < 900);
      for (const p of this.particles) {
        const a = (now - p.start) / 900;
        c.globalAlpha = 1 - a;
        c.font = '700 24px system-ui';
        c.textAlign = 'center';
        c.lineWidth = 4;
        c.strokeStyle = '#40312399';
        c.strokeText(p.text, p.x, p.y - a * 65);
        c.fillStyle = p.negative ? '#ffcab4' : '#fff5d9';
        c.fillText(p.text, p.x, p.y - a * 65);
        c.globalAlpha = 1;
      }
      this.feathers = this.feathers.filter((f) => now - f.start < f.life);
      for (const f of this.feathers) {
        const p = (now - f.start) / f.life;
        c.save();
        c.translate(f.x + f.dx * p, f.y + f.dy * p + 110 * p * p);
        c.rotate(f.angle + p * 5);
        c.globalAlpha = 1 - p;
        c.fillStyle = f.color;
        c.beginPath();
        c.ellipse(0, 0, f.r, f.r * 2.5, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#fff8e377';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, -f.r * 2);
        c.lineTo(0, f.r * 2);
        c.stroke();
        c.restore();
      }
      this.drawSpit(now);
    }
    drawIdle(now, l) {
      const e = this.idleEvent;
      if (!e || this.uiPaused) return;
      const c = this.ctx;
      if (e.kind === 'sleep') {
        const r = l.size * (0.055 + 0.014 * Math.sin(e.elapsed / 400));
        c.save();
        c.fillStyle = '#d2ebe26b';
        c.strokeStyle = '#f4ffff88';
        c.lineWidth = 1;
        c.beginPath();
        c.ellipse(l.x + l.size * 0.88, l.y + l.size * 0.84, r, r * 1.35, 0, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.restore();
        if (now - this.lastSnore > 2300) {
          this.lastSnore = now;
          this.sound.play('snore');
        }
      }
      if (e.kind === 'whistle') {
        for (let i = 0; i < 2; i++) {
          const p = (e.elapsed / 1400 + i * 0.5) % 1;
          c.globalAlpha = 1 - p;
          c.fillStyle = '#fff1c4';
          c.font = '20px Georgia';
          c.fillText('♪', l.x + l.size * 0.72 + p * 20, l.y + l.size * 0.22 - p * 40);
          c.globalAlpha = 1;
        }
        if (now - this.lastWhistle > 1800 || !this.lastWhistle) {
          this.lastWhistle = now;
          this.sound.play('whistle');
        }
      }
      if (e.kind === 'pee' && e.elapsed > 5100 && e.elapsed < 8200) {
        const x = l.x + l.size * 0.64,
          y = l.base - l.size * 0.2,
          p = (e.elapsed / 500) % 1;
        c.save();
        c.strokeStyle = '#e8cd785c';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(x + l.size * 0.24, y - l.size * 0.1, x + l.size * 0.32, l.base);
        c.stroke();
        c.fillStyle = '#e9dba488';
        c.beginPath();
        c.arc(x + l.size * 0.32, l.base, 2 + p * 3, 0, 7);
        c.fill();
        c.restore();
      }
    }
    dropPath(c, d) {
      const r = d.r,
        h = r * d.stretch;
      c.moveTo(0, -h);
      c.bezierCurveTo(r * 0.3, -h * 0.3, r * 1.2, -h * 0.4, r, h * 0.2);
      c.bezierCurveTo(r * 1.3, h * 0.8, r * 0.2, h * 1.1, -r * 0.25, h);
      c.bezierCurveTo(-r, h * 1.2, -r * 1.1, h * 0.1, -r * 0.8, -h * 0.2);
      if (d.shape === 1) c.bezierCurveTo(-r * 0.5, -h * 0.4, -r * 0.5, -h * 1.8, 0, -h);
      else c.bezierCurveTo(-r, -h * 0.8, -r * 0.1, -h * 0.5, 0, -h);
      c.closePath();
    }
    drawSpit(now) {
      const c = this.spitCtx;
      if (!c) return;
      c.clearRect(0, 0, this.w, this.h);
      this.drops = this.drops.filter((d) => now - d.start < d.life);
      for (const d of this.drops) {
        const age = now - d.start,
          p = this.reduced ? 1 : Math.min(1, age / 100),
          x = d.fromX + (d.x * this.w - d.fromX) * p,
          y = d.fromY + (d.y * this.h - d.fromY) * p,
          fade = Math.min(1, (d.life - age) / 160);
        c.save();
        c.translate(x, y);
        c.rotate(d.angle);
        c.scale(p || 0.01, p || 0.01);
        c.globalAlpha = fade * 0.96;
        c.fillStyle = '#d4e5df';
        c.shadowColor = '#213a3944';
        c.shadowBlur = 0;
        c.beginPath();
        this.dropPath(c, d);
        c.fill();
        c.shadowBlur = 0;
        c.strokeStyle = '#eefcf077';
        c.lineWidth = 1;
        c.stroke();
        c.fillStyle = '#fffefa88';
        c.beginPath();
        c.ellipse(
          -d.r * 0.25,
          -d.r * d.stretch * 0.35,
          d.r * 0.13,
          d.r * 0.32,
          -0.3,
          0,
          Math.PI * 2,
        );
        c.fill();
        c.restore();
      }
    }
    frame(now) {
      requestAnimationFrame((t) => this.frame(t));
      if (!document.hidden && (!this.last || now - this.last > (this.uiPaused ? 100 : 15))) {
        this.last = now;
        this.draw(now);
      }
    }
    preview(canvas, kind, stage) {
      if (!this.ready) return;
      const key = [
        kind,
        stage,
        this.state.homeStage,
        this.state.hat,
        Object.keys(this.images).length,
      ].join('-');
      if (canvas.dataset.preview === key) return;
      canvas.dataset.preview = key;
      const c = canvas.getContext('2d'),
        w = 640,
        h = 360;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      const home = kind === 'home' ? stage : this.state.homeStage;
      this.background(c, home, w, h);
      this.food(c, home, w, h);
      if (kind === 'pug') this.dog(c, stage, 'idle', 30, -5, 350);
    }
  }
  window.PugWorld = World;
})();
