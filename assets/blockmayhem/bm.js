/* Block Mayhem · BLACC Universal */
(function () {
  'use strict';
  var LV = window.BMLevels, COLS = LV.COLS, ROWS = LV.ROWS;
  var W = 600, H = 960, C = 10, TOP = 40, PY = 880, PH = 10, BR = 3.2, SPD = 500, SPD0 = 500, SPDMAX = 640, MAXB = 1400;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ---------- save ---------- */
  var SKEY = 'bm_save_v1';
  var save = (function () { try { return JSON.parse(localStorage.getItem(SKEY)) || null; } catch (e) { return null; } })() || { unlocked: 1, stars: 0, rate: {}, muted: false };
  function persist() { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} }

  /* ---------- screens ---------- */
  function show(name) {
    $$('[data-scr]').forEach(function (s) { s.hidden = s.getAttribute('data-scr') !== name; });
    document.body.classList.toggle('is-playing', name === 'play');
    if (name === 'home') renderHome();
    if (name === 'levels') renderLevels();
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function renderHome() {
    var n = Math.min(save.unlocked, LV.list.length);
    $('[data-continue]').innerHTML = (save.unlocked > 1 ? 'Continue · Level ' + pad(n) : 'Play') + ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    var cleared = Object.keys(save.rate).length;
    $('[data-st-cleared]').textContent = cleared + ' / ' + LV.list.length;
    $('[data-st-stars]').textContent = save.stars;
    var best = 0; Object.keys(save.rate).forEach(function (k) { best += save.rate[k]; });
    $('[data-st-rating]').textContent = best + ' / ' + LV.list.length * 3;
  }
  function renderLevels() {
    var box = $('[data-lvgrid]'); box.innerHTML = '';
    LV.list.forEach(function (l, i) {
      var b = document.createElement('button'), locked = i + 1 > save.unlocked, rt = save.rate[i] || 0;
      b.className = 'lv' + (locked ? ' is-locked' : '') + (rt ? ' is-done' : '');
      b.disabled = locked;
      b.innerHTML = (i > 0 && !hasKey() && !locked ? '<svg class="lv__k" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/></svg>' : '') + '<span class="lv__n">' + pad(i + 1) + '</span><span class="lv__t">' + l.name + '</span><span class="lv__r">' + [1, 2, 3].map(function (k) { return '<i class="' + (k <= rt ? 'is-on' : '') + '"></i>'; }).join('') + '</span>';
      b.addEventListener('click', function () { start(i); });
      box.appendChild(b);
    });
  }

  /* ---------- audio ---------- */
  var AC = null, lastTick = 0;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
  function blip(f, dur, vol, type) {
    if (save.muted || !AC) return;
    var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .7, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + .02);
  }
  function tick(r) { var n = performance.now(); if (n - lastTick < 28) return; lastTick = n; blip(520 + (ROWS - r) * 14 + Math.random() * 40, .05, .035, 'triangle'); }

  /* ---------- game state ---------- */
  var cv = $('[data-cv]'), cx = cv.getContext('2d'), off = document.createElement('canvas'), ox = off.getContext('2d');
  var S = 1; // canvas px per logical unit
  var G = null, total = 0, broken = 0, lvl = 0, lives = 3, held = true, state = 'idle', wideUntil = 0, lastHit = 0, orbs = [], orbSeq = 0, flash = [];
  var bx = new Float32Array(MAXB), by = new Float32Array(MAXB), vx = new Float32Array(MAXB), vy = new Float32Array(MAXB), bo = new Int32Array(MAXB), n = 0;
  var gclock = 0, nextTimed = 0, px = W / 2, target = W / 2, keyDir = 0, earned = 0, drops = [], parts = [], pops = [], rings = [], shake = 0, pglow = 0, slow = 1, t0 = 0, pvx = 0, lastPx = W / 2;

  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function colorOf(v, r) {
    if (v === 9) return '#2a2a2a';
    if (v === 3) return '#ffd23f';
    if (v === 2) return '#c9a646';
    var k = r / ROWS, l = Math.round(250 - k * 120);
    return 'rgb(' + l + ',' + l + ',' + l + ')';
  }
  function drawCell(c, r) {
    var v = G[r * COLS + c], x = c * C * S, y = (TOP + r * C) * S, s = C * S, gap = Math.max(1, S * 1.2);
    ox.clearRect(x, y, s, s);
    if (!v) return;
    ox.fillStyle = colorOf(v, r);
    if (v === 9) { ox.fillRect(x, y, s, s); ox.fillStyle = '#3c3c3c'; ox.fillRect(x, y, s, Math.max(1, S)); return; }
    ox.fillRect(x + gap / 2, y + gap / 2, s - gap, s - gap);
  }
  function drawAll() {
    off.width = Math.round(W * S); off.height = Math.round(H * S);
    ox.clearRect(0, 0, off.width, off.height);
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (G[r * COLS + c]) drawCell(c, r);
  }

  function placeOrbs(spec, rnd) {
    orbs = [];
    if (Array.isArray(spec)) { spec.forEach(function (o) { addOrb(o.t, o.c * C + C / 2, TOP + o.r * C + C / 2); }); return; }
    var kinds = []; Object.keys(spec).forEach(function (k) { for (var i = 0; i < spec[k]; i++) kinds.push(k); });
    kinds.forEach(function (k) {
      for (var t = 0; t < 400; t++) {
        var c = 3 + Math.floor(rnd() * (COLS - 6)), r = 2 + Math.floor(rnd() * 48), ok = true;
        for (var dr = -2; dr <= 2 && ok; dr++) for (var dc = -2; dc <= 2; dc++) if (G[(r + dr) * COLS + c + dc] === 9) { ok = false; break; }
        var x = c * C + C / 2, y = TOP + r * C + C / 2;
        if (ok) orbs.forEach(function (o) { if (Math.hypot(o.x - x, o.y - y) < 70) ok = false; });
        if (ok) { addOrb(k, x, y); break; }
      }
    });
  }
  function spawnTimed(t, fx, fy) {
    for (var tr = 0; tr < 300; tr++) {
      var x = fx || 40 + Math.random() * (W - 80), y = fy || TOP + 60 + Math.random() * (PY - TOP - 260), ok = true;
      for (var dy = -24; dy <= 24 && ok; dy += 8) for (var dx = -24; dx <= 24; dx += 8) if (solid(x + dx, y + dy) >= 0) { ok = false; break; }
      if (!ok) continue;
      orbs.forEach(function (o) { if (Math.hypot(o.x - x, o.y - y) < 60) ok = false; });
      if (!ok) continue;
      orbs.push({ id: ++orbSeq, t: t, x: x, y: y, r: 19, charges: 1, born: performance.now(), exp: gclock + (t === 'x20' ? 7000 : 10000), life: t === 'x20' ? 7000 : 10000 });
      rings.push({ x: x, y: y, t: 1, c: '#ffd23f' }); pops.push({ x: x, y: y - 30, s: t === 'x20' ? '×20' : '×10', t: 1 });
      blip(1046, .1, .045); setTimeout(function () { blip(1396, .14, .045); }, 90);
      return;
    }
  }
  function addOrb(t, x, y) { orbs.push({ id: ++orbSeq, t: t, x: x, y: y, r: 14, charges: t === 'x3' ? 28 : 1, born: performance.now() }); }

  /* ---------- passkey (level 1 is free) ---------- */
  var KEYS = ["4c907f22262c6233e46aa958", "86e6e88386e3ab8af06bde25", "86b374767a41492edb6af2f8", "46a915f40946afce6927d19d", "8f1544e7c2d8eeb3ae7fffa6", "f7a3e3b181035a590a9ec7ac", "5294f485512b377ed0e03404", "b789c0aa67e80b745df73ea8", "508fa7ef3037d73aa35d33a4", "a7cc96dc9a3e238f0339724d", "d218dd03a09621cd40fecf11", "ab1f70b5aa0d1c345bd7e375", "e79870e87074013125297ef6", "6f0b0f24cb55d950decdaa7e", "173e8d0d4e60b9facc7e0b92", "cc11aefddc0a2d65f6bbe568", "9c0485c044abdd8d32e6f6be", "23baae8b79ced6d4b0cb37ac", "a39f7f315569e418cd583a73", "b43628a6d3c8334ada36b838", "10a400cce4c3b60c395a8145", "56f31ab276efc5b8383c893b", "b3bcb610debad77100916e7c", "13c6dbbe62ac5ba1bcc43de6", "606a7690f50a0cc50f24eefa", "4c387046490ee7e2001965cc", "128afb621bd54184acb1b3b6", "f1a0dc85ba51096b8a236279", "7035be7a6be113a8d9bf6401", "90894109433d1fb52523bbed", "fe15b3dbf9ceb89165ed090d", "553468730e283620249b5bc3", "6a1b4199e6b414639235ba55", "73b4ab07e073bc3784af906a", "fcbeaa24034342331b33c9af", "76b457e2d250aad8c4b89230", "f0613665571b597af928665f", "de454a962560159fe42ccbe3", "daef51dea1b1f0c6f1ec5394", "28b3b5a64098064018c5dec4", "d5eb9b7ea6a99dbabd822e77", "43e332ebf91dce50f92cd0e2", "6eb821b45cb108cb68030ecb", "f7f1bc61a58001f1647aec6b", "425bfcb5953a9d2711f326b0", "8b8c5df66d86dbe038334221", "4dd1e3e0d4b572b36e7ceb4f", "e69b86d18aae078ee84f70a1", "76e534ec2e7a0e00e642b59c", "ff8b2532797ff3481a453fd9", "7fed0dcd9efc79e9e6866c7b", "ce178e7fb8ae356a5610657c", "a14886fdf45f57bc671e7105", "11c2aa4dd67ca0649a417caa", "b70baeed08d740672b247c03", "ba04c0cfde940d5b8277a304", "5fb6706fe546dab481f9b548", "e61378983f82952348bd4191", "18d29183999b9a630f845434", "73709539f5a8edf7d9f6abf2", "722c4d0171743f951250a02d", "97b7643b765395cc8ea795ce", "37ec7273c5121a977a33fcbc", "ca57fb16b901c39ab42e826e", "2e991fe13afcb49f5c30a90f", "8f241b28793e54d59f5b0217", "9cad851dc33325b03c1bbcab", "5216eef9d8f1f946a1f740a0", "1df80113ce56646d7d546025", "fdbd9ab361034ccb4a638166", "0a1b59cd3c1e68461c277e1d", "b723549390e747f77d964fa6", "140ace55c66eae90760e4a18", "27e71ad4c2377ceeaf4b7f39", "cfad86b7458850cb3d2cc3a3", "584707d304fe51137ed44257", "49c398ca7514e37fef0f3649", "4fc9137d4d66c1a7f7cdd737", "5fda4719a0e4d80f97f1b0fc", "846f42aac1a90c3156440059", "200644357f0721fc6af3d277", "326be04488cf94a3d1daa616", "57fa96cd30a21ade81912620", "60011ae9375242f72110ea87", "7b58b816ddbeb6ea6ed202ef", "e5fff2de95dbad0e7bb17dc7", "f5f130b2723ff56a307a1404", "046340209851a2be19c48f3b", "b6a18af6d7cfa7e8fa8f39ce", "c31b674611432997e339679e", "17ffb2760b67e46616e0a445", "97c8d3d611e628924cf42dd5", "82c1c983d1fa97a6c5cb4ab5", "fec2c12dbd508a7bc3f7134a", "bd9065a21038b1a056dcb0b0", "cdf61f16f62e636af1d7a38e", "118b533fd0a116508a32e70a", "513468ba0791b23385caceea", "04caf8c22cf5787afe429dcd", "500d28b77d7f53ac01d88eeb"], KSALT = 'bu-blockmayhem-v1:', FORM = 'https://api.web3forms.com/submit', W3K = 'c45f617c-f3f2-4caa-93cf-5d49e2cece46', pending = 0;
  function hasKey() { return !!save.key && KEYS.indexOf(save.key) > -1; }
  function knorm(v) { v = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v.indexOf('BLOCK') !== 0) v = 'BLOCK' + v; return v; }
  function khash(v) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(KSALT + v)).then(function (d) { return Array.prototype.map.call(new Uint8Array(d), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('').slice(0, 24); }); }
  var gateEl = $('[data-gate]');
  function gview(v) { $$('[data-gv]', gateEl).forEach(function (x) { x.hidden = x.getAttribute('data-gv') !== v; }); var f = $('[data-gv="' + v + '"] input', gateEl); if (f && matchMedia('(pointer:fine)').matches) setTimeout(function () { f.focus(); }, 40); }
  function openGate(i) { pending = i; gview('key'); $('[data-gkmsg]').textContent = ''; gateEl.hidden = false; }
  function closeGate() { gateEl.hidden = true; }
  $('[data-gkey]').addEventListener('submit', function (e) {
    e.preventDefault(); var inp = $('[data-gkey] input'), msg = $('[data-gkmsg]'); if (!inp.value.trim()) return;
    khash(knorm(inp.value)).then(function (h) {
      if (KEYS.indexOf(h) > -1) { save.key = h; persist(); inp.value = ''; closeGate(); blip(784, .2, .05); if (!$('[data-scr=levels]').hidden) renderLevels(); start(pending); }
      else { msg.textContent = 'That passkey isn’t valid. Check it and try again.'; msg.className = 'gate__msg is-err'; }
    }).catch(function () { msg.textContent = 'Couldn’t check the passkey on this browser.'; msg.className = 'gate__msg is-err'; });
  });
  $('[data-greq]').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target, msg = $('[data-grmsg]'), btn = f.querySelector('button[type=submit]');
    if (f._honey.value) return;
    var d = { access_key: W3K, subject: 'Block Mayhem passkey request: ' + f.name.value.trim(), from_name: 'BLACC Universal website', name: f.name.value.trim(), email: f.email.value.trim(), message: f.note.value.trim() || '(none)', page: 'Block Mayhem passkey' };
    if (!d.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { msg.textContent = 'Add your name and a valid email.'; msg.className = 'gate__msg is-err'; return; }
    btn.disabled = true; msg.textContent = 'Sending…'; msg.className = 'gate__msg';
    fetch(FORM, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.success) throw 0; }); })
      .then(function () { f.reset(); msg.textContent = ''; gview('sent'); })
      .catch(function () { msg.textContent = 'Couldn’t send right now. Please try again in a moment.'; msg.className = 'gate__msg is-err'; })
      .then(function () { btn.disabled = false; });
  });

  /* ---------- cheat codes: jump to a level ---------- */
  var CHEAT = {"924cf26bc1159e5a261e": 1, "97c1800ba1ee4d0fe142": 2, "50b9d02bb2c603aa4ce8": 3, "2913d357e669544727a1": 4, "e63c967fb77dba5aa024": 5, "de792ae936dbcf561f48": 6, "0395fbaf01e01af4fa20": 7, "fd390dde1ab7e8868ff1": 8, "6521d0be6475998bbae7": 9, "0c3450af45e8f39d9265": 10, "bac5626eb785a9b8a2c2": 11, "3c32b462696d41e6eb40": 12, "d86dcd9a1c47914efbb0": 13, "ae91453358aa170003f3": 14, "1fd67bf53f4bde020404": 15, "3220472acbd01985de91": 16, "abbdbaa2c87733dd1b92": 17, "e1e14242e07ab3ac1867": 18, "0a0dc35a686a97d6aed0": 19, "affd1dbb45875fb25fc7": 20, "8e2dad636a6b6c5ff33a": 21, "87ae86de0cf3626a47a3": 22, "331bc7431548dc9f8dc5": 23, "5f2f0196e1cd52b32fa1": 24, "302eba2aab3474033a9d": 25, "3590b22c1d97a5bc121e": 26, "7417f2ba6f5c2ee7b446": 27, "2ab53651e4fb694b7cca": 28, "3399e6ce8a7770612ef6": 29}, CSALT = 'bu-bm-cheat-v1:', cheatEl = $('[data-cheat]');
  $('[data-cform]').addEventListener('submit', function (e) {
    e.preventDefault(); var inp = $('[data-cform] input'), msg = $('[data-cmsg]'), v = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!v) return;
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(CSALT + v)).then(function (d) {
      var h = Array.prototype.map.call(new Uint8Array(d), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('').slice(0, 20), i = CHEAT[h];
      if (i == null) { msg.textContent = 'That code doesn’t open anything.'; msg.className = 'gate__msg is-err'; return; }
      if (i + 1 > save.unlocked) save.unlocked = i + 1; persist();
      inp.value = ''; msg.textContent = ''; cheatEl.hidden = true; blip(988, .12, .05); setTimeout(function () { blip(1318, .18, .05); }, 90);
      start(i);
    });
  });

  function start(i) {
    if (i > 0 && !hasKey()) { openGate(i); return; }
    lvl = i; var spec = LV.list[i], rnd = rng(1000 + i * 77);
    G = LV.make(i, rnd); total = 0; broken = 0;
    for (var k = 0; k < G.length; k++) if (G[k] && G[k] !== 9) total++;
    placeOrbs(spec.orbs, rng(5000 + i * 31));
    lives = 3; n = 0; held = true; wideUntil = 0; earned = 0; flash = []; drops = []; parts = []; pops = []; rings = []; shake = 0; slow = 1; SPD = SPD0; t0 = performance.now(); lastHit = performance.now(); gclock = 0; nextTimed = 15000 + Math.random() * 15000;
    px = target = W / 2; state = 'play';
    $('[data-lvname]').textContent = pad(i + 1) + ' · ' + spec.name;
    show('play'); hideOverlays(); resize(); hud();
    $('[data-hint]').hidden = false;
  }

  /* ---------- balls ---------- */
  function addBall(x, y, ang) {
    if (n >= MAXB) return -1;
    bx[n] = x; by[n] = y; vx[n] = Math.sin(ang) * SPD; vy[n] = -Math.cos(ang) * SPD; bo[n] = 0; return n++;
  }
  function kill(i) { n--; bx[i] = bx[n]; by[i] = by[n]; vx[i] = vx[n]; vy[i] = vy[n]; bo[i] = bo[n]; }
  function fixAngle(i) {
    var m = .22 * SPD;
    if (Math.abs(vy[i]) < m) { vy[i] = (vy[i] < 0 ? -1 : 1) * m; var sx = vx[i] < 0 ? -1 : 1; vx[i] = sx * Math.sqrt(SPD * SPD - m * m); }
  }
  function launch() {
    if (!held || state !== 'play') return;
    held = false; $('[data-hint]').hidden = true; ac();
    addBall(px, PY - BR - 1, Math.max(-.6, Math.min(.6, pvx / 2500 + (Math.random() - .5) * .25))); pglow = 1; blip(330, .06, .05, 'sine');
  }
  function pw() { return performance.now() < wideUntil ? 150 : 92; }

  /* ---------- collision ---------- */
  function solid(x, y) {
    var c = Math.floor(x / C), r = Math.floor((y - TOP) / C);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
    return G[r * COLS + c] ? r * COLS + c : -1;
  }
  function hit(k) {
    var v = G[k]; if (v === 9) return;
    var r = Math.floor(k / COLS), c = k - r * COLS;
    var col = colorOf(v, r); G[k] = v - 1; if (!G[k]) { broken++; flash.push({ x: c * C, y: TOP + r * C, t: 1 }); if (parts.length < 500) for (var sI = 0; sI < 2; sI++) parts.push({ x: c * C + Math.random() * C, y: TOP + r * C + Math.random() * C, vx: (Math.random() - .5) * 160, vy: (Math.random() - .7) * 140, t: 1, c: col }); if (drops.length < 3 && Math.random() < 1 / 110) { var q = Math.random(); drops.push({ x: c * C + C / 2, y: TOP + r * C + C / 2, t: q < .45 ? 'x3' : q < .75 ? 'p3' : 'wide' }); } }
    drawCell(c, r); lastHit = performance.now(); tick(r);
  }

  function step(dt) {
    var steps = Math.max(1, Math.ceil(SPD * dt / 4)), h = dt / steps, w = pw();
    for (var s = 0; s < steps; s++) {
      for (var i = 0; i < n; i++) {
        var x = bx[i], y = by[i], k;
        // x axis
        x += vx[i] * h;
        if (x < BR) { x = BR; vx[i] = Math.abs(vx[i]); }
        else if (x > W - BR) { x = W - BR; vx[i] = -Math.abs(vx[i]); }
        else { k = solid(x + (vx[i] > 0 ? BR : -BR), y); if (k >= 0) { hit(k); x = bx[i]; vx[i] = -vx[i]; } }
        // y axis
        var py0 = y; y += vy[i] * h;
        if (y < BR) { y = BR; vy[i] = Math.abs(vy[i]); }
        else { k = solid(x, y + (vy[i] > 0 ? BR : -BR)); if (k >= 0) { hit(k); y = py0; vy[i] = -vy[i]; fixAngle(i); } }
        // paddle
        if (vy[i] > 0 && py0 + BR <= PY && y + BR >= PY && x > px - w / 2 - BR && x < px + w / 2 + BR) {
          var o = Math.max(-1, Math.min(1, (x - px) / (w / 2))), a = o * 1.05;
          a += Math.max(-.25, Math.min(.25, pvx / 4000)); vx[i] = Math.sin(a) * SPD; vy[i] = -Math.cos(a) * SPD; y = PY - BR; fixAngle(i); if (n < 40) { pglow = 1; blip(240 + Math.abs(o) * 120, .05, .04, 'sine'); } else pglow = Math.max(pglow, .5);
        }
        bx[i] = x; by[i] = y;
        if (y > H + 20) { kill(i); i--; }
      }
    }
    // orbs (once per frame)
    for (var j = 0; j < orbs.length; j++) {
      var ob = orbs[j], rr = (ob.r + BR) * (ob.r + BR);
      for (var q = 0; q < n && ob.charges > 0; q++) {
        var dx = bx[q] - ob.x, dy = by[q] - ob.y;
        if (dx * dx + dy * dy > rr) { if (bo[q] === ob.id) bo[q] = 0; continue; }
        if (bo[q] === ob.id) continue;
        bo[q] = ob.id;
        if (ob.t === 'x20' || ob.t === 'cd') {
          var mult = ob.t === 'x20' ? 20 : Math.max(1, Math.ceil((ob.exp - gclock) / 1000)), base = Math.atan2(vx[q], -vy[q]);
          for (var mI = 1; mI < mult; mI++) { var mm = addBall(bx[q], by[q], base + (mI / (mult - 1) - .5) * 2.2); if (mm >= 0) bo[mm] = ob.id; }
          ob.charges = 0; shake = 12; buzz([20, 30, 40]); slow = .45; setTimeout(function () { if (state === 'play') slow = 1; }, 380);
          for (var rI = 0; rI < 3; rI++) rings.push({ x: ob.x, y: ob.y, t: 1 + rI * .25, c: '#ffd23f' });
          pops.push({ x: ob.x, y: ob.y - 26, s: '×' + mult + '!', t: 1.3, big: 1 });
          [660, 880, 1320, 1760].forEach(function (f, i2) { setTimeout(function () { blip(f, .16, .05); }, i2 * 60); });
        } else if (ob.t === 'x3') {
          var sp = Math.atan2(vx[q], -vy[q]);
          [-.35, .35].forEach(function (d) { var m = addBall(bx[q], by[q], sp + d); if (m >= 0) bo[m] = ob.id; });
          ob.charges--; blip(880 + (28 - ob.charges) * 18, .08, .05); rings.push({ x: ob.x, y: ob.y, t: 1, c: '#ffd23f' }); if (ob.charges % 4 === 0) pops.push({ x: ob.x, y: ob.y - 18, s: '×3', t: 1 }); shake = Math.min(6, shake + 1.2); buzz(8);
        } else if (ob.t === 'p3') {
          for (var t = 0; t < 3; t++) { var m2 = addBall(ob.x, ob.y, (t - 1) * .5); if (m2 >= 0) bo[m2] = ob.id; }
          ob.charges = 0; blip(700, .1, .05); rings.push({ x: ob.x, y: ob.y, t: 1, c: '#fff' }); pops.push({ x: ob.x, y: ob.y - 18, s: '+3', t: 1 }); buzz(10);
        } else if (ob.t === 'star') { save.stars++; earned++; persist(); ob.charges = 0; blip(1320, .14, .05, 'sine'); blip(1760, .2, .03, 'sine'); rings.push({ x: ob.x, y: ob.y, t: 1, c: '#ffd23f' }); pops.push({ x: ob.x, y: ob.y - 18, s: '+1 ★', t: 1 }); }
      }
    }
    gclock += dt * 1000;
    orbs = orbs.filter(function (o) {
      if (o.exp && gclock >= o.exp && o.charges > 0) { o.charges = 0; rings.push({ x: o.x, y: o.y, t: .6, c: '#555' }); blip(200, .12, .03); }
      return o.charges > 0;
    });
    if (gclock > nextTimed && !held && n > 0 && !orbs.some(function (o) { return o.exp; })) {
      nextTimed = gclock + 25000 + Math.random() * 20000;
      spawnTimed(Math.random() < .4 ? 'x20' : 'cd');
    }
    // falling drops
    var w2 = pw();
    for (var dI = drops.length - 1; dI >= 0; dI--) {
      var dp = drops[dI]; dp.y += 190 * dt;
      if (dp.y + 8 >= PY && dp.y - 8 <= PY + PH && Math.abs(dp.x - px) < w2 / 2 + 14) { drops.splice(dI, 1); apply(dp.t); pglow = 1; pops.push({ x: dp.x, y: PY - 24, s: dp.t === 'x3' ? '×3 all' : dp.t === 'p3' ? '+3' : 'Wide', t: 1 }); buzz(12); continue; }
      if (dp.y > H + 20) drops.splice(dI, 1);
    }
    // stuck guard
    var leftN = total - broken, quiet = performance.now() - lastHit;
    if (n && (quiet > 12000 || (leftN <= Math.max(25, total * .04) && quiet > 3500))) {
      var tg = [];
      if (leftN <= 200) for (var gi = 0; gi < G.length && tg.length < 200; gi++) if (G[gi] && G[gi] !== 9) tg.push(gi);
      for (var z = 0; z < n; z++) {
        var an;
        if (tg.length && vy[z] < 0) { var tk = tg[Math.floor(Math.random() * tg.length)], trr = Math.floor(tk / COLS); an = Math.atan2(((tk - trr * COLS) * C + C / 2) - bx[z], -((TOP + trr * C + C / 2) - by[z])); }
        else an = Math.atan2(vx[z], -vy[z]) + (Math.random() - .5) * .9;
        vx[z] = Math.sin(an) * SPD; vy[z] = -Math.cos(an) * SPD; fixAngle(z);
      }
      lastHit = performance.now();
    }
    if (state !== 'play') return;
    if (broken >= total) return win();
    if (!held && n === 0) loseLife();
  }

  function loseLife() {
    lives--; hud(); blip(180, .3, .06, 'sine'); shake = 10; buzz([30, 40, 30]); drops = [];
    if (lives <= 0) { state = 'over'; openOverlay('fail'); return; }
    held = true; $('[data-hint]').hidden = false;
  }
  function win() {
    state = 'over'; var rt = lives, prev = save.rate[lvl] || 0;
    var bonus = 2 + rt; save.stars += bonus; earned += bonus;
    if (rt > prev) save.rate[lvl] = rt;
    if (lvl + 2 > save.unlocked) save.unlocked = Math.min(LV.list.length, lvl + 2);
    persist();
    [523, 659, 784].forEach(function (f, i) { setTimeout(function () { blip(f, .22, .05); }, i * 110); });
    $('[data-win-name]').textContent = pad(lvl + 1) + ' · ' + LV.list[lvl].name;
    $('[data-win-rate]').innerHTML = [1, 2, 3].map(function (k) { return '<i class="' + (k <= rt ? 'is-on' : '') + '"></i>'; }).join('');
    $('[data-win-earned]').textContent = '+' + earned;
    $('[data-next]').hidden = lvl + 1 >= LV.list.length;
    slow = .25; shake = 4; buzz(40); for (var e = 0; e < 40; e++) parts.push({ x: px, y: PY, vx: (Math.random() - .5) * 600, vy: -Math.random() * 700, t: 1.4, c: e % 3 ? '#fff' : '#ffd23f' });
    setTimeout(function () { openOverlay('win'); }, 900);
  }

  function buzz(p) { try { if (navigator.vibrate && !save.muted) navigator.vibrate(p); } catch (e) {} }
  function apply(t) {
    if (t === 'x3') { var m = n; for (var i = 0; i < m; i++) { var a = Math.atan2(vx[i], -vy[i]); addBall(bx[i], by[i], a - .35); addBall(bx[i], by[i], a + .35); } blip(880, .1, .05); blip(1320, .16, .03); shake = Math.min(8, shake + 3); }
    else if (t === 'p3') { if (held) { held = false; $('[data-hint]').hidden = true; } for (var k = 0; k < 3; k++) addBall(px, PY - BR - 1, (k - 1) * .4); blip(700, .1, .05); }
    else if (t === 'wide') { wideUntil = Math.max(performance.now(), wideUntil) + 10000; blip(600, .12, .05); }
  }

  /* ---------- boosts ---------- */
  var BOOST = { x3: 10, p3: 5, wide: 5 };
  function boost(t) {
    if (state !== 'play' || save.stars < BOOST[t]) return;
    if (t === 'x3' && n === 0) return;
    save.stars -= BOOST[t]; persist(); ac();
    apply(t); if (t === 'wide') wideUntil += 2000;
    hud();
  }

  /* ---------- HUD ---------- */
  var hudEls = {};
  function hud() {
    hudEls.lives.forEach(function (e, i) { e.classList.toggle('is-on', i < lives); });
    hudEls.stars.textContent = save.stars;
    hudEls.balls.textContent = n + (n === 1 ? ' ball' : ' balls');
    hudEls.cleared.textContent = broken + ' / ' + total;
    hudEls.bar.style.transform = 'scaleX(' + (total ? broken / total : 0) + ')';
    $$('[data-boost]').forEach(function (b) { var t = b.getAttribute('data-boost'); b.disabled = save.stars < BOOST[t] || (t === 'x3' && n === 0); });
    var wl = Math.max(0, wideUntil - performance.now());
    hudEls.wide.hidden = !wl; if (wl) hudEls.wide.textContent = 'Wide ' + (wl / 1000).toFixed(1) + 's';
  }

  /* ---------- render ---------- */
  function star(x, y, r) {
    cx.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; cx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    cx.closePath(); cx.fill();
  }
  function render(now) {
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
    var sx = shake ? (Math.random() - .5) * shake * S : 0, sy = shake ? (Math.random() - .5) * shake * S : 0;
    cx.drawImage(off, sx, sy);
    cx.setTransform(S, 0, 0, S, sx, sy);
    // last blocks: pulse so they're easy to find
    var left = total - broken;
    if (left > 0 && left <= 40 && state === 'play') {
      cx.strokeStyle = 'rgba(255,210,63,' + (.35 + .35 * Math.sin(now / 160)) + ')'; cx.lineWidth = 1.5;
      for (var gi = 0; gi < G.length; gi++) if (G[gi] && G[gi] !== 9) { var gr = Math.floor(gi / COLS); cx.strokeRect((gi - gr * COLS) * C - 2, TOP + gr * C - 2, C + 4, C + 4); }
    }
    // break flashes
    for (var f = flash.length - 1; f >= 0; f--) { var fl = flash[f]; fl.t -= .08; if (fl.t <= 0) { flash.splice(f, 1); continue; } cx.fillStyle = 'rgba(255,255,255,' + (fl.t * .5) + ')'; cx.fillRect(fl.x, fl.y, C, C); }
    if (flash.length > 400) flash.splice(0, flash.length - 400);
    // shards
    for (var pi = parts.length - 1; pi >= 0; pi--) { var pt = parts[pi]; pt.t -= .03 * slow; if (pt.t <= 0) { parts.splice(pi, 1); continue; } pt.vy += 900 * .016 * slow; pt.x += pt.vx * .016 * slow; pt.y += pt.vy * .016 * slow; cx.globalAlpha = Math.min(1, pt.t); cx.fillStyle = pt.c; cx.fillRect(pt.x, pt.y, 3, 3); }
    cx.globalAlpha = 1;
    // rings
    for (var ri = rings.length - 1; ri >= 0; ri--) { var rg = rings[ri]; rg.t -= .045; if (rg.t <= 0) { rings.splice(ri, 1); continue; } cx.beginPath(); cx.arc(rg.x, rg.y, 14 + (1 - rg.t) * 26, 0, Math.PI * 2); cx.strokeStyle = rg.c; cx.globalAlpha = rg.t * .8; cx.lineWidth = 2; cx.stroke(); }
    if (rings.length > 30) rings.splice(0, rings.length - 30);
    cx.globalAlpha = 1;
    // orbs
    orbs.forEach(function (o) {
      var p = 1 + Math.sin((now - o.born) / 320) * .06, r = o.r * p;
      if (o.t === 'star') { cx.fillStyle = '#ffd23f'; star(o.x, o.y, r * 1.05); return; }
      if (o.exp) {
        var rem = Math.max(0, o.exp - gclock), frac = rem / o.life, R0 = o.r * (1 + Math.sin(now / 110) * .08);
        if (o.t === 'x20' && rem < 3000 && Math.sin(now / (rem < 1200 ? 45 : 90)) < 0) return; // blink before vanishing
        cx.beginPath(); cx.arc(o.x, o.y, R0 + 7, 0, Math.PI * 2); cx.fillStyle = 'rgba(255,210,63,.12)'; cx.fill();
        cx.beginPath(); cx.arc(o.x, o.y, R0, 0, Math.PI * 2); cx.fillStyle = '#000'; cx.fill();
        cx.lineWidth = 2; cx.strokeStyle = 'rgba(255,210,63,.25)'; cx.stroke();
        cx.beginPath(); cx.arc(o.x, o.y, R0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); cx.lineWidth = 3; cx.strokeStyle = '#ffd23f'; cx.stroke();
        var lbl = o.t === 'x20' ? '×20' : '×' + Math.max(1, Math.ceil(rem / 1000));
        cx.fillStyle = '#ffd23f'; cx.font = '800 ' + (lbl.length > 3 ? 13 : 15) + 'px "Open Sans",system-ui,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.fillText(lbl, o.x, o.y + .5); return;
      }
      cx.beginPath(); cx.arc(o.x, o.y, r, 0, Math.PI * 2);
      if (o.t === 'x3') { cx.fillStyle = '#ffd23f'; cx.fill(); cx.fillStyle = '#000'; }
      else { cx.fillStyle = '#000'; cx.fill(); cx.lineWidth = 2; cx.strokeStyle = '#fff'; cx.stroke(); cx.fillStyle = '#fff'; }
      cx.font = '700 12px "Open Sans",system-ui,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(o.t === 'x3' ? '×3' : '+3', o.x, o.y + .5);
    });
    // drops
    drops.forEach(function (dp) {
      cx.fillStyle = dp.t === 'x3' ? '#ffd23f' : '#000'; rr(dp.x - 15, dp.y - 8, 30, 16, 3); cx.fill();
      if (dp.t !== 'x3') { cx.lineWidth = 1.5; cx.strokeStyle = '#fff'; cx.stroke(); }
      cx.fillStyle = dp.t === 'x3' ? '#000' : '#fff'; cx.font = '700 10px "Open Sans",system-ui,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(dp.t === 'x3' ? '×3' : dp.t === 'p3' ? '+3' : 'W', dp.x, dp.y + .5);
    });
    // trails (few balls only)
    if (n <= 120) { cx.strokeStyle = 'rgba(255,255,255,.18)'; cx.lineWidth = BR * 1.6; cx.lineCap = 'round'; cx.beginPath(); for (var ti = 0; ti < n; ti++) { cx.moveTo(bx[ti], by[ti]); cx.lineTo(bx[ti] - vx[ti] * .028, by[ti] - vy[ti] * .028); } cx.stroke(); }
    // balls
    cx.fillStyle = '#fff';
    if (n > 500) { for (var i = 0; i < n; i++) cx.fillRect(bx[i] - BR, by[i] - BR, BR * 2, BR * 2); }
    else { cx.beginPath(); for (var j = 0; j < n; j++) { cx.moveTo(bx[j] + BR, by[j]); cx.arc(bx[j], by[j], BR, 0, Math.PI * 2); } cx.fill(); }
    // paddle
    var w = pw(), wd = performance.now() < wideUntil;
    if (pglow > .02) { cx.fillStyle = (wd ? 'rgba(255,210,63,' : 'rgba(255,255,255,') + (pglow * .22) + ')'; rr(px - w / 2 - 6, PY - 6, w + 12, PH + 12, 6); cx.fill(); }
    cx.fillStyle = wd ? '#ffd23f' : '#fff';
    var sq = pglow * 2; rr(px - w / 2 - sq, PY + sq * .5, w + sq * 2, PH - sq * .5, 2); cx.fill();
    // pops
    cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = '800 15px "Open Sans",system-ui,sans-serif';
    for (var qi = pops.length - 1; qi >= 0; qi--) { var pp = pops[qi]; pp.t -= .02; if (pp.t <= 0) { pops.splice(qi, 1); continue; } cx.globalAlpha = Math.min(1, pp.t * 1.6); cx.fillStyle = pp.s.charAt(0) === '+' && pp.s.indexOf('★') < 0 ? '#fff' : '#ffd23f'; if (pp.big) cx.font = '800 26px "Open Sans",system-ui,sans-serif'; cx.fillText(pp.s, pp.x, pp.y - (1 - Math.min(1, pp.t)) * 26); if (pp.big) cx.font = '800 15px "Open Sans",system-ui,sans-serif'; }
    if (pops.length > 12) pops.splice(0, pops.length - 12);
    cx.globalAlpha = 1;
    if (held && state === 'play') { cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(px, PY - BR - 1, BR, 0, Math.PI * 2); cx.fill(); }
  }
  function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }

  /* ---------- loop ---------- */
  var last = 0, hudT = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!G || document.body.classList.contains('is-playing') === false) { last = now; return; }
    var rdt = Math.min(.033, (now - last) / 1000 || 0); last = now;
    var dt = rdt * slow;
    if (state === 'play') {
      if (keyDir) target = px + keyDir * 900 * rdt;
      var w = pw(); target = Math.max(w / 2, Math.min(W - w / 2, target));
      px += (target - px) * Math.min(1, rdt * 30);
      pvx = pvx * .7 + ((px - lastPx) / (rdt || .016)) * .3; lastPx = px;
      SPD = Math.min(SPDMAX, SPD0 + (now - t0) / 1000 * 1.2);
      step(dt);
    } else if (slow < 1) {
      step(dt * .5);
    }
    shake *= .86; if (shake < .2) shake = 0;
    pglow *= .88;
    render(now);
    if (now - hudT > 100) { hudT = now; hud(); }
  }

  /* ---------- layout ---------- */
  function resize() {
    var box = $('[data-stage]'), bw = box.clientWidth, bh = box.clientHeight;
    if (!bw || !bh) return;
    var cssW = Math.min(bw, bh * W / H), cssH = cssW * H / W, dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
    S = cv.width / W;
    if (G) drawAll();
  }
  window.addEventListener('resize', resize);

  /* ---------- input ---------- */
  function toX(e) { var r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; }
  var stage = $('[data-stage]'), downX = null, downPX = 0;
  stage.addEventListener('pointerdown', function (e) {
    ac(); if (state !== 'play') return;
    if (e.pointerType === 'mouse') { target = toX(e); launch(); return; }
    downX = toX(e); downPX = target; stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', function (e) {
    if (state !== 'play') return;
    if (e.pointerType === 'mouse') { target = toX(e); return; }
    if (downX != null) target = downPX + (toX(e) - downX) * 1.25;
  });
  stage.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse' && downX != null) { if (Math.abs(toX(e) - downX) < 6) launch(); downX = null; } });
  stage.addEventListener('pointercancel', function () { downX = null; });
  document.addEventListener('keydown', function (e) {
    if (!document.body.classList.contains('is-playing')) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyDir = -1;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyDir = 1;
    else if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); launch(); }
    else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { state === 'play' ? pause() : state === 'paused' && resume(); }
    else if (e.key === '1') boost('x3'); else if (e.key === '2') boost('p3'); else if (e.key === '3') boost('wide');
  });
  document.addEventListener('keyup', function (e) { if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && keyDir < 0) keyDir = 0; if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && keyDir > 0) keyDir = 0; });

  /* ---------- overlays ---------- */
  function hideOverlays() { $$('[data-ov]').forEach(function (o) { o.hidden = true; }); }
  function openOverlay(name) { hideOverlays(); var o = $('[data-ov="' + name + '"]'); if (o) o.hidden = false; }
  function pause() { if (state !== 'play') return; state = 'paused'; openOverlay('pause'); }
  function resume() { if (state !== 'paused') return; state = 'play'; hideOverlays(); last = performance.now(); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]'); if (!t) return;
    var a = t.getAttribute('data-act'); ac();
    if (a === 'home') { state = 'idle'; show('home'); }
    else if (a === 'levels') { state = 'idle'; show('levels'); }
    else if (a === 'continue') start(Math.min(save.unlocked, LV.list.length) - 1);
    else if (a === 'pause') pause();
    else if (a === 'resume') resume();
    else if (a === 'restart' || a === 'retry') start(lvl);
    else if (a === 'next') start(Math.min(lvl + 1, LV.list.length - 1));
    else if (a === 'help') $('[data-help]').hidden = false;
    else if (a === 'help-close') $('[data-help]').hidden = true;
    else if (a === 'gate-close') closeGate();
    else if (a === 'cheat') { $('[data-cmsg]').textContent = ''; cheatEl.hidden = false; if (matchMedia('(pointer:fine)').matches) setTimeout(function () { $('[data-cform] input').focus(); }, 40); }
    else if (a === 'cheat-close') cheatEl.hidden = true;
    else if (a === 'gate-req') gview('req');
    else if (a === 'gate-key') gview('key');
    else if (a === 'mute') { save.muted = !save.muted; persist(); syncMute(); }
  });
  $$('[data-boost]').forEach(function (b) { b.addEventListener('click', function () { boost(b.getAttribute('data-boost')); }); });
  function syncMute() { $$('[data-act=mute]').forEach(function (b) { b.classList.toggle('is-off', !!save.muted); b.setAttribute('aria-label', save.muted ? 'Sound off' : 'Sound on'); }); }

  hudEls = { lives: $$('[data-life]'), stars: $('[data-stars]'), balls: $('[data-balls]'), cleared: $('[data-cleared]'), bar: $('[data-bar]'), wide: $('[data-wide]') };
  if (matchMedia('(pointer:coarse)').matches) $('[data-hint]').textContent = 'Drag to move · Tap to launch';
  syncMute(); show('home'); requestAnimationFrame(loop);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/blockmayhem/sw.js').catch(function () {});
  window.__bm = { start: start, boost: boost, get n() { return n; }, get broken() { return broken; }, get total() { return total; }, launch: launch, setStars: function (s) { save.stars = s; }, timed: function (t, x, y) { spawnTimed(t, x, y); }, dropX: function () { var b = null; drops.forEach(function (d) { if (d.y > 700 && (!b || d.y > b.y)) b = d; }); return b ? b.x : null; }, low: function () { var m = -1, x = W / 2; for (var i = 0; i < n; i++) if (vy[i] > 0 && by[i] > m && by[i] < PY) { m = by[i]; x = bx[i]; } return x; } };
})();
