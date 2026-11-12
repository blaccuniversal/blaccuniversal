/* Block Mayhem · BLACC Universal */
(function () {
  'use strict';
  var LV = window.BMLevels, COLS = LV.COLS, ROWS = LV.ROWS;
  var W = 600, H = 960, C = 10, TOP = 40, PY = 880, PH = 10, BR = 3.2, SPD = 560, MAXB = 1400;
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
      b.innerHTML = '<span class="lv__n">' + pad(i + 1) + '</span><span class="lv__t">' + l.name + '</span><span class="lv__r">' + [1, 2, 3].map(function (k) { return '<i class="' + (k <= rt ? 'is-on' : '') + '"></i>'; }).join('') + '</span>';
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
  var px = W / 2, target = W / 2, keyDir = 0, earned = 0, drops = [];

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
  function addOrb(t, x, y) { orbs.push({ id: ++orbSeq, t: t, x: x, y: y, r: 14, charges: t === 'x3' ? 28 : 1, born: performance.now() }); }

  function start(i) {
    lvl = i; var spec = LV.list[i], rnd = rng(1000 + i * 77);
    G = LV.make(i, rnd); total = 0; broken = 0;
    for (var k = 0; k < G.length; k++) if (G[k] && G[k] !== 9) total++;
    placeOrbs(spec.orbs, rng(5000 + i * 31));
    lives = 3; n = 0; held = true; wideUntil = 0; earned = 0; flash = []; drops = []; lastHit = performance.now();
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
    addBall(px, PY - BR - 1, (Math.random() - .5) * .5);
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
    G[k] = v - 1; if (!G[k]) { broken++; flash.push({ x: c * C, y: TOP + r * C, t: 1 }); if (drops.length < 3 && Math.random() < 1 / 110) { var q = Math.random(); drops.push({ x: c * C + C / 2, y: TOP + r * C + C / 2, t: q < .45 ? 'x3' : q < .75 ? 'p3' : 'wide' }); } }
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
          vx[i] = Math.sin(a) * SPD; vy[i] = -Math.cos(a) * SPD; y = PY - BR; fixAngle(i);
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
        if (ob.t === 'x3') {
          var sp = Math.atan2(vx[q], -vy[q]);
          [-.35, .35].forEach(function (d) { var m = addBall(bx[q], by[q], sp + d); if (m >= 0) bo[m] = ob.id; });
          ob.charges--; blip(880, .08, .05);
        } else if (ob.t === 'p3') {
          for (var t = 0; t < 3; t++) { var m2 = addBall(ob.x, ob.y, (t - 1) * .5); if (m2 >= 0) bo[m2] = ob.id; }
          ob.charges = 0; blip(700, .1, .05);
        } else if (ob.t === 'star') { save.stars++; earned++; persist(); ob.charges = 0; blip(1320, .14, .05, 'sine'); }
      }
    }
    orbs = orbs.filter(function (o) { return o.charges > 0; });
    // falling drops
    var w2 = pw();
    for (var dI = drops.length - 1; dI >= 0; dI--) {
      var dp = drops[dI]; dp.y += 190 * dt;
      if (dp.y + 8 >= PY && dp.y - 8 <= PY + PH && Math.abs(dp.x - px) < w2 / 2 + 14) { drops.splice(dI, 1); apply(dp.t); continue; }
      if (dp.y > H + 20) drops.splice(dI, 1);
    }
    // stuck guard
    if (n && performance.now() - lastHit > 12000) {
      for (var z = 0; z < n; z++) { var an = Math.atan2(vx[z], -vy[z]) + (Math.random() - .5) * .9; vx[z] = Math.sin(an) * SPD; vy[z] = -Math.cos(an) * SPD; fixAngle(z); }
      lastHit = performance.now();
    }
    if (broken >= total) return win();
    if (!held && n === 0) loseLife();
  }

  function loseLife() {
    lives--; hud(); blip(180, .3, .06, 'sine');
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
    setTimeout(function () { openOverlay('win'); }, 350);
  }

  function apply(t) {
    if (t === 'x3') { var m = n; for (var i = 0; i < m; i++) { var a = Math.atan2(vx[i], -vy[i]); addBall(bx[i], by[i], a - .35); addBall(bx[i], by[i], a + .35); } blip(880, .1, .05); }
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
    cx.drawImage(off, 0, 0);
    cx.setTransform(S, 0, 0, S, 0, 0);
    // break flashes
    for (var f = flash.length - 1; f >= 0; f--) { var fl = flash[f]; fl.t -= .08; if (fl.t <= 0) { flash.splice(f, 1); continue; } cx.fillStyle = 'rgba(255,255,255,' + (fl.t * .5) + ')'; cx.fillRect(fl.x, fl.y, C, C); }
    if (flash.length > 400) flash.splice(0, flash.length - 400);
    // orbs
    orbs.forEach(function (o) {
      var p = 1 + Math.sin((now - o.born) / 320) * .06, r = o.r * p;
      if (o.t === 'star') { cx.fillStyle = '#ffd23f'; star(o.x, o.y, r * 1.05); return; }
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
    // balls
    cx.fillStyle = '#fff';
    if (n > 500) { for (var i = 0; i < n; i++) cx.fillRect(bx[i] - BR, by[i] - BR, BR * 2, BR * 2); }
    else { cx.beginPath(); for (var j = 0; j < n; j++) { cx.moveTo(bx[j] + BR, by[j]); cx.arc(bx[j], by[j], BR, 0, Math.PI * 2); } cx.fill(); }
    // paddle
    var w = pw(); cx.fillStyle = performance.now() < wideUntil ? '#ffd23f' : '#fff';
    rr(px - w / 2, PY, w, PH, 2); cx.fill();
    if (held && state === 'play') { cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(px, PY - BR - 1, BR, 0, Math.PI * 2); cx.fill(); }
  }
  function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }

  /* ---------- loop ---------- */
  var last = 0, hudT = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!G || document.body.classList.contains('is-playing') === false) { last = now; return; }
    var dt = Math.min(.033, (now - last) / 1000 || 0); last = now;
    if (state === 'play') {
      if (keyDir) target = px + keyDir * 900 * dt;
      var w = pw(); target = Math.max(w / 2, Math.min(W - w / 2, target));
      px += (target - px) * Math.min(1, dt * 28);
      step(dt);
    }
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
    else if (a === 'mute') { save.muted = !save.muted; persist(); syncMute(); }
  });
  $$('[data-boost]').forEach(function (b) { b.addEventListener('click', function () { boost(b.getAttribute('data-boost')); }); });
  function syncMute() { $$('[data-act=mute]').forEach(function (b) { b.classList.toggle('is-off', !!save.muted); b.setAttribute('aria-label', save.muted ? 'Sound off' : 'Sound on'); }); }

  hudEls = { lives: $$('[data-life]'), stars: $('[data-stars]'), balls: $('[data-balls]'), cleared: $('[data-cleared]'), bar: $('[data-bar]'), wide: $('[data-wide]') };
  syncMute(); show('home'); requestAnimationFrame(loop);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/blockmayhem/sw.js').catch(function () {});
  window.__bm = { start: start, boost: boost, get n() { return n; }, get broken() { return broken; }, get total() { return total; }, launch: launch, setStars: function (s) { save.stars = s; }, dropX: function () { var b = null; drops.forEach(function (d) { if (d.y > 700 && (!b || d.y > b.y)) b = d; }); return b ? b.x : null; }, low: function () { var m = -1, x = W / 2; for (var i = 0; i < n; i++) if (vy[i] > 0 && by[i] > m && by[i] < PY) { m = by[i]; x = bx[i]; } return x; } };
})();
