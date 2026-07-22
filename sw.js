const CACHE_NAME = 'command-center-v91';
// These are cache keys, not file paths: the query string is part of the key, so an
// entry whose ?v= does not match what the HTML actually requests is precached and
// then never read. Offline, the request misses, the network leg fails, and
// staleWhileRevalidate throws - the page loads with no stylesheet or no script.
// Any time an asset's ?v= is bumped in the HTML it has to be bumped here as well,
// and CACHE_NAME bumped so this list is re-fetched rather than reused.
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/assets/css/styles.css?v=20260722shell1',
  // Reached by @import from styles.css, so it never appears as its own request in
  // the HTML — but it is still a separate fetch, and an unstyled-type page is what
  // an offline miss looks like here.
  '/assets/css/fonts.css?v=20260722shell1',
  '/assets/js/script.js',
  '/assets/js/index-inline.js?v=20260722shell1',
  '/manifest.webmanifest',
  '/assets/icons/favicon.svg',
  '/dashboard/',
  '/dashboard/index.html',
  '/dashboard/assets/dashboard-widgets.js?v=20260722shell1',
  '/dashboard/assets/vendor/lightweight-charts.standalone.production.js?v=5.0.9',
  '/stream/',
  '/stream/index.html',
  '/stream/assets/config-inline.js?v=20260722shell1',
  '/stream/assets/stream-inline.css?v=20260722shell1',
  '/stream/assets/stream-inline.js?v=20260722shell1',
  '/media-portal/',
  '/media-portal/index.html',
  '/media-portal/assets/media-inline.js?v=20260722shell1',
  '/repos/',
  '/repos/index.html',
  '/repos/assets/repos-inline.css?v=20260722shell1',
  '/repos/assets/repos-inline.js?v=20260722shell1',
  '/web-games/',
  '/web-games/index.html',
  '/web-games/assets/web-games-inline.css?v=20260722shell1',
  '/web-games/assets/web-games-inline.js?v=20260722shell1',
  '/web-games/middle-earth-rpg/',
  '/web-games/middle-earth-rpg/index.html',
  '/web-games/middle-earth-rpg/assets/rpg-inline.css?v=20260711gunmetal2',
  '/web-games/middle-earth-rpg/assets/rpg-inline.js?v=20260712webponly1',
  // Linked from the footer of every page. Left out of this list, an offline visit
  // fell through to the navigate fallback and served the home page in its place —
  // the wrong document rather than an honest miss.
  '/griddown/privacy/',
  '/griddown/privacy/index.html',
  '/griddown/privacy/assets/privacy.css?v=20260722shell1'
];

// The typeface files the stylesheet asks for. Kept apart from the shell list only
// because they are fetched by the CSS rather than requested by a page.
const FONT_FILES = [
  '/assets/fonts/fira-sans-400.woff2',
  '/assets/fonts/fira-sans-500.woff2',
  '/assets/fonts/fira-sans-600.woff2',
  '/assets/fonts/fira-sans-700.woff2',
  '/assets/fonts/fira-sans-condensed-600.woff2',
  '/assets/fonts/fira-sans-condensed-700.woff2',
  '/assets/fonts/jetbrains-mono-400.woff2',
  '/assets/fonts/jetbrains-mono-500.woff2',
  '/assets/fonts/jetbrains-mono-700.woff2'
];

function isAppShellAsset(requestUrl) {
  return requestUrl.origin === self.location.origin && (
    requestUrl.pathname.endsWith('.js') ||
    requestUrl.pathname.endsWith('.css') ||
    requestUrl.pathname.endsWith('.woff2') ||
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
    caches.open(CACHE_NAME).then(async (cache) => {
      // The shell has to land or the install fails and the old cache stays put.
      await cache.addAll(APP_SHELL_FILES);
      // A missing typeface is a degraded page, not a broken one, so one font
      // failing to fetch must not take the whole install down with it.
      await Promise.all(FONT_FILES.map((file) => cache.add(file).catch(() => {})));
    })
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
