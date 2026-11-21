(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var TARGET = new Date('2026-12-18T00:00:00+01:00').getTime(); /* midnight, Lagos */
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var started = false, muted = false;

  /* ---------- runes (procedural) ---------- */
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function glyph(r) {
    var pts = [], i, j, d = '';
    for (i = 0; i < 3; i++) for (j = 0; j < 4; j++) pts.push([i * 4.5 - 4.5, j * 5 - 7.5]);
    var n = 3 + Math.floor(r() * 3), a, b;
    for (i = 0; i < n; i++) { a = pts[Math.floor(r() * pts.length)]; b = pts[Math.floor(r() * pts.length)]; if (a === b) continue; d += 'M' + a[0] + ' ' + a[1] + 'L' + b[0] + ' ' + b[1]; }
    return d || 'M-4 -7L4 7';
  }
  function runesSVG(detail) {
    var r = rng(1218), s = '', i, a, k;
    var stroke = 'fill="none" stroke="#6dff8a" stroke-linecap="round" stroke-linejoin="round"';
    s += '<g ' + stroke + ' stroke-width="1.2"><circle r="292" opacity=".8"/><circle r="272" opacity=".5"/><circle r="206" opacity=".7"/><circle r="188" stroke-dasharray="2 7" opacity=".7"/></g>';
    s += '<g class="rs" ' + stroke + ' stroke-width=".9">';
    for (i = 0; i < 120; i++) { a = i * 3; k = i % 5 === 0 ? 12 : 6; s += '<path d="M0 -' + 272 + 'L0 -' + (272 - k) + '" transform="rotate(' + a + ')" opacity=".6"/>'; }
    s += '</g>';
    s += '<g class="rs rs--r" ' + stroke + ' stroke-width="1.15">';
    for (i = 0; i < 52; i++) { a = i * (360 / 52); s += '<path d="' + glyph(r) + '" transform="rotate(' + a + ') translate(0 -239)"/>'; }
    s += '</g>';
    s += '<g class="rs" ' + stroke + ' stroke-width="1" opacity=".75">';
    var tri = function (rot) { var p = [0, 1, 2].map(function (q) { var t = (q * 120 + rot) * Math.PI / 180; return (Math.sin(t) * 186).toFixed(1) + ' ' + (-Math.cos(t) * 186).toFixed(1); }); return '<path d="M' + p.join('L') + 'Z"/>'; };
    s += tri(0) + tri(60) + '</g>';
    if (detail) { s += '<g ' + stroke + ' stroke-width=".8" opacity=".5"><circle r="120"/><circle r="112" stroke-dasharray="1 5"/></g>'; }
    return s;
  }
  var rn = $('[data-runes]'); if (rn) rn.innerHTML = runesSVG(true);
  var rm = $('[data-rune-mini]'); if (rm) rm.innerHTML = runesSVG(false);

  /* ---------- audio (synthesised, no files) ---------- */
  var AC = null, master = null, noiseBuf = null, flip = 0, droneG = null;
  function initAudio() {
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    AC = new C(); master = AC.createGain(); master.gain.value = muted ? 0 : .9;
    var comp = AC.createDynamicsCompressor(); master.connect(comp); comp.connect(AC.destination);
    var len = AC.sampleRate * 3, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = buf;
    /* drone: low detuned saws + breathing swell (6s, matches the runes) */
    droneG = AC.createGain(); droneG.gain.value = 0;
    var lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150; lp.Q.value = .7;
    [[41.2, 'sawtooth', .5], [41.7, 'sawtooth', .5], [82.4, 'sine', .35], [123.5, 'triangle', .08]].forEach(function (o) {
      var os = AC.createOscillator(), g = AC.createGain(); os.type = o[1]; os.frequency.value = o[0]; g.gain.value = o[2]; os.connect(g); g.connect(lp); os.start();
    });
    lp.connect(droneG); droneG.connect(master);
    var lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 1 / 6; lg.gain.value = .07; lfo.connect(lg); lg.connect(droneG.gain); lfo.start();
    var lfo2 = AC.createOscillator(), lg2 = AC.createGain(); lfo2.frequency.value = 1 / 6; lg2.gain.value = 90; lfo2.connect(lg2); lg2.connect(lp.frequency); lfo2.start();
    droneG.gain.linearRampToValueAtTime(.2, AC.currentTime + 5);
    /* thin high pad */
    var pg = AC.createGain(); pg.gain.value = .012; pg.connect(master);
    [392, 587.3].forEach(function (f) { var o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(pg); o.start(); });
  }
  function noise(dest, t, dur) { var s = AC.createBufferSource(); s.buffer = noiseBuf; s.start(t, Math.random() * 1.5, dur); s.connect(dest); return s; }
  function tick(vol) {
    if (!AC || muted) return;
    var t = AC.currentTime + .005, tock = (flip++ % 2) === 1, g, f, o;
    g = AC.createGain(); g.gain.setValueAtTime(.55 * vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + .07);
    f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = tock ? 1100 : 1800; f.Q.value = 1.3; f.connect(g); g.connect(master); noise(f, t, .09);
    o = AC.createOscillator(); g = AC.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(tock ? 105 : 150, t); o.frequency.exponentialRampToValueAtTime(tock ? 52 : 70, t + .2);
    g.gain.setValueAtTime(.7 * vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + .28); o.connect(g); g.connect(master); o.start(t); o.stop(t + .3);
  }
  function thunder(big) {
    if (!AC || muted) return;
    var t = AC.currentTime + .02, k = big ? 1.35 : 1, g, f, o;
    g = AC.createGain(); g.gain.setValueAtTime(.7 * k, t); g.gain.exponentialRampToValueAtTime(.001, t + .18);
    f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2200; f.connect(g); g.connect(master); noise(f, t, .2);
    g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(1.0 * k, t + .12); g.gain.exponentialRampToValueAtTime(.001, t + (big ? 4.6 : 3.4));
    f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(55, t + 3); f.connect(g); g.connect(master); noise(f, t, 3);
    o = AC.createOscillator(); g = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(58, t); o.frequency.exponentialRampToValueAtTime(26, t + 2.4);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.95 * k, t + .06); g.gain.exponentialRampToValueAtTime(.001, t + 2.8); o.connect(g); g.connect(master); o.start(t); o.stop(t + 3);
  }
  function setMute(m) {
    muted = m; var b = $('[data-mute]'); if (b) b.setAttribute('aria-pressed', m ? 'true' : 'false');
    if (master) master.gain.setTargetAtTime(m ? 0 : .9, AC.currentTime, .05);
  }
  document.addEventListener('visibilitychange', function () { if (!AC) return; if (document.hidden) AC.suspend(); else AC.resume(); });

  /* ---------- countdown ---------- */
  var dEl = $('[data-d]'), hEl = $('[data-h]'), mEl = $('[data-m]'), sEl = $('[data-s]'), mini = $('[data-mini]'), line = $('[data-line]');
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var done = false;
  function render() {
    var ms = TARGET - Date.now(), d, h, m, s;
    if (ms <= 0) { ms = 0; if (!done) { done = true; line.textContent = 'Doomsday is here.'; } }
    s = Math.floor(ms / 1000); d = Math.floor(s / 86400); h = Math.floor(s % 86400 / 3600); m = Math.floor(s % 3600 / 60); s = s % 60;
    dEl.textContent = d < 100 ? p2(d) : d; hEl.textContent = p2(h); mEl.textContent = p2(m); sEl.textContent = p2(s);
    mini.textContent = d + 'D ' + p2(h) + 'H ' + p2(m) + 'M ' + p2(s) + 'S';
    sEl.classList.remove('tk'); void sEl.offsetWidth; sEl.classList.add('tk');
    return d;
  }
  function loop() {
    var d = render(), vol = d > 14 ? .55 : d > 3 ? .72 : d > 0 ? .88 : 1;
    if (started && !done) tick(vol);
    setTimeout(loop, 1000 - Date.now() % 1000);
  }

  /* ---------- fx canvas: bolts, cracks, debris, motes ---------- */
  var cv = $('[data-fx]'), cx = cv.getContext('2d'), W = 0, H = 0, DPR = 1;
  var bolts = [], cracks = [], debris = [], motes = [];
  function size() { DPR = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2); W = window.innerWidth; H = window.innerHeight; cv.width = W * DPR; cv.height = H * DPR; cx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  window.addEventListener('resize', size); size();
  for (var i = 0; i < (W < 700 ? 34 : 60); i++) motes.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + .4, v: Math.random() * .25 + .08, p: Math.random() * 6.28 });

  function bolt(x0, y0, x1, y1, disp, out) {
    if (disp < 3) { out.push([x0, y0, x1, y1]); return; }
    var mx = (x0 + x1) / 2 + (Math.random() - .5) * disp, my = (y0 + y1) / 2 + (Math.random() - .5) * disp * .6;
    bolt(x0, y0, mx, my, disp / 2, out); bolt(mx, my, x1, y1, disp / 2, out);
    if (Math.random() < .22 && disp > 14) { var bx = mx + (Math.random() - .5) * 240, by = my + 80 + Math.random() * 200; bolt(mx, my, bx, by, disp / 2.2, out); }
  }
  function strike() {
    var x0 = W * (.15 + Math.random() * .7), x1 = x0 + (Math.random() - .5) * W * .3, segs = [];
    bolt(x0, -10, x1, H * (.55 + Math.random() * .3), W * .18, segs);
    bolts.push({ s: segs, t: performance.now() });
    return { x: x1, y: H * .8 };
  }
  function crack(x, y) {
    var segs = [], t0 = performance.now();
    (function grow(px, py, ang, len, depth, delay) {
      if (depth > 5 || len < 8) return;
      var steps = 3 + Math.floor(Math.random() * 3), cxp = px, cyp = py, a = ang, i, nx, ny;
      for (i = 0; i < steps; i++) {
        a += (Math.random() - .5) * .9; nx = cxp + Math.cos(a) * len / steps; ny = cyp + Math.sin(a) * len / steps;
        segs.push([cxp, cyp, nx, ny, delay + i * 38, 3.4 - depth * .55]);
        if (Math.random() < .35) grow(nx, ny, a + (Math.random() < .5 ? -1 : 1) * (.5 + Math.random() * .6), len * .55, depth + 1, delay + i * 38);
        cxp = nx; cyp = ny;
      }
    })(x, y, Math.random() * 6.28, 160 + Math.random() * 160, 0, 0);
    for (var k = 0; k < 4; k++) (function () { var a = k * 1.57 + Math.random(); (function g2(px, py, ang, len, depth, delay) { if (depth > 4 || len < 10) return; var nx = px + Math.cos(ang) * len, ny = py + Math.sin(ang) * len; segs.push([px, py, nx, ny, delay, 3 - depth * .6]); g2(nx, ny, ang + (Math.random() - .5) * 1, len * .7, depth + 1, delay + 40); })(x, y, a, 70 + Math.random() * 90, 0, 0); })();
    cracks.push({ s: segs, t: t0 });
  }
  function spawnDebris(n) {
    for (var i = 0; i < n; i++) { var s = Math.random() * 22 + 5; debris.push({ x: Math.random() * W, y: -30 - Math.random() * 180, vy: 2 + Math.random() * 5, vx: (Math.random() - .5) * 2.4, r: Math.random() * 6.28, vr: (Math.random() - .5) * .22, s: s, sh: [Math.random() * .6 + .7, Math.random() * .6 + .7, Math.random() * .6 + .7], c: 30 + Math.floor(Math.random() * 40) }); }
  }
  function frame(now) {
    cx.clearRect(0, 0, W, H);
    var i, j, b, a, s;
    /* motes */
    cx.fillStyle = '#6dff8a';
    for (i = 0; i < motes.length; i++) { var m = motes[i]; m.y -= m.v; m.p += .01; if (m.y < -4) { m.y = H + 4; m.x = Math.random() * W; } cx.globalAlpha = .15 + .35 * Math.abs(Math.sin(m.p)); cx.beginPath(); cx.arc(m.x + Math.sin(m.p) * 10, m.y, m.r, 0, 6.28); cx.fill(); }
    cx.globalAlpha = 1;
    /* cracks */
    for (i = cracks.length - 1; i >= 0; i--) {
      var c = cracks[i], age = now - c.t;
      if (age > 11000) { cracks.splice(i, 1); continue; }
      a = age > 7000 ? 1 - (age - 7000) / 4000 : 1;
      for (j = 0; j < c.s.length; j++) { s = c.s[j]; if (age < s[4]) continue;
        cx.globalAlpha = a * .85; cx.strokeStyle = '#000'; cx.lineWidth = s[5] + 2; cx.beginPath(); cx.moveTo(s[0], s[1]); cx.lineTo(s[2], s[3]); cx.stroke();
        cx.globalAlpha = a * .7; cx.strokeStyle = '#8dffa6'; cx.lineWidth = Math.max(.6, s[5] * .35); cx.stroke(); }
    }
    cx.globalAlpha = 1;
    /* bolts */
    for (i = bolts.length - 1; i >= 0; i--) {
      b = bolts[i]; var ba = now - b.t; if (ba > 520) { bolts.splice(i, 1); continue; }
      a = ba < 90 ? 1 : 1 - (ba - 90) / 430;
      cx.lineCap = 'round';
      cx.globalAlpha = a * .35; cx.strokeStyle = '#5aa8ff'; cx.lineWidth = 9; cx.beginPath(); for (j = 0; j < b.s.length; j++) { s = b.s[j]; cx.moveTo(s[0], s[1]); cx.lineTo(s[2], s[3]); } cx.stroke();
      cx.globalAlpha = a; cx.strokeStyle = '#e9f5ff'; cx.lineWidth = 2; cx.beginPath(); for (j = 0; j < b.s.length; j++) { s = b.s[j]; cx.moveTo(s[0], s[1]); cx.lineTo(s[2], s[3]); } cx.stroke();
    }
    cx.globalAlpha = 1;
    /* debris */
    for (i = debris.length - 1; i >= 0; i--) {
      var d = debris[i]; d.y += d.vy; d.x += d.vx; d.r += d.vr; d.vy += .12;
      if (d.y > H + 60) { debris.splice(i, 1); continue; }
      cx.save(); cx.translate(d.x, d.y); cx.rotate(d.r); cx.fillStyle = 'rgb(' + d.c + ',' + (d.c + 6) + ',' + d.c + ')'; cx.strokeStyle = 'rgba(109,255,138,.35)'; cx.lineWidth = 1;
      cx.beginPath(); cx.moveTo(-d.s * d.sh[0], -d.s * .5); cx.lineTo(d.s * d.sh[1], -d.s * .3); cx.lineTo(d.s * .6, d.s * d.sh[2]); cx.lineTo(-d.s * .5, d.s * .6); cx.closePath(); cx.fill(); cx.stroke(); cx.restore();
    }
    requestAnimationFrame(frame);
  }

  /* ---------- shake + flash + events ---------- */
  var world = $('[data-world]'), flashEl = $('[data-flash]'), shakeAmp = 0, shakeT = 0;
  function shakeLoop() {
    if (shakeAmp > .12) { shakeAmp *= .93; var x = (Math.random() - .5) * shakeAmp, y = (Math.random() - .5) * shakeAmp, r = (Math.random() - .5) * shakeAmp * .06; world.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) rotate(' + r.toFixed(3) + 'deg)'; }
    else if (shakeAmp) { shakeAmp = 0; world.style.transform = ''; }
    requestAnimationFrame(shakeLoop);
  }
  function flash(peak) {
    if (reduce) { flashEl.animate([{ opacity: 0 }, { opacity: .1 }, { opacity: 0 }], { duration: 600 }); return; }
    flashEl.animate([{ opacity: 0 }, { opacity: peak }, { opacity: peak * .2 }, { opacity: peak * .42, offset: .5 }, { opacity: 0 }], { duration: 760, easing: 'ease-out' });
  }
  function storm(big) {
    if (document.hidden) return;
    var at = strike();
    flash(big ? .55 : .42);
    setTimeout(function () {
      thunder(big);
      if (!reduce) { shakeAmp = big ? 26 : 12; spawnDebris(big ? 46 : 12); crack(at.x, at.y * (.5 + Math.random() * .4)); if (big) { crack(W * Math.random(), H * Math.random() * .8); crack(W * Math.random(), H * Math.random() * .8); } }
      if (big) { var h = $('.hero'); h.classList.add('glitch'); setTimeout(function () { h.classList.remove('glitch'); }, 900); }
    }, 140 + Math.random() * 420);
  }
  var stormN = 0;
  function stormLoop() { stormN++; storm(stormN % 5 === 0); setTimeout(stormLoop, 6500 + Math.random() * 7500); }

  /* ---------- reveal + parallax ---------- */
  if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .2 }); $$('.rv').forEach(function (el) { io.observe(el); }); }
  else $$('.rv').forEach(function (el) { el.classList.add('in'); });
  var imgs = $$('.chap__img'), ticking = false;
  function par() { ticking = false; if (reduce) return; var vh = window.innerHeight; imgs.forEach(function (im) { var r = im.parentNode.getBoundingClientRect(); if (r.bottom < -50 || r.top > vh + 50) return; var p = (r.top + r.height / 2 - vh / 2) / vh; im.style.transform = 'translateY(' + (p * -7).toFixed(2) + '%)'; }); }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true }); par();

  /* ---------- slider (ping-pong, swipe, dots) ---------- */
  (function () {
    var s = $('[data-slider]'), track = $('[data-track]'), slides = $$('figure', track), dotsEl = $('[data-dots]'), cur = 0, dir = 1, hold = 0, vis = false;
    var per = function () { return window.innerWidth >= 900 ? 2 : 1; };
    var count = function () { return Math.max(1, slides.length - per() + 1); };
    var dots = [];
    function build() { dotsEl.innerHTML = ''; dots = []; for (var i = 0; i < count(); i++) { (function (i) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', 'Slide ' + (i + 1)); b.addEventListener('click', function () { hold = Date.now() + 9000; go(i); }); dotsEl.appendChild(b); dots.push(b); })(i); } mark(Math.min(cur, count() - 1)); }
    function mark(i) { cur = i; dots.forEach(function (d, k) { d.classList.toggle('on', k === i); }); }
    function go(i) { track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: 'smooth' }); mark(i); }
    track.addEventListener('scroll', function () { var i = Math.round(track.scrollLeft / (slides[0].offsetWidth + 12)); if (i !== cur && i >= 0 && i < count()) mark(i); }, { passive: true });
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (e) { track.addEventListener(e, function () { hold = Date.now() + 9000; }, { passive: true }); });
    window.addEventListener('resize', build); build();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }, { threshold: .4 }).observe(s); else vis = true;
    if (!reduce) setInterval(function () { if (!vis || document.hidden || Date.now() < hold) return; var n = cur + dir; if (n >= count() || n < 0) { dir = -dir; n = cur + dir; } go(n); }, 4800);
  })();

  /* ---------- calendar ---------- */
  var ics = $('[data-ics]');
  if (ics) ics.addEventListener('click', function () {
    var t = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//BLACC Universal//Doomsday//EN\r\nBEGIN:VEVENT\r\nUID:doomsday-20261218@blaccuniversal.com\r\nDTSTAMP:20261121T000000Z\r\nDTSTART;VALUE=DATE:20261218\r\nDTEND;VALUE=DATE:20261219\r\nSUMMARY:Avengers: Doomsday\r\nDESCRIPTION:The clock hits zero.\r\nBEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY\r\nDESCRIPTION:Doomsday is tomorrow.\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR';
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/calendar' })); a.download = 'doomsday.ics'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });

  /* ---------- begin ---------- */
  var veil = $('[data-veil]');
  function begin(mode) {
    if (started) return; started = true;
    if (mode === 'sound') { initAudio(); } else { muted = true; var b = $('[data-mute]'); b.setAttribute('aria-pressed', 'true'); }
    veil.classList.add('is-gone'); document.body.style.overflow = '';
    setTimeout(function () { storm(false); }, 1400); setTimeout(stormLoop, 9000);
  }
  $$('[data-begin]').forEach(function (b) { b.addEventListener('click', function () { begin(b.getAttribute('data-begin')); }); });
  $('[data-mute]').addEventListener('click', function () {
    if (!AC && started) { muted = false; initAudio(); setMute(false); return; }
    setMute(!muted);
  });
  document.body.style.overflow = 'hidden';
  loop(); requestAnimationFrame(frame); requestAnimationFrame(shakeLoop);
})();
