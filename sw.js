const CACHE = 'pug-pebbles-v4-20261014b';
const CORE = [
  './',
  'index.html',
  'style.css',
  'game.js',
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
  'backgrounds-v3.webp',
  'food-v3.webp',
  'pug-idle-v3.webp',
  'favicon.svg',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
];
const ART = [
  'homes-middle-v3.webp',
  'homes-early-v3.webp',
  'homes-poverty-v3.webp',
  'pugs-early-v3.webp',
  'pet-coins-v3.webp',
  'birds-v3.webp',
  'birds-mid-v4.webp',
  'hats-v4.webp',
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
  ].flatMap((p) => [`pug-${p}-v3.webp`, `pug-${p}-mid-v4.webp`]),
];
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
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
          .then((c) => c.match(event.request))
          .then((cached) => cached || network())
      : network()
    ).catch(() =>
      caches
        .match(event.request)
        .then(
          (cached) =>
            cached || (event.request.mode === 'navigate' ? caches.match('./') : Response.error()),
        ),
    ),
  );
});
