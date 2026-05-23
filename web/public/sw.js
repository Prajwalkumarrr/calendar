// ElevAIte Calendar — Service Worker
// Strategy: cache-first for static assets, network-first for API/pages

const CACHE = 'elevaite-v1';

const STATIC_EXTENSIONS = ['.js', '.css', '.woff2', '.woff', '.ttf', '.svg', '.png', '.ico'];

function isStatic(url) {
  const u = new URL(url);
  return (
    u.pathname.startsWith('/_next/static/') ||
    u.pathname.startsWith('/icons/') ||
    STATIC_EXTENSIONS.some((ext) => u.pathname.endsWith(ext))
  );
}

function isApi(url) {
  return new URL(url).pathname.startsWith('/api/');
}

// Install — pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        '/calendar',
        '/manifest.json',
        '/icons/icon.svg',
      ]).catch(() => {}) // don't fail install if a resource is missing
    )
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) return;

  // API calls — network first, no cache fallback (don't serve stale API data)
  if (isApi(request.url)) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Static assets — cache first, then network, then update cache
  if (isStatic(request.url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        });
        return cached ?? networkFetch;
      })
    );
    return;
  }

  // HTML pages — network first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
