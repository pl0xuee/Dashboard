const CACHE_NAME = 'command-center-v11';
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/assets/css/styles.css',
  '/assets/css/index-inline.css',
  '/assets/css/index-inline.css?v=20260630b',
  '/assets/js/script.js',
  '/assets/js/index-inline.js',
  '/assets/js/index-inline.js?v=20260630b',
  '/manifest.webmanifest',
  '/assets/icons/favicon.svg',
  '/dashboard/',
  '/dashboard/index.html',
  '/dashboard/assets/dashboard-widgets.js',
  '/dashboard/assets/dashboard-widgets.js?v=20260630b',
  '/stream/',
  '/stream/index.html',
  '/stream/assets/config-inline.js?v=20260630b',
  '/stream/assets/stream-inline.css?v=20260630b',
  '/stream/assets/stream-inline.js?v=20260630b',
  '/media-portal/',
  '/media-portal/index.html',
  '/media-portal/assets/media-inline.js?v=20260630b',
  '/web-games/',
  '/web-games/index.html',
  '/web-games/assets/web-games-inline.css?v=20260630b',
  '/web-games/assets/web-games-inline.css?v=20260630c',
  '/web-games/assets/web-games-inline.css?v=20260630d',
  '/web-games/assets/web-games-inline.js?v=20260630b',
  '/web-games/assets/web-games-inline.js?v=20260630c',
  '/web-games/assets/web-games-inline.js?v=20260630d'
];

function isAppShellAsset(requestUrl) {
  return requestUrl.origin === self.location.origin && (
    requestUrl.pathname.endsWith('.js') ||
    requestUrl.pathname.endsWith('.css') ||
    requestUrl.pathname.endsWith('.html') ||
    requestUrl.pathname === '/' ||
    requestUrl.pathname.endsWith('/')
  );
}

async function networkFirst(request, fallbackPath) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackPath) return caches.match(fallbackPath);
    throw _;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await caches.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;
  throw new Error('Asset unavailable');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/index.html'));
    return;
  }

  if (isAppShellAsset(requestUrl)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
