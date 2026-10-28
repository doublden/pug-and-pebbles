(function () {
  'use strict';
  const $ = (id) => document.getElementById(id),
    KEY = 'pug-and-pebbles-v2',
    BACKUP = 'pug-and-pebbles-v9-backup',
    V8_BACKUP = 'pug-and-pebbles-v8-backup',
    V7_BACKUP = 'pug-and-pebbles-v7-backup',
    PRIOR_BACKUP = 'pug-and-pebbles-v5-backup',
    LEGACY_BACKUP = 'pug-and-pebbles-v4-backup',
    OLDER_BACKUP = 'pug-and-pebbles-v3-backup',
    VERSION = '0.9.0',
    SHARE_URL = 'https://doublden.github.io/pug-and-pebbles/?v=' + VERSION,
    instance = Math.random().toString(36).slice(2) + Date.now();
  const session = PugSession.create(localStorage, 'pug-and-pebbles-session-v5', instance);
  session.claim();
  function readEnvelope() {
    const candidates = [];
    for (const key of [
      KEY,
      BACKUP,
      V8_BACKUP,
      V7_BACKUP,
      PRIOR_BACKUP,
      LEGACY_BACKUP,
      OLDER_BACKUP,
    ])
      try {
        const e = JSON.parse(localStorage.getItem(key) || 'null');
        if (e?.game && PugGame.createGame(e.game).restoreStatus !== 'invalid') candidates.push(e);
      } catch (_) {}
    candidates.sort(
      (a, b) => b.game.version - a.game.version || (b.revision || 0) - (a.revision || 0),
    );
    return candidates[0] || {};
  }
  let envelope = readEnvelope(),
    revision = envelope.revision || 0,
    game = PugGame.createGame(envelope.game),
    settings = cleanSettings(envelope.settings),
    runner = PugBonuses.create(),
    birdRunner = PugBirds.create(),
    idleRunner = PugIdle.create();
  function cleanSettings(s) {
    return {
      language: ['ru', 'en'].includes(s?.language) ? s.language : 'ru',
      effects: s?.effects !== false,
      music: s?.music === true,
      effectsVolume: Number.isFinite(s?.effectsVolume)
        ? Math.max(0, Math.min(100, s.effectsVolume))
        : 80,
      musicVolume: Number.isFinite(s?.musicVolume) ? Math.max(0, Math.min(100, s.musicVolume)) : 75,
      effectsIntensity: Number.isFinite(s?.effectsIntensity)
        ? Math.max(0, Math.min(100, s.effectsIntensity))
        : 100,
      tutorialDone: s?.tutorialDone === true,
    };
  }
  const sound = new PugSound(),
    world = new PugWorld($('world'), sound, $('slobber'));
  const combo = PugCombo.create();
  let bulkMode = 1;
  let tab = 'tools',
    loaded = false,
    coinReady = false,
    birdReady = false,
    birdState = null,
    saveTimer = null,
    saveAvailable = true,
    toastTimer,
    tutorialPage = 0,
    developerUnlocked = false,
    devTap = 1,
    eventSpeed = 1,
    lastTick = performance.now(),
    lastHud = 0,
    lastWork = 0,
    fartRemaining = 120000 + Math.random() * 120000,
    bonusState = { coin: null, multiplier: 1, seconds: 0 },
    hasUnread = false,
    revealFrom = null;
  const collections = new PugCollections({
    getGame: () => game,
    words: () => t(),
    world,
    format,
    bulk: () => bulkMode,
  });
  const inventoryUI = new PugInventoryUI({ getGame: () => game, words: () => t(), format });
  let cancelExpeditionEnds = null;
  const miniUI = new PugMiniUI({
    getGame: () => game,
    words: () => t(),
    world,
    format,
    sound,
    isActive: () => session.owns() && !portraitBlocked(),
    changed: () => {
      earned();
      render();
      persist();
    },
  });
  const t = () => PugLocale[settings.language],
    modalOpen = () => battleUI.active || !!document.querySelector('dialog[open]');
  const battleUI = new PugBattleUI({
    getGame: () => game,
    words: () => t(),
    world,
    sound,
    format,
    toast,
    isActive: () => session.owns() && !document.hidden && !portraitBlocked(),
    changed: () => {
      combo.reset();
      earned();
      render();
      persist();
    },
    inventory: () => {
      tab = 'inventory';
      selectShopTab();
      open('shop-dialog');
    },
    home: () => {
      tab = 'home';
      selectShopTab();
      open('shop-dialog');
    },
  });
  const secretsUI = new PugSecretsUI({
    getGame: () => game,
    words: () => t(),
    world,
    sound,
    format,
    toast,
    canPlay: () => loaded && !modalOpen() && !portraitBlocked() && session.owns(),
    changed: () => {
      earned();
      render();
      dirty();
    },
  });
  function selectShopTab() {
    for (const b of document.querySelectorAll('[data-tab]')) {
      const active = b.dataset.tab === tab;
      b.classList.toggle('selected', active);
      b.setAttribute('aria-pressed', String(active));
    }
  }
  function format(value) {
    const n = PugGame.Amount.from(value);
    if (!n.m) return '0';
    if (n.e < 3)
      return new Intl.NumberFormat(settings.language, { maximumFractionDigits: 1 }).format(
        n.toNumber(),
      );
    const rank = Math.floor(n.e / 3);
    if (rank > 4) return `${n.m.toFixed(2)}e${n.e}`;
    const suffix =
      settings.language === 'ru' ? ['', 'тыс.', 'млн', 'млрд', 'трлн'] : ['', 'K', 'M', 'B', 'T'];
    return `${(n.m * 10 ** (n.e - rank * 3)).toFixed(1).replace(/\.0$/, '')} ${suffix[rank]}`;
  }
  function toast(text) {
    $('toast').textContent = text;
    $('toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2800);
  }
  function stageName(kind, level) {
    const current = game.getState()[kind];
    if (level > (kind === 'pug' ? 14 : 13) && level > current && !game.getState().hiddenRevealed)
      return '???';
    const names = t()[kind === 'pug' ? 'pugNames' : 'homeNames'],
      last = names.length - 1;
    return names[Math.min(level, last)] + (level > last ? ` +${level - last}` : '');
  }
  function saveNotes() {
    for (const [id, yes] of [
      ['save-note', t().saved],
      ['settings-save-note', t().autoSave],
    ])
      $(id).textContent = saveAvailable ? yes : t().saveError;
  }
  function adopt(e) {
    secretsUI.clear();
    battleUI.reset();
    envelope = e;
    revision = e.revision || 0;
    if (miniUI.active) miniUI.close(false);
    game = PugGame.createGame(e.game);
    settings = cleanSettings(e.settings);
    translate();
    render();
  }
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!session.owns()) return;
    try {
      const latest = readEnvelope();
      if ((latest.revision || 0) > revision && latest.instance !== instance) {
        adopt(latest);
        toast(t().sync);
        return;
      }
      const e = {
        version: 7,
        release: VERSION,
        revision: revision + 1,
        instance,
        game: game.serialize(),
        settings,
      };
      const text = JSON.stringify(e);
      localStorage.setItem(KEY, text);
      localStorage.setItem(BACKUP, text);
      envelope = e;
      revision = e.revision;
      saveAvailable = true;
    } catch (_) {
      saveAvailable = false;
    }
    saveNotes();
  }
  function dirty() {
    if (!saveTimer) saveTimer = setTimeout(persist, 650);
  }
  function earned() {
    const ids = game.takeAchievements();
    if (ids.length) {
      hasUnread = true;
      $('achievement-dot').hidden = false;
      toast(
        t().earned +
          ': ' +
          ids
            .map((id) => t().awardNames[PugGame.ACHIEVEMENTS.findIndex((a) => a.id === id)])
            .join(' · '),
      );
    }
    if ($('achievements-dialog').open) renderAwards();
  }
  function render() {
    const s = game.getState();
    world.setState(s);
    $('minigames-open').disabled = !loaded;
    if (world.ready) {
      const f = world.foodLayout();
      Object.assign($('food-hit').style, {
        left: f.x - 12 + 'px',
        top: f.y - 12 + 'px',
        width: f.w + 24 + 'px',
        height: f.h + 24 + 'px',
      });
      $('food-hit').ariaLabel = t().dig;
    }
    $('balance').textContent = format(s.balance);
    $('shop-balance').textContent = format(s.balance);
    $('equipped-icon').innerHTML = PugIcons[PugGame.TOOLS[s.toolAppearance].key];
    $('equipped-name').textContent = t().toolNames[s.toolAppearance];
    $('click-power').textContent =
      '+' +
      format(
        s.power.multiply(
          bonusState.multiplier *
            combo.status(performance.now()).multiplier *
            (developerUnlocked ? devTap : 1),
        ),
      );
    $('pug-label').textContent = stageName('pug', s.pugAppearance);
    $('home-label').textContent = stageName('home', s.homeAppearance);
    $('tap-hint').hidden = s.clicks >= 5;
    $('life-status').textContent =
      t().lifeNumber +
      ': ' +
      s.lives +
      ' · ' +
      t().lifeBonus +
      ': +' +
      ((s.lifeBoost - 1) * 100).toFixed(2) +
      '%';
    $('newlife-open').disabled = false;
    $('newlife-open').title = game.canNewLife() ? '' : t().lifeLocked;
    document.body.dataset.gold = String(s.homeStage === 13);
    $('test-chip').hidden = !s.testMode;
    const available = game.shopAvailability();
    $('shop-dot').hidden = !available.main;
    for (const button of document.querySelectorAll('[data-tab]')) {
      const active = !!available[button.dataset.tab];
      button.classList.toggle('can-buy', active);
      button.setAttribute('aria-label', button.textContent + (active ? ' · ' + t().ready : ''));
    }
    if ($('shop-dialog').open) renderShop(false);
  }
  function translate() {
    const w = t();
    $('minigames-open').ariaLabel = w.minigames;
    $('expedition-cancel-close').ariaLabel = w.close;
    $('expedition-ready-dismiss').ariaLabel = w.close;
    for (const id of ['minigames-close', 'mini-exit']) $(id).ariaLabel = w.close;
    for (const button of document.querySelectorAll('[data-lane]'))
      button.ariaLabel = w.laneNames[Number(button.dataset.lane)];
    document.documentElement.lang = settings.language;
    document.title = settings.language === 'ru' ? 'Мопс и камушки' : 'Pug & Pebbles';
    const map = {
      'shop-open-label': 'shop',
      'shop-title': 'shop',
      'settings-title': 'settings',
      'wallet-label': 'currency',
      'shop-currency': 'currency',
      'shop-eyebrow': 'eyebrow',
      'tab-tools': 'tabTools',
      'tab-pug': 'pug',
      'tab-home': 'home',
      'tab-hats': 'hats',
      'tab-helper': 'helper',
      'tab-inventory': 'inventory',
      'tab-beds': 'beds',
      'tab-album': 'album',
      'expedition-ready-text': 'expeditionReady',
      'expedition-ready-claim': 'collect',
      'expedition-cancel-title': 'cancelExpedition',
      'expedition-cancel-about': 'cancelExpeditionAbout',
      'expedition-cancel-confirm': 'cancelExpedition',
      'language-label': 'language',
      'music-label': 'music',
      'effects-label': 'effects',
      'tap-hint': 'hint',
      'loading-title': 'loading',
      'loading-detail': 'loadingDetail',
      'shop-footnote': 'milestone',
    };
    for (const [id, key] of Object.entries(map)) $(id).textContent = w[key];
    for (const e of document.querySelectorAll('[data-i18n]')) e.textContent = w[e.dataset.i18n];
    $('settings-open').ariaLabel = w.settings;
    $('achievements-open').ariaLabel = w.achievements;
    for (const id of ['shop-close', 'settings-close', 'achievements-close', 'developer-close'])
      $(id).ariaLabel = w.close;
    $('world').ariaLabel = w.dig;
    $('loading-retry').ariaLabel = settings.language === 'ru' ? 'Попробовать снова' : 'Try again';
    document.querySelector('.shop-tabs').ariaLabel = w.shop;
    $('language').value = settings.language;
    $('music-toggle').checked = settings.music;
    $('effects-toggle').checked = settings.effects;
    for (const kind of ['music', 'effects']) {
      $(kind + '-volume').value = settings[kind + 'Volume'];
      $(kind + '-volume-value').textContent = settings[kind + 'Volume'] + '%';
    }
    world.effectsIntensity = settings.effectsIntensity;
    $('effects-intensity').value = settings.effectsIntensity;
    $('effects-intensity-value').textContent = settings.effectsIntensity + '%';
    sound.configure(settings.effects, settings.music, settings.effectsVolume, settings.musicVolume);
    saveNotes();
    renderShop(true);
    renderAwards();
    renderDev();
    if ($('tutorial-dialog').open) renderTutorial();
    render();
  }
  function renderShop(rebuild) {
    $('bulk-label').textContent = t().quantity;
    $('bulk-max').textContent = t().maximum;
    $('shop-options')?.setAttribute('aria-label', t().quantity);
    document.querySelector('.shop-options').hidden = !['tools', 'helper'].includes(tab);
    const current = game.getState(),
      goals = ['pug', 'home', ...(current.pug >= 4 ? ['helper'] : [])].map((kind) => ({
        kind,
        cost: kind === 'helper' ? game.getHelperPrice() : game.getTrackPrice(kind),
      }));
    goals.sort((a, b) => a.cost.compare(b.cost));
    const goal = goals[0],
      name = goal.kind === 'helper' ? t().helper : stageName(goal.kind, current[goal.kind] + 1);
    $('nearest-goal').innerHTML =
      `<span>${t().nearestGoal}: <strong>${name}</strong></span><div class="track-progress"><span style="width:${current.balance.ratio(goal.cost) * 100}%"></span></div><small>${goal.kind === 'home' && game.bossGate() !== null ? t().bossGate : current.balance.compare(goal.cost) >= 0 ? t().ready : t().remaining + ': ' + format(goal.cost.subtract(current.balance))}</small>`;
    const s = game.getState(),
      w = t(),
      content = $('shop-content');
    if (['beds', 'album'].includes(tab)) {
      secretsUI.render(tab, rebuild);
      $('shop-footnote').hidden = true;
      return;
    }
    if (tab === 'inventory') {
      inventoryUI.render(rebuild);
      $('shop-footnote').hidden = true;
      return;
    }
    if (['hats', 'helper'].includes(tab)) {
      collections.render(tab, rebuild);
      $('shop-footnote').hidden = true;
      return;
    }
    if (tab === 'tools') {
      if (rebuild || !content.querySelector('.tool-grid'))
        content.innerHTML =
          '<div class="tool-grid">' +
          PugGame.TOOLS.slice(1)
            .map((tool, j) => {
              const i = j + 1;
              return `<article class="tool-card" id="tool-card-${i}"><div class="tool-topline"><span class="tool-icon" aria-hidden="true">${PugIcons[tool.key]}</span><span class="tool-level" id="tool-level-${i}"></span></div><h2>${w.toolNames[i]}</h2><p class="tool-production" id="tool-production-${i}"></p><button class="purchase-button" id="buy-tool-${i}" data-tool="${i}"><span id="tool-action-${i}"></span><span class="purchase-price"><span class="kibble" aria-hidden="true"></span><span id="tool-price-${i}"></span></span></button></article>`;
            })
            .join('') +
          '</div>';
      const net = secretsUI.netCard();
      let netNode = content.querySelector('.net-card');
      if (net && !netNode) {
        $('tool-card-9').insertAdjacentHTML('afterend', net);
      } else if (!net && netNode) netNode.remove();
      if (netNode) {
        const o = game.netOffer();
        netNode.querySelector('button').disabled = !o.unlocked || s.balance.compare(o.price) < 0;
      }
      for (let i = 1; i < PugGame.TOOLS.length; i++) {
        const lv = s.levels[i],
          quote = game.quote('tool', i, bulkMode),
          cost = quote.count ? quote.cost : game.getToolPrice(i),
          locked = i > 1 && !s.levels[i - 1];
        $('tool-card-' + i).className = 'tool-card' + (locked ? ' locked' : lv ? ' owned' : '');
        $('tool-level-' + i).textContent = locked ? w.locked : lv ? `${w.level} ${lv}` : '';
        const next = game.getToolPower(i, Math.max(1, lv + quote.count));
        $('tool-production-' + i).textContent = lv
          ? '+' + format(game.toolGain(i, quote.count)) + ' ' + w.totalPerTap
          : '+' + format(next) + ' ' + w.perTap;
        $('tool-price-' + i).textContent = format(cost);
        $('tool-action-' + i).textContent = (lv ? w.improve : w.buy) + ' ×' + quote.count;
        const b = $('buy-tool-' + i);
        b.disabled = locked || !quote.count || s.balance.compare(cost) < 0;
        b.ariaLabel = `${lv ? w.improve : w.buy}: ${w.toolNames[i]}, ${format(cost)} ${w.currency}`;
      }
    } else {
      const lv = s[tab],
        last = t()[tab === 'pug' ? 'pugNames' : 'homeNames'].length - 1,
        stage = Math.min(last, lv + 1),
        quote = game.quote(tab, 0, 1),
        cost = quote.count ? quote.cost : game.getTrackPrice(tab);
      if (rebuild || !$('upgrade-' + tab))
        content.innerHTML = `<article class="track-card"><p class="track-current">${w.current}: <strong id="track-current-name"></strong></p><div class="track-preview"><canvas id="track-canvas" aria-hidden="true"></canvas><span class="track-badge">${w.next}</span></div><div class="track-heading"><h2 id="track-name"></h2><span class="track-level" id="track-level"></span></div><p class="track-caption" id="track-caption"></p><div class="track-benefits"><span>${w.benefit}</span><strong id="track-boost"></strong></div><button class="purchase-button" id="upgrade-${tab}" data-upgrade="${tab}"><span>${w.improve}</span><span class="purchase-price"><span class="kibble" aria-hidden="true"></span><span id="track-price"></span></span></button><div class="track-progress"><span id="track-progress-fill"></span></div><p class="track-remaining" id="track-remaining"></p><div class="stage-dots" id="stage-dots" aria-hidden="true"></div></article>`;
      $('track-current-name').textContent = stageName(tab, lv);
      $('track-name').textContent = stageName(tab, lv + Math.max(1, quote.count));
      $('track-level').textContent = `${w.level} ${lv} → ${lv + quote.count}`;
      $('track-caption').textContent = lv < last ? w.trackCaption : w.infinite;
      $('track-boost').textContent = '+' + (game.getTrackGain(tab) * 100).toFixed(1) + '%';
      $('track-price').textContent = format(cost);
      $('upgrade-' + tab).disabled = !!quote.locked || !quote.count || s.balance.compare(cost) < 0;
      const gate = tab === 'home' ? game.bossGate() : null;
      if (gate !== null) {
        if (!$('shop-boss-open')) {
          const b = document.createElement('button');
          b.id = 'shop-boss-open';
          b.className = 'setting-action';
          $('upgrade-home').before(b);
        }
        $('shop-boss-open').textContent = w.bossFight + ' · ' + w.bossNames[gate];
        $('shop-boss-open').onclick = () => {
          $('shop-dialog').close();
          battleUI.open(gate);
        };
        $('track-caption').textContent = w.bossGate;
      } else $('shop-boss-open')?.remove();
      $('track-progress-fill').style.width = s.balance.ratio(cost) * 100 + '%';
      $('track-remaining').textContent =
        s.balance.compare(cost) >= 0
          ? w.ready
          : `${w.remaining}: ${format(cost.subtract(s.balance))}`;
      $('stage-dots').innerHTML = Array.from(
        { length: last + 1 },
        (_, i) => `<span class="${i <= Math.min(lv, last) ? 'active' : ''}"></span>`,
      ).join('');
      if (stage > (tab === 'pug' ? 14 : 13) && stage > lv && !s.hiddenRevealed) {
        $('track-canvas').dataset.preview = '';
        const c = $('track-canvas').getContext('2d');
        c.clearRect(0, 0, $('track-canvas').width, $('track-canvas').height);
        c.fillStyle = '#857b5f';
        c.textAlign = 'center';
        c.font = '100px Georgia';
        c.fillText('?', $('track-canvas').width / 2, $('track-canvas').height * 0.7);
        $('track-caption').textContent = w.stageSecret;
      } else if (loaded) world.preview($('track-canvas'), tab, stage);
    }
    $('shop-footnote').hidden = tab !== 'tools';
  }
  function renderAwards() {
    const list = game.getAchievements(),
      w = t(),
      icons = ['✦', '☁', '♛', '🥄', '🍲', '♥', '⌂', '🐾', '✧', '💦'];
    $('awards-count').textContent = `${list.filter((a) => a.unlocked).length} / ${list.length}`;
    $('awards-content').innerHTML = list
      .map(
        (a, i) =>
          `<article class="award-card ${a.unlocked ? 'earned' : ''}"><span class="award-icon" aria-hidden="true">${icons[i] || '✦'}</span><div><h2>${a.secret && !a.unlocked ? '???' : w.awardNames[i]}</h2><p>${a.secret && !a.unlocked ? w.awardDescriptions[i] : w.awardDescriptions[i]}</p><div class="award-progress"><span style="width:${(a.progress / a.target) * 100}%"></span></div><p class="award-status">${a.unlocked ? w.earned : Math.floor(a.progress) + ' / ' + a.target}</p></div></article>`,
      )
      .join('');
  }
  function open(id) {
    if (!loaded || battleUI.active) return;
    sound.unlock();
    $(id).showModal();
    if (id === 'shop-dialog') {
      $('shop-message').hidden = true;
      renderShop(true);
    }
    if (id === 'achievements-dialog') {
      hasUnread = false;
      $('achievement-dot').hidden = true;
      renderAwards();
    }
    if (id === 'developer-dialog') renderDev();
  }
  $('bulk-options').onclick = (e) => {
    const b = e.target.closest('[data-bulk]');
    if (!b) return;
    bulkMode = b.dataset.bulk === 'max' ? 'max' : Number(b.dataset.bulk);
    for (const el of document.querySelectorAll('[data-bulk]'))
      el.classList.toggle('selected', el === b);
    renderShop(true);
  };
  $('sound-test').onclick = () => {
    sound.unlock();
    sound.play('sneeze');
    setTimeout(() => sound.play('fart', Math.floor(Math.random() * 4)), 650);
    setTimeout(() => sound.play('pet'), 2100);
  };
  // Resume audio synchronously inside every trusted first-touch gesture (including tutorial).
  document.addEventListener(
    'pointerdown',
    () => {
      if (!session.owns()) {
        session.claim(true);
        const latest = readEnvelope();
        if ((latest.revision || 0) > revision) adopt(latest);
      }
      sound.unlock();
    },
    { capture: true, passive: true },
  );
  $('shop-open').onclick = () => open('shop-dialog');
  $('settings-open').onclick = () => open('settings-dialog');
  $('achievements-open').onclick = () => open('achievements-dialog');
  for (const kind of ['shop', 'settings', 'achievements', 'developer']) {
    $(kind + '-close').onclick = () => $(kind + '-dialog').close();
    $(kind + '-dialog').addEventListener('click', (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      if (
        e.target === e.currentTarget &&
        (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      )
        e.currentTarget.close();
    });
  }
  $('shop-dialog').addEventListener('close', () => {
    if (revealFrom) {
      world.transition = {
        from: {
          ...revealFrom,
          pugStage: revealFrom.pugAppearance,
          homeStage: revealFrom.homeAppearance,
          foodStage: revealFrom.foodAppearance,
        },
        start: performance.now(),
      };
      revealFrom = null;
    }
  });
  for (const button of document.querySelectorAll('[data-tab]'))
    button.onclick = () => {
      tab = button.dataset.tab;
      for (const b of document.querySelectorAll('[data-tab]')) {
        b.classList.toggle('selected', b === button);
        b.setAttribute('aria-pressed', String(b === button));
      }
      $('shop-message').hidden = true;
      renderShop(true);
      $('shop-content').scrollTop = 0;
    };
  $('shop-content').onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.inventoryJump) {
      $(b.dataset.inventoryJump)?.scrollIntoView({
        block: 'start',
        behavior: world.reduced ? 'auto' : 'smooth',
      });
      return;
    }
    const kind = b.dataset.upgrade;
    const before = kind ? game.getState() : null,
      purchaseGame = game;
    let bought = false;
    if (b.dataset.bed)
      bought = game.getState().beds.includes(b.dataset.bed)
        ? game.equipBed(b.dataset.bed)
        : game.buyBed(b.dataset.bed);
    if (b.hasAttribute('data-bed-remove')) bought = game.equipBed(null);
    if (b.hasAttribute('data-net')) bought = game.buyNet();
    if (b.dataset.hat) {
      const s = game.getState();
      bought = s.hats.includes(b.dataset.hat)
        ? game.equipHat(b.dataset.hat)
        : game.buyHat(b.dataset.hat);
    }
    if (b.dataset.hatRemove) bought = game.equipHat(null);
    if (b.dataset.expedition) {
      bought = game.sendExpedition(Number(b.dataset.expedition));
    }
    if (b.dataset.collect) {
      collectExpedition();
      return;
    }
    if (b.dataset.cancelExpedition) {
      cancelExpeditionEnds = game.getState().expedition?.ends;
      $('expedition-cancel-dialog').showModal();
      return;
    }
    if (b.dataset.helperBurst) {
      bought = game.activateHelper();
      if (bought) {
        world.extras.react(performance.now());
        sound.play('sigh');
      }
    }
    if (b.dataset.weapon !== undefined) bought = game.equipWeapon(Number(b.dataset.weapon));
    if (b.dataset.merge !== undefined) bought = game.mergeWeapon(Number(b.dataset.merge));
    if (b.dataset.cosmetic) bought = game.buyCosmetic(b.dataset.cosmetic);
    if (b.dataset.helper) bought = game.buyBulk('helper', 0, bulkMode);
    if (b.dataset.tool) bought = game.buyBulk('tool', Number(b.dataset.tool), bulkMode);
    if (kind) {
      if (b.dataset.pending) return;
      b.dataset.pending = 'true';
      b.disabled = true;
      try {
        const stage = Math.min(kind === 'pug' ? 15 : 14, game.getState()[kind] + 1);
        if (kind === 'pug' && world.rig) await world.rig.preload(stage);
        else if (kind === 'pug' && stage === 15) await world.scene.preloadPug();
        else if (kind === 'home')
          await Promise.all([
            world.image('location-' + stage, world.artPath('background', stage)),
            world.image('food-' + stage, world.artPath('food', stage)),
          ]);
        if (game === purchaseGame) bought = game.buyBulk(kind, 0, 1);
      } catch (_) {
        toast(t().loadError);
      } finally {
        delete b.dataset.pending;
      }
    }
    if (bought) {
      if (kind && !revealFrom) revealFrom = before;
      sound.unlock();
      sound.play('buy');
      if (kind === 'pug') sound.play('pet');
      if (b.dataset.helper) world.extras.react(performance.now());
      render();
      earned();
      persist();
      if (kind) {
        const text = t().received + ': ' + stageName(kind, game.getState()[kind]);
        $('shop-message').textContent = text;
        $('shop-message').hidden = false;
        $('shop-dialog').close();
        toast(text);
      }
    }
  };
  function collectExpedition() {
    const amount = game.claimExpedition();
    if (!amount.m) return;
    $('expedition-banner').hidden = true;
    sound.play('buy');
    const loot = game.getState().lastLoot;
    toast(
      t().collect +
        ' +' +
        format(amount) +
        (loot.length ? ' · ' + t().lootReceived + ': ' + loot.length : ''),
    );
    earned();
    render();
    persist();
  }
  $('expedition-ready-claim').onclick = collectExpedition;
  $('expedition-ready-dismiss').onclick = () => {
    $('expedition-banner').hidden = true;
  };
  for (const id of ['expedition-cancel-close'])
    $(id).onclick = () => $('expedition-cancel-dialog').close();
  $('expedition-cancel-confirm').onclick = () => {
    if (game.cancelExpedition(cancelExpeditionEnds)) {
      render();
      persist();
      toast(t().expeditionCancelled);
    }
    $('expedition-cancel-dialog').close();
  };
  $('shop-content').onchange = (e) => {
    const input = e.target;
    let changed = false;
    if (input.dataset.skin)
      changed = game.chooseSkin(
        input.dataset.skin,
        input.value === '' ? null : Number(input.value),
      );
    if (input.dataset.showWeapon !== undefined) changed = game.showWeapon(input.checked);
    if (input.dataset.helperSkin !== undefined)
      changed = game.chooseHelperSkin(input.value === '' ? null : Number(input.value));
    if (input.dataset.helperSticker !== undefined) changed = game.chooseHelperSticker(input.value);
    if (changed) {
      render();
      persist();
    }
  };
  function updateSettings() {
    settings = {
      ...settings,
      language: $('language').value,
      effects: $('effects-toggle').checked,
      music: $('music-toggle').checked,
    };
    sound.unlock();
    translate();
    persist();
  }
  for (const id of ['language', 'effects-toggle', 'music-toggle']) $(id).onchange = updateSettings;
  for (const kind of ['music', 'effects'])
    $(kind + '-volume').oninput = () => {
      settings[kind + 'Volume'] = Number($(kind + '-volume').value);
      $(kind + '-volume-value').textContent = settings[kind + 'Volume'] + '%';
      sound.unlock();
      sound.configure(
        settings.effects,
        settings.music,
        settings.effectsVolume,
        settings.musicVolume,
      );
      dirty();
    };
  for (const kind of ['music', 'effects'])
    $(kind + '-volume').onchange = () => {
      if (kind === 'effects') sound.play('dig');
      persist();
    };
  function dig(x, y, silent = false) {
    if (!loaded || modalOpen() || portraitBlocked() || !session.owns()) return;
    sound.unlock();
    const s = game.getState(),
      amount = game.dig(
        bonusState.multiplier * (developerUnlocked ? devTap : 1),
        combo.tap(performance.now()).multiplier,
      );
    world.dig(PugGame.TOOLS[s.toolAppearance].key, '+' + format(amount), x, y);
    if (!silent) sound.play('dig');
    earned();
    render();
    dirty();
  }
  function sneeze(x, y) {
    if (!loaded || modalOpen() || portraitBlocked() || !session.owns()) return;
    const l = world.layout();
    dig(
      Number.isFinite(x) ? x : l.x + l.size * 0.5,
      Number.isFinite(y) ? y : l.y + l.size * 0.4,
      true,
    );
    if (game.getState().pug <= 8) {
      game.sneeze();
      world.sneeze();
    } else {
      game.fart();
      world.scene.petPug(performance.now());
    }
    earned();
    dirty();
  }
  function petHelper(x, y) {
    dig(x, y, true);
    if (game.petHelper()) {
      world.extras.react(performance.now());
      sound.play('meow', Math.floor(Math.random() * 4));
      earned();
      dirty();
    }
  }
  function tapScene(p) {
    if (world.scene.actors.some((a) => a.kind === 'yuppi'))
      world.scene.missUntil = performance.now() + 600;
    if (world.hitHelper(p.x, p.y)) petHelper(p.x, p.y);
    else if (world.hitPug(p.x, p.y)) sneeze(p.x, p.y);
    else if (world.hitFood(p.x, p.y)) dig(p.x, p.y);
  }
  function portraitBlocked() {
    return matchMedia('(orientation: landscape) and (max-height: 600px)').matches;
  }
  function scenePoint(e) {
    const r = $('world').getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  $('food-hit').addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || modalOpen() || portraitBlocked()) return;
    const p = scenePoint(e);
    tapScene(p);
  });
  $('food-hit').onclick = (e) => {
    if (e.detail === 0) {
      const p = world.foodFocus();
      dig(p.x, p.y);
    }
  };
  $('world').addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || modalOpen() || portraitBlocked()) return;
    const p = scenePoint(e);
    tapScene(p);
  });
  $('world').addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      const point = world.foodFocus();
      dig(point.x, point.y);
    }
    if (e.code === 'KeyS') {
      e.preventDefault();
      sneeze();
    }
  });
  $('sneeze-button').onclick = () => sneeze();
  $('pet-coin').onclick = () => {
    if (modalOpen() || !session.owns()) return;
    const got = runner.catch(Number($('pet-coin').dataset.coinId));
    if (!got) return;
    game.claimBonus(got.value);
    bonusState = { ...bonusState, coin: null, multiplier: got.multiplier, seconds: 30 };
    $('pet-coin').hidden = true;
    sound.unlock();
    sound.play('gold');
    earned();
    toast(`${t().bonusWon} ×${got.multiplier} ${t().bonusFor}`);
    render();
    persist();
  };
  function chaseBird() {
    if (modalOpen() || !birdState || !session.owns()) return;
    const b = birdRunner.chase(birdState.id);
    if (!b) return;
    const pos = PugBirds.position(b, world.birdAnchor(b.target), world.w, world.h);
    world.burstBird(b.type, pos.x, pos.y - 20);
    game.chaseBird(b.type, b.test);
    earned();
    sound.unlock();
    sound.play('poof');
    birdState = null;
    $('bird').hidden = true;
    dirty();
  }
  $('bird').addEventListener('pointerdown', (e) => {
    if (e.button === 0) chaseBird();
  });
  $('bird').onclick = (e) => {
    if (e.detail === 0) chaseBird();
  };
  function tickBirds(delta, playing) {
    const s = game.getState(),
      result = birdRunner.tick(delta, playing && birdReady && (s.clicks >= 30 || s.testMode));
    birdState = result.bird;
    const b = birdState;
    $('bird').hidden = !b || !playing;
    if (!b || !playing) return;
    const type = PugBirds.TYPES[b.type],
      p = PugBirds.position(b, world.birdAnchor(b.target), world.w, world.h),
      button = $('bird');
    button.dataset.birdId = b.id;
    button.style.left = p.x + 'px';
    button.style.top = p.y + 'px';
    button.style.width = type.size + 'px';
    button.style.height = type.size * 1.5 + 'px';
    button.style.transform = `translate(-50%,-90%) rotate(${p.angle}deg) scaleX(${b.fromLeft ? 1 : -1})`;
    world.drawBird($('bird-canvas'), b);
    button.ariaLabel = t().chase + ' ' + t()[b.type];
    if (result.spawned) {
      game.observeBird(b.type, b.test);
      dirty();
      sound.play(b.type === 'crow' ? 'crow' : 'chirp');
      toast(b.type === 'pirate' ? t().pirateHint : t().birdHint);
    }
    if (result.pecks && !b.test) {
      for (let i = 0; i < result.pecks; i++) {
        const amount = game.birdPeck();
        if (amount.compare(0) > 0) world.lost('−' + format(amount), p.x, p.y - 25);
      }
      sound.play('peck');
      dirty();
      render();
    }
  }
  function tick(now) {
    requestAnimationFrame(tick);
    miniUI.tick(now);
    battleUI.tick(now);
    const frameState = game.getState();
    const speed = combo.status(now);
    $('combo-indicator').hidden = !speed.rate || modalOpen();
    $('combo-indicator').dataset.tier = speed.tier;
    $('combo-rate').textContent = speed.rate;
    $('combo-caption').textContent =
      t().combo + (speed.tier ? ' +' + Math.round((speed.multiplier - 1) * 100) + '%' : '');
    const delta = Math.max(0, now - lastTick);
    lastTick = now;
    const owner = session.owns();
    if (owner && !document.hidden) session.heartbeat();
    const playing = owner && loaded && !document.hidden && !modalOpen() && !portraitBlocked();
    bonusState = runner.tick(
      delta,
      playing && coinReady && (frameState.clicks >= 10 || frameState.testMode),
      world.w,
      world.h,
    );
    const coin = bonusState.coin;
    $('pet-coin').hidden = !coin || !playing;
    if (coin && playing) {
      const button = $('pet-coin');
      button.dataset.coinId = coin.id;
      button.style.left = coin.x + 'px';
      button.style.top = coin.y + 'px';
      button.style.transform = `translate(-50%,-50%) rotate(${coin.angle}deg)`;
      button.querySelector('.coin-face').style.backgroundPosition =
        `${(coin.pet % 3) * 50}% ${Math.floor(coin.pet / 3) * 100}%`;
      if (typeof PugCharacterMotion !== 'undefined')
        PugCharacterMotion.drawFriend(world, button.querySelector('.coin-face'), coin);
      $('coin-value').textContent = '×' + coin.value;
      button.ariaLabel = t().catch + ' ×' + coin.value;
    }
    $('bonus-indicator').hidden = battleUI.active || bonusState.multiplier === 1;
    $('bonus-value').textContent = '×' + bonusState.multiplier;
    $('bonus-seconds').textContent = bonusState.seconds + 's';
    runner.configure({
      durationFactor: game.hatEffect('bonusTime'),
      rareCoin: game.hatEffect('rareCoin') === 1 && frameState.hat === 'pirate',
    });
    birdRunner.configure({ peckFactor: game.hatEffect('peckTime') });
    tickBirds(delta, playing);
    secretsUI.tick(delta, playing);
    world.uiPaused = !playing;
    const idle = idleRunner.tick(delta, playing && world.idleReady());
    world.setIdle(idle.event);
    if (
      idle.event &&
      idle.event.elapsed >= idle.event.duration * 0.9 &&
      !frameState.idleSeen.includes(idle.event.kind)
    ) {
      game.seeIdle(idle.event.kind);
      earned();
      dirty();
    }
    if (
      owner &&
      loaded &&
      !document.hidden &&
      !portraitBlocked() &&
      (!modalOpen() || $('shop-dialog').open) &&
      frameState.helper
    ) {
      if (now - lastWork >= 100) {
        game.work(Math.min(now - lastWork, 1000) / 1000);
        lastWork = now;
        dirty();
      }
    } else lastWork = now;
    if (playing) {
      fartRemaining -= Math.min(delta, 1000) * eventSpeed;
      if (fartRemaining <= 0) {
        game.fart();
        world.fart();
        fartRemaining = 120000 + Math.random() * 120000;
        dirty();
      }
    }
    if (now - lastHud > 250) {
      lastHud = now;
      if (playing && !world.transition) battleUI.maybeIntro();
      if (!game.getState().expedition) $('expedition-banner').hidden = true;
      if (game.expeditionNotice(Date.now(), !owner || !playing || world.bossActive === true)) {
        $('expedition-banner').hidden = false;
        persist();
      }
      if (world.drops.length) {
        const cloud = world.spitCoverage(now, 'cloud');
        if (game.markFartCoverage(cloud.covered, cloud.total)) {
          earned();
          dirty();
        }
        const coverage = world.spitCoverage(now);
        if (game.markCoverage(coverage.covered, coverage.total)) {
          earned();
          dirty();
        }
      }
      render();
    }
  }
  function renderTutorial() {
    const w = t();
    $('tutorial-title').textContent = w.introTitles[tutorialPage];
    $('tutorial-copy').textContent = w.introBodies[tutorialPage];
    $('tutorial-counter').textContent = `${tutorialPage + 1} / ${w.introTitles.length}`;
    $('tutorial-visual').innerHTML =
      tutorialPage === 0
        ? '<span class="intro-pug"></span>'
        : tutorialPage === 1
          ? PugIcons.teaspoon
          : tutorialPage === 2
            ? '<span class="intro-coin"></span>'
            : tutorialPage === 3
              ? '<span class="intro-bird"></span>'
              : '<span class="intro-award">♛</span>';
    $('tutorial-dots').innerHTML = Array.from(
      { length: w.introTitles.length },
      (_, i) => `<span class="${i === tutorialPage ? 'active' : ''}"></span>`,
    ).join('');
    $('tutorial-back').hidden = tutorialPage === 0;
    $('tutorial-next').textContent =
      tutorialPage === w.introTitles.length - 1 ? w.play : w.nextSlide;
  }
  function showTutorial() {
    tutorialPage = 0;
    renderTutorial();
    $('tutorial-dialog').showModal();
  }
  function finishTutorial() {
    settings.tutorialDone = true;
    $('tutorial-dialog').close();
    sound.unlock();
    persist();
    lastTick = performance.now();
  }
  $('tutorial-open').onclick = () => {
    $('settings-dialog').close();
    showTutorial();
  };
  $('tutorial-skip').onclick = finishTutorial;
  $('tutorial-next').onclick = () => {
    if (tutorialPage === t().introTitles.length - 1) finishTutorial();
    else {
      tutorialPage++;
      renderTutorial();
    }
  };
  $('tutorial-back').onclick = () => {
    tutorialPage = Math.max(0, tutorialPage - 1);
    renderTutorial();
  };
  $('tutorial-dialog').addEventListener('cancel', (e) => {
    e.preventDefault();
    finishTutorial();
  });
  $('reset-open').onclick = () => {
    $('settings-dialog').close();
    $('reset-dialog').showModal();
  };
  $('reset-cancel').onclick = () => {
    $('reset-dialog').close();
    open('settings-dialog');
  };
  $('reset-dialog').addEventListener('cancel', (e) => {
    e.preventDefault();
    $('reset-cancel').click();
  });
  $('reset-confirm').onclick = () => {
    battleUI.reset();
    secretsUI.clear();
    game = PugGame.createGame();
    combo.reset();
    revealFrom = null;
    world.transition = null;
    world.hasState = false;
    world.pose = 'idle';
    world.poseEnd = 0;
    world.nextPose = performance.now() + 6000;
    world.returning = null;
    world.hit = null;
    world.sneezeAt = -1000;
    tab = 'tools';
    bulkMode = 1;
    for (const b of document.querySelectorAll('[data-tab]')) {
      const selected = b.dataset.tab === tab;
      b.classList.toggle('selected', selected);
      b.setAttribute('aria-pressed', String(selected));
    }
    for (const b of document.querySelectorAll('[data-bulk]'))
      b.classList.toggle('selected', b.dataset.bulk === '1');
    runner = PugBonuses.create();
    birdRunner = PugBirds.create();
    idleRunner = PugIdle.create();
    world.setIdle(null);
    birdState = null;
    secretsUI.clear();
    world.feathers = [];
    developerUnlocked = false;
    devTap = 1;
    eventSpeed = 1;
    world.drops = [];
    world.particles = [];
    bonusState = { coin: null, multiplier: 1, seconds: 0 };
    settings.tutorialDone = false;
    hasUnread = false;
    $('achievement-dot').hidden = true;
    $('reset-dialog').close();
    render();
    persist();
    showTutorial();
    toast(t().restartSuccess);
  };
  function renderDev() {
    const w = t(),
      s = game.getState();
    $('developer-login').hidden = developerUnlocked;
    $('developer-controls').hidden = !developerUnlocked;
    for (const kind of ['pug', 'home']) {
      $('dev-' + kind).innerHTML = w[kind === 'pug' ? 'pugNames' : 'homeNames']
        .map((name, i) => `<option value="${i}">${i} · ${name}</option>`)
        .join('');
      $('dev-' + kind).value = Math.min(kind === 'pug' ? 15 : 14, s[kind]);
    }
    $('dev-tool').innerHTML = w.toolNames
      .slice(1)
      .map((name, i) => `<option value="${i + 1}">${name}</option>`)
      .join('');
    $('dev-speed').value = eventSpeed;
    $('dev-taps').value = devTap;
  }
  $('developer-open').onclick = () => {
    $('settings-dialog').close();
    $('code-error').textContent = '';
    $('developer-code').value = '';
    open('developer-dialog');
  };
  $('developer-login').onsubmit = (e) => {
    e.preventDefault();
    if ($('developer-code').value !== '1435') {
      $('code-error').textContent = t().wrongCode;
      return;
    }
    developerUnlocked = true;
    sound.unlock();
    renderDev();
  };
  function devAction(action, close = false) {
    if (!developerUnlocked) return;
    game.enableTest();
    action();
    earned();
    render();
    persist();
    if (close) $('developer-dialog').close();
  }
  $('dev-grant').onclick = () => devAction(() => game.devGrant(Number($('dev-money').value)));
  $('dev-stages').onclick = () =>
    devAction(() => game.devStages(Number($('dev-pug').value), Number($('dev-home').value)), true);
  $('dev-tool-apply').onclick = () =>
    devAction(() => game.devTool(Number($('dev-tool').value), Number($('dev-tool-level').value)));
  $('dev-speed').onchange = () =>
    devAction(() => {
      eventSpeed = Number($('dev-speed').value);
      runner.setSpeed(eventSpeed);
      birdRunner.setSpeed(eventSpeed);
    });
  $('dev-taps').onchange = () =>
    devAction(() => {
      devTap = Number($('dev-taps').value);
    });
  $('dev-bonus-apply').onclick = () =>
    devAction(() => {
      coinReady = true;
      runner.force(Number($('dev-bonus').value));
    }, true);
  $('dev-idle-apply').onclick = () => devAction(() => idleRunner.force($('dev-idle').value), true);
  $('effects-intensity').oninput = () => {
    settings.effectsIntensity = Number($('effects-intensity').value);
    world.effectsIntensity = settings.effectsIntensity;
    $('effects-intensity-value').textContent = settings.effectsIntensity + '%';
    dirty();
  };
  $('effects-intensity').onchange = persist;
  $('dev-reveal-hidden').onclick = () => devAction(() => game.devRevealHidden());
  $('dev-guest-apply').onclick = () => devAction(() => game.devGuest($('dev-guest').value), true);
  $('dev-bird-apply').onclick = () =>
    devAction(() => {
      birdReady = true;
      birdRunner.force($('dev-bird').value);
    }, true);
  $('dev-fart').onclick = () =>
    devAction(() => {
      game.fart();
      world.animatePose(Math.random() < 0.5 ? 'left' : 'look');
      sound.play('fart', Number($('dev-fart-variant').value) - 1);
    }, true);
  $('dev-sneeze').onclick = () =>
    devAction(() => {
      game.sneeze();
      world.sneeze();
    }, true);
  $('dev-spit').onclick = () =>
    devAction(() => {
      let left = 32;
      const spray = () => {
        if (left-- <= 0 || modalOpen()) return;
        game.sneeze();
        world.sneeze();
        setTimeout(spray, 90);
      };
      setTimeout(spray, 0);
    }, true);
  $('dev-inventory').onclick = () => devAction(() => game.devInventory());
  $('dev-expedition-ready').onclick = () => devAction(() => game.devExpeditionReady());
  $('dev-helper-ready').onclick = () => devAction(() => game.devHelperReady());
  $('dev-mini-reset').onclick = () => devAction(() => game.devMiniReady());
  $('dev-pose-apply').onclick = () => devAction(() => world.animatePose($('dev-pose').value), true);
  $('dev-exit').onclick = () => {
    developerUnlocked = false;
    devTap = 1;
    eventSpeed = 1;
    runner.setSpeed(1);
    birdRunner.setSpeed(1);
    $('developer-dialog').close();
    render();
  };
  $('newlife-open').onclick = () => {
    $('settings-dialog').close();
    const s = game.getState(),
      next = PugGame.newLifeBoost(s.lives + 1),
      delta = (next / s.lifeBoost - 1) * 100;
    $('newlife-copy').textContent =
      t().lifeAbout +
      ' ' +
      t().lifeNext +
      ': +' +
      ((next - 1) * 100).toFixed(2) +
      '% (+' +
      delta.toFixed(2) +
      '% ' +
      t().benefit +
      ').';
    $('newlife-proceed').hidden = false;
    $('newlife-proceed').disabled = !game.canNewLife();
    $('newlife-proceed').textContent = game.canNewLife() ? t().lifeProceed : t().lifeLocked;
    $('newlife-confirm').hidden = true;
    $('newlife-warning').hidden = true;
    $('newlife-dialog').showModal();
  };
  $('newlife-proceed').onclick = () => {
    if (!game.canNewLife()) return;
    $('newlife-warning').hidden = false;
    $('newlife-warning').textContent =
      t().lifeConfirm +
      '+' +
      ((PugGame.newLifeBoost(game.getState().lives + 1) - 1) * 100).toFixed(2) +
      '%';
    $('newlife-proceed').hidden = true;
    $('newlife-confirm').hidden = false;
  };
  $('newlife-cancel').onclick = () => {
    $('newlife-dialog').close();
    open('settings-dialog');
  };
  $('newlife-confirm').onclick = () => {
    if (!game.newLife()) return;
    secretsUI.clear();
    world.hasState = false;
    world.pose = 'idle';
    world.poseEnd = 0;
    world.nextPose = performance.now() + 6000;
    world.returning = null;
    world.hit = null;
    combo.reset();
    revealFrom = null;
    runner = PugBonuses.create();
    birdRunner = PugBirds.create();
    idleRunner = PugIdle.create();
    birdState = null;
    bonusState = { coin: null, multiplier: 1, seconds: 0 };
    devTap = 1;
    eventSpeed = 1;
    world.drops = [];
    world.feathers = [];
    world.setIdle(null);
    $('newlife-dialog').close();
    earned();
    render();
    persist();
    toast(t().newLifeDone);
  };
  $('share-game').onclick = async () => {
    sound.unlock();
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, text: t().shareText, url: SHARE_URL });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(SHARE_URL);
        toast(t().shared);
      } else window.prompt(t().share, SHARE_URL);
    } catch (e) {
      if (e.name !== 'AbortError') window.prompt(t().share, SHARE_URL);
    }
  };
  addEventListener(
    'pointerdown',
    () => {
      if (!modalOpen()) {
        idleRunner.touch();
        world.setIdle(null);
      }
    },
    true,
  );
  addEventListener(
    'keydown',
    () => {
      if (!modalOpen()) {
        idleRunner.touch();
        world.setIdle(null);
      }
    },
    true,
  );
  addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) persist();
    lastTick = performance.now();
    lastWork = lastTick;
    combo.reset();
    idleRunner.touch();
    world.setIdle(null);
  });
  addEventListener('storage', (e) => {
    if (
      e.key === KEY ||
      e.key === BACKUP ||
      e.key === V7_BACKUP ||
      e.key === PRIOR_BACKUP ||
      e.key === LEGACY_BACKUP ||
      e.key === OLDER_BACKUP
    ) {
      const latest = readEnvelope();
      if ((latest.revision || 0) > revision && latest.instance !== instance) {
        adopt(latest);
        toast(t().sync);
      }
    }
  });
  $('loading-retry').onclick = () => location.reload();
  translate();
  const birdImage = new Image();
  birdImage.onload = () => (birdReady = true);
  birdImage.src = 'birds-mobile-v5.webp';
  const coinImage = new Image();
  coinImage.onload = () => (coinReady = true);
  coinImage.src = 'pet-coins-mobile-v5.webp';
  world
    .load((percent) => {
      $('loading-percent').textContent = percent + '%';
      $('loading-progress').value = percent;
    })
    .then(() => {
      loaded = true;
      render();
      $('loading').hidden = true;
      persist();
      if (!settings.tutorialDone) showTutorial();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () =>
          navigator.serviceWorker.controller?.postMessage({
            type: 'WARM',
            art: [
              world.artPath('background', game.getState().homeStage),
              world.artPath('food', game.getState().homeStage),
            ],
          }),
        );
        navigator.serviceWorker
          .register('sw.js', { updateViaCache: 'none' })
          .then(() => navigator.serviceWorker.ready)
          .then((reg) =>
            reg.active?.postMessage({
              type: 'WARM',
              art: [
                world.artPath('background', game.getState().homeStage),
                world.artPath('food', game.getState().homeStage),
              ],
            }),
          )
          .catch(() => {});
      }
      requestAnimationFrame(tick);
    })
    .catch(() => {
      $('loading-detail').textContent = t().loadError;
      $('loading-retry').hidden = false;
    });
})();
