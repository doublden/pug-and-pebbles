# Mortik — animation study / Пример живой сцены

Standalone, silent, non-interactive 18-second character loop. Open `index.html` through a web server. This is a 2D cutout animation study, not a 3D build or a game update. No UI, saves, gameplay, cookies, dependencies or external requests. Does not register a service worker.

Отдельная немая сцена: дыхание и наклон головы мопса, моргание, хвост, плавный ковш Василия, солнечные частицы и бабочка. Демонстрация 2D-анимации из независимых слоёв; не обновляет основную игру и её сохранения.

## Artwork

New pug body, head, closed eyelids and tail: generated with the built-in ImageGen tool using the existing `pugs-idle.png` as the identity/style reference, then atlas cells extracted, isolated, trimmed and compressed to WebP. Garden, bowl and excavator reuse the project's original artwork. No private reference photos are included.

Final generation prompt:

> Production 2D skeletal puppet texture atlas, exactly 2 columns x 2 rows, square image, genuine transparent alpha, no backdrop, no shadows outside objects. Reference image shows our existing Mortik pug; preserve his specific wrinkled fawn face, dark folded ears and dark muzzle, detailed illustrated fur, soft warm realistic cartoon game rendering. Build one coherent moderately plump sitting pug facing camera with a slight turn to viewer's right. Four separated animation rig parts in equal cells, fully inside each cell with margin, no labels/text: top left complete sitting body, hind legs, belly, front legs and paws, no head/tail, soft neck stump for overlap; top right isolated full head and ears, alert brown eyes, closed mouth, no body/collar; bottom left small curled fawn tail; bottom right exactly matching head with both eyes gently closed. Warm sunlight from upper left across all parts, crisp detailed fur, broad natural anatomy, recognizable reference face. Flat 2D illustration with volume, not a photo or plastic. No assembled dog, checkerboard or black background.

## Validation

- JavaScript syntax checked; scene loaded without browser errors.
- Visual checks at 430×932 and 375×812 CSS pixels, including closed eyelids and tilted head.
- Aspect-preserving rendering, independent piece transforms, cached helper parts, capped pixel ratio, animation paused when tab is hidden; reduced-motion preference supported.
- Physical phones and a sustained frame-rate/thermal benchmark have not been tested.
- `?frame=2.9` / `?frame=12.8` freeze the demonstration for visual inspection. Normal URL animates automatically.
