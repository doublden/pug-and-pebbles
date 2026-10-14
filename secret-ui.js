(function () {
  'use strict';
  class SecretsUI {
    constructor(options) {
      Object.assign(this, options);
      this.buttons = new Map();
    }
    tick(delta, playing) {
      const g = this.getGame(),
        s = g.getState(),
        result = g.tickGuests(
          delta,
          playing && (s.clicks >= 30 || s.testMode),
          this.world.scene.guestReady(),
        );
      this.world.scene.actors = playing ? result.actors : [];
      const ids = new Set(result.actors.map((a) => a.id));
      for (const [id, b] of this.buttons)
        if (!ids.has(id)) {
          b.remove();
          this.buttons.delete(id);
        }
      for (const a of result.actors) {
        let b = this.buttons.get(a.id);
        if (!b) {
          b = document.createElement('button');
          b.className = 'guest-target';
          b.innerHTML = '<canvas aria-hidden="true"></canvas>';
          b.addEventListener('pointerdown', (e) => {
            if (e.button === 0) {
              e.preventDefault();
              this.claim(a.id);
            }
          });
          b.addEventListener('click', (e) => {
            if (e.detail === 0) this.claim(a.id);
          });
          document.getElementById('app').append(b);
          this.buttons.set(a.id, b);
        }
        b.hidden = !playing;
        const p = PugGuests.position(a, this.world.w, this.world.h);
        b.style.left = p.x + 'px';
        b.style.top = p.y + 'px';
        b.style.width = p.size + 'px';
        b.style.height = p.size + 'px';
        b.style.transform = `translate(-50%,-50%) rotate(${p.angle}rad)`;
        b.ariaLabel = this.words().guestNames[PugGuests.GUESTS.indexOf(a.kind)];
        this.world.scene.drawGuest(b.firstChild, a);
      }
      this.sound.setYuppi(playing && result.actors.some((a) => a.kind === 'yuppi'));
      if (result.spawned.length) this.changed();
    }
    claim(id) {
      if (!this.canPlay()) return;
      const a = this.world.scene.actors.find((a) => a.id === id);
      if (!a) return;
      const r = this.getGame().claimGuest(id);
      if (!r) return;
      const p = PugGuests.position(a, this.world.w, this.world.h);
      this.world.scene.burst(a, p, r.caught);
      this.sound.unlock();
      this.sound.play(r.caught ? 'gold' : 'poof');
      if (r.amount.m) this.world.dig('paw', '+' + this.format(r.amount), p.x, p.y);
      if (r.caught) this.toast(r.test ? this.words().testMode : this.words().yuppiCaught);
      if (r.kind !== 'yuppi' || r.caught) {
        this.buttons.get(id)?.remove();
        this.buttons.delete(id);
        this.world.scene.actors = this.world.scene.actors.filter((a) => a.id !== id);
      }
      this.changed();
    }
    clear() {
      for (const b of this.buttons.values()) b.remove();
      this.buttons.clear();
      this.world.scene.clear();
      this.sound.setYuppi(false);
    }
    render(kind, rebuild) {
      const game = this.getGame(),
        s = game.getState(),
        w = this.words(),
        c = document.getElementById('shop-content');
      if (kind === 'beds') {
        if (rebuild || !c.querySelector('#bed-grid'))
          c.innerHTML = `<p class="collection-note">${w.bedRule}</p><button class="setting-action" data-bed-remove>${w.noBed}</button><div class="tool-grid" id="bed-grid">${PugGuests.BEDS.map((b, i) => `<article class="tool-card"><canvas width="220" height="140" id="bed-art-${i}" class="bed-art"></canvas><h2 id="bed-name-${i}"></h2><p class="collection-note" id="bed-description-${i}"></p><button class="purchase-button" data-bed="${b.id}" id="bed-buy-${i}"></button></article>`).join('')}</div>`;
        PugGuests.BEDS.forEach((b, i) => {
          const owned = s.beds.includes(b.id),
            awardLocked = !!b.award && !owned,
            secret = awardLocked && !s.hiddenRevealed,
            button = document.getElementById('bed-buy-' + i),
            canvas = document.getElementById('bed-art-' + i),
            ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, 220, 140);
          document.getElementById('bed-name-' + i).textContent = secret ? '???' : w.bedNames[i];
          document.getElementById('bed-description-' + i).textContent = secret
            ? w.bedHints[i - 6]
            : w.bedDescriptions[i];
          button.textContent = owned
            ? s.bed === b.id
              ? w.equipped
              : w.wear
            : awardLocked
              ? w.secret
              : w.buy + ' · ' + this.format(b.cost);
          button.disabled =
            awardLocked || (!owned && (s.home < b.home || s.balance.compare(b.cost) < 0));
          if (secret) {
            ctx.font = '60px Georgia';
            ctx.fillStyle = '#77745b';
            ctx.textAlign = 'center';
            ctx.fillText('?', 110, 100);
          } else {
            const f = this.world.extras.frame('beds', i, 3, 3);
            if (f) {
              const scale = Math.min(210 / f.w, 130 / f.h);
              ctx.drawImage(
                f.canvas,
                f.x,
                f.y,
                f.w,
                f.h,
                (220 - f.w * scale) / 2,
                (140 - f.h * scale) / 2,
                f.w * scale,
                f.h * scale,
              );
            }
          }
        });
      } else {
        const key = JSON.stringify([w.album, s.guestStats, this.world.artRevision]);
        if (!rebuild && this.albumKey === key && c.querySelector('.guest-album')) return;
        this.albumKey = key;
        c.innerHTML = `<p class="collection-note">${w.albumRule}</p><div class="tool-grid guest-album">${PugGuests.GUESTS.map(
          (id, i) => {
            const v = s.guestStats[id];
            return `<article class="tool-card"><div class="guest-portrait ${v.seen ? '' : 'unknown'}"><canvas width="256" height="256" id="album-${id}" aria-hidden="true"></canvas>${v.seen ? '' : '<span>?</span>'}</div><h2>${v.seen ? w.guestNames[i] : '???'}</h2><p>${w.seen}: ${v.seen} · ${w.caught}: ${v.caught}</p></article>`;
          },
        ).join('')}</div>`;
        PugGuests.GUESTS.forEach((id) => {
          const canvas = document.getElementById('album-' + id);
          if (['crow', 'sparrow', 'pirate'].includes(id)) {
            if (this.world.images.birds)
              this.world.drawBird(canvas, {
                type: id,
                pose: 4,
                phase: 'landed',
                lastPeckAge: 1000,
                frameClock: 0,
                p: 0,
              });
          } else this.world.scene.drawGuest(canvas, { kind: id, fromLeft: true, elapsed: 0 });
        });
      }
    }
    netCard() {
      const g = this.getGame(),
        o = g.netOffer(),
        s = g.getState(),
        w = this.words();
      if (!o.visible || o.bought) return '';
      return `<article class="tool-card net-card"><div class="tool-icon">◉</div><h2>${w.netName}</h2><p class="collection-note">${w.netDescription}</p><button class="purchase-button" data-net ${!o.unlocked || s.balance.compare(o.price) < 0 ? 'disabled' : ''}>${w.buy} · ${this.format(o.price)}</button></article>`;
    }
  }
  window.PugSecretsUI = SecretsUI;
})();
