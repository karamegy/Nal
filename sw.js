const CACHE_NAME = 'eidco-v14-cache';
const assetsToCache = [
  './index.html',
  './auth.html',
  './dashboard.html',
  './invoices.html',
  './batch-invoices.html',
  './inventory.html',
  './clients.html',
  './chat.html',
  './profile.html',
  './users.html',
  './vault.html',
  './map.html',
  './settings.html',
  './tv.html',
  './manifest.json',
  './icon-new-192.png',
  './icon-new-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        assetsToCache.map(url => cache.add(url).catch(err => console.log('Failed to cache:', url)))
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

// استراتيجية جلب ذكية: الشبكة أولاً لصفحات HTML لضمان تحديثات السحابة الفورية، والتخزين المؤقت للملفات الثابتة
self.addEventListener('fetch', (e) => {
  let requestURL = new URL(e.request.url);

  if (e.request.mode === 'navigate' || requestURL.pathname.endsWith('.html') || requestURL.pathname === '/') {
    e.respondWith(
      fetch(e.request)
        .then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(e.request);
        })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((response) => {
        return response || fetch(e.request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});
