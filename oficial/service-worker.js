// Service Worker para PWA - Tuta Lanches (cópia para /oficial)
const CACHE_NAME = 'tuta-delivery-v1';
const urlsToCache = [
  './index.html',
  './manifest.json',
  './img/Captura_de_tela_2025-11-06_123540-removebg-preview.png'
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando... (oficial)');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('[Service Worker] Erro ao fazer cache:', error);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (
    event.request.url.includes('firebasestorage') ||
    event.request.url.includes('googleapis') ||
    event.request.url.includes('gstatic') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('unsplash')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          if (response) return response;
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});
