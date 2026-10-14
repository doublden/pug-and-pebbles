# Мопс и камушки / Pug & Pebbles — 0.6.0

[Играть / Play](https://doublden.github.io/pug-and-pebbles/?v=0.6.0) · [GitHub](https://github.com/doublden/pug-and-pebbles)

[План следующих обновлений](ROADMAP.ru.md) · [Next update roadmap](ROADMAP.en.md)

## Русский

Мобильный кликер про мопса Мортика. Копайте камушки, покупайте инструменты, улучшайте мопса и его дом. Ловите падающих друзей ради временного бонуса и прогоняйте птиц, которые воруют корм. Быстрые нажатия дают небольшое комбо.

В магазине доступны покупки ×1, ×10 и максимум, шляпы и кот Василий. Василий копает сам или отправляется в экспедицию на 15 минут, час или три часа. Мини-игры: вычесать мопса, поймать корм и собачьи три в ряд. Достигнув мопса короля, можно добровольно начать Новую жизнь с небольшим постоянным бонусом и сохранением коллекции.

**На iPhone:** откройте игровую ссылку в Safari → «Поделиться» → «На экран Домой». Если предлагается переключатель «Открывать как веб-приложение», включите его. Игра запускается отдельно от браузерного окна. Сохранение находится на этом устройстве; после первого онлайн-запуска игра кэширует рисунки для работы без сети.

**В 0.6.0:** исправлены наложения комбо/бонуса и двойная голова Василия; все шапки перерисованы и проверены во всех стадиях/позах. Анимации мопса более плавные и медленные. Перерендерены 14 локаций и 14 стадий корма с загрузкой по мере необходимости. Корм увеличен на 10%, мопс уменьшен на 10%. Три в ряд поддерживают свайпы, клетки стали понятнее. Игра работает в вертикальном формате.

**Ранее, в 0.5.0:** устранено зависание экскаватора; его ковш анимируется отдельными подвижными деталями. Перерисованы шапки в трёх ракурсах и кадры вида мопса сзади. Добавлены экспедиции, комбо, массовые покупки, ближайшая цель, третья мини-игра, понятное меню Новой жизни, новая иконка Mortik и натуральные звуки. Укорочена инструкция. Птицы следуют за позой мопса. Исправлено взаимодействие нескольких вкладок.

Настройки: русский/английский, музыка и эффекты с отдельной громкостью, проверка звуков, инструкция, полный сброс с подтверждением. Режим разработчика с кодом **1435** предназначен для тестов и отмечает тестовый прогресс.

## English

A mobile-first clicker about Mortik the pug. Dig pebbles, buy tools, improve the pug and his home. Catch falling friends for a temporary bonus and chase birds before they steal food. Fast tapping builds a small combo.

Buy ×1, ×10 or the maximum affordable upgrades. Collect hats and hire grumpy Vasiliy: let him excavate or send him on a 15-minute, one-hour or three-hour expedition. Play Brush the pug, Catch the food and Doggy match three. Reach King pug to unlock an optional New life with a small permanent production bonus while keeping your collection.

**On iPhone:** open the play link in Safari → Share → Add to Home Screen. Enable “Open as Web App” if offered. Progress is stored on the device. The first online launch caches artwork for offline use.

**0.6.0:** fixes overlapping combo/bonus HUD and Vasiliy’s duplicate head; redraws and audits all hats across stages/poses. Pug motions are smoother and slower. Rerenders 14 locations and 14 food stages with on-demand loading. Food is 10% larger and the pug 10% smaller. Match three supports swipes and clearer cells. Portrait-only gameplay.

**Previously, 0.5.0:** fixes the excavator freeze; adds continuously articulated machinery, three-view hats, rear-facing pug sprites, expeditions, tap combos, bulk purchasing, nearest goals, match three, a clear New life flow, the Mortik icon and natural recorded effects. The tutorial is shorter. Birds track the pug's current pose. Multiple tabs no longer simulate and overwrite progress simultaneously.

Settings include RU/EN, separate music/effects volumes, a sound test, tutorial and confirmed full reset. Developer code **1435** enables testing tools and marks the save as test progress.

## Development / Разработка

Plain HTML, CSS and JavaScript; no framework or production dependencies. Start a local static server from the repository root, then open its localhost URL. GitHub Pages publishes `main`.

Currency uses immutable scientific amounts. Economy, collections and mini-games are pure modules tested with Node:

```sh
node --test tests/*.test.cjs
```

78 automated tests cover legacy-save migrations, progression, hats, achievements, capped rewards, expeditions, bulk quotes, combo timing, tab ownership and the excavator rendering regression. Desktop browser checks cover responsive layouts, controls, recordings and PWA caching. Physical iPhone/Safari validation remains a device test; desktop viewport emulation does not replace it.

[Economy / Экономика](ECONOMY.md) · [Release notes / Изменения](RELEASE_NOTES.md) · [Sound credits / Источники звуков](AUDIO_CREDITS.md) · [Artwork / Рисунки](ART_BRIEF_V6.md)
