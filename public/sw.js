// Service Worker for Invoice Generator PWA
//
// Caching strategy, and why it is what it is:
//
// The previous version was cache-first for EVERY same-origin GET, including
// the navigation document. Because index.html names the content-hashed JS
// bundle, a cached index.html pinned every returning visitor to the bundle
// from the deploy that first cached it -- permanently. New deploys could
// never reach anyone. That is how a build still calling Supabase kept running
// long after Supabase was removed from the codebase.
//
// So:
//   - HTML / navigation  -> network-first (cache only as an offline fallback)
//   - /static/* assets   -> cache-first (filenames are content-hashed, so a
//                           changed file is a different URL; safe forever)
//   - /api/*             -> never cached, never intercepted (live data)
//
// Bump CACHE_VERSION on any change here. Activation deletes every cache that
// does not match the current version.

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `invoice-pro-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `invoice-pro-runtime-${CACHE_VERSION}`;
const CURRENT_CACHES = [STATIC_CACHE, RUNTIME_CACHE];

// Only precache things that are certain to exist. A single 404 rejects
// cache.addAll() and the whole install fails -- which is what happened when
// this list still referenced the unhashed dev filenames.
const PRECACHE_URLS = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  console.log(`Service Worker: Installing ${CACHE_VERSION}...`);
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // Take over immediately rather than waiting for every tab to close.
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.log('Service Worker: Error caching assets', err);
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log(`Service Worker: Activating ${CACHE_VERSION}`);
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !CURRENT_CACHES.includes(name))
            .map((name) => {
              console.log('Service Worker: Deleting stale cache', name);
              return caches.delete(name);
            })
        )
      )
      // Control existing tabs without requiring a reload.
      .then(() => self.clients.claim())
  );
});

const isApiRequest = (url) =>
  url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/functions/');

const isStaticAsset = (url) => url.pathname.startsWith('/static/');

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Live data and anything cross-origin: leave it to the network entirely.
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return;
  if (url.protocol === 'chrome-extension:') return;

  // Content-hashed assets never change under the same URL.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const copy = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Everything else (navigations, manifest, icons): network first, so a new
  // deploy is picked up on the next load. Cache is the offline fallback only.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate' || request.destination === 'document') {
          return caches.match('/');
        }
        return Response.error();
      })
  );
});

// Allow the page to tell a waiting worker to activate immediately.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
