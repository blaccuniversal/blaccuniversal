/* Bemaamoo service worker: plays offline once loaded */
var CACHE = 'bemaamoo-v22';
var CORE = ['/bemaamoo/', '/assets/bemaamoo/bmo.css?v=14', '/assets/bemaamoo/bmo-gate.js?v=4', '/assets/bemaamoo/bmo-engine.js?v=6', '/assets/bemaamoo/bmo.js?v=17', '/bemaamoo/icon.svg', '/assets/bemaamoo/mqtt.min.js?v=1'];
self.addEventListener('install', function (e) { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).catch(function () {})); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('bemaamoo-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url), same = url.origin === location.origin, font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !font) return;
  if (same && !/^\/(bemaamoo|assets\/bemaamoo)\//.test(url.pathname)) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    // pages: network first so updates show straight away
    if (req.mode === 'navigate') {
      return fetch(req, { cache: 'no-cache' }).then(function (res) { if (res.ok) c.put('/bemaamoo/', res.clone()); return res; })
        .catch(function () { return c.match('/bemaamoo/'); });
    }
    // word lists are versioned by ?v=, so once cached they never need re-downloading
    if (same && /\/words\//.test(url.pathname)) {
      return c.match(req).then(function (hit) { return hit || fetch(req).then(function (res) { if (res && res.ok) c.put(req, res.clone()); return res; }); });
    }
    return c.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
