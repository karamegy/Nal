const CACHE_NAME = 'eidco-v30-cache'; // تم تحديث الإصدار لضمان سحب الملفات الجديدة
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
  './admin-reports.html',
  './admin-accounts.html',
  './vault.html',
  './map.html',
  './settings.html',
  './tv.html',
  './documents.html',
  './privacy.html',
  './remote.html',
  './eidco-core.js',
  './firebase-config.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-new-192.png',
  './icon-new-512.png',
  './accounts-tree.html',
  './sitemap.xml',
  './robots.txt',
  './googleeb8d677c7529419b.html'
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

self.addEventListener('fetch', (e) => {
  let requestURL = new URL(e.request.url);

  // السماح لطلبات Vercel أو طلبات POST بالمرور مباشرة عبر الشبكة دون اعتراض
  if (requestURL.hostname.includes('vercel.app') || e.request.method !== 'GET') {
    return; 
  }

  // تم تصحيح الشرط ليطابق مسار /Nal/ بدلاً من الجذر الرئيسي /
  if (e.request.mode === 'navigate' || requestURL.pathname.endsWith('.html') || requestURL.pathname === '/Nal/' || requestURL.pathname === '/Nal') {
    e.respondWith(
      fetch(e.request)
        .then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(e.request) || caches.match('./index.html');
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
