/* PQT offline: keeps the game saved on this device so it opens and plays without internet */
var CACHE = 'pqt-v92';
var CORE = ['/pqt/', '/pqt/host/', '/pqt/screen/',
  '/assets/pqt/pqt.css', '/assets/pqt/pqt.js', '/assets/pqt/pqt-import.js', '/assets/pqt/pqt-play.js', '/pqt/play/', '/assets/pqt/pqt-gate.js', '/assets/pqt/pqt-leaderboard.js', '/pqt/leaderboard/', '/pqt/data/season-1.json',
  '/assets/pqt/mqtt.min.js', '/assets/pqt/peerjs.min.js', '/assets/pqt/pqt-logo.png', '/assets/pqt/pqt-mark.png', '/assets/pqt/pqt-icon.png', '/assets/pqt/pqt-apple-touch-icon.png', '/assets/pqt/pqt-icon-192.png',
  '/assets/pqt/q/map-canada.png', '/assets/pqt/q/flag-wakanda.png', '/pqt/manifest.webmanifest', '/assets/pqt/pqt-star.js', '/assets/superstar/beat.js', '/assets/superstar/game.json'];
// Pages: network first (always fresh when online), saved copy when offline.
// Files: versioned URLs (?v=) are kept per version; everything else refreshes in the background.
// Redirects (e.g. /pqt/play -> /pqt/play/) are never answered from here: the browser follows them itself.
function key(u, nav) { u = new URL(u, self.location.href); if (nav) { u.search = ''; if (!/\/$/.test(u.pathname) && !/\.[a-z0-9]+$/i.test(u.pathname)) u.pathname += '/'; } return u.href; }
function okToCache(req) { var u = new URL(req.url); return req.method === 'GET' && (u.origin === self.location.origin ? (u.pathname.indexOf('/pqt') === 0 || u.pathname.indexOf('/assets/pqt/') === 0 || u.pathname === '/assets/superstar/beat.js' || u.pathname === '/assets/superstar/game.json') : /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)); }
function good(r) { return r && !r.redirected && (r.ok || r.type === 'opaque'); }
function save(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (good(r)) return caches.open(CACHE).then(function (c) { return c.put(key(url, /\/$/.test(url)), r); }); }).catch(function () {}); }
self.addEventListener('install', function (e) { e.waitUntil(Promise.all(CORE.map(save)).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('pqt-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('message', function (e) { var d = e.data || {}; if (d.t === 'save' && d.urls) e.waitUntil(Promise.all(d.urls.filter(function (u) { return okToCache({ url: u, method: 'GET' }); }).map(save))); });
self.addEventListener('fetch', function (e) {
  var req = e.request; if (!okToCache(req)) return;
  var nav = req.mode === 'navigate';
  if (nav) {
    var u = new URL(req.url);
    if (!/\/$/.test(u.pathname) && !/\.[a-z0-9]+$/i.test(u.pathname)) return;   // let the site add the trailing slash
    e.respondWith(fetch(req).then(function (r) {
      if (good(r)) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(key(req.url, true), cp); }); }
      return r;
    }).catch(function () { return caches.open(CACHE).then(function (c) { return c.match(key(req.url, true)).then(function (hit) { return hit || c.match(key('/pqt/', true)); }); }); }));
    return;
  }
  var k = key(req.url), versioned = /[?&]v=/.test(req.url);
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(k).then(function (hit) {
      var net = fetch(req).then(function (r) { if (good(r)) c.put(k, r.clone()); else if (r && (r.status === 404 || r.status === 410)) c.delete(k); return r; });
      if (hit) { if (!versioned) e.waitUntil(net.catch(function () {})); return hit; }
      return net.catch(function () { return Response.error(); });
    });
  }));
});
