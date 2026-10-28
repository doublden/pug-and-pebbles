(function (root) {
  'use strict';

  // Mounts describe the *wearing opening*, excluding ears, tassels and handles.
  // They are measured in each isolated atlas figure, not in the whole grid cell.
  // A rig supplies world-space skull crown + skull width; every pose shares this contract.
  const FITS = Object.freeze({
    carrot: [
      [0.5, 0.91, 1],
      [0.5, 0.91, 1],
      [0.5, 0.96, 1],
    ],
    frog: [
      [0.5, 0.92, 1],
      [0.5, 0.91, 1],
      [0.5, 0.96, 1],
    ],
    snowflake: [
      [0.5, 0.91, 1],
      [0.5, 0.9, 1],
      [0.5, 0.95, 1],
    ],
    bunny: [
      [0.5, 0.88, 0.83],
      [0.53, 0.88, 0.82],
      [0.5, 0.94, 0.83],
    ],
    ushanka: [
      [0.5, 0.66, 0.78],
      [0.62, 0.65, 0.72],
      [0.5, 0.72, 0.78],
    ],
    cap: [
      [0.5, 0.93, 1],
      [0.65, 0.93, 0.74],
      [0.5, 0.75, 0.98],
    ],
    pirate: [
      [0.5, 0.91, 0.92],
      [0.58, 0.91, 0.88],
      [0.5, 0.92, 0.94],
    ],
    umbrella: [
      [0.5, 0.93, 0.94],
      [0.51, 0.93, 0.94],
      [0.5, 0.94, 0.94],
    ],
    pan: [
      [0.38, 0.91, 0.7],
      [0.64, 0.94, 0.72],
      [0.5, 0.73, 0.92],
    ],
    nightcap: [
      [0.42, 0.92, 0.82],
      [0.42, 0.92, 0.82],
      [0.43, 0.94, 0.82],
    ],
    poop: [
      [0.5, 0.94, 1],
      [0.5, 0.94, 1],
      [0.5, 0.95, 1],
    ],
    yogurt: [
      [0.5, 0.94, 1],
      [0.5, 0.94, 1],
      [0.5, 0.94, 1],
    ],
    butterfly: [
      [0.5, 0.94, 0.91],
      [0.5, 0.94, 0.91],
      [0.5, 0.95, 0.91],
    ],
    bee: [
      [0.5, 0.94, 0.87],
      [0.5, 0.94, 0.87],
      [0.5, 0.95, 0.87],
    ],
  });
  const VIEWS = Object.freeze(['front', 'side', 'back']);
  const VIEW_POSE = Object.freeze({ front: 'idle', side: 'back', back: 'rear' });
  function viewFor(pose, mount = {}) {
    pose = String(pose || 'idle');
    if (VIEWS.includes(mount.perspective)) return mount.perspective;
    if (pose === 'rear') return 'back';
    return pose.includes('back') || pose.includes('left') ? 'side' : 'front';
  }
  function layout(id, mount, pose, frame) {
    if (
      !FITS[id] ||
      !mount ||
      !frame ||
      ![mount.x, mount.y, mount.w].every(Number.isFinite) ||
      mount.w <= 0
    )
      return null;
    const view = viewFor(pose || 'idle', mount);
    const [mx, my, span] = FITS[id][VIEWS.indexOf(view)];
    const width = (mount.w * 1.045) / span;
    const height = (width * frame.h) / frame.w;
    const angle = Number.isFinite(mount.tilt) ? mount.tilt : 0;
    const mirror = mount.mirror ? -1 : 1;
    const drop = mount.w * 0.014;
    const x = mount.x - Math.sin(angle) * drop,
      y = mount.y + Math.cos(angle) * drop;
    const point = (lx, ly) => ({
      x: x + lx * mirror * Math.cos(angle) - ly * Math.sin(angle),
      y: y + lx * mirror * Math.sin(angle) + ly * Math.cos(angle),
    });
    return {
      id,
      view,
      x,
      y,
      width,
      height,
      angle,
      mirror,
      left: -width * mx,
      top: -height * my,
      mount: { x: mx, y: my, span },
      topPoint: point(width * (0.5 - mx), -height * my),
      bandPoint: point(0, 0),
      bounds: [
        point(-width * mx, -height * my),
        point(width * (1 - mx), -height * my),
        point(width * (1 - mx), height * (1 - my)),
        point(-width * mx, height * (1 - my)),
      ],
    };
  }
  function draw(ctx, id, mount, pose, now, extras) {
    const view = viewFor(pose || 'idle', mount);
    const frame = extras.hatFrame(id, VIEW_POSE[view]);
    const fit = layout(id, mount, pose, frame);
    if (!fit) return null;
    ctx.save();
    ctx.translate(fit.x, fit.y);
    ctx.rotate(fit.angle);
    ctx.scale(fit.mirror, 1);
    // A small contact shadow seats the band without darkening the eyes or muzzle.
    ctx.save();
    ctx.globalAlpha *= 0.12;
    ctx.fillStyle = '#342c23';
    ctx.beginPath();
    ctx.ellipse(0, 0, mount.w * 0.37, mount.w * 0.025, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(
      frame.canvas,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      fit.left,
      fit.top,
      fit.width,
      fit.height,
    );
    if (id === 'umbrella' && !extras.world.reduced) {
      ctx.save();
      ctx.lineWidth = Math.max(0.9, mount.w * 0.006);
      ctx.strokeStyle = '#d9f5f8';
      const rainAlpha = ctx.globalAlpha;
      for (let i = 0; i < 9; i++) {
        const p = (now / 620 + i / 9) % 1;
        const x = fit.left + (fit.width * (i + 0.5)) / 9;
        const y = fit.top - mount.w * 0.18 + p * mount.w * 0.17;
        ctx.globalAlpha = rainAlpha * (1 - p);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - mount.w * 0.008, y + mount.w * 0.023);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (id === 'yogurt') {
      ctx.save();
      ctx.lineWidth = Math.max(1, mount.w * 0.009);
      const rainbowY = fit.top - mount.w * 0.04;
      ['#fa706e', '#ffd44f', '#80dcb0', '#6dc5fa', '#c398fa'].forEach((color, i) => {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(0, rainbowY, mount.w * (0.29 + i * 0.012), Math.PI, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha *= 0.4 + 0.6 * Math.abs(Math.sin(now / 380));
      ctx.fillStyle = '#fff4b8';
      ctx.font = `${Math.max(9, mount.w * 0.09)}px system-ui`;
      ctx.fillText('✦', mount.w * 0.28, rainbowY - mount.w * 0.12);
      ctx.restore();
    }
    ctx.restore();
    return fit;
  }
  const api = Object.freeze({ FITS, VIEWS, VIEW_POSE, viewFor, layout, draw });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatAttachmentsV9 = api;
})(typeof window !== 'undefined' ? window : globalThis);
