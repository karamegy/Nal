self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('eidco-v13-cache').then((cache) => {
      return cache.addAll([
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
        './settings.html'
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
