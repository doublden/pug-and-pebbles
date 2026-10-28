(function () {
  'use strict';
  const KING_FITS = [
    [0.58, 0.273, 0.35],
    [0.61, 0.27, 0.35],
    [0.63, 0.273, 0.33],
    [0.67, 0.328, 0.36],
    [0.63, 0.28, 0.34],
    [0.55, 0.265, 0.35],
    [0.56, 0.285, 0.35],
    [0.59, 0.27, 0.36],
    [0.615, 0.285, 0.34],
    [0.625, 0.273, 0.32],
    [0.635, 0.254, 0.34],
    [0.56, 0.28, 0.36],
    [0.53, 0.289, 0.36],
    [0.6, 0.262, 0.366],
    [0.55, 0.281, 0.34],
    [0.64, 0.293, 0.37],
    [0.7, 0.48, 0.36],
    [0.664, 0.273, 0.32],
    [0.627, 0.3, 0.34],
    [0.66, 0.242, 0.28],
    [0.63, 0.258, 0.29],
    [0.605, 0.246, 0.325],
    [0.521, 0.359, 0.337],
    [0.537, 0.351, 0.337],
  ];
  const KING_POSES = [
    'idle',
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
    'rear',
    'stretch',
  ].flatMap((p) => (p === 'idle' || p === 'rear' ? [p] : ['mid-' + p, p]));
  const POSE_FITS = {
    sleep: [
      [0.8, 0.56, 0.4],
      [0.79, 0.57, 0.43],
      [0.8, 0.55, 0.39],
      [0.8, 0.57, 0.42],
      [0.83, 0.56, 0.39],
      [0.83, 0.55, 0.4],
      [0.81, 0.56, 0.4],
      [0.8, 0.55, 0.41],
      [0.84, 0.54, 0.4],
      [0.84, 0.53, 0.4],
      [0.83, 0.52, 0.4],
      [0.84, 0.51, 0.4],
      [0.85, 0.46, 0.41],
      [0.8, 0.4, 0.47],
      [0.8, 0.46, 0.47],
    ],
  };
  POSE_FITS.stretch = {
    0: [0.68, 0.56, 0.41],
    6: [0.67, 0.565, 0.4],
    13: [0.55, 0.25, 0.43],
    14: [0.57, 0.27, 0.43],
  };
  POSE_FITS['mid-stretch'] = {
    6: [0.715, 0.51, 0.44],
    7: [0.709, 0.52, 0.43],
    11: [0.695, 0.51, 0.45],
    13: [0.72, 0.54, 0.43],
    14: [0.55, 0.27, 0.43],
  };
  POSE_FITS['mid-scratch'] = {
    0: [0.65, 0.17, 0.42],
    1: [0.65, 0.17, 0.42],
    2: [0.67, 0.17, 0.42],
    4: [0.67, 0.15, 0.42],
    7: [0.67, 0.15, 0.43],
    9: [0.67, 0.18, 0.44],
    10: [0.67, 0.18, 0.44],
    11: [0.67, 0.18, 0.44],
    13: [0.7, 0.14, 0.44],
  };
  POSE_FITS['mid-sleep'] = { 11: [0.69, 0.21, 0.44], 13: [0.71, 0.18, 0.46] };
  POSE_FITS.back = { 13: [0.7, 0.1, 0.31] };

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
      const f = { canvas, cacheKey: cache, x, y, w: right - x + 1, h: bottom - y + 1 };
      if (key.startsWith('hats')) {
        const rear = key === 'hatsBack',
          side = key === 'hatsSide';
        const mountX =
          index === 8
            ? rear
              ? 0.64
              : 0.37
            : index === 9
              ? rear
                ? 0.6
                : 0.42
              : index === 5 && side
                ? 0.65
                : 0.5;
        const bandX = index === 4 && side ? 0.78 : mountX;
        let band = y;
        for (let row = y; row <= bottom; row++)
          for (
            let col = Math.floor(x + f.w * (bandX - 0.025));
            col <= x + f.w * (bandX + 0.025);
            col++
          )
            if (pixels.data[(row * w + col) * 4 + 3] > 150) band = Math.max(band, row);
        f.mount = {
          x: mountX,
          y: (band - y + 1) / f.h,
          span:
            index === 8
              ? 0.67
              : index === 9
                ? 0.82
                : index === 5 && side
                  ? 0.74
                  : index === 6
                    ? 0.9
                    : 1,
        };
      }
      if (key.startsWith('hats') && index === 8) {
        f.mount =
          key === 'hatsBack'
            ? { x: 0.5, y: 0.73, span: 0.92 }
            : key === 'hatsSide'
              ? { x: 0.64, y: 0.94, span: 0.72 }
              : { x: 0.38, y: 0.96, span: 0.7 };
      }
      if (key.startsWith('hats') && index === 7) f.mount.span = 0.84;
      this.frames.set(cache, f);
      if (this.frames.size > 96) this.frames.delete(this.frames.keys().next().value);
      return f;
    }
    head(pixels, cell, pad, padY, pose, stage) {
      if (stage === -1) {
        const [x, y, w] = KING_FITS[KING_POSES.indexOf(pose)];
        return {
          x: 0.5 + (x - 0.5) * 1.2,
          y: 0.94 + (y - 0.94) * 1.2,
          w: w * 1.2,
          tilt: pose.includes('left')
            ? -0.1
            : pose.includes('look')
              ? 0.07
              : pose === 'sleep'
                ? 0.08
                : 0,
        };
      }
      // Lying sprites have a continuous silhouette from spine to forehead.
      // Their measured skull fits avoid mistaking the back for the crown.
      if (POSE_FITS[pose]?.[stage]) {
        const [x, y, w] = POSE_FITS[pose][stage];
        return { x, y, w, tilt: 0.08 };
      }
      const w = pixels.width,
        h = pixels.height,
        data = pixels.data,
        low = pose === 'sleep' || (pose.includes('stretch') && stage < 13 && stage !== -1);

      if (pose === 'rear') {
        let top = h,
          left = w,
          right = 0;
        for (let y = 0; y < Math.min(h, padY + cell * 0.4); y++)
          for (let x = Math.floor(pad + cell * 0.15); x < Math.min(w, pad + cell * 0.9); x++)
            if (data[(y * w + x) * 4 + 3] > 180) top = Math.min(top, y);
        for (let y = top; y < Math.min(h, top + cell * 0.2); y++)
          for (let x = 0; x < w; x++)
            if (data[(y * w + x) * 4 + 3] > 180) {
              left = Math.min(left, x);
              right = Math.max(right, x);
            }
        return {
          x: ((left + right) * 0.5 - pad) / cell,
          y: (top - padY) / cell + 0.055,
          w: Math.max(0.3, Math.min(0.52, ((right - left) / cell) * 0.85)),
          tilt: 0,
        };
      }
      const mask = new Uint8Array(w * h),
        seen = new Uint8Array(w * h),
        queue = new Int32Array(w * h);
      let best = [];
      const minY = Math.floor(padY + cell * (low ? 0.38 : 0.04)),
        maxY = Math.min(h, Math.floor(padY + cell * (low ? 0.91 : 0.58)));
      for (let y = minY; y < maxY; y++)
        for (
          let x = Math.floor(pad + cell * 0.14);
          x < Math.min(w, pad + cell * (low ? 1.1 : 1.02));
          x++
        ) {
          const i = y * w + x,
            j = i * 4;
          if (data[j + 3] > 180 && (data[j] + data[j + 1] + data[j + 2]) / 3 < 100) mask[i] = 1;
        }
      for (let i = 0; i < mask.length; i++)
        if (mask[i] && !seen[i]) {
          let tail = 1;
          queue[0] = i;
          seen[i] = 1;
          for (let head = 0; head < tail; head++) {
            const n = queue[head];
            for (const next of [n - 1, n + 1, n - w, n + w])
              if (
                next >= 0 &&
                next < mask.length &&
                !seen[next] &&
                mask[next] &&
                Math.abs((next % w) - (n % w)) <= 1
              ) {
                seen[next] = 1;
                queue[tail++] = next;
              }
          }
          if (tail > best.length) best = Array.from(queue.subarray(0, tail));
        }
      if (best.length < 30)
        return { x: low ? 0.72 : 0.52, y: low ? 0.65 : 0.29, w: low ? 0.32 : 0.43, tilt: 0 };
      let left = w,
        right = 0,
        top = h,
        bottom = 0;
      for (const i of best) {
        const x = i % w,
          y = Math.floor(i / w);
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
      let scalp = top;
      const cx = (left + right) / 2;
      for (
        let y = Math.floor(low ? Math.max(padY + cell * 0.3, top - cell * 0.07) : padY);
        y < top;
        y++
      ) {
        let count = 0;
        for (let x = Math.floor(cx - cell * 0.08); x < cx + cell * 0.08; x++)
          if (x >= 0 && x < w) {
            const j = (y * w + x) * 4;
            if (
              data[j + 3] > 180 &&
              Math.abs(data[j] - data[j + 1]) < 45 &&
              Math.abs(data[j + 1] - data[j + 2]) < 40
            )
              count++;
          }
        if (count > cell * 0.08) {
          scalp = y;
          break;
        }
      }
      return {
        x: ((left + right) / 2 - pad) / cell,
        y: (scalp - padY) / cell + 0.035,
        w: Math.max(0.25, Math.min(0.47, ((right - left) / cell) * 1.25)),
        tilt: pose.includes('left') ? -0.1 : pose.includes('look') ? 0.07 : low ? 0.13 : 0,
      };
    }
    react(now) {
      this.reactionAt = now;
    }
    hatFrame(id, pose = 'idle') {
      const index = PugGame.HATS.findIndex((h) => h.id === id);
      if (index < 0) return null;
      const view = pose === 'rear' ? 'Back' : pose.includes('back') ? 'Side' : '';
      const key = (index >= 10 ? 'hatsSecret' : 'hats') + view;
      const f = this.frame(
        this.world.images[key] ? key : index >= 10 ? 'hatsSecret' : 'hats',
        index >= 10 ? index - 10 : index,
        4,
        index >= 10 ? 1 : 3,
      );
      if (f && index >= 10) {
        f.mount = { x: 0.5, y: 0.96, span: 1 };
      }
      return f;
    }
    hat(ctx, id, layout, pose, now, head) {
      const index = PugGame.HATS.findIndex((h) => h.id === id),
        f = this.hatFrame(id, pose);
      if (index < 0 || !f) return;
      const anchor = head || { x: 0.52, y: 0.28, w: 0.44, tilt: 0 };
      const size = layout.size,
        mount = f.mount || { x: 0.5, y: 0.98, span: 1 },
        wide = (size * anchor.w * (index === 4 ? 1 : 1.08)) / mount.span,
        height = (wide * f.h) / f.w,
        left = layout.x + size * anchor.x - wide * mount.x,
        bottom = layout.y + size * (anchor.y + (pose === 'rear' ? 0.035 : 0.045));
      ctx.save();
      ctx.translate(left + wide * mount.x, bottom);
      ctx.rotate(anchor.tilt || 0);
      ctx.translate(-left - wide * mount.x, -bottom);
      ctx.drawImage(f.canvas, f.x, f.y, f.w, f.h, left, bottom - height * mount.y, wide, height);
      if (id === 'yogurt') {
        ctx.save();
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          ctx.strokeStyle = ['#fa706e', '#ffd44f', '#80dcb0', '#6dc5fa', '#c398fa'][i];
          ctx.beginPath();
          ctx.arc(
            left + wide * 0.5,
            bottom - height - 5,
            wide * 0.35 + i * 2,
            Math.PI,
            Math.PI * 2,
          );
          ctx.stroke();
        }
        ctx.fillStyle = '#fff5b4';
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(now / 270));
        ctx.font = '15px system-ui';
        ctx.fillText('✦', left + wide * 0.86, bottom - height - 10);
        ctx.restore();
      }
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
    metalFrame(frame, tier) {
      // Cached material coloring works on Safari without Canvas filter support.
      if (tier === 2 || typeof document === 'undefined') return null;
      this.metals ||= new Map();
      const key = [tier, frame.cacheKey ?? [frame.x, frame.y, frame.w, frame.h].join('-')].join(
        '-',
      );
      if (this.metals.has(key)) return this.metals.get(key);
      const palette = [
        [131, 87, 58],
        [176, 135, 75],
        [236, 174, 45],
        [104, 181, 95],
        [91, 154, 237],
        [85, 195, 190],
        [233, 88, 66],
        [237, 239, 245],
        [244, 194, 92],
        [255, 209, 74],
        [255, 220, 109],
      ][tier];
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(frame.w);
      canvas.height = Math.ceil(frame.h);
      const c = canvas.getContext('2d', { willReadFrequently: true });
      c.drawImage(
        frame.canvas,
        frame.x,
        frame.y,
        frame.w,
        frame.h,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const image = c.getImageData(0, 0, canvas.width, canvas.height),
        data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        if (data[i + 3] && r > g * 0.9 && g > b * 1.15 && r > b * 1.4) {
          const shade = Math.min(255, (r * 0.3 + g * 0.59 + b * 0.11) * 0.85 + 30);
          data[i] = (shade * palette[0]) / 255;
          data[i + 1] = (shade * palette[1]) / 255;
          data[i + 2] = (shade * palette[2]) / 255;
        }
      }
      c.putImageData(image, 0, 0);
      this.metals.set(key, canvas);
      if (this.metals.size > 32) this.metals.delete(this.metals.keys().next().value);
      return canvas;
    }
    weapon(ctx, layout, pose, head) {
      const s = this.world.state;
      if (!s.weaponsUnlocked || !s.showWeapon) return;
      const id = PugInventoryRules.WEAPONS[s.weaponEquipped]?.id,
        img = this.world.images['weapon-' + id];
      if (!img) return;
      if (this.world.rig?.ready(this.world.state.pugStage)) {
        const m = this.world.rig.measure(this.world.state.pugStage, pose, layout),
          b = m.body;
        const lying = m.lie > 0.5,
          rear = m.view === 'back';
        const length = layout.size * (lying ? 0.46 : 0.58),
          width = length / 3;
        const px = b.x + b.w * (lying ? 0.72 : rear ? 0.51 : 0.23),
          py = b.y + b.h * (lying ? 0.25 : 0.18);
        ctx.save();
        ctx.translate(layout.x + px * layout.size, layout.y + py * layout.size);
        ctx.rotate(lying ? -1.4 : Math.PI + (rear ? -0.35 : 0.36));
        ctx.drawImage(img, -width * 0.5, -length * 0.8, width, length);
        ctx.restore();
        return;
      }
      const low = ['sleep', 'stretch', 'mid-sleep', 'mid-stretch'].includes(pose),
        rear = pose === 'rear',
        side = pose.includes('back');
      const length = layout.size * (low ? 0.46 : 0.58),
        width = length / 3;
      ctx.save();
      ctx.translate(
        layout.x +
          layout.size * (head.x + (rear ? 0 : low || side ? -head.w * 0.65 : head.w * 0.65)),
        layout.y + layout.size * (head.y + (low ? -0.07 : rear || side ? 0.18 : 0.05)),
      );
      ctx.rotate(low ? 1.35 : rear ? -0.38 : side ? -0.18 : 0.46);
      ctx.translate(0, length * 0.76);
      ctx.rotate(Math.PI);
      ctx.drawImage(img, -width / 2, -length * 0.12, width, length);
      ctx.restore();
    }
    rig(ctx, now, width, height, preview) {
      const base = this.frame('helperRig', 0, 4, 4);
      if (!base) return false;
      const tier = this.world.state.helperTier || 0;
      // A local motion clock prevents a jump when a modal or reduced-motion mode pauses the scene.
      const last = this.helperMotionLast ?? now;
      this.helperMotionLast = now;
      if (!preview && !this.world.reduced && !this.world.uiPaused) {
        const delta = Math.max(0, Math.min(80, now - last));
        this.helperMotionTime = (this.helperMotionTime || 0) + delta;
        this.helperWorkTime =
          (this.helperWorkTime || 0) + delta * (this.world.state.helperBurstActive ? 2 : 1);
      }
      const time = preview ? 1600 : this.helperMotionTime || 0;
      const workTime = preview ? 1600 : this.helperWorkTime || 0;
      const cycle = (time / 1000) % 30;
      const smooth = (p) => {
        p = Math.max(0, Math.min(1, p));
        return p * p * (3 - 2 * p);
      };
      const moveAmount = smooth((cycle - 12) / 1.3) * (1 - smooth((cycle - 21.7) / 1.3));
      const moving = moveAmount > 0;
      const w = preview
          ? Math.min(width * 0.66, height * 1.25)
          : width * (width < height ? 0.4 : 0.2375) * (1 + tier * 0.02),
        bodyW = w * 0.6,
        bodyH = (bodyW * base.h) / base.w;
      const x =
        (preview
          ? (width - w * 1.23) / 2
          : width < height
            ? Math.min(width * 0.49, width - w * 1.23 - width * 0.055)
            : width * 0.78) +
        Math.sin(((cycle - 12) / 11) * Math.PI * 2) * width * 0.035 * moveAmount;
      const y =
        height * (width < height ? 0.82 : 0.91) -
        bodyH +
        Math.sin(((cycle - 12) / 11) * Math.PI) * height * 0.012 * moveAmount;
      if (!preview) this.helperBounds = { x, y, w: w * 1.23, h: bodyH + w * 0.22 };
      const paint = (f, x, y, w, h, metal = true) => {
        const colored = metal ? this.metalFrame(f, tier) : null;
        if (colored) ctx.drawImage(colored, 0, 0, colored.width, colored.height, x, y, w, h);
        else ctx.drawImage(f.canvas, f.x, f.y, f.w, f.h, x, y, w, h);
      };
      ctx.save();
      ctx.globalAlpha = 1;
      const groundY = y + bodyH * 0.98;
      ctx.fillStyle = 'rgba(36,24,13,.17)';
      ctx.beginPath();
      ctx.ellipse(x + bodyW * 0.5, groundY, bodyW * 0.51, bodyW * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      paint(base, x, y, bodyW, bodyH);
      if (moveAmount > 0.01) {
        ctx.save();
        ctx.globalAlpha = moveAmount * 0.22;
        ctx.beginPath();
        ctx.ellipse(
          x + bodyW * 0.5,
          y + bodyH * 0.88,
          bodyW * 0.46,
          bodyH * 0.08,
          0,
          0,
          Math.PI * 2,
        );
        ctx.clip();
        ctx.strokeStyle = '#c5b99d';
        ctx.lineWidth = Math.max(0.7, bodyW * 0.006);
        const spacing = bodyW * 0.06,
          offset = (time / 55) % spacing;
        for (let tread = -1; tread < 19; tread++) {
          const tx = x + tread * spacing + offset;
          ctx.beginPath();
          ctx.moveTo(tx, y + bodyH * 0.81);
          ctx.lineTo(tx - bodyW * 0.035, y + bodyH * 0.96);
          ctx.stroke();
        }
        ctx.restore();
      }
      const face = this.frame('helperRig', 5, 4, 4);
      if (face) {
        const hx = x + bodyW * (0.27 + Math.sin(time / 3400) * 0.008),
          hy = y + bodyH * (0.085 + Math.sin(time / 1300) * 0.003),
          hw = bodyW * 0.4,
          hh = (hw * face.h) / face.w;
        const blinkAge = time % 7400,
          blink = Math.max(0, 1 - Math.abs(blinkAge - 4200) / 155);
        const yawn = smooth((cycle - 24) / 0.8) * (1 - smooth((cycle - 26.2) / 0.8));
        const look = (smooth((cycle - 17) / 1.2) - smooth((cycle - 20) / 1.2)) * 0.055;
        const reactionAge = now - (this.reactionAt ?? -10000);
        const reaction =
          reactionAge >= 0 && reactionAge < 1400
            ? smooth(reactionAge / 220) * (1 - smooth((reactionAge - 900) / 500))
            : 0;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + bodyW * 0.24, y + bodyH * 0.04, bodyW * 0.5, bodyH * 0.49);
        ctx.clip();
        ctx.translate(hx + hw * 0.5, hy + hh * 0.68);
        ctx.rotate(Math.sin(time / 2600) * 0.023 + look + reaction * 0.06);
        ctx.scale(1 - Math.abs(look), 1);
        const fx = -hw * 0.5,
          fy = -hh * 0.68;
        paint(face, fx, fy, hw, hh, false);
        const eye = this.frame('helperRig', 7, 4, 4);
        if (eye && blink > 0) {
          ctx.save();
          ctx.globalAlpha = smooth(blink);
          ctx.beginPath();
          ctx.ellipse(0, fy + hh * 0.6, hw * 0.35, hh * 0.105, 0, 0, Math.PI * 2);
          ctx.clip();
          paint(eye, fx, fy, hw, hh, false);
          ctx.restore();
        }
        if (reaction > 0) {
          const annoyedEyes = this.frame('helperRig', 13, 4, 4);
          if (annoyedEyes) {
            ctx.save();
            ctx.globalAlpha = reaction;
            ctx.beginPath();
            ctx.ellipse(0, fy + hh * 0.57, hw * 0.35, hh * 0.14, 0, 0, Math.PI * 2);
            ctx.clip();
            paint(annoyedEyes, fx, fy, hw, hh, false);
            ctx.restore();
          }
        }
        // A local mouth patch opens continuously; the skull, ears and silhouette never dissolve.
        if (yawn > 0.01) {
          const mouth = this.frame('helperRig', 11, 4, 4);
          if (mouth) {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(
              hw * 0.015,
              fy + hh * 0.79,
              hw * 0.17,
              hh * (0.08 + yawn * 0.15),
              0,
              0,
              Math.PI * 2,
            );
            ctx.clip();
            ctx.globalAlpha = smooth(yawn);
            paint(mouth, fx, fy - hh * 0.005, hw, hh, false);
            ctx.restore();
          }
        }
        ctx.restore();
      }
      const p = (workTime % 8500) / 8500;
      const working = 1 - moveAmount * 0.78;
      const a = -0.7 + Math.sin(p * Math.PI * 2) * 0.34 * working,
        b = 0.92 + Math.sin(p * Math.PI * 2 + 0.8) * 0.42 * working;
      const pivot = { x: x + bodyW * 0.86, y: y + bodyH * 0.62 },
        l1 = w * 0.27,
        l2 = w * 0.27;
      const link = (index, origin, angle, length) => {
        const f = this.frame('helperRig', index, 4, 4);
        if (!f) return;
        ctx.save();
        ctx.translate(origin.x, origin.y);
        ctx.rotate(angle);
        const h = (length * f.h) / f.w;
        paint(f, -length * 0.06, -h * 0.5, length * 1.12, h);
        ctx.restore();
      };
      link(1, pivot, a, l1);
      const joint = { x: pivot.x + Math.cos(a) * l1, y: pivot.y + Math.sin(a) * l1 };
      link(2, joint, b, l2);
      const tip = { x: joint.x + Math.cos(b) * l2, y: joint.y + Math.sin(b) * l2 },
        bucket = this.frame('helperRig', 3, 4, 4);
      if (bucket) {
        ctx.save();
        ctx.translate(tip.x, tip.y);
        ctx.rotate(-0.45 + Math.sin(p * Math.PI * 2) * 0.55);
        paint(bucket, -w * 0.07, -w * 0.025, w * 0.22, (w * 0.22 * bucket.h) / bucket.w);
        const load = smooth((p - 0.2) / 0.15) * (1 - smooth((p - 0.68) / 0.13));
        if (load > 0) {
          ctx.save();
          ctx.globalAlpha = load;
          for (let i = 0; i < 7; i++) {
            ctx.fillStyle = i % 2 ? '#b47a35' : '#8d592b';
            ctx.beginPath();
            ctx.ellipse(
              w * (-0.025 + (i % 4) * 0.027),
              w * (0.075 - Math.floor(i / 4) * 0.023),
              w * 0.018,
              w * 0.015,
              i * 0.7,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
          ctx.restore();
        }
        ctx.restore();
      }
      if (p > 0.75 && !moving && !this.world.reduced) {
        ctx.fillStyle = this.world.state.homeStage === 13 ? '#d5b459' : '#a77c53';
        for (let i = 0; i < 4; i++) {
          const f = ((p - 0.75) * 4 + i * 0.23) % 1;
          ctx.beginPath();
          ctx.ellipse(tip.x - 6 + i * 3, tip.y + f * bodyH * 0.5, 2, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (tier < 2) {
        ctx.fillStyle = '#6f412c';
        for (let i = 0; i < 7; i++) {
          ctx.beginPath();
          ctx.ellipse(
            x + bodyW * (0.07 + ((i * 0.13) % 0.7)),
            y + bodyH * (0.64 + ((i * 0.047) % 0.23)),
            bodyW * 0.025,
            bodyH * 0.025,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      if (tier >= 10) {
        ctx.fillStyle = '#9de5ec';
        ctx.strokeStyle = '#eef9df';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const dx = x + bodyW * (0.12 + i * 0.19),
            dy = y + bodyH * 0.86;
          ctx.beginPath();
          ctx.moveTo(dx, dy - 3);
          ctx.lineTo(dx + 3, dy);
          ctx.lineTo(dx, dy + 4);
          ctx.lineTo(dx - 3, dy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
      const sticker = this.world.state.helperSticker;
      if (sticker && sticker !== 'none') {
        ctx.save();
        ctx.translate(x + bodyW * 0.15, y + bodyH * 0.73);
        const size = bodyW * 0.08;
        ctx.fillStyle = tier >= 8 ? '#544334' : '#fff0d0';
        if (sticker === 'paw') {
          ctx.beginPath();
          ctx.ellipse(0, size * 0.3, size * 0.46, size * 0.36, 0, 0, Math.PI * 2);
          ctx.fill();
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.ellipse(
              (i - 1.5) * size * 0.3,
              -size * 0.22 + Math.abs(i - 1.5) * size * 0.16,
              size * 0.14,
              size * 0.18,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        } else if (sticker === 'fish') {
          ctx.beginPath();
          ctx.ellipse(0, 0, size * 0.5, size * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(size * 0.35, 0);
          ctx.lineTo(size * 0.8, -size * 0.3);
          ctx.lineTo(size * 0.8, size * 0.3);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5 - Math.PI / 2,
              r = i % 2 ? size * 0.25 : size * 0.6;
            ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
      return true;
    }
    helper(ctx, now, width, height, level, preview = false) {
      if (!level && !preview) {
        this.helperBounds = null;
        return;
      }
      if (this.world.images.helperRig && this.rig(ctx, now, width, height, preview)) return;
      const frame = this.world.reduced || this.world.uiPaused ? 0 : (now / 480) % 8,
        a = Math.floor(frame),
        mix = frame - a,
        f = this.frame('helper', a, 4, 2),
        g = this.frame('helper', (a + 1) % 8, 4, 2);
      if (!f) return;
      const mobile = width < height,
        cycle = (now / 1000) % 30,
        moving = !preview && !this.world.uiPaused && cycle > 12 && cycle < 23;
      const travel = moving ? Math.sin(((cycle - 12) / 11) * Math.PI * 2) * width * 0.035 : 0;
      const w = preview
          ? Math.min(width * 0.66, height * 1.25)
          : width * (width < height ? 0.4 : 0.2375),
        h = w * (f.canvas.height / f.canvas.width),
        x = (width < height ? width * 0.49 : width * 0.78) + travel,
        y =
          height * (width < height ? 0.82 : 0.91) -
          h +
          (moving ? Math.sin(((cycle - 12) / 11) * Math.PI) * height * 0.025 : 0);
      if (!preview) this.helperBounds = { x, y, w, h };
      ctx.save();
      const draw = (r, alpha) => {
        if (!r) return;
        ctx.globalAlpha = alpha;
        ctx.drawImage(r.canvas, x, y, w, h);
      };
      draw(f, 1);
      // Optional legacy fallback stays on one opaque drawing; never dissolve entire machines.
      // The normal path above uses the independent articulated rig.
      if (!this.world.reduced && frame > 6) {
        const p = (frame - 6) / 2;
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.world.state.homeStage === 13 ? '#d5b459' : '#a77c53';
        for (let i = 0; i < 4; i++) {
          const fall = (p + i * 0.17) % 1;
          ctx.beginPath();
          ctx.ellipse(
            x + w * 0.88 + Math.sin(i) * 3,
            y + h * 0.45 + fall * h * 0.45,
            2,
            2.5,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
  Extras.kingPoses = Object.freeze(KING_POSES);
  window.PugExtras = Extras;
})();
