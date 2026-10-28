# Layered character motion / Послойная анимация персонажей

All new raster artwork was created with the built-in ImageGen tool. No external model service, paid API or private photo upload was used. Reference inputs were the game's existing published illustrations. Generated originals remain in the local generated-images history; the repository stores optimized transparent WebP atlases and measured extraction metadata.

Новые иллюстрации созданы встроенным ImageGen по уже существующим игровым иллюстрациям. В игру загружаются прозрачные WebP-атласы; исходные старые изображения сохранены для совместимости. Это 2D-персонажи из независимых частей, не 3D-модели.

## Final prompt set / Финальные задания генерации

1. **Birds:** a four-column, three-row transparent puppet atlas of the reference crow, house sparrow and pirate sparrow. Each row contains torso/tail/feet, isolated matching head, near spread wing and far spread wing. Preserve detailed feathers, reference colors, a small tricorn and eye patch on Jack; no complete duplicate birds, labels, background or motion blur. Root of wings at lower right, heads face right. Normalize extracted parts to 384-pixel cells with generous margins.
2. **Raccoon boss:** a four-column, two-row transparent atlas matching the original cheeky gray raccoon. Parts: upright torso and hind legs with no head/arms/tail; neutral three-quarter head facing left; near upper arm; near forearm/fist; far upper arm; far forearm/fist; striped tail; exact same closed-eye head for local eyelid extraction. Preserve fur, mask and short natural neck overlap; no full assembled duplicate characters, labels or background.
3. **Crow boss:** matching four-column, two-row atlas for the angry orange-eyed charcoal crow. Same parts as the raccoon but upper wings and forewings instead of arms. Complete talons, isolated tail feathers, matching neutral/closed heads; natural hidden joint overlap, crisp feather edges and no frame blur.
4. **Insects:** three-column, two-row transparent atlas of the purple-blue butterfly and fuzzy yellow-black bee. One row per species, each containing complete wingless body/head/legs/antennae, near wing and smaller far wing, with root at lower right. Preserve reference eyes, stripes and iridescent spots; no repeated heads on wings, complete assembled insects, text or background.
5. **Friends:** five-column, two-row transparent atlas of the five reference animal heads, without coins or bodies. Top row: grumpy tabby, round-eyed tuxedo, cloudy-eye tabby, smiling corgi, cream spitz with one folded ear. Bottom row: identical heads with gently closed eyes, same skull, markings, ears and mouth. Preserve individual identities; no extra animals, labels or background. The gold medallion is drawn separately in the renderer.

## Motion and review

- Independent head, limb and wing transforms; cached parts; local eyelids/mouth only.
- Vasiliy's neutral skull remains stable while eyes roll, blink and yawn. Articulated machine joints use a local paused clock; burst speed preserves the current phase. Traveling treads receive local movement.
- Boss limbs use two-bone reach, matching fur/feather elbow patches, two attack variants and a 45ms target-follow filter for rapid taps. Defeat is a continuous fall rather than a new full-body picture.
- The Yuppi model stays on one consistent reference painting with a small continuous body wave and local facial reactions.
- Corrected legacy bee fallback: the first complete bee is cell 7; cell 6 is a clipped butterfly fragment.
- Browser inspection covered crow/sparrow/Jack flight and pecks, both boss stances/attacks/guards, butterfly/bee wings, Yuppi and all five animated friend portraits. Automated checks cover motion bounds/continuity, local paused clocks, burst phase, alpha/payload and existing bird/battle rules.
- Local review page: `tests/characters-motion-v9.html`. Saved review image: `output/qa-v9/characters-neutral.png` (local evidence, not required at runtime).
- Combat loading first awaits the new pug rig, new boss and equipped weapon. It fetches old combat metadata/artwork only if the new models fail to load; that fallback stays fixed for the entire fight. The menu previews the new boss model as well. Automated loading checks cover successful new models, offline fallback, cancellation and complete failure.
- `tests/combat-rigs-v9.html` exercises the actual pug and boss renderers across all four pug families, with rapid taps, guard, victory and multiple weapons. Static command-rendered proofs are saved as `output/qa-v9/combat-static-{stance,strike,guard}.png`; these supplement the earlier browser character review and do not constitute phone or Safari verification.
- Physical phone speaker, thermal and sustained performance checks still require real-device verification.

See `assets-motion-v9/animations.json` for the complete non-pug clip catalog and sheet layout. Main pug rigs are documented separately.
