# Mortik implementation roadmap

[Русский](ROADMAP.ru.md)

Updated: 14 October 2026. Blocks 1–3 are implemented together in 0.6.0. Blocks 4–9 are planned and not implemented.

Verification: 78 automated tests, a 10 hats × 15 stages × 24 poses visual matrix, six mobile viewports, input and offline startup. Physical iPhone/Safari validation remains a device test.

## Sequence and estimates

| Block | Work | Hours | Status |
|---|---|---:|---|
| 1 | Mobile bugs and stability | 2–3 | done, 0.6.0 |
| 2 | Hats and character attachment | 4–7 | done, 0.6.0 |
| 3 | Detailed locations, bowls and food | 4–6 | done, 0.6.0 |
| 4 | Economy, shop and purchases | 4–6 | planned |
| 5 | Vasiliy, expeditions, weapons and inventory | 6–9 | planned |
| 6 | Raccoon and giant crow boss fights | 6–10 | planned |
| 7 | Yuppi, reactions, secrets and settings | 5–8 | planned |
| 8 | Final verification, optimization and release | 3–6 | planned |
| 9 | Beds and sleep scenes | 5–8 | planned |

Remaining blocks with accepted additions: approximately **29–47 active work hours**. This is provisional, not a release date. Next: block 4 economy/shop, then 5 and 6. Beds are a separate future block 9. Each coherent update is verified before publication.

## 1. Mobile bugs and stability

**Estimate: 2–3 hours.** Implemented in 0.6.0.

 - [x] Separate the combo counter, multiplier timer, balance, notifications and buttons; check long numbers and both languages.
 - [x] Fix Vasiliy’s duplicate head and machinery flicker; check the earlier hiring freeze and reset regression.
 - [x] Fix horizontal/vertical match-three swipes while keeping tap selection; provide clear cells and remove excessive empty space.
 - [x] Start viewport checks with iPhone 15 Pro Max and smaller screens; touch controls and safe areas remain part of every subsequent block.
 - [x] Portrait-only gameplay; centered mobile field on desktop, turn-phone notice and pause in landscape.

Done when HUD items do not overlap, the cat has one head, the game does not freeze, and swipe/grid behavior is checked. Distinguish emulation from physical-device testing.

## 2. Hats and character attachment

**Estimate: 4–7 hours.** Implemented in 0.6.0.

 - [x] Visually inspect all ten existing hats across every stage, pose and intermediate frame: sitting, lying down, leaning, sneezing and facing away.
 - [x] Redraw problematic views of each hat with correct scale, volume, perspective and seating depth; moving the whole set is not sufficient.
 - [x] Seat the rim on the head; avoid unintended overlap with eyes, ears or medallion. Preserve visor/ornament orientation from behind and keep the medallion on the chest.
 - [x] Use head attachments for hat motion and bird perches; prepare compatibility with block 5 weapons. New secret hats receive the same checks in block 7.
 - [x] Remove pose flicker, slow pug motions and transitions; draw one hat following the interpolated head.

Done when a hat × stage × pose visual matrix is available and motion transitions/mobile scale are checked. Pixel contact does not replace visual fit inspection.

## 3. Detailed locations, bowls and food

**Estimate: 4–6 hours.** Implemented in 0.6.0.

 - [x] Rerender all locations and bowl/food stages in the approved cartoon-realistic style with detail suitable for iPhone 15 Pro Max.
 - [x] Preserve progression from an almost-empty dirty bowl to a large golden pile; food remains a separate interactive image with a small tap reaction.
 - [x] Preserve the mobile composition: pug to the left, food conveniently reachable near the center, location visible. Remove neighboring-cell fragments and cropped-tail artifacts.
 - [x] Match image sizes to the actual display and pixel density, compress WebP assets and load needed art on demand; stretching old low-resolution images is not sufficient.
 - [x] Enlarge bowl/food by 10%, shrink the pug by 10% and move it slightly left; resize food hit bounds with the drawing.

Done when mobile renders are inspected at 100%, food is detailed, composition is usable, and startup avoids loading every detailed location.

## 4. Economy, shop and purchases

**Estimate: 4–6 hours.** Planned.

 - [ ] Make the first three or four pug/home upgrades more demanding and rewarding; improve ordinary hat usefulness. Target roughly 10% easier mid/late progression without a blanket price discount.
 - [ ] Calculate Vasiliy around one ordinary tap per second at hire; levels still improve him. Rebalance prices and expedition payouts together.
 - [ ] Pug/home progression is single-purchase only; retain ×1/×10/max for tools and Vasiliy. Successful pug/home purchases close the shop and show the transformation with sun rays.
 - [ ] The main shop badge signals only a first purchase of a new digging tool, the next home or pug stage. Category badges signal available purchases in that category, including ordinary upgrades. All requirements, including home boss clearance, must be met.
 - [ ] Keep the nearest-goal display; simulate combined income, costs, coins, combos, hats, Vasiliy and upcoming boss gates. Preserve separately approved secret-item formulas.
 - [ ] Tools: first purchase shows base power; upgrades show the actual increase to total ordinary tap power.
 - [ ] Full minigame victory: 8 × planned seconds × ordinary tap power captured at start; partial success is proportional, temporary boosts excluded.

