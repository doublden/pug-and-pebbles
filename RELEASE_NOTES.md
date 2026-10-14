# 0.7.0 — Crisp motion, composition and economy / Чёткие позы, композиция и экономика

## Русский

Одно обновление: блоки 2.1 + 3.1 + 4 + 5 + 6.

- Убрано долгое наложение разных поз мопса. Кадры удерживаются дольше, шапки и птицы следуют видимой позе.
- Василий с экскаватором увеличен на 25%; корм ещё на 10%, выше и по центру; мопс ещё на 10% меньше с прежней точкой привязки.
- Первые покупки мопса/дома требовательнее, бонусы стадий и обычных шапок заметнее. Поздний темп в сравнительной модели примерно на 11% доступнее при ручной стратегии без помощника и мини-игр; это не обещание длительности прохождения.
- Дом/мопс покупаются по одной стадии; магазин закрывается, появляется превращение с лучами. ×1/×10/максимум остаются у копалок и Василия.
- Главная точка магазина — только новая копалка, дом или мопс. У каждой категории своя точка; улучшения копалок показывают прибавку общей силы тапа.
- Идеальные мини-игры: 160/240/360 обычных тапов, сила фиксируется на старте; частичный результат пропорционален. Ловля корма ограничена 30 секундами. Зайчик помогает вычёсывать, кастрюля замедляет падение, не увеличивая потолок награды.
- Василий: базовый уровень 1 обычный тап/с, рост L^0.35; способность ×2 на 10 секунд раз в пять минут. 11 расцветок экскаватора, рост каждые 10 уровней, старые цвета и наклейки доступны отдельно.
- Экспедиции: отмена с предупреждением, однократное уведомление о возвращении, хлам и оружие; деньги и находки фиксируются при отправке. Первая учебная поездка даёт три части; обычные шансы 35% / 80% / 100%, гарантия после двух неудач.
- Инвентарь: девять видов оружия, объединение 3 → 1, экипировка и отображение за спиной. Выбор скинов инструмента/мопса/дома/корма за 500 тыс. / 1 млн / 1,5 млн / 750 тыс., без изменения силы.
- Бои с енотом (200 HP) и большой вороной (400 HP): 30 секунд, разные атаки/защиты, оружие следует лапе, шапка и корм скрыты. Добыча и события на паузе; таймер идёт в фоне. Повтор бесплатный, приз и открытие покупки дома — один раз. Старые купленные дома сохранены.
- Сохранены балансы, купленные уровни, коллекции, таймеры и уже отправленные экспедиции. Обновлён кэш веб-приложения и резервная версия сохранения. Боевые рисунки: 60 кадров, пять WebP-листов, около 1,16 МБ; загружаются перед боем, таймер во время загрузки не идёт.

Проверка: 115 автоматических теста; шесть мобильных размеров (включая 430×932), магазин/покупки, позы, касания и обновление кэша. Проверка в браузере не заменяет тест на физическом iPhone. Блоки 7–10 остаются в плане.

## English

One release combines blocks 2.1 + 3.1 + 4 + 5 + 6.

- Crisp held pug frames replace long pose crossfades; hats and birds track the visible frame.
- Vasiliy/excavator +25%; food another +10%, raised and centered; pug another −10%, preserving its anchor.
- More demanding first pug/home purchases and stronger stage/ordinary-hat benefits. Comparison-model late progression is about 11% faster in a manual strategy without helper/mini-games, not a playtime promise.
- Pug/home upgrades are single-step and close the shop with transformation rays. Tools/helper retain bulk buying.
- Main badge only for a new tool, home or pug; category badges and actual total-tap upgrade gains.
- Perfect mini-games award 160/240/360 ordinary taps using starting power; partial success scales proportionally. Catch food has a 30-second limit. Assistance hats improve the task without exceeding the payout cap.
- Vasiliy starts at one ordinary tap/s, scales with level^0.35 and has a ×2 ten-second ability every five minutes. Eleven paint tiers, bounded growth, optional earlier paints/stickers.
- Expeditions have cancellation, one-time ready notifications, junk and weapon loot fixed at dispatch. First training trip guarantees three parts; ordinary chances 35% / 80% / 100%, with a two-miss pity rule.
- Nine weapons, 3-to-1 crafting and back equipment; cosmetic selectors cost 500k / 1m / 1.5m / 750k without changing power.
- Raccoon (200 HP) and giant crow (400 HP): 30 seconds, multiple attacks/guards, weapon tracks the paw, hat/food hidden. Production/events pause; the deadline continues in the background. Free retries, one-time prize/home purchase clearance, existing homes preserved.
- Wallets, purchases, collections, cooldowns and dispatched expedition rewards survive. Updated PWA cache and versioned save backup. Combat art: 60 frames in five WebP sheets, about 1.16 MB, loaded before the timer starts.

