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
