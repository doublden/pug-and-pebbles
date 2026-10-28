# Mortik 0.9.0 — living animation

The approved scene's layered animation approach now spans the game. Characters move as independent connected pieces. The existing URL, Home Screen installation and compatible saves are retained.

- All 16 pug stages use four anatomical families, short necks, separate heads/bodies/paws/tails and local facial animation. Regular actions, sleep, turns, licking, scratching, stretching, hiccups, whistling and tail chase are updated.
- All 14 hats follow moving skull mounts. Repacked art fixes sliced bands/flaps; view-specific fit includes the reversed cap and umbrella hat.
- Vasiliy/excavator, crows/sparrows/Jack, insects, Yuppi, five bonus friends and both bosses use continuous local motion. Weapons grip at their handles; rapid strikes are smoothed.
- Beds use floor anchors in all 15 locations. The muscle-pug sleep bubble follows the face. Bowls in the last two homes and their tap bounds shrink by 10%.
- Model caches are bounded; missing artwork respects retry backoff; ready new battles skip legacy art loading. Updated offline/PWA cache; economy and save format remain unchanged.

This is a 2D animation overhaul, not a Unity/3D conversion. See `ANIMATIONS_V9.json` and `VERIFICATION_V9.json` for the catalogue, checks and limitations.

iPhone: Safari → Share → Add to Home Screen. Existing installations can close and reopen online to receive the update; do not clear the save.
