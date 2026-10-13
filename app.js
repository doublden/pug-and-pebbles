'use strict';
(() => {
  const {TOOLS, STAGES, UPGRADES, createGame} = window.PugGame;
  const game = createGame();
  const $ = id => document.getElementById(id);
  const number = value => value.toLocaleString('ru-RU');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let sound = false, audio, animationTimer, toastTimer;
  const spoon = large => `<svg viewBox="0 0 80 80" aria-hidden="true"><defs><linearGradient id="metal-${large}" x2="1" y2="1"><stop stop-color="#f8f8ed"/><stop offset=".45" stop-color="#a5b2ad"/><stop offset=".65" stop-color="#edf0db"/><stop offset="1" stop-color="#83918c"/></linearGradient></defs><g transform="rotate(35 40 40)"><rect x="36" y="29" width="8" height="43" rx="4" fill="url(#metal-${large})" stroke="#77867f" stroke-width="1.5"/><ellipse cx="40" cy="22" rx="${large ? 15 : 11}" ry="${large ? 21 : 16}" fill="url(#metal-${large})" stroke="#77867f" stroke-width="1.5"/><path d="M35 12Q29 20 34 28" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/></g></svg>`;
  const shovel = `<svg viewBox="0 0 80 80" aria-hidden="true"><g transform="rotate(35 40 40)"><path d="M29 8h22v17H29z" fill="none" stroke="#e88a4c" stroke-width="7" stroke-linejoin="round"/><path d="M40 26v25" stroke="#e88a4c" stroke-width="8"/><path d="M23 46h34v18Q40 85 23 64z" fill="#8ea99a" stroke="#5f8573" stroke-width="2"/><path d="M40 50v18" stroke="#bdd0c0" stroke-width="3"/></g></svg>`;
  const icons = ['', spoon(false), spoon(true), shovel];
  const rows = TOOLS.slice(1).map((tool, offset) => {
    const index = offset + 1;
    const row = document.createElement('div');
    row.className = 'tool-card';
    row.innerHTML = `<div class="tool-icon">${icons[index]}</div><div class="tool-info"><h3>${tool.name}</h3><p>${tool.description}</p><span class="tool-yield">+${tool.yield} за клик</span></div><button class="buy-tool" id="buy-tool-${index}" aria-label="Купить: ${tool.name}, ${tool.cost} камушков" disabled><span class="pebble small" aria-hidden="true"></span><span>${tool.cost}</span></button><span class="tool-note"></span>`;
    row.querySelector('button').addEventListener('click', () => {
      if (!game.buyTool(index)) return;
      render();
      celebrate(`${tool.name} в деле! Теперь +${tool.yield} за клик.`);
      tone(570, .12);
    });
    $('tools').append(row);
    return row;
  });
  function tone(frequency, duration = .05) {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * .6, audio.currentTime + duration);
      gain.gain.setValueAtTime(.07, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(); oscillator.stop(audio.currentTime + duration);
    } catch (_) { sound = false; $('sound').textContent = 'Звук недоступен'; $('sound').setAttribute('aria-pressed', 'false'); }
  }
  function render() {
    const s = game.getState(), stage = STAGES[s.stage], upgrade = UPGRADES[s.stage];
    $('balance').textContent = number(s.balance);
    $('total').textContent = number(s.total);
    $('clicks').textContent = number(s.clicks);
    $('yield').textContent = `+${s.yield} за клик`;
    $('dig-yield').textContent = `+${s.yield}`;
    $('dig-scene').setAttribute('aria-label', `Копать камушки: ${s.yield} за клик`);
    $('dig-scene').dataset.stage = s.stage;
    document.body.dataset.stage = s.stage;
    $('location').textContent = stage.location;
    $('chapter').textContent = `ГЛАВА 0${s.stage + 1} / 04`;
    $('current-tool').textContent = TOOLS[s.tool].name;
    $('pug-title').textContent = stage.title;
    $('pug-description').textContent = stage.description;
    $('pug-tag').textContent = stage.tag;
    $('currency-label').textContent = s.stage === 3 ? 'Золотые камушки' : 'Твои камушки';
    $('held-tool').innerHTML = icons[s.tool];
    $('digging-arm').dataset.tool = s.tool;
    $('scene-hint').textContent = s.clicks === 0 ? 'Нажми на гору. Лапа справится.' : s.stage === 3 ? 'Королевские камушки сами себя не накопают.' : 'Ещё один взмах — ближе к дворцу.';
    rows.forEach((row, offset) => {
      const index = offset + 1, tool = TOOLS[index], button = row.querySelector('button');
      const owned = s.tool >= index, next = s.tool + 1 === index;
      row.classList.toggle('owned', owned);
      row.classList.toggle('available', next && s.balance >= tool.cost);
      row.classList.toggle('locked', !owned && !next);
      button.disabled = owned || !next || s.balance < tool.cost;
      button.innerHTML = owned ? '<span class="owned-check">✓</span>' : `<span class="pebble small" aria-hidden="true"></span><span>${tool.cost}</span>`;
      button.setAttribute('aria-label', owned ? `${tool.name}: куплено` : `Купить: ${tool.name}, ${tool.cost} камушков`);
      row.querySelector('.tool-note').textContent = owned ? (s.tool === index ? 'В лапе' : 'Куплено') : !next ? `Сначала ${TOOLS[index - 1].name.toLowerCase()}` : s.balance < tool.cost ? `Ещё ${number(tool.cost - s.balance)} камушков` : 'Можно покупать';
    });
    $('journey-progress').style.width = `${s.stage / 3 * 75}%`;
    document.querySelectorAll('[data-milestone]').forEach(el => {
      const index = Number(el.dataset.milestone);
      el.classList.toggle('current', index === s.stage);
      el.classList.toggle('done', index < s.stage);
      if (index === s.stage) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    });
    if (upgrade) {
      $('upgrade-name').textContent = upgrade.name;
      $('upgrade-description').textContent = upgrade.description;
      $('upgrade-symbol').textContent = upgrade.symbol;
      $('upgrade-action').textContent = s.stage === 2 ? 'Во дворец' : 'Позаботиться';
      $('upgrade-price').textContent = upgrade.cost;
      $('upgrade-pug').disabled = s.balance < upgrade.cost;
      $('upgrade-pug').setAttribute('aria-label', `${upgrade.name}: ${upgrade.cost} камушков`);
      $('purchase-progress-fill').style.width = `${Math.min(1, s.balance / upgrade.cost) * 100}%`;
      $('upgrade-remaining').textContent = s.balance < upgrade.cost ? `Ещё ${number(upgrade.cost - s.balance)} камушков до новой жизни` : 'Камушков достаточно. Мопс ждёт!';
    } else {
      $('upgrade-name').textContent = 'Жизнь удалась';
      $('upgrade-description').textContent = 'У мопса есть всё. Кроме чувства меры.';
      $('upgrade-symbol').textContent = '♛';
      $('upgrade-action').textContent = 'Королевский максимум';
      $('upgrade-price').textContent = '✓';
      $('upgrade-pug').disabled = true;
      $('upgrade-pug').setAttribute('aria-label', 'Все улучшения мопса куплены');
      $('purchase-progress-fill').style.width = '100%';
      $('upgrade-remaining').textContent = 'Дальше — только золотые камушки.';
    }
    $('victory').hidden = s.stage !== 3;
  }
  function celebrate(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').classList.add('visible');
    toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3300);
  }
  function floatPebbles(amount, event) {
    if (reducedMotion.matches) return;
    const rect = $('dig-scene').getBoundingClientRect();
    const x = event && event.clientX > rect.left && event.clientX < rect.right ? event.clientX - rect.left : rect.width * .67;
    const y = event && event.clientY > rect.top && event.clientY < rect.bottom ? event.clientY - rect.top : rect.height * .63;
    if ($('particles').children.length > 60) return;
    const floater = document.createElement('span');
    floater.className = 'floating-number'; floater.textContent = `+${amount}`;
    floater.style.left = `${x}px`; floater.style.top = `${y}px`;
    $('particles').append(floater); setTimeout(() => floater.remove(), 750);
    for (let i = 0; i < 4; i++) {
      const bit = document.createElement('span'); bit.className = 'flying-pebble';
      bit.style.left = `${rect.width * .56}px`; bit.style.top = `${rect.height * .69}px`;
      bit.style.setProperty('--dx', `${(Math.random() - .5) * 130}px`);
      bit.style.setProperty('--dy', `${-35 - Math.random() * 80}px`);
      bit.style.setProperty('--spin', `${Math.random() * 250}deg`);
      $('particles').append(bit); setTimeout(() => bit.remove(), 600);
    }
  }
  function dig(event) {
    const amount = game.dig(); render();
    clearTimeout(animationTimer);
    $('character').classList.remove('digging');
    void $('character').offsetWidth;
    $('character').classList.add('digging');
    animationTimer = setTimeout(() => $('character').classList.remove('digging'), 280);
    floatPebbles(amount, event); tone(320 + Math.random() * 80);
  }
  $('dig-scene').addEventListener('click', dig);
  $('dig-button').addEventListener('click', dig);
  document.addEventListener('keydown', event => {
    if (event.code !== 'Space' || event.repeat || $('restart-dialog').open || /^(BUTTON|INPUT|TEXTAREA|SELECT|A)$/.test(document.activeElement.tagName)) return;
    event.preventDefault(); dig();
  });
  $('upgrade-pug').addEventListener('click', () => {
    const before = game.getState().stage;
    if (!game.upgradePug()) return;
    render(); celebrate(UPGRADES[before].message); tone(750, .2);
  });
  $('sound').addEventListener('click', () => {
    sound = !sound;
    $('sound').textContent = sound ? 'Звук: вкл.' : 'Звук: выкл.';
    $('sound').setAttribute('aria-pressed', sound);
    $('sound').setAttribute('aria-label', sound ? 'Выключить звук' : 'Включить звук');
    if (sound) tone(440, .08);
  });
  $('restart').addEventListener('click', () => $('restart-dialog').showModal());
  $('cancel-restart').addEventListener('click', () => $('restart-dialog').close());
  $('confirm-restart').addEventListener('click', () => {
    game.reset(); render(); $('particles').replaceChildren();
    clearTimeout(animationTimer); $('character').classList.remove('digging');
    $('restart-dialog').close(); celebrate('Новая история. С большой надеждой и маленькой лапой.');
  });
  render();
  Promise.all(['backgrounds.png', 'pugs.png'].map(src => new Promise((resolve, reject) => {
    const img = new Image(); img.onload = resolve; img.onerror = reject; img.src = src;
  }))).then(() => $('art-loading').hidden = true).catch(() => {
    $('art-loading').textContent = 'Картинки не загрузились. Попробуй обновить страницу.';
  });
})();
