/* PQT vault: keeps a host's saved games in sync across devices.
   Games are sealed in the browser with the host code's key (AES-GCM) before they leave the device, so the
   store only ever holds scrambled text. Each code writes to its own slot and proves ownership with a
   secret derived from the code, so nobody else can overwrite it.
   Turn on by setting URL to the deployed Apps Script web app (see pqt-vault.gs in the PQT project doc). */
(function () {
  'use strict';
  var URL = '';   // e.g. 'https://script.google.com/macros/s/XXXX/exec'
  var q = new URLSearchParams(location.search).get('vault');
  if (q && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(q)) URL = q;
  var enc = new TextEncoder();
  function hex(buf) { return [].map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function sha(s) { return crypto.subtle.digest('SHA-256', enc.encode(s)).then(hex); }
  function pass() { try { return JSON.parse(localStorage.getItem('pqt_pass') || 'null'); } catch (e) { return null; } }

  var api = window.PQT_VAULT = { on: false, state: 'off', at: 0, onState: null };
  function setState(s) { api.state = s; if (s === 'ok') api.at = Date.now(); if (api.onState) try { api.onState(s); } catch (e) {} }
  var h = null, lastSent = '', busy = null, again = false, timer = 0;

  function ident() {
    if (h) return Promise.resolve(h);
    var v = pass(); if (!URL || !v || !v.k || !v.b || !window.PQT_CRYPT) return Promise.resolve(null);
    return sha('blaccpqt-vault-auth:' + v.k).then(function (a) { h = { id: v.b, auth: a }; api.on = true; return h; });
  }
  function get(id) { return fetch(URL + (URL.indexOf('?') > -1 ? '&' : '?') + 'id=' + encodeURIComponent(id) + '&t=' + Date.now()).then(function (r) { return r.json(); }); }
  function put(id, auth, data) { return fetch(URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ op: 'put', id: id, auth: auth, data: data }) }).then(function (r) { return r.json(); }); }

  // Merge two lists of saved games. A game removed on one device stays removed (tombstone) unless it was saved again later.
  function merge(local, del, remote) {
    var byId = {}, dels = {}, k;
    for (k in (del || {})) dels[k] = del[k];
    for (k in ((remote && remote.del) || {})) dels[k] = Math.max(dels[k] || 0, remote.del[k]);
    (local || []).concat((remote && remote.games) || []).forEach(function (g) { if (g && g.id && (!byId[g.id] || g.at > byId[g.id].at)) byId[g.id] = g; });
    var out = [];
    Object.keys(byId).forEach(function (id) { if (!(dels[id] && dels[id] >= byId[id].at)) out.push(byId[id]); });
    out.sort(function (a, b) { return b.at - a.at; });
    Object.keys(dels).forEach(function (id) { if (Date.now() - dels[id] > 60 * 864e5) delete dels[id]; });
    return { games: out.slice(0, 30), del: dels };
  }

  // io: { get(): games, getDel(): {id:ts}, set(games, del) }  returns a promise
  api.sync = function (io) {
    if (busy) { again = true; return busy; }
    busy = ident().then(function (hh) {
      if (!hh) { setState('off'); return; }
      setState('sync');
      return get(hh.id).then(function (res) {
        if (!res || !res.ok) throw new Error('get');
        var rem = null;
        return (res.data ? window.PQT_CRYPT.open(res.data).then(function (o) { rem = o; }).catch(function () { rem = null; }) : Promise.resolve()).then(function () {
          var m = merge(io.get(), io.getDel(), rem), before = JSON.stringify(io.get());
          io.set(m.games, m.del);
          var body = JSON.stringify(m), changedLocal = JSON.stringify(io.get()) !== before;
          if (body === lastSent && !changedLocal) { setState('ok'); return; }
          return window.PQT_CRYPT.seal(m).then(function (sealed) { return put(hh.id, hh.auth, sealed); }).then(function (r) {
            if (!r || !r.ok) throw new Error(r && r.err || 'put');
            lastSent = body; setState('ok');
          });
        });
      });
    }).catch(function (e) { setState(String(e && e.message) === 'auth' ? 'locked' : 'fail'); }).then(function () { busy = null; if (again) { again = false; return api.sync(io); } });
    return busy;
  };
  api.soon = function (io, ms) { clearTimeout(timer); timer = setTimeout(function () { api.sync(io); }, ms || 3000); };
  api.merge = merge;
})();
