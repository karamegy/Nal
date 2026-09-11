const CACHE_NAME = 'eidco-v14-cache';
const assetsToCache = [
  './index.html',
  './auth.html',
  './dashboard.html',
  './invoices.html',
  './inventory.html',
  './clients.html',
  './chat.html',
  './profile.html',
  './vault.html',
  './map.html',
  './settings.html',
  './manifest.json',
  './icon-new-192.png',
  './icon-new-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        assetsToCache.map(url => cache.add(url).catch(err => console.log('Failed to cache:', url, err)))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
