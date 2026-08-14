// Bump this on every deploy so clients pick up the new files.
var CACHE_NAME = 'hockey-systems-v4';

var PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/storage.js',
  'js/data.js',
  'js/mastery.js',
  'js/rink.js',
  'js/animator.js',
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

function cachePut(request, response) {
  if (response && response.ok && response.type === 'basic') {
    var copy = response.clone();
    caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
  }
}

function isIcon(url) {
  return /\/icons\//.test(url);
}

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var req = event.request;

  // Icons rarely change — cache-first saves bandwidth for what's essentially
  // static art.
  if (isIcon(req.url)) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (res) { cachePut(req, res); return res; });
      })
    );
    return;
  }

  // App shell (HTML/JS/CSS) and the systems data: network-first, so a push
  // to the repo is picked up the moment there's connectivity, instead of
  // being stuck behind whatever was cached on first install. Falls back to
  // the last cached copy — and index.html for navigations — when offline.
  event.respondWith(
    fetch(req).then(function (res) {
      cachePut(req, res);
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        if (cached) return cached;
        if (req.mode === 'navigate') return caches.match('index.html');
      });
    })
  );
});
