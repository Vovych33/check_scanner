const CACHE_NAME = 'CheckScanner';
const urlsToCache = [
  '.',
  'index.html',
  'beep.mp3',
  'html5-qrcode.min.js',
  'img/favicon.ico',
  'img/icon-192.png',
  'img/icon-512.png',
  'manifest.json'
];

// При установке кешируем нужные ресурсы
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// При активации удаляем старые кеши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Функция с таймаутом для fetch
function fetchWithTimeout(request, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
    fetch(request).then(response => {
      clearTimeout(timer);
      resolve(response);
    }, reject);
  });
}

// Обработчик fetch - сначала пытаемся получить из сети с таймаутом,
// если не получается - отдаем из кеша
self.addEventListener('fetch', event => {
  event.respondWith(
    fetchWithTimeout(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const url = new URL(event.request.url);
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }
        return caches.match(event.request);
      })
      .catch(() => caches.match(event.request).then(resp => resp || new Response("Not found", { status: 404 })))
  );
});