// Glass Closet service worker
// Bump this version string any time you change index.html or any cached asset,
// otherwise phones will keep serving the old cached copy.
const CACHE_NAME = 'glass-closet-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './glass-closet-look.png',
  './mirrorshatter.jpg',
  './glasscloset.png',
  './kissprint.png',
  './gossip-icon.png',
  './crack.mp3',
  './item-select.mp3',
  './true-item-select.mp3',
  './shutter.mp3',
  './icon-192.png',
  './icon-512.png'
];

// Install: pre-cache the core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll fails entirely if ANY one file 404s, so cache individually
      // and just skip whatever isn't there yet instead of breaking install.
      return Promise.all(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[sw] could not cache', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate: clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch:
// - HTML (the app shell) uses NETWORK-FIRST so updates show immediately
//   after a redeploy, falling back to cache only if offline.
// - Everything else (images, audio, manifest) uses CACHE-FIRST so the
//   app still works offline and loads fast.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isHTML =
    event.request.mode === 'navigate' ||
    event.request.url.endsWith('.html') ||
    event.request.url.endsWith('/');

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => cached);
    })
  );
});
