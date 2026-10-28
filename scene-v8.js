(function () {
  'use strict';
  const POSES = [
    'idle',
    'mid-look',
    'look',
    'mid-scratch',
    'scratch',
    'mid-yawn',
    'yawn',
    'mid-lick',
    'lick',
    'mid-left',
    'left',
    'mid-pawlick',
    'pawlick',
    'mid-splay',
    'splay',
    'mid-sleep',
    'sleep',
    'mid-whistle',
    'whistle',
    'mid-back',
    'back',
    'rear',
    'mid-stretch',
    'stretch',
  ];
  // Measured crown anchors in each normalized drawing, including lying and rear views.
  const HEADS = [
    [0.54, 0.075, 0.4],
    [0.54, 0.075, 0.4],
    [0.55, 0.11, 0.35],
    [0.53, 0.09, 0.38],
    [0.55, 0.075, 0.4],
    [0.54, 0.08, 0.39],
    [0.54, 0.1, 0.34],
    [0.55, 0.1, 0.36],
    [0.54, 0.1, 0.36],
    [0.53, 0.12, 0.38],
    [0.39, 0.14, 0.35],
    [0.54, 0.145, 0.38],
    [0.54, 0.145, 0.36],
    [0.53, 0.16, 0.36],
    [0.5, 0.24, 0.34],
    [0.54, 0.335, 0.36],
    [0.29, 0.56, 0.37],
    [0.55, 0.23, 0.38],
    [0.54, 0.24, 0.38],
    [0.58, 0.19, 0.31],
    [0.63, 0.21, 0.31],
    [0.5, 0.055, 0.31],
    [0.6, 0.43, 0.34],
    [0.66, 0.59, 0.34],
  ];
  // Floor anchors measured against each location's architecture, not a universal wall height.
  // [left, floor baseline, width] in viewport fractions. The displayed home skin selects the floor.
  const BED_FLOORS = Object.freeze(
    [
      [0.03, 0.49, 0.34],
      [0.04, 0.51, 0.32],
      [0.06, 0.5, 0.34],
      [0.04, 0.5, 0.34],
      [0.06, 0.51, 0.34],
      [0.05, 0.5, 0.34],
      [0.04, 0.53, 0.34],
      [0.03, 0.51, 0.34],
      [0.04, 0.52, 0.34],
      [0.03, 0.54, 0.34],
      [0.05, 0.52, 0.34],
      [0.04, 0.53, 0.34],
      [0.05, 0.54, 0.34],
      [0.06, 0.55, 0.34],
      [0.05, 0.56, 0.34],
    ].map(Object.freeze),
  );
  class Scene {
    constructor(world) {
      this.world = world;
      this.bursts = [];
      this.actors = [];
    }
    async load() {
      for (const [key, file] of [
        ['beds', 'beds'],
        ['yuppi', 'yuppi'],
        ['insects', 'insects'],
        ['hatsSecret', 'hats-front'],
        ['hatsSecretSide', 'hats-side'],
        ['hatsSecretBack', 'hats-back'],
      ]) {
        await new Promise((r) => (window.requestIdleCallback || setTimeout)(r));
        await this.world.image(key, 'assets-v8/' + file + '.webp').catch(() => {});
      }
    }
    async preloadPug(pose = 'idle') {
      const i = POSES.indexOf(pose);
      if (i < 0) return;
      const key = 'muscle-' + Math.floor(i / 4);
      if (performance.now() < (this.world.artRetryAt.get(key) || 0))
        throw Error('pose temporarily unavailable');
      await this.world.image(
        'muscle-' + Math.floor(i / 4),
        'assets-v8/muscle-' + Math.floor(i / 4) + '.webp',
      );
    }
    muscleFrame(pose) {
      let i = POSES.indexOf(pose);
      if (i < 0) i = 0;
      const key = 'muscle-' + Math.floor(i / 4);
      if (!this.world.images[key]) {
        this.preloadPug(pose).catch(() => {});
        i = 0;
      }
      if (!this.world.images['muscle-' + Math.floor(i / 4)]) return null;
      const frame = this.world.extras.frame('muscle-' + Math.floor(i / 4), i % 4, 2, 2);
      if (!frame) return null;
      if (!frame.alpha) {
        const pixels = frame.canvas
          .getContext('2d', { willReadFrequently: true })
          .getImageData(0, 0, 480, 480);
        frame.alpha = Uint8Array.from({ length: 480 * 480 }, (_, j) => pixels.data[j * 4 + 3]);
        frame.cellWidth = 480;
        frame.cellHeight = 480;
        frame.pad = 0;
        frame.padY = 0;
        const [x, y, w] = HEADS[i];
        frame.head = { x, y, w, tilt: pose === 'sleep' ? 0.12 : 0 };
      }
      return frame;
    }
    bedLayout() {
      const w = this.world.w,
        h = this.world.h,
        stage = Math.max(
          0,
          Math.min(BED_FLOORS.length - 1, Math.floor(this.world.state.homeStage || 0)),
        ),
        [left, floor, extent] = BED_FLOORS[stage],
        width = w * extent;
      return {
        x: w * left,
        y: h * floor - width * 0.55,
        w: width,
        h: width * 0.55,
        base: h * floor,
      };
    }
    bed(ctx, lip = false) {
      const s = this.world.state,
        i = PugGuests.BEDS.findIndex((b) => b.id === s.bed);
      if (i < 0) return;
      const f = this.world.extras.frame('beds', i, 3, 3);
      if (!f) return;
      const l = this.bedLayout();
      ctx.save();
      if (lip) {
        ctx.beginPath();
        ctx.rect(l.x, l.y + l.h * 0.67, l.w, l.h * 0.33);
        ctx.clip();
      }
      ctx.drawImage(f.canvas, f.x, f.y, f.w, f.h, l.x, l.y, l.w, l.h);
      ctx.restore();
    }
    sleepLayout(l) {
      const e = this.world.idleEvent;
      if (e?.kind !== 'sleep' || !this.world.state.bed) return l;
      const b = this.bedLayout(),
        p = Math.min(1, e.elapsed / 1400, (e.duration - e.elapsed) / 1000),
        q = 1 - (1 - Math.max(0, p)) ** 3,
        size = l.size * 0.57;
      const target = {
        x: b.x + b.w * 0.5 - size * 0.5,
        y: b.base - size * 0.92,
        size,
        base: b.base,
      };
      return Object.fromEntries(Object.keys(l).map((k) => [k, l[k] + (target[k] - l[k]) * q]));
    }
    petPug(now) {
      const previous = this.farting;
      if (previous && now - previous.last < 1000) previous.last = now;
      else this.farting = { start: now, last: now, variant: Math.floor(Math.random() * 3) };
      this.world.sneeze('cloud');
    }
    fartPose(now) {
      const a = this.farting;
      if (!a) return null;
      if (now - a.last > 1100) {
        this.farting = null;
        return null;
      }
      const p = now - a.start;
      return p < 180
        ? 'yawn'
        : p < 420
          ? 'mid-back'
          : a.variant === 0
            ? 'rear'
            : a.variant === 1
              ? 'back'
              : Math.floor(p / 600) % 2
                ? 'rear'
                : 'back';
    }
    guestReady() {
      return !!this.world.images.yuppi && !!this.world.images.insects;
    }
    drawGuest(canvas, a, now = performance.now()) {
      if (window.PugCharacterMotion?.drawGuest(this.world, canvas, a, now)) return;
      if (canvas.width !== 256) {
        canvas.width = 256;
        canvas.height = 256;
      }
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, 256, 256);
      const kind = a.kind,
        key = kind === 'yuppi' ? 'yuppi' : 'insects',
        cell =
          (kind === 'bee' ? 6 : 0) +
          (kind === 'yuppi' && now < (this.missUntil || 0)
            ? 4
            : Math.floor(a.elapsed / (kind === 'yuppi' ? 190 : 100)) % 6);
      const f = this.world.extras.frame(
        key,
        cell,
        kind === 'yuppi' ? 3 : 4,
        kind === 'yuppi' ? 2 : 3,
      );
      if (!f) return;
      c.save();
      if (!a.fromLeft) {
        c.translate(256, 0);
        c.scale(-1, 1);
      }
      const scale = Math.min(246 / f.w, 210 / f.h),
        x = (256 - f.w * scale) / 2,
        y = (256 - f.h * scale) / 2;
      c.drawImage(f.canvas, f.x, f.y, f.w, f.h, x, y, f.w * scale, f.h * scale);
      c.restore();
    }
    burst(a, p, caught) {
      this.bursts.push({ start: performance.now(), x: p.x, y: p.y, caught, kind: a.kind });
      this.bursts = this.bursts.slice(-4);
    }
    draw(ctx, now) {
      for (const a of this.actors) {
        if (a.kind !== 'yuppi') continue;
        const p = PugGuests.position(a, this.world.w, this.world.h),
          sign = a.fromLeft ? -1 : 1;
        ctx.save();
        ctx.globalAlpha = 0.8;
        const colors = ['#f65356', '#ffab37', '#ffe257', '#7be08c', '#67c5fc', '#d57eef'];
        for (let i = 0; i < 6; i++) {
          ctx.strokeStyle = colors[i];
          ctx.lineWidth = 4;
          ctx.beginPath();
          for (let j = 0; j < 12; j++) {
            const x = p.x + sign * (p.size * 0.35 + j * 6),
              y = p.y + (i - 2.5) * 4 + Math.sin(j * 0.5 + now / 140) * 3;
            j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        ctx.font = '900 19px system-ui';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#483125';
        ctx.lineWidth = 3;
        ctx.strokeText('YIPPEEEE!', p.x, p.y - p.size * 0.43);
        ctx.fillStyle = colors[Math.floor(now / 170) % 6];
        ctx.fillText('YIPPEEEE!', p.x, p.y - p.size * 0.43);
        ctx.restore();
      }
      this.bursts = this.bursts.filter((b) => now - b.start < 750);
      for (const b of this.bursts) {
        const p = (now - b.start) / 750;
        ctx.save();
        ctx.translate(b.x, b.y);
        if (!b.caught && p < 0.4) {
          ctx.rotate(-0.8 + p * 2);
          ctx.fillStyle = '#d87244';
          ctx.strokeStyle = '#f6d6a9';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(0, -30 + p * 60, 12, 28, 0, 0, 7);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#a95738';
          ctx.fillRect(-12, -38 + p * 60, 24, 13);
        }
        for (let i = 0; i < 18; i++) {
          const t = i * 2.4,
            r = 10 + p * (45 + (i % 4) * 10);
          ctx.globalAlpha = 1 - p;
          ctx.fillStyle = b.caught
            ? ['#ff615a', '#ffd850', '#75e0b4', '#80b9ff', '#cf86f6'][i % 5]
            : b.kind === 'bee'
              ? '#ffd757'
              : '#debbfa';
          ctx.beginPath();
          ctx.arc(Math.cos(t) * r, Math.sin(t) * r, 2.5, 0, 7);
          ctx.fill();
        }
        ctx.restore();
      }
    }
    clear() {
      this.actors = [];
      this.bursts = [];
      this.farting = null;
    }
  }
  Scene.poses = Object.freeze(POSES);
  Scene.heads = Object.freeze(HEADS);
  Scene.bedFloors = BED_FLOORS;
  window.PugScene = Scene;
})();