Validation: 115 automated tests, six mobile layouts including 430×932, shop flows, pose/touch checks and cache update. Browser-size testing is not a physical iPhone test. Blocks 7–10 remain planned.

---

# 0.6.0 — Blocks 1–3 / Блоки 1–3

- RU: разнесены счётчики комбо и бонуса; исправлена двойная голова Василия. Свайпы трёх в ряд, контрастные клетки, вертикальная сцена и пауза при повороте.
- RU: заново нарисованы все 10 шапок спереди, сбоку и сзади; проверены 3 600 сочетаний. Более медленные движения и плавное смешивание промежуточных кадров без двойной шапки.
- RU: 14 детальных локаций и 14 стадий корма; загрузка текущей пары, ограниченные кэши и резервная графика для офлайн. Корм +10% по размеру, мопс −10% и немного левее.
- EN: separate combo/bonus counters, repair Vasiliy’s duplicate head, add match-three swipes and readable cells, portrait scene with landscape pause.
- EN: redraw all ten hats in front/side/rear views and inspect 3,600 fits; slower motions and intermediate-frame blending with one attached hat.
- EN: rerender 14 locations and 14 food stages; load the current pair, bound memory caches and keep offline fallbacks. Food is 10% larger; the pug is 10% smaller and slightly left.

Validation / Проверки: 78 Node tests pass. Six logical mobile sizes: 430×932, 375×812, 390×844, 393×852, 360×800, 412×915; landscape notice, hiring/upgrade rendering, reset, native horizontal swipe and offline startup were checked in the desktop browser. Vertical swipe, cancelled gestures and multi-touch are covered by automated UI tests. Physical iPhone/Safari tests remain to be performed on the device. Save schema and economy are preserved.

Future scope / Дальше: blocks 4–9, including stronger mini-game rewards, inventory skins, expedition cancellation/claim banners, bosses, secrets and beds, are recorded in the bilingual roadmap and are not enabled here.

# 0.5.0 — Mortik и экспедиции / Mortik and expeditions

## Русский

- Исправлено зависание после найма Василия: неверный вызов Canvas останавливал отрисовку. Сброс и Новая жизнь обновляют сцену.
- Экскаватор получает отдельные подвижные детали с непрерывным движением; корпус не растворяется между кадрами. Василий моргает, зевает, оглядывается и закатывает глаза; машина ездит. Тап по Василию копает корм.
- Экспедиции на 15 минут, час и три часа: экскаватор простаивает, награда фиксируется при отправке и не растёт после возвращения. Ручное копание доступно.
- Покупки ×1 / ×10 / максимум с полной ценой и шкала ближайшей цели в магазине.
- Быстрые нажатия дают комбо до +20%. Пауза 0,5 секунды сбрасывает его. Цвет счётчика меняется от коричневого до огненного.
- Все десять шапок перерисованы; добавлены боковой и задний ракурсы. Кепка носится козырьком назад; при заднем ракурсе виден козырёк. На заднем ракурсе мопса медаль скрыта.
- Птицы учитывают положение головы мопса, включая сон и движение.
- Новая иконка Mortik по фото мопса, включая Apple touch icon.
- Натуральные записи чиха, пука и хрюканья; разные длительности и тембры. Первый тап активирует звук, добавлены проверка звуков и поддержка Audio Session API там, где она доступна.
- Разные формы слюней исчезают примерно за секунду. Частыми чихами всё ещё можно закрыть весь экран и получить достижение.
- «Собачьи три в ряд»: 45 секунд, управление тапами или свайпом. Награда ограничена; у каждой мини-игры картинка, правила и живой таймер отдыха.
- Инструкция сокращена до пяти базовых слайдов без раскрытия секретов.
- Кнопка Новой жизни всегда открывает описание. Доступный переход требует отдельного подтверждения с точным постоянным бонусом.
- Сжатые мобильные атласы, загрузка нужных поз по запросу, ограниченное хранение декодированных поз, кэширование цен и изображений магазина. Начальные три атласа: около 0,58 МБ вместо 1,55 МБ.
- Отдельный резервный формат сохранения сохраняет старые покупки. Одна вкладка управляет симуляцией, чтобы фоновые вкладки не обнуляли награды мини-игр.

