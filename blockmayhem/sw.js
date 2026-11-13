/* Block Mayhem service worker */
var CACHE = 'blockmayhem-v17';
var CORE = ['/blockmayhem/', '/assets/blockmayhem/bm.css', '/assets/blockmayhem/bm.js', '/assets/blockmayhem/levels.js', '/blockmayhem/manifest.webmanifest', '/blockmayhem/icon-192.png', '/blockmayhem/apple-touch-icon.png'];
self.addEventListener('install', function (e) { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).catch(function () {})); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('blockmayhem-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url), same = url.origin === location.origin, font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !font) return;
  if (same && !/^\/(blockmayhem|assets\/blockmayhem)\//.test(url.pathname)) return;
  var key = same ? url.origin + url.pathname : req.url;
  e.respondWith(caches.open(CACHE).then(function (c) { return c.match(key).then(function (hit) {
    var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(key, res.clone()); return res; }).catch(function () { return hit; });
    return hit || net;
  }); }));
});