Done when old/new progression is compared at several play rates, prices/bonuses are clear, badges behave correctly, and existing purchases are preserved.

## 5. Vasiliy, expeditions, weapons and inventory

**Estimate: 6–9 hours.** Planned.

 - [ ] Implement rebalanced baseline production around one ordinary tap/second. Temporary coins, combos and Yuppi do not amplify it. “Fine, I’ll work”: ×2 for 10 seconds with a five-minute cooldown; unavailable during expeditions and while rewards await collection.
 - [ ] Excavator: small and rusty at levels 1–9, new appearance every ten levels up to gold/diamonds at 100+. Limit size to the reference bowl; production may continue growing. Preserve smooth travel/digging and allow older colors/stickers without changing strength.
 - [ ] Expeditions last 15 minutes/one hour/three hours; rewards are fixed at dispatch, do not grow after returning, and can be collected once. Add collectible junk and small capped duplicate compensation.
 - [ ] Weapons: free stick; three fragments → rusty spoon → spoon shiv → toothbrush sword → rusty pipe → crowbar → rusty sword → Templar sword → Paladin sword. Each step after the spoon consumes three identical items. Gradually introduce ready-made weapon drops; fragments alone would require 6,561 for a Paladin sword.
 - [ ] The first tutorial 15-minute expedition guarantees three fragments. Starting ordinary table: 15 minutes — 35% for one trophy, one hour — 80% for three, three hours — 100% for eight; show item-tier probabilities and the visible bad-luck guarantee. Chased birds: 0.2% for a base fragment after weapons unlock. Validate final tables against time to each boss.
 - [ ] Inventory shows counts, damage, equipped state and merge recipes. Merging is manual with visible costs/results. Equip the result if the equipped item was consumed. In normal play, weapons hang on the back in every pose; a toggle hides them without unequipping. In combat they are always held. Weapons are not sold for pebbles.
 - [ ] New life preserves the collection/appearances while strong weapon access follows the new run’s milestones. Migrate and persist all new progress fields.
 - [ ] Inventory cosmetic unlocks: tool 500k, pug 1m, home 1.5m; independent bowl/pile skin with price to be defined. Only unlocked looks, power unchanged.
 - [ ] Confirm expedition cancellation with no reward; one claimable completion banner, deferred until combat ends.

Done when Vasiliy provides noticeable production, expeditions cannot pay twice, recipes/equipment persist, weapons fit naturally, and required tiers unlock before their bosses.

## 6. Raccoon and giant crow boss fights

**Estimate: 6–10 hours.** Planned.

 - [ ] Show combat onboarding at the seventh location, Yard with a bed; the first boss unlocks purchase of the eighth, Modest yard. Use stable location IDs. Keep bosses out of the initial tutorial.
 - [ ] Draw two complete bosses: a cheeky raccoon and giant crow. Hide food; switch the pug to a side-facing armed stance and temporarily hide the hat. Provide smooth idle poses, multiple attacks/defenses, impacts and victory, with weapons tracking the paw.
 - [ ] Deal damage by tapping within 30 seconds. First-boss baseline: raccoon 200 HP, stick 1 damage, spoon 2, maximum six counted hits/second; the stick cannot win, the spoon needs about 3.34 taps/second. Digging tools/economic multipliers do not affect damage.
 - [ ] Pug attacks trigger boss defense/impact reactions; boss attacks trigger pug defenses. Defense never cancels counted damage; there is no pug HP initially. Pause automatic production and other events during combat; backgrounding must not provide an advantageous timer pause.
 - [ ] Play tense music, then smoothly return to ordinary music; vary swings, impacts and blocks by weapon material and synchronize contact. Respect volume settings and overlapping-sound limits.
 - [ ] Victory unlocks a transition once; the home is purchased separately and combat costs no currency. Free retries, no weapon/balance loss. One-time reward = min(100 ordinary taps, 5% of the next home’s price), fixed at encounter unlock. Existing homes remain accessible.
 - [ ] Calculate crow HP/required weapons alongside expeditions. Later bosses—badger, yard dog, goose, boar, royal peacock—are follow-up concepts; the estimate covers the first two. Missing bosses must not block existing or otherwise available later homes.

Done when both fights run smoothly on touch, damage limits are fair, timers/retries cannot be exploited, victories/rewards persist once, and home transitions are clear.

## 7. Yuppi, reactions, secrets and settings

