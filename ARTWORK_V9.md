# Mortik 0.9.0 — layered art / Слоистая графика

The approved standalone scene is now the production animation approach: independent illustrated pieces, articulated paws, fixed skulls with local facial motion and explicit accessory mounts. This is 2D cutout animation, not a Unity/3D conversion. No new runtime package is required.

Все 16 визуальных стадий сохранены. Они собраны из четырёх нарисованных анатомических семейств — худой, здоровый, круглый и мускулистый — с индивидуальной шириной тела, степенью загрязнения, ошейником и короной. Голова сидит низко между плечами. Четыре семейства содержат по 12 независимых деталей, включая отдельные головы спереди/сбоку/сзади, закрытые глаза, пасть, туловища и лапы. Движения и их переходы хранятся в `pug-rig-v9.js`; полный список — `ANIMATIONS_V9.json`.

## Generation and processing

Built-in ImageGen was used; no API/CLI fallback. References were the existing game artwork (`pugs-idle.png`, the approved scene head, `assets-v8/muscle-0.webp`, `battle-v7/pug-healthy.webp`). Private animal photographs are not included in this update. Generated alpha is preserved. Technical processing extracts connected components, isolates them from neighboring objects, repacks into safe 512-pixel cells and encodes WebP. Original generations remain local; the four final atlases and measured source/component rectangles are versioned in `assets-pug-v9/`.

The first generations incorrectly included forelegs in seated torsos. A focused correction generated arm-free torsos for all four families. Another correction generated proper biped combat bodies so an extra baked-in foreleg cannot appear. The final cells, not the rejected bodies, ship.

## Final prompt set

**Shared 12-part puppet prompt:** Production 2D game skeletal character atlas, exactly three columns and four rows on genuine transparent background, no labels or shadows behind pieces. Match Mortik's familiar wrinkled fawn pug face, flat dark muzzle, floppy ears, brown eyes, detailed warm cream fur and soft upper-left light. All cells are separate disassembled pieces of the same character, centered with clear margins: row 1 front sitting torso with hindlegs, no head/frontlegs/tail and extremely short neck; front head with ears and open eyes; matching closed-eye head. Row 2 lying body with paws and absent head at the right neck joint; upright rear-facing body on hindlegs; right-profile head. Row 3 back of head; curled tail; left foreleg from shoulder to paw. Row 4 matching right foreleg; matching yawning head with open mouth and tongue; right-facing action torso. Compact anatomical proportions, heads sit low between shoulder tops, clean alpha, no collars/outfits, no checkerboard or complete assembled dog.

**Four body specifications:** skinny adult with narrow belly/slender limbs; ordinary compact healthy adult; comically obese round adult; athletic muscular pug with abs/pecs/biceps/triceps and dog paws. The identity and fur treatment remain consistent.

**Torso correction prompt:** Four torso components in a 2×2 transparent atlas: skinny, healthy, obese, muscular. Body, belly and two hindlegs only. Remove both frontlegs entirely; unobstructed chest/belly, rounded furry shoulder attachments, no forearms/frontpaws/stubs, no head/tail or tall neck. Front view, warm matching fur, clear cell separation.

**Combat correction prompt:** Four headless, armless biped pug bodies in a 2×2 transparent atlas. Torso and two hindlegs only, balanced right-facing three-quarter fighting stance, extremely short neck, rounded shoulder attachments, no forelimbs, head, tail or clothes. Skinny/healthy/obese/muscular body types, matching fawn fur and lighting, generous margins.

## Hats and other characters

`assets-v9/` repacks the original first ten hats in three views without sliced wearing bands or ushanka flaps. Four secret hats retain their existing complete art. `hat-attachments-v9.js` defines all 14 wearing openings and attaches them to moving skull crowns, including the reversed cap perspective, umbrella rain and yogurt rainbow.

Birds, bosses, insects and the five bonus friends have new independent-piece atlases; see `ARTWORK_CHARACTERS_V9.md`. Vasiliy uses one fixed skull with local eyelids/mouth and independently moving excavator joints. Weapons use measured handle grips in combat and a body mount when carried.

## Limits

Some front/profile/rear views use different drawings with continuous transforms; this is not unrestricted 3D rotation. A brief, aligned torso-only blend is used while lying down; the face never dissolves into a second model. Physical-device thermal/FPS tests and real Safari installation are separate from the recorded browser and renderer checks.
