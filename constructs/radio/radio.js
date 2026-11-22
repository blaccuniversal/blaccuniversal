/* BLACC Radio · live stations from the open Radio Browser directory */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var root = $('[data-root]'), au = $('[data-au]'), dial = $('[data-dial]'), knob = $('[data-knob]');
  var elName = $('[data-sname]'), elMeta = $('[data-meta]'), elSt = $('[data-status]'), elCtx = $('[data-ctx]'), elArt = $('[data-art]');
  var elList = $('[data-list]'), elLctx = $('[data-lctx]'), elLcount = $('[data-lcount]'), elNet = $('[data-net]');
  var prog = $('[data-prog]'), track = $('[data-track]'), ticksG = $('[data-ticks]');
  var sheet = $('[data-sheet]'), sQ = $('[data-q]'), sL = $('[data-sl]'), sT = $('[data-st]');
  var favBtn = $('[data-fav]'), vol = $('[data-vol]');

  var HOSTS = ['de1', 'de2', 'fi1', 'nl1', 'at1'].map(function (h) { return 'https://' + h + '.api.radio-browser.info'; });
  var STEP = 20, KEY = 'bcr1';
  var S = { list: [], idx: 0, mode: 'country', key: 'NG', label: 'Nigeria', playing: false, tok: 0, fails: 0, hls: null, want: false };
  var store = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  store.fav = store.fav || []; store.rec = store.rec || [];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- api ---------- */
  var hostI = 0;
  function api(path, ms) {
    var tries = 0;
    function go() {
      var base = HOSTS[(hostI + tries) % HOSTS.length], ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, ms || 8000);
      return fetch(base + '/json/' + path, { signal: ctl.signal }).then(function (r) {
        clearTimeout(t); if (!r.ok) throw new Error('http'); hostI = (hostI + tries) % HOSTS.length; return r.json();
      }).catch(function (e) { clearTimeout(t); if (++tries < HOSTS.length) return go(); throw e; });
    }
    return go();
  }
  function cached(key, path, ttl) {
    var c = store['c_' + key];
    if (c && Date.now() - c.t < ttl) return Promise.resolve(c.d);
    return api(path).then(function (d) {
      var slim = d.map(function (x) { return x.iso_3166_1 ? { n: x.name, c: x.iso_3166_1, k: x.stationcount } : { n: x.name, k: x.stationcount }; });
      store['c_' + key] = { t: Date.now(), d: slim }; save(); return slim;
    }).catch(function (e) { if (c) return c.d; throw e; });
  }
  function norm(s) {
    var u = s.url_resolved || s.url || '';
    if (!/^https:\/\//i.test(u) || !(s.name || '').trim()) return null;
    return { id: s.stationuuid, name: s.name.trim().replace(/\s+/g, ' '), url: u, cc: s.countrycode || '', country: s.country || '', tags: (s.tags || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 3), codec: s.codec || '', br: s.bitrate | 0, logo: /^https:\/\//i.test(s.favicon || '') ? s.favicon : '', hls: s.hls | 0 };
  }
  function stations(q) {
    return api('stations/search?hidebroken=true&is_https=true&order=clickcount&reverse=true&limit=120&' + q, 10000).then(function (a) {
      var seen = {}, out = [];
      a.forEach(function (s) { var n = norm(s); if (!n) return; var k = n.name.toLowerCase(); if (seen[k]) return; seen[k] = 1; out.push(n); });
      return out;
    });
  }

  /* ---------- dial ui ---------- */
  (function ring() {
    var cx = 100, cy = 100, r = 84, a0 = 135, a1 = 405;
    function pt(a, rr) { var t = a * Math.PI / 180; return [cx + rr * Math.cos(t), cy + rr * Math.sin(t)]; }
    var s = pt(a0, r), e = pt(a1, r), d = 'M ' + s[0].toFixed(2) + ' ' + s[1].toFixed(2) + ' A ' + r + ' ' + r + ' 0 1 1 ' + e[0].toFixed(2) + ' ' + e[1].toFixed(2);
    track.setAttribute('d', d); prog.setAttribute('d', d);
    var h = '';
    for (var i = 0; i <= 54; i++) { var a = a0 + (a1 - a0) * i / 54, p = pt(a, 93), q = pt(a, i % 6 ? 96.5 : 99); h += '<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '"/>'; }
    ticksG.innerHTML = h;
    var sats = document.querySelectorAll('[data-sat]'), n = sats.length, W = 0.5, cxp = 0.38, cyp = 0.5;
    Array.prototype.forEach.call(sats, function (b, i) {
      var ang = (-52 + (104 * i / (n - 1))) * Math.PI / 180;
      b.style.left = ((cxp + W * Math.cos(ang)) * 100).toFixed(2) + '%'; b.style.top = ((cyp + W * Math.sin(ang)) * 100).toFixed(2) + '%';
    });
  })();
  function paint() {
    var n = S.list.length, st = S.list[S.idx];
    prog.style.strokeDasharray = (n ? (S.idx + 1) / n * 100 : 0) + ' 100';
    var on = ticksG.children, lit = n ? Math.round((S.idx + 1) / n * 54) : 0;
    for (var i = 0; i < on.length; i++) on[i].classList.toggle('on', i <= lit && n > 0);
    dial.setAttribute('aria-valuemax', Math.max(0, n - 1)); dial.setAttribute('aria-valuenow', S.idx);
    if (!drag) knob.style.setProperty('--rot', (S.idx * STEP) + 'deg');
    elLctx.textContent = S.label; elLcount.textContent = n ? (S.idx + 1) + ' of ' + n : '';
    elCtx.textContent = S.label;
    if (st) {
      elName.textContent = st.name;
      elMeta.textContent = [st.country, st.tags.join(' · '), (st.codec ? st.codec + (st.br ? ' ' + st.br + 'k' : '') : '')].filter(Boolean).join('  ·  ') || ' ';
      art(elArt, st);
      var isF = store.fav.some(function (f) { return f.id === st.id; });
      favBtn.setAttribute('aria-pressed', isF); favBtn.setAttribute('aria-label', isF ? 'Remove from favourites' : 'Add to favourites');
    } else { elName.textContent = 'Tune in'; elMeta.innerHTML = '&nbsp;'; elArt.style.backgroundImage = ''; elArt.textContent = ''; }
    Array.prototype.forEach.call(document.querySelectorAll('[data-sat]'), function (b) { b.classList.toggle('on', b.getAttribute('data-sat') === S.mode); });
    Array.prototype.forEach.call(elList.children, function (li, i) { var r = li.firstChild; if (r && r.classList) r.classList.toggle('sel', i === S.idx); });
    if ('mediaSession' in navigator && st) {
      try { navigator.mediaSession.metadata = new MediaMetadata({ title: st.name, artist: 'BLACC Radio', album: st.country || '', artwork: st.logo ? [{ src: st.logo, sizes: '256x256' }] : [] }); } catch (e) {}
    }
  }
  function art(el, st) {
    if (st.logo) { el.style.backgroundImage = 'url("' + st.logo.replace(/"/g, '%22') + '")'; el.textContent = ''; var im = new Image(); im.onerror = function () { el.style.backgroundImage = ''; el.textContent = (st.cc || st.name.slice(0, 2)).toUpperCase(); }; im.src = st.logo; }
    else { el.style.backgroundImage = ''; el.textContent = (st.cc || st.name.slice(0, 2)).toUpperCase(); }
  }
  function renderList() {
    if (!S.list.length) { elList.innerHTML = '<li class="empty">' + esc(S.empty || 'No stations here.') + '</li>'; return; }
    elList.innerHTML = S.list.map(function (st, i) {
      return '<li><button type="button" class="row' + (i === S.idx ? ' sel' : '') + '" data-i="' + i + '"><span class="row__a" data-a="' + i + '"></span><span class="row__t"><b>' + esc(st.name) + '</b><span>' + esc([st.country, st.tags.join(', ')].filter(Boolean).join(' · ')) + '</span></span><span class="eq"><i></i><i></i><i></i></span></button></li>';
    }).join('');
    Array.prototype.forEach.call(elList.querySelectorAll('[data-a]'), function (a) { art(a, S.list[+a.getAttribute('data-a')]); });
    scrollSel(true);
  }
  function scrollSel(instant) {
    var li = elList.children[S.idx]; if (!li) return;
    var top = li.offsetTop - (elList.clientHeight - li.offsetHeight) / 2;
    elList.scrollTo({ top: top, behavior: instant ? 'auto' : 'smooth' });
  }
  function setState(cls, msg, bad) {
    root.classList.toggle('is-play', cls === 'live' || cls === 'load');
    root.classList.toggle('is-live', cls === 'live'); root.classList.toggle('is-load', cls === 'load');
    elSt.textContent = msg || ''; elSt.classList.toggle('bad', !!bad);
    var hub = $('[data-play]'); hub.setAttribute('aria-label', cls === 'live' || cls === 'load' ? 'Pause' : 'Play');
  }

  /* ---------- playback ---------- */
  var hlsP = null;
  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsP) return hlsP;
    hlsP = new Promise(function (res) { var s = document.createElement('script'); s.src = '/constructs/radio/hls.light.min.js?v=1'; s.onload = function () { res(window.Hls); }; s.onerror = function () { res(null); }; document.head.appendChild(s); });
    return hlsP;
  }
  function killHls() { if (S.hls) { try { S.hls.destroy(); } catch (e) {} S.hls = null; } }
  function tune(i, keep) {
    if (!S.list.length) return;
    S.idx = ((i % S.list.length) + S.list.length) % S.list.length;
    paint(); scrollSel(); begin(keep);
  }
  function begin(keep) {
    var st = S.list[S.idx]; if (!st) return;
    var tok = ++S.tok; if (!keep) S.fails = 0; S.want = true;
    killHls(); setState('load', 'Tuning…');
    store.last = { mode: S.mode, key: S.key, label: S.label, id: st.id }; pushRecent(st); save();
    api('url/' + encodeURIComponent(st.id), 4000).catch(function () {});
    var isH = st.hls || /\.m3u8(\?|$)/i.test(st.url);
    function fail(msg) { if (tok !== S.tok) return; onFail(msg); }
    if (isH && !au.canPlayType('application/vnd.apple.mpegurl')) {
      loadHls().then(function (H) {
        if (tok !== S.tok) return;
        if (!H || !H.isSupported()) return fail();
        var h = new H({ enableWorker: true, lowLatencyMode: false }); S.hls = h;
        h.on(H.Events.ERROR, function (_, d) { if (d && d.fatal) fail(); });
        h.loadSource(st.url); h.attachMedia(au);
        au.play().catch(function (e) { if (e && e.name === 'NotAllowedError') pausedUi(); });
      });
    } else {
      au.src = st.url; au.load();
      var p = au.play(); if (p && p.catch) p.catch(function (e) { if (e && e.name === 'NotAllowedError') pausedUi(); else if (e && e.name !== 'AbortError') fail(); });
    }
  }
  function onFail() {
    killHls(); S.fails++;
    if (S.fails >= 4 || S.list.length < 2) { S.want = false; setState('', 'This station isn’t available right now.', true); au.removeAttribute('src'); return; }
    setState('load', 'Not available, trying the next one…', true);
    var tok = S.tok; setTimeout(function () { if (tok === S.tok && S.want) tune(S.idx + 1, true); }, 900);
  }
  function pausedUi() { S.want = false; setState('', ''); }
  function stop() { S.tok++; S.want = false; killHls(); try { au.pause(); } catch (e) {} au.removeAttribute('src'); au.load(); setState('', ''); }
  function toggle() {
    if (!S.list.length) return;
    if (root.classList.contains('is-play')) stop(); else begin();
  }
  au.addEventListener('playing', function () { S.fails = 0; setState('live', 'Live'); });
  au.addEventListener('waiting', function () { if (S.want) setState('load', 'Buffering…'); });
  au.addEventListener('stalled', function () { if (S.want && au.readyState < 3) setState('load', 'Buffering…'); });
  au.addEventListener('error', function () { if (S.want && au.getAttribute('src')) onFail(); });
  au.addEventListener('pause', function () { if (S.want && !au.ended && root.classList.contains('is-live')) { /* external pause (headset, lock screen) */ S.tok++; S.want = false; setState('', ''); } });
  function pushRecent(st) {
    store.rec = [st].concat(store.rec.filter(function (r) { return r.id !== st.id; })).slice(0, 25);
  }

  /* ---------- lists / modes ---------- */
  function setList(list, mode, key, label, id, empty) {
    S.list = list; S.mode = mode; S.key = key; S.label = label; S.empty = empty;
    S.idx = Math.max(0, id ? list.findIndex(function (s) { return s.id === id; }) : 0);
    renderList(); paint();
  }
  function showCountry(cc, name, id) {
    S.mode = 'country'; elCtx.textContent = 'Loading…';
    return stations('countrycode=' + encodeURIComponent(cc)).then(function (l) {
      setList(l, 'country', cc, name + ' · Popular', id, 'No streams found for this country. Try another one.');
    }).catch(netErr);
  }
  function showTag(tag, id) {
    elCtx.textContent = 'Loading…';
    return stations('tagExact=true&tag=' + encodeURIComponent(tag)).then(function (l) {
      setList(l, 'genre', tag, cap(tag) + ' · Worldwide', id, 'No streams found for this genre.');
    }).catch(netErr);
  }
  function showFav() { setList(store.fav.slice(), 'fav', 'fav', 'Favourites', null, 'No favourites yet. Tap the heart on a station to keep it here.'); }
  function showRecent() { setList(store.rec.slice(), 'recent', 'recent', 'Recently played', null, 'Nothing played yet.'); }
  function netErr() {
    elNet.textContent = 'Offline?'; setList([], S.mode, S.key, 'Can’t reach the station directory', null, 'The station directory could not be reached. Check your connection and try again.');
    elList.innerHTML = '<li class="empty">The station directory could not be reached.<br>Check your connection and try again.<br><button type="button" data-retry>Retry</button></li>';
  }
  function cap(s) { return s.replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }

  /* ---------- sheets ---------- */
  var sheetKind = '', sheetData = [], sT0 = 0;
  function openSheet(kind) {
    sheetKind = kind; sheet.hidden = false; sQ.value = ''; sL.innerHTML = '<li class="empty">Loading…</li>';
    sT.textContent = kind === 'country' ? 'Choose a country' : kind === 'genre' ? 'Choose a genre' : 'Search stations';
    sQ.placeholder = kind === 'search' ? 'Station name' : 'Filter';
    setTimeout(function () { if (kind !== 'country' || matchMedia('(min-width:900px)').matches) sQ.focus(); }, 60);
    if (kind === 'country') cached('countries', 'countries?hidebroken=true&order=stationcount&reverse=true', 864e5).then(function (d) { sheetData = d.filter(function (x) { return x.k > 0 && x.c; }); fill(); }).catch(function () { sL.innerHTML = '<li class="empty">Could not load countries.</li>'; });
    else if (kind === 'genre') cached('tags', 'tags?hidebroken=true&order=stationcount&reverse=true&limit=150', 864e5).then(function (d) { sheetData = d.filter(function (x) { return x.k > 20; }); fill(); }).catch(function () { sL.innerHTML = '<li class="empty">Could not load genres.</li>'; });
    else { sheetData = []; sL.innerHTML = '<li class="empty">Type a station name to search the world.</li>'; }
  }
  function closeSheet() { sheet.hidden = true; document.activeElement && document.activeElement.blur && document.activeElement.blur(); }
  function fill() {
    var q = sQ.value.trim().toLowerCase();
    var d = sheetData.filter(function (x) { return !q || x.n.toLowerCase().indexOf(q) > -1; }).slice(0, 250);
    if (!d.length) { sL.innerHTML = '<li class="empty">Nothing matches.</li>'; return; }
    sL.innerHTML = d.map(function (x, i) {
      return '<li><button type="button" class="row" data-pick="' + esc(sheetKind === 'country' ? x.c : x.n) + '" data-nm="' + esc(x.n) + '">' + (x.c ? '<span class="cc">' + esc(x.c) + '</span>' : '') + '<span class="row__t"><b>' + esc(sheetKind === 'genre' ? cap(x.n) : x.n) + '</b></span><span class="cnt">' + x.k + '</span></button></li>';
    }).join('');
  }
  function runSearch() {
    var q = sQ.value.trim(); if (q.length < 2) { sL.innerHTML = '<li class="empty">Type at least 2 letters.</li>'; return; }
    var my = ++sT0; sL.innerHTML = '<li class="empty">Searching…</li>';
    stations('name=' + encodeURIComponent(q)).then(function (l) {
      if (my !== sT0) return;
      sheetData = l;
      if (!l.length) { sL.innerHTML = '<li class="empty">No stations found for “' + esc(q) + '”.</li>'; return; }
      sL.innerHTML = l.slice(0, 80).map(function (st, i) { return '<li><button type="button" class="row" data-sr="' + i + '"><span class="cc">' + esc(st.cc || '··') + '</span><span class="row__t"><b>' + esc(st.name) + '</b><span>' + esc([st.country, st.tags.join(', ')].filter(Boolean).join(' · ')) + '</span></span></button></li>'; }).join('');
    }).catch(function () { if (my === sT0) sL.innerHTML = '<li class="empty">Search failed. Check your connection.</li>'; });
  }
  var qT; sQ.addEventListener('input', function () { if (sheetKind === 'search') { clearTimeout(qT); qT = setTimeout(runSearch, 350); } else fill(); });
  sQ.addEventListener('keydown', function (e) { if (e.key === 'Enter' && sheetKind === 'search') { clearTimeout(qT); runSearch(); sQ.blur(); } });
  sheet.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) return closeSheet();
    var p = e.target.closest('[data-pick]'), sr = e.target.closest('[data-sr]');
    if (p) { var v = p.getAttribute('data-pick'), nm = p.getAttribute('data-nm'); closeSheet(); stop(); (sheetKind === 'country' ? showCountry(v, nm) : showTag(v)).then(function () { if (S.list.length) tune(0); }); }
    else if (sr) { var st = sheetData[+sr.getAttribute('data-sr')]; closeSheet(); setList(sheetData.slice(0, 80), 'search', 'search', 'Search · ' + sQ.value.trim(), st.id); tune(S.idx); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

  /* ---------- controls ---------- */
  $('[data-play]').addEventListener('click', function (e) { e.stopPropagation(); if (!moved) toggle(); });
  $('[data-prev]').addEventListener('click', function () { tune(S.idx - 1); });
  $('[data-next]').addEventListener('click', function () { tune(S.idx + 1); });
  $('[data-up]').addEventListener('click', function () { tune(S.idx - 1); });
  $('[data-down]').addEventListener('click', function () { tune(S.idx + 1); });
  favBtn.addEventListener('click', function () {
    var st = S.list[S.idx]; if (!st) return;
    var has = store.fav.some(function (f) { return f.id === st.id; });
    store.fav = has ? store.fav.filter(function (f) { return f.id !== st.id; }) : [st].concat(store.fav);
    save(); paint(); if (S.mode === 'fav' && has) { var cur = st.id; showFav(); }
  });
  $('[data-sats]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-sat]'); if (!b) return; var k = b.getAttribute('data-sat');
    if (k === 'fav') showFav(); else if (k === 'recent') showRecent(); else openSheet(k);
  });
  elList.addEventListener('click', function (e) {
    var r = e.target.closest('[data-i]'); if (r) tune(+r.getAttribute('data-i'));
    else if (e.target.closest('[data-retry]')) init();
  });
  vol.addEventListener('input', function () { var v = vol.value / 100; au.volume = v; vol.style.setProperty('--v', vol.value + '%'); store.vol = +vol.value; save(); });

  /* dial gestures: turn to step through stations, tap hub to play/pause */
  var drag = false, moved = false, lastA = 0, acc = 0, sx = 0, sy = 0, tuneT = 0, baseIdx = 0, pend = 0;
  function ang(e) { var r = dial.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; }
  dial.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return; drag = true; moved = false; acc = 0; lastA = ang(e); sx = e.clientX; sy = e.clientY; baseIdx = S.idx; pend = 0;
    dial.classList.add('drag'); try { dial.setPointerCapture(e.pointerId); } catch (x) {}
  });
  dial.addEventListener('pointermove', function (e) {
    if (!drag) return;
    if (!moved && Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 6) moved = true;
    if (!moved) return;
    var a = ang(e), d = a - lastA; if (d > 180) d -= 360; if (d < -180) d += 360; lastA = a; acc += d;
    knob.style.setProperty('--rot', (baseIdx * STEP + acc) + 'deg');
    var n = S.list.length; if (!n) return;
    var steps = Math.round(acc / STEP), ni = (((baseIdx + steps) % n) + n) % n;
    if (ni !== S.idx) { S.idx = ni; paintLight(); if (navigator.vibrate) try { navigator.vibrate(4); } catch (x) {} clearTimeout(tuneT); tuneT = setTimeout(function () { tune(S.idx); }, 420); }
  });
  function endDrag(e) {
    if (!drag) return; drag = false; dial.classList.remove('drag');
    knob.style.setProperty('--rot', (S.idx * STEP) + 'deg');
    setTimeout(function () { moved = false; }, 0);
  }
  dial.addEventListener('pointerup', endDrag); dial.addEventListener('pointercancel', endDrag);
  function paintLight() { paint(); scrollSel(); }
  dial.addEventListener('wheel', function (e) { e.preventDefault(); var now = Date.now(); if (now - (dial._w || 0) < 120) return; dial._w = now; var n = S.list.length; if (!n) return; S.idx = (S.idx + (e.deltaY > 0 ? 1 : -1) + n) % n; paintLight(); clearTimeout(tuneT); tuneT = setTimeout(function () { tune(S.idx); }, 420); }, { passive: false });
  dial.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowUp') { e.preventDefault(); tune(S.idx + (k === 'ArrowUp' ? -1 : 1)); }
    else if (k === 'ArrowLeft' || k === 'ArrowDown') { e.preventDefault(); tune(S.idx + (k === 'ArrowDown' ? 1 : -1)); }
    else if (k === ' ' || k === 'Enter') { e.preventDefault(); toggle(); }
  });
  if ('mediaSession' in navigator) {
    [['play', function () { begin(); }], ['pause', stop], ['stop', stop], ['previoustrack', function () { tune(S.idx - 1); }], ['nexttrack', function () { tune(S.idx + 1); }]].forEach(function (a) { try { navigator.mediaSession.setActionHandler(a[0], a[1]); } catch (e) {} });
  }
  window.addEventListener('online', function () { elNet.textContent = ''; });
  window.addEventListener('offline', function () { elNet.textContent = 'Offline'; });

  /* ---------- start ---------- */
  function init() {
    elNet.textContent = navigator.onLine === false ? 'Offline' : '';
    var v = typeof store.vol === 'number' ? store.vol : 80; vol.value = v; au.volume = v / 100; vol.style.setProperty('--v', v + '%');
    var L = store.last, p;
    if (L && L.mode === 'fav' && store.fav.length) { showFav(); p = Promise.resolve(); }
    else if (L && L.mode === 'genre') p = showTag(L.key, L.id);
    else if (L && L.mode === 'country') p = showCountry(L.key, L.label.split(' · ')[0], L.id);
    else {
      var reg = ((navigator.language || '').split('-')[1] || '').toUpperCase();
      p = cached('countries', 'countries?hidebroken=true&order=stationcount&reverse=true', 864e5).then(function (d) {
        var m = d.filter(function (x) { return x.c === reg; })[0] || d.filter(function (x) { return x.c === 'NG'; })[0] || d[0];
        return showCountry(m.c, m.n);
      }).catch(netErr);
    }
    return p;
  }
  paint(); renderList(); init();
})();
