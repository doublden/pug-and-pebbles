(function () {
  'use strict';
  class MiniUI {
    constructor(options) {
      Object.assign(this, options);
      this.$ = (id) => document.getElementById(id);
      this.active = null;
      this.fur = [];
      this.pointer = null;
      this.previous = performance.now();
      this.$('minigames-open').onclick = () => {
        this.renderMenu();
        this.$('minigames-dialog').showModal();
      };
      this.$('minigames-close').onclick = () => this.$('minigames-dialog').close();
      this.$('mini-menu').onclick = (e) => {
        const button = e.target.closest('[data-mini]');
        if (button && !button.disabled) this.start(button.dataset.mini);
      };
      for (const id of ['mini-exit', 'mini-done']) this.$(id).onclick = () => this.close();
      this.$('mini-dialog').addEventListener('cancel', (e) => {
        e.preventDefault();
        this.close();
      });
      const canvas = this.$('mini-canvas');
      canvas.onpointerdown = (e) => {
        if (this.active?.kind !== 'brush') return;
        this.pointer = e.pointerId;
        canvas.setPointerCapture(e.pointerId);
        this.move(e);
      };
      canvas.onpointermove = (e) => {
        if (e.pointerId === this.pointer) this.move(e);
      };
      canvas.onpointerup = canvas.onpointercancel = (e) => {
        this.pointer = null;
        this.active?.simulation.release?.();
      };
      for (const button of document.querySelectorAll('[data-lane]'))
        button.onpointerdown = (e) => {
          e.preventDefault();
          this.choose(Number(button.dataset.lane));
        };
      for (const button of document.querySelectorAll('[data-lane]'))
        button.onclick = (e) => {
          if (e.detail === 0) this.choose(Number(button.dataset.lane));
        };
      addEventListener('keydown', (e) => {
        if (
          this.$('mini-dialog').open &&
          this.active?.kind === 'catch' &&
          ['1', '2', '3', '4'].includes(e.key)
        ) {
          e.preventDefault();
          this.choose(Number(e.key) - 1);
        }
      });
    }
    renderMenu() {
      const w = this.words(),
        game = this.getGame();
      this.$('mini-menu').innerHTML =
        `<p class="collection-note">${w.miniLimit}</p>` +
        ['brush', 'catch']
          .map((kind) => {
            const status = game.miniStatus(kind),
              limit = kind === 'brush' ? 30 : 20;
            return `<article class="mini-card"><h2>${w[kind === 'brush' ? 'brush' : 'catchFood']}</h2><p>${w.reward}: ≤ ${this.format(game.getState().power.multiply(limit * game.hatEffect(kind)))} · ${status.seconds ? w.cooldown + ' ' + Math.ceil(status.seconds / 60) + ' ' + w.minutes : ''}</p><button class="setting-action" data-mini="${kind}" ${!status.unlocked || status.seconds ? 'disabled' : ''}>${w.start}</button></article>`;
          })
          .join('');
    }
    start(kind) {
      const game = this.getGame();
      if (!game.beginMini(kind)) return;
      this.changed();
      this.$('minigames-dialog').close();
      const w = this.words();
      this.active = {
        kind,
        simulation: kind === 'brush' ? PugMinigames.brush() : PugMinigames.catcher(),
        finished: false,
      };
      this.fur = [];
      this.pointer = null;
      this.$('mini-title').textContent = w[kind === 'brush' ? 'brush' : 'catchFood'];
      this.$('mini-help').textContent = w[kind === 'brush' ? 'brushHelp' : 'catchHelp'];
      this.$('catch-controls').hidden = kind !== 'catch';
      this.$('mini-result').hidden = true;
      this.$('mini-dialog').showModal();
      this.resize();
      this.previous = performance.now();
      this.sound.unlock();
    }
    close() {
      this.getGame().cancelMini();
      this.active = null;
      this.pointer = null;
      this.fur = [];
      this.$('mini-dialog').close();
      this.changed();
    }
    resize() {
      const canvas = this.$('mini-canvas'),
        box = canvas.parentElement.getBoundingClientRect();
      this.width = box.width;
      this.height = box.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (
        canvas.width !== Math.round(box.width * dpr) ||
        canvas.height !== Math.round(box.height * dpr)
      ) {
        canvas.width = Math.round(box.width * dpr);
        canvas.height = Math.round(box.height * dpr);
      }
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    move(e) {
      if (!this.active || this.active.finished) return;
      const box = this.$('mini-canvas').getBoundingClientRect(),
        x = e.clientX - box.left,
        y = e.clientY - box.top;
      if (this.active.simulation.move(x, y, performance.now(), box.width, box.height)) {
        for (let i = 0; i < 3; i++)
          this.fur.push({
            x,
            y,
            start: performance.now(),
            vx: (Math.random() - 0.5) * 80,
            vy: 20 + Math.random() * 90,
            r: 3 + Math.random() * 3,
          });
        this.fur = this.fur.slice(-120);
      }
    }
    choose(lane) {
      if (this.active?.kind === 'catch' && !this.active.finished) {
        this.active.simulation.select(lane);
        this.sound.play('dig');
      }
    }
    tick(now) {
      if (!this.$('mini-dialog').open || !this.active) return;
      this.resize();
      const delta = document.hidden ? 0 : Math.max(0, now - this.previous);
      this.previous = now;
      const a = this.active,
        w = this.words();
      const state = a.finished ? a.state : a.simulation.tick(delta);
      a.state = state;
      const score = a.kind === 'brush' ? a.simulation.score(this.width) : state.score;
      this.$('mini-score').textContent =
        a.kind === 'brush' ? Math.floor(score * 100) + '%' : state.caught + ' / 24';
      this.$('mini-clock').textContent =
        a.kind === 'brush' ? state.seconds + 's' : w.misses + ': ' + state.missed + ' / 3';
      for (const b of document.querySelectorAll('[data-lane]'))
        b.classList.toggle('active', Number(b.dataset.lane) === state.lane);
      this.draw(now, state, score);
      if (state.done && !a.finished) {
        a.finished = true;
        const amount = this.getGame().finishMini(a.kind, score, state.perfect);
        this.$('mini-result').hidden = false;
        this.$('mini-reward').textContent = w.reward + ': +' + this.format(amount);
        this.sound.play('buy');
        this.changed();
      }
    }
    draw(now, s, score) {
      const canvas = this.$('mini-canvas'),
        c = canvas.getContext('2d'),
        w = this.width,
        h = this.height;
      c.clearRect(0, 0, w, h);
      if (this.active.kind === 'brush') {
        const size = Math.min(w * 0.94, h * 0.9);
        this.world.dog(
          c,
          this.getGame().getState().pugStage,
          'idle',
          (w - size) / 2,
          (h - size) / 2,
          size,
        );
        this.fur = this.fur.filter((f) => now - f.start < 1300);
        for (const f of this.fur) {
          const p = (now - f.start) / 1300;
          c.save();
          c.globalAlpha = 1 - p;
          c.translate(f.x + f.vx * p, f.y + f.vy * p + 70 * p * p);
          c.rotate(p * 5);
          c.strokeStyle = '#cabca6';
          c.lineWidth = f.r;
          c.beginPath();
          c.moveTo(-3, -5);
          c.quadraticCurveTo(4, 0, -1, 8);
          c.stroke();
          c.restore();
        }
        return;
      }
      const points = [
        { x: w * 0.37, y: h * 0.36 },
        { x: w * 0.63, y: h * 0.36 },
        { x: w * 0.37, y: h * 0.75 },
        { x: w * 0.63, y: h * 0.75 },
      ];
      c.strokeStyle = '#9ca67d';
      c.lineWidth = 7;
      for (let i = 0; i < 4; i++) {
        const end = points[i],
          left = i % 2 === 0,
          startX = left ? w * 0.04 : w * 0.96,
          startY = end.y - h * 0.2;
        c.beginPath();
        c.moveTo(startX, startY);
        c.lineTo(end.x, end.y);
        c.stroke();
      }
      const size = Math.min(w * 0.5, h * 0.45);
      this.world.dog(c, this.getGame().getState().pugStage, 'idle', (w - size) / 2, h * 0.4, size);
      for (const item of s.items) {
        const end = points[item.lane],
          left = item.lane % 2 === 0,
          x = (left ? w * 0.04 : w * 0.96) + (end.x - (left ? w * 0.04 : w * 0.96)) * item.p,
          y = end.y - h * 0.2 + h * 0.2 * item.p;
        c.save();
        c.translate(x, y);
        c.rotate(item.p * 7);
        c.fillStyle = '#a17148';
        c.strokeStyle = '#734b30';
        c.lineWidth = 2;
        c.beginPath();
        c.roundRect(-6, -6, 12, 12, 4);
        c.fill();
        c.stroke();
        c.restore();
      }
      const p = points[s.lane];
      c.fillStyle = '#879d8b';
      c.strokeStyle = '#56664f';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(p.x - 23, p.y + 8);
      c.lineTo(p.x + 23, p.y + 8);
      c.lineTo(p.x + 15, p.y + 25);
      c.lineTo(p.x - 15, p.y + 25);
      c.closePath();
      c.fill();
      c.stroke();
    }
  }
  window.PugMiniUI = MiniUI;
})();
