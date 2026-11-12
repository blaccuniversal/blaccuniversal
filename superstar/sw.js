/* Superstar offline cache: stale-while-revalidate */
var CACHE = 'superstar-v12';
var CORE = ['/superstar/', '/assets/superstar/superstar.css', '/assets/superstar/beat.js', '/assets/superstar/superstar.js', '/assets/superstar/game.json', '/assets/superstar/dict.json', '/superstar/manifest.webmanifest', '/superstar/icon-192.png', '/superstar/apple-touch-icon.png', '/superstar/logo.webp', '/superstar/wordmark.webp'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('superstar-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var same = url.origin === location.origin, font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !font) return;
  if (same && !/^\/(superstar|assets\/superstar)\//.test(url.pathname)) return;
  var key = same ? url.origin + url.pathname : req.url;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(key).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(key, res.clone()); return res; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
