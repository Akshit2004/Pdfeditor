const CACHE_NAME = 'pdf-editor-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/logo-removebg-preview.png',
  '/pdf.worker.js',
  // Add more assets as needed
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
