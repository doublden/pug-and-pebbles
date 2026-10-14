# Mortik 0.6.0 artwork

Generated and edited with the built-in **image_gen** tool. Sharp only compresses/packs the generated originals; runtime Canvas places and animates layers. Original animal photos and personal screenshots remain private local references.

## Rerender brief / Задание

Fourteen separate portrait backgrounds: detailed warm cartoon-realistic 3D illustration, 1024×1536; progression from scrapyard and poor alleys through a bed yard, kennel, stone home and rich estate. Architecture in the upper half, clear playable foreground, no dog, bowl or UI embedded in the background. Runtime files: `artwork-v6/background-00.webp` through `background-13.webp`.

Fourteen separate transparent food sprites, 1536×1024: rusty almost-empty cobwebbed bowl with two pieces; gradually fuller repaired bowls; clean cream paw-print bowl; overflow hiding the bowl; freestanding brown mound; progressively more gold; final large golden mound. Complete uncropped outline, warm detailed texture, transparent margins. Targeted edits removed the accidentally retained bowls in stages 12 and 13. Runtime files: `artwork-v6/food-00.webp` through `food-13.webp`.

All ten hats were redrawn as compact head-fitting front, right-facing side and rear sprite sheets: carrot, frog, snowflake, bunny, ushanka, backward cap, pirate, umbrella, saucepan and nightcap. Rounded lower contact rims, correct perspective. Umbrella has a thin head band without a forehead buckle. Rear cap exposes its visor toward the viewer; rear frog/ushanka/pirate do not show front ornaments. Runtime: `hats-v6.webp`, `hats-side-v6.webp`, `hats-back-v6.webp`.

Vasiliy rig edit: remove the static head inside the chassis while preserving the body, cabin, tracks and articulated parts; draw exactly one animated head in the cabin. Runtime: `vasiliy-rig-v6.webp`.

## Local originals / Локальные оригиналы

`assets/source-v6/background-00.png` … `background-13.png`, `food-00.png` … `food-13.png`, `hats-front.png`, `hats-side.png`, `hats-back.png`, `rig.png`. These source PNGs are local and excluded from publication; only optimized runtime WebP files are shipped.

## Fit and rendering / Проверка

All 10 hats × 15 pug stages × 24 poses = 3,600 static fits were visually inspected. Head anchors interpolate through movements; only one hat is rendered. The rig chassis stays opaque while joints animate continuously. Local visual proofs are in `output/hat-audit-v6/` and mobile QA screenshots; these QA files are excluded from the deployed game.

Backgrounds and food load per current location. Canvas respects up to DPR 3; portrait composition uses larger food and a smaller pug. An unavailable detailed asset falls back to the core scene, with retry throttling rather than network requests every frame. No new production dependency is added.
