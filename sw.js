const CACHE = 'pug-pebbles-v9-20261028c';
const CORE = [
  './',
  'index.html',
  'style.css',
  'inventory-rules.js',
  'inventory-ui.js',
  'battle-rules.js',
  'battle-ui.js',
  'battle-render.js',
  'game.js',
  'guests.js',
  'scene-v8.js',
  'pug-rig-v9.js',
  'hat-attachments-v9.js',
  'character-motion.js',
  'secret-ui.js',
  'locale-v8.js',
  'combo.js',
  'session.js',
  'sounds/sneeze.wav',
  'sounds/fart.wav',
  'sounds/snort.wav',
  'icons.js',
  'locale.js',
  'bonuses.js',
  'birds.js',
  'idle.js',
  'audio.js',
  'sprites.js',
  'world.js',
  'extras.js',
  'minigames.js',
  'mini-ui.js',
  'collections.js',
  'app.js',
  'backgrounds-mobile-v5.webp',
  'homes-middle-mobile-v5.webp',
  'homes-early-mobile-v5.webp',
  'homes-poverty-mobile-v5.webp',
  'artwork-v6/background-00.webp',
  'artwork-v6/food-00.webp',
  'food-mobile-v5.webp',
  'pug-idle-mobile-v5.webp',
  'manifest.webmanifest',
  'icon-192-v5.png',
  'icon-512-v5.png',
  'icon-180-v5.png',
  'favicon-v5.png',
];
const ART = [
  'assets-pug-v9/skinny.webp',
  'assets-pug-v9/healthy.webp',
  'assets-pug-v9/round.webp',
  'assets-pug-v9/muscle.webp',
  'assets-v9/hats-front.webp',
  'assets-v9/hats-side.webp',
  'assets-v9/hats-back.webp',
  'assets-motion-v9/birds-rig.webp',
  'assets-motion-v9/insects-rig.webp',
  'assets-motion-v9/friends-rig.webp',
  'assets-motion-v9/boss-raccoon-rig.webp',
  'assets-motion-v9/boss-crow-rig.webp',
  'assets-v8/beds.webp',
  'assets-v8/yuppi.webp',
  'assets-v8/insects.webp',
  'assets-v8/hats-front.webp',
  'assets-v8/hats-side.webp',
  'assets-v8/hats-back.webp',
  'assets-v8/background-14.webp',
  'assets-v8/food-14.webp',
  'vasiliy-rig-v6.webp',
  'battle-v7/frames.json',
  'assets-v8/muscle-combat.json',
  'battle-v7/raccoon.webp',
  'battle-v7/crow.webp',
  'battle-v7/pug-lean.webp',
  'battle-v7/pug-healthy.webp',
  'battle-v7/pug-rich.webp',
  'weapons/stick.svg',
  'weapons/spoon.svg',
  'weapons/shank.svg',
  'weapons/toothbrush.svg',
  'weapons/pipe.svg',
  'weapons/crowbar.svg',
  'weapons/rustsword.svg',
  'weapons/templar.svg',
  'weapons/paladin.svg',
  'sounds/fart-1.wav',
  'sounds/fart-2.wav',
  'sounds/fart-3.wav',
  'sounds/meow-0.wav',
  'sounds/meow-1.wav',
  'sounds/meow-2.wav',
  'sounds/meow-3.wav',
  'sounds/yuppi.wav',
  'pet-coins-mobile-v5.webp',
  'birds-mobile-v5.webp',
  'birds-mid-mobile-v5.webp',
];
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(
          CORE.map(
            (file) =>
              new Request(/\.(js|css)$/.test(file) ? file + '?v=0.9.0b' : file, {
                cache: 'reload',
              }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('pug-pebbles-') && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
let warming;
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'WARM') return;
  if (!warming)
    warming = (async () => {
      const cache = await caches.open(CACHE);
      const current = Array.isArray(event.data.art)
        ? event.data.art.filter((p) =>
            /^(artwork-v6\/(background|food)-\d{2}|(?:assets-v8|assets-pug-v9|assets-motion-v9|assets-v9)\/[a-z0-9-]+)\.webp$/.test(
              p,
            ),
          )
        : [];
      for (const file of [...current, ...ART])
        try {
          if (!(await cache.match(file))) await cache.add(file);
        } catch (_) {
          /* Retry the missing optional file on the next launch. */
        }
      warming = null;
    })();
  event.waitUntil(warming);
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin)
    return;
  const network = () =>
    fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
      }
      return response;
    });
  event.respondWith(
    (/\.webp$/.test(new URL(event.request.url).pathname)
      ? caches
          .open(CACHE)
          .then((c) => c.match(event.request, { ignoreSearch: true }))
          .then((cached) => cached || network())
      : network()
    ).catch(() =>
      caches
        .match(event.request, { ignoreSearch: true })
        .then(
          (cached) =>
            cached || (event.request.mode === 'navigate' ? caches.match('./') : Response.error()),
        ),
    ),
  );
});
