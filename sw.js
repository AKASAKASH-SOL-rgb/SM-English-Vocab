const CACHE_NAME = 'vocabmaster-v5';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/data.js',
  '/app.js',
  '/tailwind.min.js',
  '/lucide.min.js',
  '/confetti.min.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/icon-96.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) => cache.add(url).catch((e) => console.log('Precache skip:', url)))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const request = event.request;
  const url = new URL(request.url);

  // 1. Navigation requests (Opening the web page / app)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          // When offline, fall back to cached index.html or root
          const cached = (await caches.match(request)) || 
                         (await caches.match('/')) || 
                         (await caches.match('/index.html')) || 
                         (await caches.match('./index.html'));
          if (cached) return cached;
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;background:#0b0f19;color:#fff;"><h2>VocabMaster is Offline</h2><p>Please open the app once with internet to download all offline content.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, PNG, JSON) -> Cache First with Network Fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const fallback = await caches.match(url.pathname);
          if (fallback) return fallback;
          return new Response('', { status: 408, statusText: 'Offline Asset Unavailable' });
        });
    })
  );
});