## English

- Fixes a malformed Canvas ellipse call that stopped the excavator's render loop and made reset appear frozen.
- Adds a continuously articulated excavator, cat expressions, driving and ordinary digging when tapping Vasiliy.
- Adds fixed-reward expeditions (15 min / 1 h / 3 h), ×1 / ×10 / maximum purchases, nearest goals and a capped +20% tap combo with a 0.5-second timeout.
- Redraws all ten hats with front/side/rear views; backward-cap orientation and rear collars are corrected. Birds follow current head position.
- Adds the Mortik iPhone icon, natural recorded effects, sound testing and supported audio-session activation.
- Adds Doggy match three, illustrated mini-game cards and live cooldowns; shorter tutorial and a two-step New life confirmation.
- Irregular spit fades in about one second while rapid sneezing can still cover the screen.
- Optimizes startup artwork to about 0.58 MB, loads regular poses on demand, bounds retained decoded poses and caches shop quotes/previews.
- Migrates previous saves and prevents concurrent tabs from overwriting an active mini-game.

Hat QA: 3,600 geometric attachment checks across every hat, stage and keyframe, plus visual review of 720 reference frames. Crowns are removed from a dedicated king-with-hats atlas instead of clipping the pug. / Шапки: 3 600 проверок посадки и визуальный просмотр 720 контрольных кадров; отдельные королевские кадры без короны сохраняют целую голову.

Validation: 69 automated tests plus desktop browser checks. Physical iPhone/Safari testing remains a device check.

---

# 0.4.1

Уточнена траектория падающего корма на экране загрузки: вращение каждого камушка происходит вокруг его центра. Основное обновление описано ниже.

# 0.4.0 — Василий, шляпы и Новая жизнь

- Загрузка: самосвал с кормом и проценты реально загруженных необходимых рисунков.
- Добавлены165 промежуточных кадров мопса (11 действий×15стадий),24 кадра птиц и8 кадров работы Василия; сцена рисуется до60кадров/с.
- Быстрые чихи полностью перекрывают экран брызгами; «Большой чих» выдаётся за реальное перекрытие и открывает зонтик.
- Две мини-игры: вычесать мопса жестами и поймать24камушка в четырёх направлениях.
- Магазин10шляп с небольшими разными бонусами;4тайные шляпы за события. Всего22достижения.
- Кот Василий по фотографиям: недовольный полосатый кот в экскаваторе, отдельные уровни автоматической добычи.
- Добровольная Новая жизнь после королевской стадии: сохраняет коллекцию, первый постоянный бонус+1.90%, последующие уменьшаются.
- Быстрее первый запуск: необходимые3–4атласа сначала, остальные рисунки фоном. Офлайн-кэш пополняется постепенно.
- Сохранены мобильный интерфейс, RU/EN, музыка и громкости, монетки, птицы, редкие сцены, настройки сброса, разработчик1435 и установка через Safari на домашний экран.

Формулы, ограничения и бонусы: [ECONOMY.md](ECONOMY.md).
