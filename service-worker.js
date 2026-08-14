// Bump this on every deploy so clients pick up the new files.
var CACHE_NAME = 'hockey-systems-v2';

var PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/storage.js',
  'js/data.js',
  'js/mastery.js',
  'js/rink.js',
  'js/screens.js',
  'js/app.js',
  'systems-seed.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(PRECACHE_URLS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// Cache-first for everything we precached; network fallback (and cache the
// result) for anything else, so the app keeps working with no connection.
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;

      return fetch(event.request).then(function (response) {
        if (response && response.ok && response.type === 'basic') {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      }).catch(function () {
        if (event.request.mode === 'navigate') return caches.match('index.html');
      });
    })
  );
});
