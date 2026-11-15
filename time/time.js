/* BLACC Universal · World Clock (/time) */
(function () {
  'use strict';
  var D = window.TZD; if (!D) return;
  var RAD = Math.PI / 180;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* ---------- data ---------- */
  var raw = atob(D.dots), N = raw.length / 5;
  var dLat = new Float32Array(N), dLon = new Float32Array(N), dC = new Uint8Array(N);
  var sLat = new Float32Array(N), cLat = new Float32Array(N);
  for (var i = 0; i < N; i++) {
    var o = i * 5;
    var a = (raw.charCodeAt(o) | raw.charCodeAt(o + 1) << 8); if (a > 32767) a -= 65536;
    var b = (raw.charCodeAt(o + 2) | raw.charCodeAt(o + 3) << 8); if (b > 32767) b -= 65536;
    dLat[i] = a / 100; dLon[i] = b / 100; dC[i] = raw.charCodeAt(o + 4);
    sLat[i] = Math.sin(dLat[i] * RAD); cLat[i] = Math.cos(dLat[i] * RAD);
  }
  // cities: [name, ascii|0, province, iso2, lat, lng, pop, tzIndex]
  var C = D.cities.map(function (c) {
    var ascii = (c[1] || c[0]);
    return { name: c[0], key: norm(ascii), prov: c[2], iso: c[3], lat: c[4], lon: c[5], pop: c[6], tz: D.tz[c[7]] };
  });
  var byIso = {};
  C.forEach(function (c) { (byIso[c.iso] = byIso[c.iso] || []).push(c); });
  function cname(iso) { return D.names[iso] || iso || ''; }
  var countryKeys = Object.keys(D.names).map(function (k) { return { iso: k, key: norm(D.names[k]) }; });

  function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function dist(aLat, aLon, bLat, bLon) {
    var p = Math.sin((bLat - aLat) * RAD / 2), q = Math.sin((bLon - aLon) * RAD / 2);
    var h = p * p + Math.cos(aLat * RAD) * Math.cos(bLat * RAD) * q * q;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /* ---------- time helpers ---------- */
  var LOCAL_TZ = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
  var h12 = !/^(?:en-GB|fr|de|es|it|pt|ru|nl|sv|pl)/.test(navigator.language || '') ;
  var fmts = {};
  function fmt(tz, kind) {
    var k = tz + '|' + kind + '|' + h12;
    if (!fmts[k]) {
      var opt = { timeZone: tz };
      if (kind === 't') { opt.hour = h12 ? 'numeric' : '2-digit'; opt.minute = '2-digit'; opt.second = '2-digit'; opt.hour12 = h12; }
      else if (kind === 's') { opt.hour = 'numeric'; opt.minute = '2-digit'; opt.hour12 = h12; }
      else if (kind === 'd') { opt.weekday = 'long'; opt.day = 'numeric'; opt.month = 'long'; }
      else if (kind === 'o') { opt.hour = '2-digit'; opt.minute = '2-digit'; opt.hourCycle = 'h23'; opt.year = 'numeric'; opt.month = '2-digit'; opt.day = '2-digit'; }
      var loc = (kind === 't' || kind === 's') && h12 ? 'en-US' : 'en-GB';
      try { fmts[k] = new Intl.DateTimeFormat(loc, opt); }
      catch (e) { opt.timeZone = 'UTC'; fmts[k] = new Intl.DateTimeFormat(loc, opt); }
    }
    return fmts[k];
  }
  function offsetMin(tz, now) {
    if (typeof tz === 'number') return tz;
    var p = {}; fmt(tz, 'o').formatToParts(now).forEach(function (x) { p[x.type] = x.value; });
    var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
    return Math.round((asUTC - Math.floor(now / 60000) * 60000) / 60000);
  }
  function offLabel(m) {
    if (!m) return 'GMT';
    var s = m < 0 ? '−' : '+'; m = Math.abs(m);
    return 'GMT' + s + Math.floor(m / 60) + (m % 60 ? ':' + String(m % 60).padStart(2, '0') : '');
  }
  function timeParts(place, now) {
    if (typeof place.tz === 'number') { // fixed offset (sea / Antarctica)
      var d = new Date(now.getTime() + place.tz * 60000);
      return { t: fmt('UTC', 't').format(d), d: fmt('UTC', 'd').format(d), s: fmt('UTC', 's').format(d) };
    }
    return { t: fmt(place.tz, 't').format(now), d: fmt(place.tz, 'd').format(now), s: fmt(place.tz, 's').format(now) };
  }
  function relLabel(m) {
    var me = offsetMin(LOCAL_TZ, new Date());
    var diff = m - me;
    if (!diff) return 'Same time as you';
    var a = Math.abs(diff), h = Math.floor(a / 60), mm = a % 60;
    var s = (h ? h + (h === 1 ? ' hr' : ' hrs') : '') + (mm ? (h ? ' ' : '') + mm + ' min' : '');
    return s + (diff > 0 ? ' ahead of you' : ' behind you');
  }

  /* ---------- places ---------- */
  function localPlace() {
    var seg = norm(LOCAL_TZ.split('/').pop().replace(/_/g, ' '));
    var list = C.filter(function (c) { return c.tz === LOCAL_TZ; });
    var best = list.filter(function (c) { return c.key === seg; })[0] || list[0];
    if (best) return Object.assign({}, best, { you: true });
    return { name: 'Your time', prov: '', iso: '', lat: null, lon: null, tz: LOCAL_TZ, you: true };
  }
  function seaPlace(lat, lon, label) {
    var z = Math.round(lon / 15);
    return { name: label || 'Open sea', prov: '', iso: '', lat: lat, lon: lon, tz: z * 60, sea: true,
      note: 'Nautical time zone · ' + offLabel(z * 60) };
  }
  function nearestLand(lat, lon) {
    var best = -1, bd = 1e9, sl = Math.sin(lat * RAD), cl = Math.cos(lat * RAD);
    for (var i = 0; i < N; i++) {
      var dot = sl * sLat[i] + cl * cLat[i] * Math.cos((lon - dLon[i]) * RAD);
      var d = 1 - dot; if (d < bd) { bd = d; best = i; }
    }
    var km = 6371 * Math.acos(Math.min(1, 1 - bd));
    return { i: best, km: km };
  }
  function placeAt(lat, lon) {
    var nl = nearestLand(lat, lon);
    if (nl.km > 95) return seaPlace(lat, lon);
    var iso = D.ctry[dC[nl.i]];
    if (iso === 'AQ') { var p = seaPlace(lat, lon, 'Antarctica'); p.note = 'Solar time zone · ' + offLabel(p.tz); return p; }
    var pool = byIso[iso] && byIso[iso].length ? byIso[iso] : C;
    var best = null, bs = 1e12;
    pool.forEach(function (c) {
      var d = dist(lat, lon, c.lat, c.lon);
      var s = d / (1 + Math.log10(Math.max(c.pop, 10)) / 3);  // prefer known cities nearby
      if (s < bs) { bs = s; best = c; }
    });
    return best ? Object.assign({}, best) : seaPlace(lat, lon);
  }

  /* ---------- globe ---------- */
  var stage = $('.tm-globe'), base = $('#tm-base'), fx = $('#tm-fx');
  var bctx = base.getContext('2d'), fctx = fx.getContext('2d');
  var W = 0, H = 0, DPR = 1, R0 = 0;
  var view = { lon: 0, lat: 12, k: 1 };
  var dirty = true;
  var me = localPlace(), sel = me;

  function size() {
    var r = stage.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    [base, fx].forEach(function (cv) { cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); });
    R0 = Math.min(W, H) / 2 * 0.9;
    dirty = true;
  }
  function sun(now) {
    var d = (now - Date.UTC(now.getUTCFullYear(), 0, 0)) / 864e5;
    var g = 2 * Math.PI / 365 * (d - 1);
    var decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    var eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var utcMin = now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;
    return { lat: decl / RAD, lon: -(utcMin + eot - 720) / 4 };
  }
  function project(lat, lon) {
    var p0 = view.lat * RAD, l = (lon - view.lon) * RAD, p = lat * RAD;
    var cp = Math.cos(p), R = R0 * view.k;
    var z = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * cp * Math.cos(l);
    return { x: W / 2 + R * cp * Math.sin(l), y: H / 2 - R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * cp * Math.cos(l)), z: z };
  }
  function invert(px, py) {
    var R = R0 * view.k, x = (px - W / 2) / R, y = -(py - H / 2) / R, rho = Math.sqrt(x * x + y * y);
    if (rho > 1) return null;
    if (rho < 1e-9) return { lat: view.lat, lon: view.lon };
    var c = Math.asin(rho), p0 = view.lat * RAD;
    var lat = Math.asin(Math.cos(c) * Math.sin(p0) + y * Math.sin(c) * Math.cos(p0) / rho);
    var lon = view.lon * RAD + Math.atan2(x * Math.sin(c), rho * Math.cos(c) * Math.cos(p0) - y * Math.sin(c) * Math.sin(p0));
    lon = ((lon / RAD + 540) % 360) - 180;
    return { lat: lat / RAD, lon: lon };
  }

  var LV = 12;
  function drawBase() {
    dirty = false;
    var ctx = bctx, R = R0 * view.k, cx = W / 2, cy = H / 2;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // sphere body
    var g = ctx.createRadialGradient(cx - R * .35, cy - R * .4, R * .05, cx, cy, R);
    g.addColorStop(0, '#121212'); g.addColorStop(1, '#030303');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fillStyle = g; ctx.fill();
    // graticule (faint, dotted)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1; ctx.setLineDash([1, 4]);
    ctx.beginPath();
    var lat, lon, pt, pen;
    for (lon = -180; lon < 180; lon += 20) { pen = false; for (lat = -90; lat <= 90; lat += 3) { pt = project(lat, lon); if (pt.z > 0) { if (pen) ctx.lineTo(pt.x, pt.y); else ctx.moveTo(pt.x, pt.y); pen = true; } else pen = false; } }
    for (lat = -60; lat <= 60; lat += 20) { pen = false; for (lon = -180; lon <= 180; lon += 3) { pt = project(lat, lon); if (pt.z > 0) { if (pen) ctx.lineTo(pt.x, pt.y); else ctx.moveTo(pt.x, pt.y); pen = true; } else pen = false; } }
    ctx.stroke(); ctx.restore(); ctx.setLineDash([]);

    // land dots, shaded by depth and daylight
    var s = sun(new Date()), ss = Math.sin(s.lat * RAD), cs = Math.cos(s.lat * RAD);
    var p0 = view.lat * RAD, sp0 = Math.sin(p0), cp0 = Math.cos(p0);
    var paths = []; for (var q = 0; q < LV; q++) paths.push(new Path2D());
    var rd = Math.max(.7, R * .0062) * Math.min(1.6, Math.pow(view.k, .35));
    var TAU = 2 * Math.PI;
    for (var i = 0; i < N; i++) {
      var l = (dLon[i] - view.lon) * RAD, cl = Math.cos(l);
      var z = sp0 * sLat[i] + cp0 * cLat[i] * cl;
      if (z <= 0.02) continue;
      var x = cx + R * cLat[i] * Math.sin(l), y = cy - R * (cp0 * sLat[i] - sp0 * cLat[i] * cl);
      if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
      var day = ss * sLat[i] + cs * cLat[i] * Math.cos((dLon[i] - s.lon) * RAD);
      var lit = Math.max(0, Math.min(1, (day + .1) / .2));
      var a = (.3 + .7 * lit) * (.2 + .8 * Math.min(1, z * 1.8));
      var lv = Math.min(LV - 1, Math.floor(a * LV));
      var pth = paths[lv], r = rd * (.3 + .7 * Math.sqrt(z));
      pth.moveTo(x + r, y); pth.arc(x, y, r, 0, TAU);
    }
    for (q = 0; q < LV; q++) { ctx.fillStyle = 'rgba(255,255,255,' + ((q + .5) / LV).toFixed(3) + ')'; ctx.fill(paths[q]); }
    // rim
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1; ctx.stroke();
  }

  function marker(place, t, main) {
    if (place.lat == null) return;
    var pt = project(place.lat, place.lon);
    if (pt.z <= 0.03) return;
    var ctx = fctx, a = Math.min(1, pt.z * 3);
    if (main) {
      for (var k = 0; k < 2; k++) {
        var ph = ((t / 1600) + k * .5) % 1;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 5 + ph * 26, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - ph) * .8 * a).toFixed(3) + ')'; ctx.lineWidth = 1.4; ctx.stroke();
      }
      var blink = .55 + .45 * Math.abs(Math.cos(t / 420));
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,' + (blink * a).toFixed(3) + ')'; ctx.fill();
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 4.5, 0, 2 * Math.PI); ctx.strokeStyle = 'rgba(0,0,0,.9)'; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255,255,255,' + (.75 * a).toFixed(3) + ')'; ctx.lineWidth = 1.4; ctx.stroke();
    }
  }

  /* ---------- motion ---------- */
  var anim = null, vel = { x: 0, y: 0 }, dragging = false;
  function flyTo(lat, lon, ms) {
    var fromLon = view.lon, fromLat = view.lat;
    var dLon = ((lon - fromLon + 540) % 360) - 180;
    var toLat = Math.max(-55, Math.min(55, lat));
    anim = { t0: performance.now(), ms: ms || 1100, fromLon: fromLon, fromLat: fromLat, dLon: dLon, dLat: toLat - fromLat };
    vel.x = vel.y = 0;
  }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lastSun = 0;
  function frame(t) {
    if (anim) {
      var p = Math.min(1, (t - anim.t0) / anim.ms), e = reduce ? 1 : ease(p);
      view.lon = anim.fromLon + anim.dLon * e; view.lat = anim.fromLat + anim.dLat * e; dirty = true;
      if (p >= 1) anim = null;
    } else if (!dragging && (Math.abs(vel.x) > .01 || Math.abs(vel.y) > .01)) {
      view.lon -= vel.x; view.lat = Math.max(-80, Math.min(80, view.lat + vel.y));
      vel.x *= .94; vel.y *= .94; dirty = true;
    }
    view.lon = ((view.lon + 540) % 360) - 180;
    if (t - lastSun > 30000) { lastSun = t; dirty = true; }
    if (dirty) drawBase();
    fctx.setTransform(DPR, 0, 0, DPR, 0, 0); fctx.clearRect(0, 0, W, H);
    if (!(sel.lat === me.lat && sel.lon === me.lon)) marker(me, t, false);
    marker(sel, t, true);
    requestAnimationFrame(frame);
  }

  /* ---------- input ---------- */
  var ptrs = {}, start = null, pinch = null;
  fx.addEventListener('pointerdown', function (e) {
    fx.setPointerCapture(e.pointerId);
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(ptrs);
    if (ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.k }; start = null; return;
    }
    anim = null; dragging = true; vel.x = vel.y = 0;
    start = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY, moved: false };
    stage.classList.add('is-grab');
  });
  fx.addEventListener('pointermove', function (e) {
    if (!ptrs[e.pointerId]) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (pinch) {
      var ids = Object.keys(ptrs); if (ids.length < 2) return;
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      view.k = Math.max(1, Math.min(4, pinch.k * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)); dirty = true; return;
    }
    if (!start) return;
    var dx = e.clientX - start.lx, dy = e.clientY - start.ly;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) start.moved = true;
    var deg = 180 / Math.PI / (R0 * view.k);
    view.lon -= dx * deg; view.lat = Math.max(-80, Math.min(80, view.lat + dy * deg));
    vel.x = dx * deg; vel.y = dy * deg;
    start.lx = e.clientX; start.ly = e.clientY; dirty = true;
  });
  function up(e) {
    if (!ptrs[e.pointerId]) return;
    delete ptrs[e.pointerId];
    if (pinch) { if (Object.keys(ptrs).length < 2) pinch = null; start = null; dragging = false; return; }
    dragging = false; stage.classList.remove('is-grab');
    if (start && !start.moved && e.type === 'pointerup') {
      vel.x = vel.y = 0;
      var r = fx.getBoundingClientRect(), ll = invert(e.clientX - r.left, e.clientY - r.top);
      if (ll) choose(placeAt(ll.lat, ll.lon), false);
    }
    start = null;
  }
  fx.addEventListener('pointerup', up); fx.addEventListener('pointercancel', up);
  fx.addEventListener('wheel', function (e) {
    e.preventDefault();
    view.k = Math.max(1, Math.min(4, view.k * Math.exp(-e.deltaY * .0015))); dirty = true;
  }, { passive: false });
  fx.addEventListener('keydown', function (e) {
    var k = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
    if (k) { e.preventDefault(); anim = null; view.lon += k[0] / view.k; view.lat = Math.max(-80, Math.min(80, view.lat + k[1] / view.k)); dirty = true; }
    if (e.key === '+' || e.key === '=') { view.k = Math.min(4, view.k * 1.25); dirty = true; }
    if (e.key === '-') { view.k = Math.max(1, view.k / 1.25); dirty = true; }
  });
  $('[data-tm-zoom="in"]').addEventListener('click', function () { view.k = Math.min(4, view.k * 1.35); dirty = true; });
  $('[data-tm-zoom="out"]').addEventListener('click', function () { view.k = Math.max(1, view.k / 1.35); dirty = true; });

  /* ---------- readout ---------- */
  var el = { name: $('[data-tm-name]'), where: $('[data-tm-where]'), time: $('[data-tm-time]'), date: $('[data-tm-date]'),
    rel: $('[data-tm-rel]'), mine: $('[data-tm-mine]'), mineName: $('[data-tm-minename]'), back: $('[data-tm-back]'), live: $('[data-tm-live]') };
  function whereText(p) {
    if (p.note) return p.note;
    return [p.prov && p.prov !== p.name ? p.prov : '', cname(p.iso)].filter(Boolean).join(', ');
  }
  function tick() {
    var now = new Date(), tp = timeParts(sel, now), m = offsetMin(sel.tz, now);
    var mm = /^(.*?)\s*([AP]M)$/i.exec(tp.t);
    if (mm) { el.time.innerHTML = ''; el.time.appendChild(document.createTextNode(mm[1])); var sp = document.createElement('span'); sp.textContent = mm[2]; el.time.appendChild(sp); }
    else el.time.textContent = tp.t;
    el.date.textContent = tp.d + ' · ' + offLabel(m);
    el.rel.textContent = sel.you ? 'Your local time' : relLabel(m);
    el.mine.textContent = timeParts(me, now).s;
  }
  function choose(p, fly) {
    sel = p;
    el.name.textContent = p.name;
    el.where.textContent = whereText(p);
    el.back.hidden = !!p.you;
    if (p.lat != null && fly !== false) flyTo(p.lat, p.lon);
    tick();
    el.live.textContent = p.name + ', ' + el.time.textContent + ', ' + el.rel.textContent;
    document.title = (p.you ? 'World Clock' : p.name + ' time') + ' · BLACC Universal';
  }
  el.mineName.textContent = me.name;
  el.back.addEventListener('click', function () { choose(me); });
  $('[data-tm-12]').addEventListener('click', function () {
    h12 = !h12; this.textContent = h12 ? '24h' : '12h'; this.setAttribute('aria-pressed', String(!h12)); tick();
  });
  $('[data-tm-12]').textContent = h12 ? '24h' : '12h';

  /* ---------- search ---------- */
  var input = $('#tm-q'), list = $('#tm-res'), hits = [], active = -1;
  function search(q) {
    q = norm(q); if (!q) return [];
    var out = [], seen = {};
    function add(c, score) { var id = c.name + c.iso + c.lat; if (seen[id]) return; seen[id] = 1; out.push({ c: c, s: score }); }
    countryKeys.forEach(function (k) {
      if (k.key.indexOf(q) === 0 && byIso[k.iso]) byIso[k.iso].slice(0, 2).forEach(function (c, i) { add(c, 2.5 - i * .2); });
    });
    var parts = q.split(' '), first = q;
    for (var i = 0; i < C.length; i++) {
      var c = C[i], k = c.key, s = 0;
      if (k === first) s = 4; else if (k.indexOf(first) === 0) s = 3; else if ((' ' + k).indexOf(' ' + first) >= 0) s = 2; else if (q.length > 2 && k.indexOf(first) >= 0) s = 1;
      else if (parts.length > 1) { var full = k + ' ' + norm(c.prov) + ' ' + norm(cname(c.iso)); if (parts.every(function (w) { return full.indexOf(w) >= 0; })) s = 1.5; }
      if (s) add(c, s + Math.log10(Math.max(c.pop, 10)) / 8);
    }
    out.sort(function (a, b) { return b.s - a.s; });
    return out.slice(0, 7).map(function (x) { return x.c; });
  }
  function render() {
    var now = new Date();
    list.innerHTML = '';
    hits.forEach(function (c, i) {
      var li = document.createElement('li');
      li.id = 'tm-r' + i; li.setAttribute('role', 'option'); li.className = 'tm-res__i' + (i === active ? ' is-on' : '');
      li.setAttribute('aria-selected', i === active ? 'true' : 'false');
      li.innerHTML = '<span class="tm-res__n"></span><span class="tm-res__w"></span><span class="tm-res__t"></span>';
      li.children[0].textContent = c.name;
      li.children[1].textContent = [c.prov && c.prov !== c.name ? c.prov : '', cname(c.iso)].filter(Boolean).join(', ');
      li.children[2].textContent = timeParts(c, now).s;
      li.addEventListener('mousedown', function (e) { e.preventDefault(); pick(i); });
      list.appendChild(li);
    });
    var open = hits.length > 0;
    list.hidden = !open; input.setAttribute('aria-expanded', String(open));
    input.setAttribute('aria-activedescendant', active >= 0 ? 'tm-r' + active : '');
    $('.tm-search').classList.toggle('is-empty', !!input.value && !open);
  }
  function pick(i) {
    var c = hits[i]; if (!c) return;
    choose(Object.assign({}, c));
    input.value = ''; hits = []; active = -1; render(); input.blur();
  }
  input.addEventListener('input', function () { hits = search(input.value); active = hits.length ? 0 : -1; render(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (hits.length) { active = (active + 1) % hits.length; render(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (hits.length) { active = (active - 1 + hits.length) % hits.length; render(); } }
    else if (e.key === 'Enter') { e.preventDefault(); pick(active < 0 ? 0 : active); }
    else if (e.key === 'Escape') { input.value = ''; hits = []; render(); }
  });
  input.addEventListener('blur', function () { setTimeout(function () { hits = []; render(); }, 120); });
  document.querySelectorAll('[data-tm-city]').forEach(function (b) {
    b.addEventListener('click', function () { var r = search(b.getAttribute('data-tm-city')); if (r[0]) choose(Object.assign({}, r[0])); });
  });
  addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== input && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
  });

  /* ---------- go ---------- */
  size();
  addEventListener('resize', size);
  if (window.ResizeObserver) new ResizeObserver(size).observe(stage);
  choose(me, false);
  if (me.lat != null) { view.lat = Math.max(-55, Math.min(55, me.lat)); view.lon = me.lon - 120; flyTo(me.lat, me.lon, reduce ? 1 : 2200); }
  setInterval(tick, 1000);
  requestAnimationFrame(frame);
  document.documentElement.classList.add('tm-ready');
})();
