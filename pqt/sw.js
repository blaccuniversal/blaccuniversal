/* PQT offline: keeps the game saved on this device so it opens and plays without internet */
var CACHE = 'pqt-v57';
var CORE = ['/pqt/', '/pqt/host/', '/pqt/screen/',
  '/assets/pqt/pqt.css', '/assets/pqt/pqt.js', '/assets/pqt/pqt-data.js', '/assets/pqt/pqt-gate.js', '/assets/pqt/pqt-leaderboard.js', '/pqt/leaderboard/', '/pqt/data/season-1.json',
  '/assets/pqt/mqtt.min.js', '/assets/pqt/peerjs.min.js', '/assets/pqt/pqt-logo.png', '/assets/pqt/pqt-mark.png', '/assets/pqt/pqt-icon.png', '/assets/pqt/pqt-apple-touch-icon.png', '/assets/pqt/pqt-icon-192.png',
  '/assets/pqt/q/map-canada.png', '/assets/pqt/q/flag-wakanda.png', '/pqt/manifest.webmanifest', '/assets/pqt/pqt-star.js', '/assets/superstar/beat.js', '/assets/superstar/game.json'];
function key(u) { u = new URL(u, self.location.href); if (u.origin === self.location.origin) u.search = ''; return u.href; }
function okToCache(req) { var u = new URL(req.url); return req.method === 'GET' && (u.origin === self.location.origin ? (u.pathname.indexOf('/pqt') === 0 || u.pathname.indexOf('/assets/pqt/') === 0 || u.pathname === '/assets/superstar/beat.js' || u.pathname === '/assets/superstar/game.json') : /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)); }
function save(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (r && (r.ok || r.type === 'opaque')) return caches.open(CACHE).then(function (c) { return c.put(key(url), r); }); }).catch(function () {}); }
self.addEventListener('install', function (e) { e.waitUntil(Promise.all(CORE.map(save)).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('pqt-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('message', function (e) { var d = e.data || {}; if (d.t === 'save' && d.urls) e.waitUntil(Promise.all(d.urls.filter(function (u) { return okToCache({ url: u, method: 'GET' }); }).map(save))); });
self.addEventListener('fetch', function (e) {
  var req = e.request; if (!okToCache(req)) return;
  var k = key(req.url);
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(k).then(function (hit) {
      var net = fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) c.put(k, r.clone()); return r; });
      if (hit) { e.waitUntil(net.catch(function () {})); return hit; }   // saved copy straight away, refreshed in the background
      return net.catch(function () { return req.mode === 'navigate' ? c.match(key('/pqt/')) : Response.error(); });
    });
  }));
});
