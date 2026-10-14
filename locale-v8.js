(function () {
  'use strict';
  const additions = {
    ru: {
      beds: 'Лежанки',
      album: 'Гости',
      bedRule: 'Одна активная лежанка даёт небольшой бонус. Остальные остаются в коллекции.',
      noBed: 'Убрать лежанку',
      bedNames: [
        'Коробка мечты',
        'Носковое гнездо',
        'Лесная подушка',
        'Тыквенный уют',
        'Космический плед',
        'Бархатный трон',
        'Трофей енота',
        'Перина ворона',
        'Ложе паладина',
      ],
      bedDescriptions: [
        '+2% ручной добычи',
        '−3% ожидания мини-игр',
        '−5% потерь от птиц',
        '+5% ширины миски в мини-игре',
        '+4% добычи Василия',
        '+4% награды экспедиций',
        '−10% потерь от птиц',
        '+5% наград за насекомых',
        '+6% добычи Василия',
      ],
      bedHints: ['Победи наглого енота', 'Победи большого ворона', 'Собери меч паладина'],
      guestNames: ['Ворона', 'Воробей', 'Воробей Джек', 'Бабочка', 'Пчела', 'Юпи'],
      albumRule:
        'Знакомься с редкими гостями. Неизвестные пока скрыты. Тестовые вызовы не пополняют альбом.',
      seen: 'Встречен',
      caught: 'Пойман',
      netName: 'Сачок для ловли Юпи',
      netDescription:
        'Что это и зачем — никто не знает. Одноразовая покупка; бонуса к копанию не даёт.',
      yuppiCaught: 'Юпи пойман! Загляни в коллекцию.',
      effectsIntensity: 'Слюни и облака',
      revealHidden: 'Показать скрытые предметы',
      spawnGuest: 'Вызвать редкого гостя',
      hiccup: 'Мопсиная икота',
      zoomies: 'Охота за хвостом',
      copyright: '© @doublden · Сделано из любви к мопсам',
      stageSecret: 'Что-то необычное… Узнаешь после покупки.',
      hatNames: ['Пук-пук', 'Yuppi!', 'Бабочка', 'Пчёлка'],
      hatDescriptions: [
        '5% шанс удвоить обычную ручную добычу. Не усиливает гостей и мини-игры.',
        '+10% награды экспедиции. Бонус фиксируется при отправке.',
        '+20% наград за бабочек и пчёл',
        '−5% времени экспедиции при той же награде',
      ],
      secretHints: [
        'Заполни весь экран облаками',
        'Поймай Юпи сачком',
        'Поймай 50 бабочек',
        'Поймай 100 пчёл',
      ],
      awardNames: [
        'Пук-пук или тук-тук?',
        'Поймать Юпи',
        'Порхай как бабочка',
        'Пчелиный укротитель',
        'Паладин помойки',
        'Мопс без пропуска ног',
        'Дубайский камушек',
        'Василий терпит',
      ],
      awardDescriptions: [
        'Закрой весь экран облаками за одну серию быстрых нажатий',
        'Один раз поймай Юпи сачком',
        'Прогони 50 бабочек',
        'Прогони 100 пчёл',
        'Собери меч паладина',
        'Открой скрытую форму мопса',
        'Открой скрытую локацию',
        'Погладь работающего Василия 100 раз',
      ],
    },
    en: {
      beds: 'Beds',
      album: 'Guests',
      bedRule: 'One equipped bed gives a small bonus. The others stay in your collection.',
      noBed: 'Remove bed',
      bedNames: [
        'Dream box',
        'Sock nest',
        'Forest cushion',
        'Pumpkin comfort',
        'Space blanket',
        'Velvet throne',
        'Raccoon trophy',
        'Crow feathers',
        'Paladin bed',
      ],
      bedDescriptions: [
        '+2% manual income',
        '−3% minigame cooldown',
        '−5% bird losses',
        '+5% bowl width in Catch food',
        '+4% Vasiliy income',
        '+4% expedition reward',
        '−10% bird losses',
        '+5% insect rewards',
        '+6% Vasiliy income',
      ],
      bedHints: ['Defeat the cheeky raccoon', 'Defeat the giant crow', 'Craft a paladin sword'],
      guestNames: ['Crow', 'Sparrow', 'Jack the sparrow', 'Butterfly', 'Bee', 'Yuppi'],
      albumRule: 'Meet rare visitors. Unknown guests stay hidden. Developer spawns do not count.',
      seen: 'Seen',
      caught: 'Caught',
      netName: 'Yuppi catching net',
      netDescription: 'What is this for? Nobody knows. One purchase, no digging bonus.',
      yuppiCaught: 'Yuppi caught! Check your collection.',
      effectsIntensity: 'Slobber and clouds',
      revealHidden: 'Reveal hidden items',
      spawnGuest: 'Spawn a rare guest',
      hiccup: 'Pug hiccups',
      zoomies: 'Tail chase',
      copyright: '© @doublden · Made with love for pugs',
      stageSecret: 'Something unusual… Buy it to find out.',
      hatNames: ['Poot-poot', 'Yuppi!', 'Butterfly', 'Bee'],
      hatDescriptions: [
        '5% chance to double regular manual income. Does not boost guests or minigames.',
        '+10% expedition reward, locked in at dispatch.',
        '+20% butterfly and bee rewards',
        '−5% expedition duration with the same reward',
      ],
      secretHints: [
        'Cover the entire screen with clouds',
        'Catch Yuppi with the net',
        'Catch 50 butterflies',
        'Catch 100 bees',
      ],
      awardNames: [
        'Poot-poot or knock-knock?',
        'Catch Yuppi',
        'Float like a butterfly',
        'Bee keeper',
        'Junkyard paladin',
        'Never skip leg day',
        'Dubai pebble',
        'Vasiliy puts up with it',
      ],
      awardDescriptions: [
        'Cover the screen with clouds in one fast tapping streak',
        'Catch Yuppi once with the net',
        'Swat 50 butterflies',
        'Swat 100 bees',
        'Craft a paladin sword',
        'Unlock the secret pug form',
        'Unlock the secret location',
        'Pet working Vasiliy 100 times',
      ],
    },
  };
  for (const lang of ['ru', 'en']) {
    const w = PugLocale[lang],
      a = additions[lang];
    for (const key of [
      'hatNames',
      'hatDescriptions',
      'secretHints',
      'awardNames',
      'awardDescriptions',
    ]) {
      w[key].push(...a[key]);
      delete a[key];
    }
    Object.assign(w, a);
    w.lifeAbout =
      lang === 'ru'
        ? 'Достигни последней стадии мопса и начни заново с небольшим постоянным бонусом. Коллекции шляп, лежанок, оружия и гостей останутся. После сброса нужно снова вырастить мопса. Ранее заслуженное право на новую жизнь сохраняется.'
        : 'Reach the final pug form and begin again with a small permanent bonus. Keep hats, beds, weapons and your guest album. Raise your pug again after each reset. Previously earned New life eligibility is preserved.';
    w.lifeLocked = lang === 'ru' ? 'Достигни последней стадии мопса.' : 'Reach the final pug form.';
    w.introBodies[0] =
      lang === 'ru'
        ? 'Нажимай на миску или камушки. Чем быстрее жмёшь, тем больше получаешь: комбо исчезает после короткой паузы. Тапы по мопсу тоже приносят камушки.'
        : 'Tap the bowl or pebbles. Faster tapping earns a small combo bonus; a brief pause ends it. Tapping your pug also earns pebbles.';
    w.pugNames.push(lang === 'ru' ? 'Мопс качок' : 'Muscle pug');
    w.homeNames.push(lang === 'ru' ? 'Дубайский пентхаус' : 'Dubai penthouse');
  }
})();
