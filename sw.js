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

// Установка: кешируем всё сразу
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Активация: чистим старые кеши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Основной обработчик
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Работаем только с GET запросами и протоколами http/https
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. Создаем запрос в сеть для обновления ресурса в кеше
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Если сети нет, этот промис просто "молчит"
      });

      // 2. Если файл есть в кеше — отдаем его МГНОВЕННО (звук сработает сразу)
      // Если файла нет в кеше — ждем ответа из сети
      return cachedResponse || fetchPromise;
    }).catch(() => {
      // На случай полной ошибки возвращаем пустой Response или 404
      return new Response("Not found", { status: 404 });
    })
  );
});