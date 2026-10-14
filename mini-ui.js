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
        if (!this.active || this.active.finished || this.pointer !== null) return;
        if (this.active.kind === 'match') {
          const box = canvas.getBoundingClientRect(), g = this.matchGrid();
          const x = e.clientX - box.left, y = e.clientY - box.top;
          const col = Math.floor((x - g.x) / g.cell), row = Math.floor((y - g.y) / g.cell);
          if (col < 0 || col > 5 || row < 0 || row > 5) return;
          e.preventDefault();
          const index = row * 6 + col;
          this.swipeStart = { index, x, y, previous: this.selected, moved: false };
          this.selected = index;
          this.pointer = e.pointerId;
          canvas.setPointerCapture(e.pointerId);
        } else if (this.active.kind === 'brush') {
          this.pointer = e.pointerId;
          canvas.setPointerCapture(e.pointerId);
          this.move(e);
        }
      };
      canvas.onpointermove = (e) => {
        if (e.pointerId !== this.pointer || this.active?.finished) return;
        if (this.active?.kind === 'match' && this.swipeStart) {
          const box = canvas.getBoundingClientRect(), g = this.matchGrid(), a = this.swipeStart;
          const dx = e.clientX - box.left - a.x, dy = e.clientY - box.top - a.y;
          if (!a.moved && Math.max(Math.abs(dx), Math.abs(dy)) > g.cell * 0.25) {
            a.moved = true;
            const horizontal = Math.abs(dx) > Math.abs(dy);
            const col = a.index % 6 + (horizontal ? Math.sign(dx) : 0);
            const row = Math.floor(a.index / 6) + (horizontal ? 0 : Math.sign(dy));
            if (col >= 0 && col < 6 && row >= 0 && row < 6 && this.active.simulation.swap(a.index, row * 6 + col)) this.sound.play('dig');
            this.selected = null;
          }
        } else this.move(e);
      };
      canvas.onpointerup = (e) => {
        if (e.pointerId !== this.pointer) return;
        const a = this.swipeStart;
        if (this.active?.kind === 'match' && !this.active.finished && a && !a.moved && a.previous !== null && a.previous !== a.index) {
          if (this.active.simulation.swap(a.previous, a.index)) { this.selected = null; this.sound.play('dig'); }
        }
        this.releasePointer(e);
      };
      canvas.onpointercancel = (e) => {
        if (e.pointerId !== this.pointer) return;
        this.selected = null;
        this.releasePointer(e);
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
    releasePointer(e) {
      const canvas = this.$('mini-canvas');
      if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      this.pointer = null;
      this.swipeStart = null;
      this.active?.simulation.release?.();
    }
    renderMenu() {
      const w = this.words(),
        game = this.getGame();
      this.$('mini-menu').innerHTML =
        `<p class="collection-note">${w.miniLimit}</p>` +
        ['brush', 'catch', 'match']
          .map((kind) => {
            const status = game.miniStatus(kind),
              limit = game.miniRewardLimit(kind);
            return `<article class="mini-card"><canvas class="mini-art" data-mini-art="${kind}" width="420" height="150" aria-hidden="true"></canvas><h2>${w[kind === 'brush' ? 'brush' : kind === 'match' ? 'match3' : 'catchFood']}</h2><p>${w[kind === 'brush' ? 'brushMenu' : kind === 'catch' ? 'catchMenu' : 'matchMenu']}</p><p>${w.reward}: ≤ ${this.format(limit)} · <span data-mini-wait="${kind}">${status.seconds ? w.cooldown + ' ' + Math.floor(status.seconds / 60) + ':' + String(status.seconds % 60).padStart(2, '0') : ''}</span></p><button class="setting-action" data-mini="${kind}" ${!status.unlocked || status.seconds ? 'disabled' : ''}>${w.start}</button></article>`;
          })
          .join('');
      for (const canvas of document.querySelectorAll('[data-mini-art]')) {
        const c = canvas.getContext('2d'),
          kind = canvas.dataset.miniArt;
        c.fillStyle = '#dce3ca';
        c.fillRect(0, 0, 420, 150);
        if (kind !== 'match') {
          this.world.dog(c, this.getGame().getState().pugStage, 'idle', 40, 5, 150);
          c.font = '65px system-ui';
          c.fillText(kind === 'brush' ? '🪮' : '🥣', 260, 115);
          if (kind === 'catch') {
            c.font = '28px system-ui';
            c.fillText('🦴', 310, 38);
          }
        } else {
          c.font = '36px system-ui';
          for (let i = 0; i < 9; i++)
            c.fillText(['🦴', '🎾', '🧸'][i % 3], 140 + (i % 3) * 50, 45 + Math.floor(i / 3) * 45);
        }
      }
    }
    updateMenu() {
      for (const kind of ['brush', 'catch', 'match']) {
        const s = this.getGame().miniStatus(kind),
          wait = document.querySelector(`[data-mini-wait="${kind}"]`),
          button = document.querySelector(`[data-mini="${kind}"]`);
        if (wait)
          wait.textContent = s.seconds
            ? this.words().cooldown +
              ' ' +
              Math.floor(s.seconds / 60) +
              ':' +
              String(s.seconds % 60).padStart(2, '0')
            : '';
        if (button) button.disabled = !s.unlocked || !!s.seconds;
      }
    }
    start(kind) {
      const game = this.getGame();
      if (!game.beginMini(kind)) return;
      this.changed();
      this.$('minigames-dialog').close();
      const w = this.words();
      this.active = {
        kind,
        simulation:
          kind === 'brush'
            ? PugMinigames.brush(game.hatEffect('brush'))
            : kind === 'match'
              ? PugMinigames.match3()
              : PugMinigames.catcher(Math.random, game.hatEffect('catch')),
        finished: false,
      };
      this.fur = [];
      this.selected = null;
      this.swipeStart = null;
      this.pointer = null;
      this.$('mini-title').textContent =
        w[kind === 'brush' ? 'brush' : kind === 'match' ? 'match3' : 'catchFood'];
      this.$('mini-help').textContent =
        w[kind === 'brush' ? 'brushHelp' : kind === 'match' ? 'matchHelp' : 'catchHelp'];
      this.$('catch-controls').hidden = kind !== 'catch';
      this.$('mini-result').hidden = true;
      this.$('mini-dialog').dataset.kind = kind;
      this.$('mini-dialog').showModal();
      this.resize();
      this.previous = performance.now();
      this.sound.unlock();
    }
    close(notify = true) {
      this.getGame().cancelMini();
      this.active = null;
      this.pointer = null;
      this.fur = [];
      this.$('mini-dialog').close();
      if (notify) this.changed();
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
      if (this.$('minigames-dialog').open && (!this.lastMenu || now - this.lastMenu > 1000)) {
        this.lastMenu = now;
        this.updateMenu();
      }
      if (!this.$('mini-dialog').open || !this.active) return;
      if (this.lastDraw && now - this.lastDraw < 30) return;
      this.lastDraw = now;
      this.resize();
      const delta = document.hidden || !this.isActive() ? 0 : Math.max(0, now - this.previous);
      this.previous = now;
      const a = this.active,
        w = this.words();
      const state = a.finished ? a.state : a.simulation.tick(delta);
      a.state = state;
      const score = a.kind === 'brush' ? a.simulation.score(this.width) : state.score;
      this.$('mini-score').textContent =
        a.kind === 'brush'
          ? Math.floor(score * 100) + '%'
          : a.kind === 'match'
            ? state.points + ' / 90'
            : state.caught + ' / 24';
      this.$('mini-clock').textContent =
        a.kind !== 'catch' ? state.seconds + 's' : state.seconds + 's · ' + w.misses + ': ' + state.missed + ' / 3';
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
    matchGrid() {
      const cell = Math.min(this.width * 0.96, this.height * 0.94) / 6;
      return { cell, x: (this.width - cell * 6) / 2, y: (this.height - cell * 6) / 2 };
    }
    draw(now, s, score) {
      const canvas = this.$('mini-canvas'),
        c = canvas.getContext('2d'),
        w = this.width,
        h = this.height;
      c.clearRect(0, 0, w, h);
      if (this.active.kind === 'match') {
        const g = this.matchGrid(),
          art = ['🦴', '🎾', '🧸', '🐾', '🥣'];
        for (let i = 0; i < 36; i++) {
          const x = g.x + (i % 6) * g.cell,
            y = g.y + Math.floor(i / 6) * g.cell;
          c.fillStyle = i === this.selected ? '#f2ce70' : (Math.floor(i / 6) + i % 6) % 2 ? '#fff5da' : '#f1e5c7';
          c.beginPath();
          c.roundRect(x + 2, y + 2, g.cell - 4, g.cell - 4, 8);
          c.fill();
          c.strokeStyle = i === this.selected ? '#966428' : '#a5a07c';
          c.lineWidth = i === this.selected ? 3 : 1.5;
          c.stroke();
          const p = s.animation?.cells.includes(i) ? s.animation.p : 0;
          c.save();
          c.globalAlpha = 1 - p;
          c.translate(x + g.cell / 2, y + g.cell / 2);
          c.scale(1 - p * 0.5, 1 - p * 0.5);
          c.font = `${g.cell * 0.55}px system-ui`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(art[s.board[i]], 0, 0);
          c.restore();
        }
        return;
      }
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
