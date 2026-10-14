const CACHE = 'pug-pebbles-v5-20261014c';
const CORE = [
  './',
  'index.html',
  'style.css',
  'game.js',
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
  'food-mobile-v5.webp',
  'pug-idle-mobile-v5.webp',
  'manifest.webmanifest',
  'icon-192-v5.png',
  'icon-512-v5.png',
  'icon-180-v5.png',
  'favicon-v5.png',
];
const ART = [
  'homes-middle-mobile-v5.webp',
  'homes-early-mobile-v5.webp',
  'homes-poverty-mobile-v5.webp',
  'pugs-early-mobile-v5.webp',
  'pet-coins-mobile-v5.webp',
  'birds-mobile-v5.webp',
  'birds-mid-mobile-v5.webp',
  'hats-v5.webp',
  'hats-side-v5.webp',
  'hats-back-v5.webp',
  'pug-rear-v5.webp',
  'pug-king-hats-v5.webp',
  'vasiliy-rig-v5.webp',
  'vasiliy-v4.webp',
  ...[
    'look',
    'scratch',
    'yawn',
    'lick',
    'left',
    'pawlick',
    'splay',
    'sleep',
    'whistle',
    'back',
    'stretch',
  ].flatMap((p) => [`pug-${p}-mobile-v5.webp`, `pug-${p}-mid-mobile-v5.webp`]),
];
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(
          CORE.map(
            (file) =>
              new Request(/\.(js|css)$/.test(file) ? file + '?v=0.5.0' : file, { cache: 'reload' }),
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
      for (const file of ART)
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
