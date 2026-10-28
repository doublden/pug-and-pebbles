(() => {
  'use strict';
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const W = 900, H = 1600, TAU = Math.PI * 2;
  const art = {}, parts = [];
  let raf = 0, started = 0, elapsed = 0, resumed = 0, pixelRatio = 1;
  const stillFrame = new URLSearchParams(location.search).get('frame');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (v) => { v = clamp(v); return v * v * (3 - 2 * v); };
  const pulse = (t, center, duration) => smooth(1 - Math.abs(t - center) / duration);
  const paint = (im, x, y, width, height = width * im.height / im.width) => ctx.drawImage(im, x, y, width, height);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    pixelRatio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * pixelRatio);
    canvas.height = Math.round(rect.height * pixelRatio);
  }
  new ResizeObserver(resize).observe(canvas);

  // Extract and cache independent rigid pieces once, never swap whole-character pictures.
  function piece(image, index) {
    const sw = image.width / 4, sh = image.height / 4;
    const cell = document.createElement('canvas');
    cell.width = sw; cell.height = sh;
    const c = cell.getContext('2d', { willReadFrequently: true });
    c.drawImage(image, index % 4 * sw, Math.floor(index / 4) * sh, sw, sh, 0, 0, sw, sh);
    const pixels = c.getImageData(0, 0, sw, sh);
    let left = sw, top = sh, right = 0, bottom = 0;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      if (pixels.data[(y * sw + x) * 4 + 3] > 40) {
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
    const out = document.createElement('canvas');
    out.width = right - left + 1; out.height = bottom - top + 1;
    out.getContext('2d').drawImage(cell, left, top, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  function shadow(x, y, rx, ry, opacity = .25) {
    ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, `rgba(40,30,16,${opacity})`);
    gradient.addColorStop(1, 'rgba(40,30,16,0)');
    ctx.fillStyle = gradient; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
  }

  function background(t) {
    const drift = reducedMotion ? 0 : Math.sin(t * .13) * 2;
    const scale = Math.max(W / art.garden.width, H / art.garden.height) * 1.025;
    const width = art.garden.width * scale, height = art.garden.height * scale;
    paint(art.garden, (W - width) / 2 + drift, (H - height) / 2, width, height);
    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, '#fff4c30a'); shade.addColorStop(.45, '#ffce6e09');
    shade.addColorStop(1, '#422d1f25'); ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const beam = ctx.createLinearGradient(0, 0, 600, 950);
    beam.addColorStop(0, '#ffe4ab25'); beam.addColorStop(1, '#ffe4ab00');
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(210, 0);
    ctx.lineTo(770, 1150); ctx.lineTo(300, 1200); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function excavator(t) {
    const cycle = t % 12, work = cycle < 8;
    const travel = smooth((cycle - 8) / 2) - smooth((cycle - 10) / 2);
    const x = 495 + travel * 35, y = 969 + Math.sin(t * 1.6) * 1.1;
    const bodyW = 205, bodyH = bodyW * parts[0].height / parts[0].width;
    const p = t * .72, a = -.83 + Math.sin(p) * .31;
    const b = .68 + Math.sin(p + .8) * .39;
    shadow(x + 110, y + bodyH, 138, 19, .27);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.1) * .0025);
    paint(parts[0], 0, 0, bodyW, bodyH);
    const headW = bodyW * .41, headH = headW * parts[5].height / parts[5].width;
    const headX = bodyW * .255 + Math.sin(t * .42) * 1.7;
    const headY = bodyH * .085 + Math.sin(t * .8) * .7;
    paint(parts[5], headX, headY, headW, headH);
    const blink = pulse(t % 5.9, 3.4, .14);
    if (blink > 0) {
      ctx.save(); ctx.globalAlpha = blink;
      // Only eyelids change; the silhouette and position remain identical.
      ctx.beginPath(); ctx.ellipse(headX + headW * .52, headY + headH * .58, headW * .36, headH * .11, 0, 0, TAU); ctx.clip();
      paint(parts[7], headX, headY, headW, headH); ctx.restore();
    }
    ctx.restore();
    const pivot = { x: x + bodyW * .86, y: y + bodyH * .62 };
    const l1 = 112, l2 = 108;
    function arm(index, at, angle, length) {
      const part = parts[index], h = length * 1.12 * part.height / part.width;
      ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(angle);
      paint(part, -length * .06, -h * .5, length * 1.12, h); ctx.restore();
    }
    arm(1, pivot, a, l1);
    const joint = { x: pivot.x + Math.cos(a) * l1, y: pivot.y + Math.sin(a) * l1 };
    arm(2, joint, b, l2);
    const tip = { x: joint.x + Math.cos(b) * l2, y: joint.y + Math.sin(b) * l2 };
    ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(-.30 + Math.sin(p + 1.3) * .38);
    paint(parts[3], -29, -10, 91); ctx.restore();
    if (work && Math.sin(p + 1.3) > .65) {
      for (let i = 0; i < 7; i++) {
        const fall = ((t * 1.3 + i * .143) % 1);
        const px = tip.x - 20 + i * 4 + Math.sin(i * 3) * fall * 18;
        const py = tip.y + 55 + fall * 95;
        ctx.save(); ctx.globalAlpha = Math.sin(fall * Math.PI) * .8;
        ctx.fillStyle = '#96602d'; ctx.beginPath(); ctx.ellipse(px, py, 3, 4, fall * 4, 0, TAU); ctx.fill(); ctx.restore();
      }
    }
  }

  function pug(t) {
    const breath = Math.sin(t * 1.65), cycle = t % 18;
    const look = smooth((cycle - 4) / 1.4) - smooth((cycle - 8) / 1.6);
    const tilt = smooth((cycle - 11) / 1.3) - smooth((cycle - 14.5) / 1.5);
    const wag = pulse(cycle, 12.8, 2.8);
    const blink = Math.max(pulse(t % 5.6, 2.9, .16), pulse(t % 11.2, 9.1, .13));
    shadow(297, 1268, 249, 40, .37);
    ctx.save(); ctx.translate(140, 1105); ctx.rotate(-.16 + Math.sin(t * 7) * .13 * wag);
    paint(art.tail, -105, -83, 145); ctx.restore();
    // Feet stay planted while the chest expands gently.
    ctx.save(); ctx.translate(312, 1268); ctx.scale(1 + breath * .006, 1 + breath * .009);
    paint(art.body, -220, -442, 440, 442); ctx.restore();
    ctx.save(); ctx.translate(326 + look * 5, 887 - breath * 2.7);
    ctx.rotate(-.018 + Math.sin(t * .56) * .016 + tilt * .11 - look * .045);
    ctx.scale(1 - look * .025, 1);
    const x = -200, y = -282, width = 407, height = width * art.head.height / art.head.width;
    paint(art.head, x, y, width, height);
    if (blink > 0) {
      ctx.save(); ctx.globalAlpha = blink;
      // Each eyelid has a fitted local mask. No full-frame dissolves.
      ctx.beginPath();
      ctx.ellipse(x + width * .405, y + height * .465, width * .078, height * .066, -.16, 0, TAU);
      ctx.ellipse(x + width * .779, y + height * .404, width * .065, height * .073, -.15, 0, TAU);
      ctx.clip(); paint(art.blink, x + 5, y + 10, width - 9, height - 12); ctx.restore();
    }
    ctx.restore();
  }

  function particles(t) {
    ctx.save();
    for (let i = 0; i < 31; i++) {
      const x = (i * 179.33 + Math.sin(t * .24 + i) * 24) % W;
      const y = (i * 137.21 - t * (5 + i % 4) + H * 100) % H;
      ctx.globalAlpha = (.12 + .14 * Math.sin(t * .7 + i)) * (1 - y / H * .55);
      ctx.fillStyle = '#ffedba'; ctx.beginPath(); ctx.arc(x, y, 1.5 + i % 3 * .5, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // A small visitor follows a smooth path; its wings are continuous curves.
    const b = (t % 24) / 24;
    if (b < .4) {
      const u = b / .4, x = -80 + u * 1100, y = 550 + Math.sin(u * Math.PI * 2) * 58;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(u * 10) * .16);
      const flap = .15 + Math.abs(Math.sin(t * 11)) * .85;
      ctx.scale(flap, 1);
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#edb94b'; ctx.beginPath(); ctx.ellipse(side * 11, -5, 13, 18, side * -.4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8c643b'; ctx.beginPath(); ctx.ellipse(side * 10, 5, 9, 10, side * .2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  function draw(t) {
    const scale = canvas.height / H;
    const visibleWidth = canvas.width / scale;
    const narrow = clamp((W - visibleWidth) / 170);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - W * scale) / 2, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    background(t);
    ctx.save(); ctx.translate(-narrow * 95, 0); excavator(t); ctx.restore();
    ctx.save(); ctx.translate(-narrow * 20, 0);
    shadow(650, 1273, 177, 32, .3);
    paint(art.food, 498, 1082, 307);
    ctx.restore();
    ctx.save(); ctx.translate(narrow * 35, 0); pug(t); ctx.restore();
    particles(t);
    const vignette = ctx.createRadialGradient(420, 850, 400, 450, 800, 1030);
    vignette.addColorStop(0, '#271b0b00'); vignette.addColorStop(1, '#271b0b36');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
  }

  function animate(now) {
    if (!started) started = now;
    const t = stillFrame !== null && Number.isFinite(Number(stillFrame)) ? Number(stillFrame) : reducedMotion ? 0 : elapsed + (now - resumed) / 1000;
    draw(t); raf = requestAnimationFrame(animate);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { elapsed += (performance.now() - resumed) / 1000; cancelAnimationFrame(raf); }
    else { resumed = performance.now(); raf = requestAnimationFrame(animate); }
  });
  Promise.all(['garden', 'body', 'head', 'blink', 'tail', 'food', 'helper'].map(name => new Promise((resolve, reject) => {
    const im = new Image(); im.onload = () => { art[name] = im; resolve(); };
    im.onerror = () => reject(new Error(name)); im.src = name + '.webp';
  }))).then(() => {
    for (let i = 0; i < 8; i++) parts[i] = piece(art.helper, i);
    resize(); resumed = performance.now();
    document.querySelector('#loading').classList.add('ready');
    raf = requestAnimationFrame(animate);
  }).catch(() => { document.querySelector('#loading').textContent = 'Не удалось загрузить сцену. Обнови страницу.'; });
})();