**Estimate: 5–8 hours.** Planned.

 - [ ] Tapping the pug or Vasiliy grants exactly one ordinary manual dig with a reaction. Through Healthy pug inclusive: sneeze; later: two or three rear-turn variants, strained face and brown clouds. Vasiliy meows grumpily.
 - [ ] Provide varied realistic sneezes/snorts/farts/meows, including three or four fart/meow recordings. Clouds can cover the screen, disappear quickly and pass touch input through. Add effect intensity and overlapping-sound limits.
 - [ ] Award the “Fart-fart or knock-knock?” achievement for actual full coverage. Poop hat: 5% chance to double manual digging, no effect on Yuppi, minigames or automatic production; only the equipped hat applies. Reduced effects do not prevent the achievement.
 - [ ] Yuppi is a fat grumpy ginger cat based on the reference, with a rainbow and “YIPPEEEE!”. After Stone house: once per 20–35 active main-scene minutes, at most three paid taps worth ×100 ordinary tap strength without coin/combo stacking. Misses trigger a tongue/look reaction without a penalty. Nyan Cat is a music reference; select the actual publishable track separately and fade it in/out.
 - [ ] One-time net displayed after the bucket: only after Stone house, no digging power and not required for later tools; description “What is this for? Nobody knows.” Price 30,000P and capture reward 45,000P, both fixed using ordinary strength P at first unlock. The first successful hit captures instead of paying ×100; misses keep the net. It disappears permanently after purchase.
 - [ ] Capture grants a hidden achievement and a “Yuppi!” yogurt hat with a shimmering rainbow: +10% expedition reward, fixed at dispatch. Net purchase/capture/hat persist through New life. Inspect both new hats in every pose.
 - [ ] Visitor album: unknown silhouettes and discovered portraits/statistics. Developer tools reveal hidden items, summon Yuppi/Jack/future visitors and repeat test scenarios without automatically granting achievements; keep the test-save marker.
 - [ ] Remove the separate music-rights row from settings but retain attribution in documentation; add “© @doublden. Made with love for pugs and strange ideas” and native iOS/Android sharing with copy-link fallback.
 - [ ] Add two funny random actions with sounds and synchronized ground urination sound for the existing rare animation.

Done when secrets unlock from real events, rewards are capped/persistent, fast taps are not deafening, effects do not block controls, and secret items cannot be farmed repeatedly.

## 8. Final verification, optimization and release

**Estimate: 3–6 hours.** Planned.

 - [ ] Check 0.5.0 and supported legacy saves, New life, full reset, weapons/secrets, multiple tabs and duplicate rewards. Each block verifies its changes before final regression.
 - [ ] Primary phone: iPhone 15 Pro Max—1290×2796 physical pixels, 430×932 logical screen, DPR 3. Additional logical viewports: 375×812, 390×844, 393×852, 360×800, 412×915. Refine common device choices before testing.
 - [ ] Check Safari/installed iPhone web app and Chrome/Android installation; safe areas, changing browser height, rotation, gestures, audio after first touch, installation and offline-cache updates. Report physical devices separately from emulation.
 - [ ] Review the full code, remove unused layers/assets/duplication, constrain memory and startup loading, and check long sessions with effects/animation. Avoid unnecessary heavy dependencies.
 - [ ] Publish the verified update to GitHub Pages with RU/EN notes and a new version; provide the phone play/install/share link.

Done when checks/limitations are recorded, migrations preserve purchases, the published build is verified, and its link/PWA update work correctly.

## 9. Beds and sleep scenes

**Estimate: 5–8 hours.** Planned.

 - [ ] Six ordinary beds and three secret beds unlocked by raccoon, crow and Paladin sword; one equipped bed in the background.
 - [ ] The pug smoothly walks to its bed, sleeps briefly and returns; balance small unique bonuses, only the equipped bed applies.

Done: smooth sleep and return, saved secret unlocks, correct hats/weapons and verified bonuses.
## Completed research and deferred scope

Research produced eight ideas from seven clicker/idle games. Vasiliy’s active ability and boss/weapon progression replacing household crafting were selected. Build specializations, story quests, minigame mastery, seasonal events and friends’ cooperative goals remain proposals and are not automatically included.

Research sources:

- [AdVenture Capitalist events](https://screenzilla.helpshift.com/hc/en/5-adventure-capitalist/faq/20-event-faq-and-troubleshooting/)
- [Clicker Heroes](https://store.steampowered.com/app/363970/Clicker_Heroes/)
- [Egg, Inc. artifacts](https://auxbrain.freshdesk.com/support/solutions/articles/47001170665-what-are-artifacts-)
- [Egg, Inc. co-op](https://auxbrain.freshdesk.com/support/solutions/articles/47001170222-how-do-i-join-a-co-op-)
- [Tap Titans 2 builds](https://gamehive.helpshift.com/hc/en/3-tap-titans-2/faq/67-builds/)
- [Idle Slayer](https://store.steampowered.com/app/1353300/)
- [Idle Miner Tycoon abilities](https://www.idleminertycoon.com/lets-make-it-10-a-new-super-manager-joins-the-roster)
- [Melvor Idle](https://store.steampowered.com/app/1267910/Melvor_Idle/)

A Telegram Mini App is a possible separate phase after the main version and is excluded from the 30–50 hours. Shared Telegram/Safari/PWA progress requires a separate synchronization design.

Original animal photos and personal screenshots remain local references; only game illustrations and documentation are published.
