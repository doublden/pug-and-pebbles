(function () {
  'use strict';
  class Collections {
    constructor(options) {
      Object.assign(this, options);
      this.$ = (id) => document.getElementById(id);
    }
    render(kind, rebuild) {
      const game = this.getGame(),
        s = game.getState(),
        w = this.words(),
        content = this.$('shop-content');
      if (kind === 'hats') {
        if (rebuild || !this.$('hat-grid'))
          content.innerHTML =
            `<p class="collection-note">${w.hatRule}</p><button class="setting-action" data-hat-remove="true">${w.noHat}</button><div id="hat-grid" class="tool-grid">` +
            PugGame.HATS.map(
              (hat, i) =>
                `<article class="tool-card"><div class="hat-image" id="hat-art-${i}"></div><h2 id="hat-name-${i}"></h2><p class="collection-note" id="hat-info-${i}"></p><button id="hat-buy-${i}" class="purchase-button" data-hat="${hat.id}"></button></article>`,
            ).join('') +
            '</div>';
        PugGame.HATS.forEach((hat, i) => {
          const owned = s.hats.includes(hat.id),
            secret = !!hat.award && !owned,
            button = this.$('hat-buy-' + i),
            art = this.$('hat-art-' + i);
          this.$('hat-name-' + i).textContent = secret ? '???' : w.hatNames[i];
          this.$('hat-info-' + i).textContent = secret
            ? w.secretHints[i - 6]
            : w.hatDescriptions[i] +
              (!owned && s.pug < hat.stage ? ' · ' + w.hatGate + ': ' + w.pugNames[hat.stage] : '');
          button.disabled =
            secret || (!owned && (s.pug < hat.stage || s.balance.compare(hat.cost) < 0));
          button.textContent = secret
            ? w.secret
            : owned
              ? s.hat === hat.id
                ? w.equipped
                : w.wear
              : w.buy + ' · ' + this.format(hat.cost);
          if (secret) {
            art.innerHTML = '<span class="hat-secret">?</span>';
            return;
          }
          if (!art.querySelector('canvas'))
            art.innerHTML = '<canvas width="200" height="120" aria-hidden="true"></canvas>';
          const canvas = art.querySelector('canvas'),
            f = this.world.extras.frame('hats', i, 4, 3);
          if (f) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 200, 120);
            const scale = Math.min(180 / f.w, 110 / f.h);
            ctx.drawImage(
              f.canvas,
              f.x,
              f.y,
              f.w,
              f.h,
              (200 - f.w * scale) / 2,
              (120 - f.h * scale) / 2,
              f.w * scale,
              f.h * scale,
            );
          }
        });
      } else {
        if (rebuild || !this.$('helper-buy'))
          content.innerHTML = `<article class="track-card"><h2>${w.helper}</h2><div class="helper-preview"><canvas id="helper-preview" width="600" height="260" aria-hidden="true"></canvas></div><p class="collection-note">${w.helperText}</p><p id="helper-level" class="collection-note"></p><p class="helper-rate" id="helper-rate"></p><button id="helper-buy" class="purchase-button" data-helper="true"></button><section id="expeditions"></section></article>`;
        this.$('helper-level').textContent = s.pug < 4 ? w.helperGate : w.level + ' ' + s.helper;
        this.$('helper-rate').textContent = this.format(s.helperRate) + ' ' + w.perSecond;
        const button = this.$('helper-buy');
        const quote = game.quote('helper', 0, this.bulk());
        button.disabled = s.pug < 4 || !quote.count || s.balance.compare(quote.cost) < 0;
        button.textContent =
          (s.helper ? w.improve : w.hire) +
          ' ×' +
          quote.count +
          ' · ' +
          this.format(quote.count ? quote.cost : game.getHelperPrice());
        const ex = s.expedition,
          left = ex ? Math.max(0, Math.ceil((ex.ends - Date.now()) / 1000)) : 0;
        this.$('expeditions').innerHTML =
          `<h2>${w.expeditions}</h2><p class="collection-note">${w.expeditionRule}</p>` +
          (ex
            ? `<p>${w.away}: ${Math.floor(left / 3600)}:${String(Math.floor(left / 60) % 60).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}</p><button class="setting-action" data-collect="true" ${left ? 'disabled' : ''}>${w.collect} · ${this.format(ex.reward)}</button>`
            : [900, 3600, 10800]
                .map(
                  (d, i) =>
                    `<button class="setting-action" data-expedition="${d}" ${!s.helper ? 'disabled' : ''}>${w.expeditionTimes[i]} · +${this.format(game.expeditionOffer(d))}</button>`,
                )
                .join(''));
        const canvas = this.$('helper-preview'),
          c = canvas.getContext('2d');
        if (!rebuild && canvas.dataset.drawn) return;
        canvas.dataset.drawn = 'true';
        c.clearRect(0, 0, 600, 260);
        const f = this.world.extras.frame('helper', 0, 4, 2);
        if (f) {
          const scale = Math.min(560 / f.canvas.width, 240 / f.canvas.height);
          c.drawImage(
            f.canvas,
            (600 - f.canvas.width * scale) / 2,
            10,
            f.canvas.width * scale,
            f.canvas.height * scale,
          );
        }
      }
    }
  }
  window.PugCollections = Collections;
})();
