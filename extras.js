(function () {
  'use strict';
  class Extras {
    constructor(world) {
      this.world = world;
      this.frames = new Map();
    }
    frame(key, index, cols, rows) {
      const cache = key + '-' + index;
      if (this.frames.has(cache)) return this.frames.get(cache);
      const image = this.world.images[key];
      if (!image) return null;
      const w = Math.round(image.width / cols),
        h = Math.round(image.height / rows),
        canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const c = canvas.getContext('2d', { willReadFrequently: true });
      c.drawImage(image, (-index % cols) * w, -Math.floor(index / cols) * h);
      const pixels = c.getImageData(0, 0, w, h);
      PugSprites.isolate(pixels.data, w, h);
      c.putImageData(pixels, 0, 0);
      let x = w,
        y = h,
        right = 0,
        bottom = 0;
      for (let row = 0; row < h; row++)
        for (let col = 0; col < w; col++)
          if (pixels.data[(row * w + col) * 4 + 3] > 32) {
            x = Math.min(x, col);
            y = Math.min(y, row);
            right = Math.max(right, col);
            bottom = Math.max(bottom, row);
          }
      const f = { canvas, x, y, w: right - x + 1, h: bottom - y + 1 };
      this.frames.set(cache, f);
      return f;
    }
    hat(ctx, id, layout, pose, now) {
      const index = PugGame.HATS.findIndex((h) => h.id === id),
        f = this.frame('hats', index, 4, 3);
      if (index < 0 || !f) return;
      const anchor =
        pose === 'sleep'
          ? { x: 0.82, y: 0.7, w: 0.25 }
          : pose === 'stretch'
            ? { x: 0.55, y: 0.72, w: 0.42 }
            : pose === 'back'
              ? { x: 0.54, y: 0.18, w: 0.42 }
              : { x: 0.52, y: 0.21, w: 0.48 };
      const size = layout.size,
        bottom = layout.y + size * anchor.y,
        scale = Math.min(
          1,
          Math.max(32, bottom - this.world.h * 0.02) / ((size * anchor.w * f.h) / f.w),
        ),
        wide = size * anchor.w * scale,
        height = (wide * f.h) / f.w,
        left = layout.x + size * anchor.x - wide * 0.5;
      ctx.save();
      if (pose === 'look') ctx.translate(size * 0.015, 0);
      if (pose === 'left') ctx.translate(-size * 0.02, 0);
      ctx.drawImage(f.canvas, f.x, f.y, f.w, f.h, left, bottom - height, wide, height);
      if (id === 'umbrella' && !this.world.reduced) {
        ctx.strokeStyle = '#c9e9f1';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 9; i++) {
          const p = (now / 650 + i / 9) % 1,
            x = left + (wide * (i + 0.5)) / 9,
            y = bottom - height - 35 + p * 35;
          ctx.globalAlpha = 1 - p;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 2, y + 5);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    helper(ctx, now, width, height, level, preview = false) {
      if (!level && !preview) return;
      const frame = this.world.reduced || this.world.uiPaused ? 0 : (now / 250) % 8,
        a = Math.floor(frame),
        mix = frame - a,
        f = this.frame('helper', a, 4, 2),
        g = this.frame('helper', (a + 1) % 8, 4, 2);
      if (!f) return;
      const w = width * (width < height ? 0.36 : 0.19),
        h = w * (f.canvas.height / f.canvas.width),
        x = width < height ? width * 0.63 : width * 0.78,
        y = height * (width < height ? 0.82 : 0.91) - h;
      ctx.save();
      const draw = (r, alpha) => {
        if (!r) return;
        ctx.globalAlpha = alpha;
        ctx.drawImage(r.canvas, x, y, w, h);
      };
      draw(f, 1 - mix);
      draw(g, mix);
      if (!this.world.reduced && frame > 6) {
        const p = (frame - 6) / 2;
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.world.state.homeStage === 13 ? '#d5b459' : '#a77c53';
        for (let i = 0; i < 4; i++) {
          const fall = (p + i * 0.17) % 1;
          ctx.beginPath();
          ctx.ellipse(x + w * 0.88 + Math.sin(i) * 3, y + h * 0.45 + fall * h * 0.45, 2, 2.5, 0, 7);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
  window.PugExtras = Extras;
})();
