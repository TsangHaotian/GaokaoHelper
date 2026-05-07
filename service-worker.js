var CACHE_NAME = 'gaokaoai-v1';

var PRECACHE_URLS = [
  '.',
  'index.html',
  'chat/style.css',
  'chat/app.js',
  'manifest.json',
];

// Install: cache core files
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); })
      );
    })
  );
});

// Fetch: cache-first for core files, network-first for everything else
self.addEventListener('fetch', function(e) {
  // Don't cache API calls or guide pages
  if (e.request.url.indexOf('/chat/completions') !== -1 ||
      e.request.url.indexOf('/guide/') !== -1) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(resp) {
      return resp || fetch(e.request).then(function(netResp) {
        // Cache successful responses for future offline use
        if (netResp && netResp.status === 200) {
          var clone = netResp.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        }
        return netResp;
      }).catch(function() {
        // Offline fallback - just return nothing
        return new Response('', { status: 200 });
      });
    })
  );
});
