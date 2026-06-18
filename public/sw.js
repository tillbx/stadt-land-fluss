const CACHE_NAME = 'slf-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icons.svg',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Bypass service worker for pocketbase, websockets and API calls
  if (
    e.request.url.includes('/api/') || 
    e.request.url.includes(':8090') || 
    e.request.url.includes('/_/') || 
    e.request.url.includes('ws://') || 
    e.request.url.includes('wss://')
  ) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // Only cache successful static GET requests
        if (
          e.request.method === 'GET' &&
          networkResponse.status === 200 &&
          (e.request.url.endsWith('.js') || e.request.url.endsWith('.css') || e.request.url.endsWith('.svg') || e.request.url.endsWith('.png'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Offline fallback
      return caches.match('/');
    })
  );
});
