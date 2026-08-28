var CACHE_NAME = 'gaokaoai-v2';

// Install: cache core files immediately
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([
        '/GaokaoHelper/index.html',
        '/GaokaoHelper/chat/style.css',
        '/GaokaoHelper/chat/app.js',
        '/GaokaoHelper/manifest.json',
      ]).catch(function() {
        // If absolute paths fail (e.g. dev server), try relative
        return cache.addAll([
          'index.html',
          'chat/style.css',
          'chat/app.js',
          'manifest.json',
        ]);
      });
    })
  );
});

// Activate: claim clients and clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(function(names) {
        return Promise.all(
          names.filter(function(n) { return n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); })
        );
      })
    ])
  );
});

// Fetch: network-first,缓存仅作离线兜底
// 保证有网时用户永远拿到最新代码,修复推送后立即生效
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Skip API calls
  if (url.indexOf('/chat/completions') !== -1) return;

  // 只处理 GET 请求
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request).then(function(resp) {
      // 网络成功:更新缓存并返回最新内容
      if (resp && resp.status === 200) {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
      }
      return resp;
    }).catch(function() {
      // 离线:回退到缓存
      return caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        // 页面请求兜底到 index.html
        return caches.match('/GaokaoHelper/index.html').then(function(idx) {
          if (idx) return idx;
          return caches.match('index.html').then(function(i2) {
            if (i2) return i2;
            return new Response('离线模式：请连接网络后刷新', { status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
          });
        });
      });
    })
  );
});
