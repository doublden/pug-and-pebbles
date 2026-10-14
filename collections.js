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
            awardLocked = !!hat.award && !owned,
            secret = awardLocked && !s.hiddenRevealed,
            button = this.$('hat-buy-' + i),
            art = this.$('hat-art-' + i);
          this.$('hat-name-' + i).textContent = secret ? '???' : w.hatNames[i];
          this.$('hat-info-' + i).textContent = secret
            ? w.secretHints[i - 6]
            : w.hatDescriptions[i] +
              (!owned && s.pug < hat.stage ? ' · ' + w.hatGate + ': ' + w.pugNames[hat.stage] : '');
          button.disabled =
            awardLocked || (!owned && (s.pug < hat.stage || s.balance.compare(hat.cost) < 0));
          button.textContent = awardLocked
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
            f = this.world.extras.hatFrame(hat.id);
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
          content.innerHTML = `<article class="track-card"><h2>${w.helper}</h2><div class="helper-preview"><canvas id="helper-preview" width="600" height="260" aria-hidden="true"></canvas></div><p class="collection-note">${w.helperText}</p><p id="helper-level" class="collection-note"></p><p class="helper-rate" id="helper-rate"></p><button id="helper-buy" class="purchase-button" data-helper="true"></button><button id="helper-burst" class="helper-ability" data-helper-burst="true"></button><p class="collection-note">${w.helperBurstHelp}</p><div id="helper-colors"></div><section id="expeditions"></section></article>`;
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
        const ability = this.$('helper-burst');
        ability.disabled = !s.helper || !!ex || s.helperBurstSeconds > 0;
        ability.textContent = s.helperBurstActive
          ? w.helperBurstActive
          : w.helperBurst + (s.helperBurstSeconds ? ' · ' + s.helperBurstSeconds + 's' : '');
        const paletteKey = w.helperColor + '-' + s.maxHelperSkin;
        if (rebuild || this.paletteKey !== paletteKey || !this.$('helper-colors').firstChild) {
          this.paletteKey = paletteKey;
          this.$('helper-colors').innerHTML =
            `<label class="setting-row">${w.helperColor}<select data-helper-skin><option value="">${w.currentLook}</option>${Array.from({ length: s.maxHelperSkin + 1 }, (_, i) => `<option value="${i}">${w.helperTiers[i]}</option>`).join('')}</select></label><label class="setting-row">${w.helperSticker}<select data-helper-sticker>${['none', 'paw', 'fish', 'star'].map((id, i) => `<option value="${id}">${w.stickerNames[i]}</option>`).join('')}</select></label>`;
        }
        this.$('helper-colors').querySelector('[data-helper-skin]').value =
          s.helperSkin === null ? '' : s.helperSkin;
        this.$('helper-colors').querySelector('[data-helper-sticker]').value = s.helperSticker;
        const expeditionKey = JSON.stringify([
          w.expeditions,
          s.helper,
          s.home,
          s.trainingDone,
          s.expeditionMisses,
          s.helperBaseRate,
          ex?.ends,
          !!left,
        ]);
        if (rebuild || this.expeditionKey !== expeditionKey || !this.$('expeditions').firstChild) {
          this.expeditionKey = expeditionKey;
          this.$('expeditions').innerHTML =
            `<h2>${w.expeditions}</h2><p class="collection-note">${w.expeditionRule}</p>` +
            (ex
              ? `<p id="expedition-timer"></p><button class="setting-action" data-collect="true" ${left ? 'disabled' : ''}>${w.collect} · ${this.format(ex.reward)}</button>${left ? `<button class="setting-action" data-cancel-expedition="true">${w.cancelExpedition}</button>` : ''}`
              : PugInventoryRules.DURATIONS.map((d, i) => {
                  const offer = game.expeditionLootOffer(d),
                    conditional = offer.weights
                      .map(
                        (o) =>
                          (o.index < 0 ? w.parts : w.weaponNames[o.index]) +
                          ': ' +
                          o.percent.toFixed(1) +
                          '%',
                      )
                      .join(' · ');
                  return `<button class="setting-action" data-expedition="${d}" ${!s.helper ? 'disabled' : ''}>${w.expeditionTimes[i]} · +${this.format(game.expeditionOffer(d))}</button><p class="loot-odds">${offer.training ? w.trainingLoot : `${w.lootChance}: ${offer.chance}% · ${w.lootRolls}: ${offer.rolls}${offer.chance ? `<br>${w.lootConditional}: ${conditional}` : ''}`}</p>`;
                }).join('') + `<p class="collection-note">${w.pityLoot}</p>`);
        }
        if (ex)
          this.$('expedition-timer').textContent =
            w.away +
            ': ' +
            Math.floor(left / 3600) +
            ':' +
            String(Math.floor(left / 60) % 60).padStart(2, '0') +
            ':' +
            String(left % 60).padStart(2, '0');
        const canvas = this.$('helper-preview'),
          ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 600, 260);
        this.world.extras.helper(ctx, performance.now(), 600, 260, s.helper, true);
      }
    }
  }
  window.PugCollections = Collections;
})();
