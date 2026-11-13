/* Snake · BLACC Universal (unlisted) */
(function () {
  'use strict';
  var COLS = 18, ROWS = 24, START_LEN = 4;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ---------- save ---------- */
  var SKEY = 'sn_save_v1';
  var save = (function () { try { return JSON.parse(localStorage.getItem(SKEY)) || null; } catch (e) { return null; } })() || { speed: 5, maze: 0, best: {}, muted: false, theme: 'night', games: 0 };
  function persist() { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} }

  /* ---------- mazes ---------- */
  function box(w) { for (var c = 0; c < COLS; c++) { w[c] = 1; w[(ROWS - 1) * COLS + c] = 1; } for (var r = 0; r < ROWS; r++) { w[r * COLS] = 1; w[r * COLS + COLS - 1] = 1; } }
  function line(w, c0, r0, c1, r1) { for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) w[r * COLS + c] = 1; }
  function clear(w, c0, r0, c1, r1) { for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) w[r * COLS + c] = 0; }
  var MAZES = [
    { name: 'No walls', wrap: true, build: function () {} },
    { name: 'Box', build: function (w) { box(w); } },
    { name: 'Tunnel', wrap: true, build: function (w) { box(w); clear(w, 7, 0, 10, 0); clear(w, 7, ROWS - 1, 10, ROWS - 1); clear(w, 0, 10, 0, 13); clear(w, COLS - 1, 10, COLS - 1, 13); line(w, 4, 5, 13, 5); line(w, 4, 18, 13, 18); } },
    { name: 'Mill', wrap: true, build: function (w) { line(w, 3, 3, 9, 3); line(w, 3, 3, 3, 9); line(w, 8, 20, 14, 20); line(w, 14, 14, 14, 20); line(w, 14, 3, 14, 9); line(w, 11, 3, 14, 3); line(w, 3, 14, 3, 20); line(w, 3, 20, 6, 20); } },
    { name: 'Rails', wrap: true, build: function (w) { line(w, 0, 6, 12, 6); line(w, 5, 17, COLS - 1, 17); line(w, 15, 0, 15, 4); line(w, 2, 19, 2, ROWS - 1); } },
    { name: 'Apartment', build: function (w) { box(w); line(w, 1, 8, 6, 8); line(w, 11, 8, 16, 8); line(w, 1, 16, 6, 16); line(w, 11, 16, 16, 16); line(w, 8, 1, 8, 4); line(w, 9, 19, 9, 22); } }
  ];
  function mazeGrid(i) { var w = new Uint8Array(COLS * ROWS); MAZES[i].build(w); clear(w, 2, 12, 9, 12); return w; }

  /* ---------- screens ---------- */
  function show(name) {
    $$('[data-scr]').forEach(function (s) { s.hidden = s.getAttribute('data-scr') !== name; });
    document.body.classList.toggle('is-playing', name === 'play');
    if (name === 'home') renderHome();
    if (name === 'play') requestAnimationFrame(resize);
  }
  function bestKey() { return save.maze + ':' + save.speed; }
  function renderHome() {
    $$('[data-speed]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-speed') === save.speed ? 'true' : 'false'); });
    var box = $('[data-mazes]'); box.innerHTML = '';
    MAZES.forEach(function (m, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'mz'; b.setAttribute('aria-pressed', i === save.maze ? 'true' : 'false');
      b.innerHTML = '<span class="mz__img">' + mazeSvg(i) + '</span><span class="mz__t">' + m.name + '</span>';
      b.addEventListener('click', function () { save.maze = i; persist(); renderHome(); tick(660); });
      box.appendChild(b);
    });
    $('[data-best]').textContent = save.best[bestKey()] || 0;
    $('[data-best-label]').textContent = MAZES[save.maze].name + ' · Speed ' + save.speed;
    var top = 0; Object.keys(save.best).forEach(function (k) { if (save.best[k] > top) top = save.best[k]; });
    $('[data-top]').textContent = top; $('[data-games]').textContent = save.games || 0;
  }
  function mazeSvg(i) {
    var w = mazeGrid(i), r = '';
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) if (w[y * COLS + x]) r += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    return '<svg viewBox="0 0 ' + COLS + ' ' + ROWS + '" preserveAspectRatio="xMidYMid meet">' + r + '<rect class="mz__s" x="5" y="12" width="4" height="1"/></svg>';
  }
  $$('[data-speed]').forEach(function (b) { b.addEventListener('click', function () { save.speed = +b.getAttribute('data-speed'); persist(); renderHome(); tick(440 + save.speed * 40); }); });

  /* ---------- audio ---------- */
  var AC = null;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
  function blip(f, dur, vol, type) {
    if (save.muted || !AC) return;
    var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + .02);
  }
  function tick(f) { ac(); blip(f, .05, .03); }
  function buzz(p) { try { if (navigator.vibrate && !save.muted) navigator.vibrate(p); } catch (e) {} }

  /* ---------- theme ---------- */
  var TH = {
    night: { bg: '#050505', grid: 'rgba(255,255,255,.035)', wall: '#2c2c2c', wallTop: '#3d3d3d', head: '#ffffff', body: [235, 120], food: '#ffd23f', bonus: '#ffd23f', ink: '#fff', dead: '#ff5a5a' },
    day: { bg: '#fbfaf7', grid: 'rgba(0,0,0,.04)', wall: '#c6c4bd', wallTop: '#b2b0a9', head: '#111111', body: [30, 150], food: '#e0a100', bonus: '#e0a100', ink: '#111', dead: '#d33' }
  };
  var T = TH[save.theme === 'day' ? 'day' : 'night'];
  function setTheme(t) {
    save.theme = t; persist(); T = TH[t]; document.documentElement.setAttribute('data-theme', t);
    var mc = document.querySelector('meta[name=theme-color]'); if (mc) mc.content = t === 'day' ? '#f4f3ef' : '#000000';
    $$('[data-act=theme]').forEach(function (b) { b.classList.toggle('is-day', t === 'day'); });
    if (state !== 'idle') draw(performance.now());
  }

  /* ---------- game ---------- */
  var cv = $('[data-cv]'), cx = cv.getContext('2d'), S = 20;
  var walls, wrap, snake, dir, queue, food, bonus, eaten, score, state = 'idle', stepMs, acc = 0, last = 0, deadAt = 0, grew = 0;
  function free(c, r) {
    if (walls[r * COLS + c]) return false;
    for (var i = 0; i < snake.length; i++) if (snake[i][0] === c && snake[i][1] === r) return false;
    return true;
  }
  function place() {
    var spots = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (free(c, r) && !(food && food[0] === c && food[1] === r) && !(bonus && bonus.c === c && bonus.r === r)) spots.push([c, r]);
    return spots.length ? spots[Math.floor(Math.random() * spots.length)] : null;
  }
  function start() {
    var m = MAZES[save.maze]; walls = mazeGrid(save.maze); wrap = !!m.wrap;
    snake = []; for (var i = 0; i < START_LEN; i++) snake.push([5 + START_LEN - 1 - i, 12]);
    dir = [1, 0]; queue = []; food = null; bonus = null; eaten = 0; score = 0; grew = 0;
    food = place();
    stepMs = Math.round(250 - (save.speed - 1) * 24);
    state = 'ready'; acc = 0;
    $('[data-hud-maze]').textContent = m.name + ' · Speed ' + save.speed;
    $('[data-hud-best]').textContent = save.best[bestKey()] || 0;
    hideOverlays(); show('play'); hud(); $('[data-hint]').hidden = false;
    draw(performance.now());
  }
  function go() { if (state !== 'ready') return; state = 'play'; last = performance.now(); acc = 0; $('[data-hint]').hidden = true; ac(); }
  function turn(dx, dy) {
    if (state === 'ready') go();
    if (state !== 'play') return;
    var ref = queue.length ? queue[queue.length - 1] : dir;
    if ((dx === -ref[0] && dy === -ref[1]) || (dx === ref[0] && dy === ref[1])) return;
    if (queue.length < 3) queue.push([dx, dy]);
  }
  function step() {
    if (queue.length) dir = queue.shift();
    var h = snake[0], nc = h[0] + dir[0], nr = h[1] + dir[1];
    if (wrap) { nc = (nc + COLS) % COLS; nr = (nr + ROWS) % ROWS; }
    var hitEdge = nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS;
    var willEat = food && food[0] === nc && food[1] === nr;
    // tail moves away this step unless we grow
    var body = snake.slice(0, grew > 0 || willEat ? snake.length : snake.length - 1);
    var self = !hitEdge && body.some(function (s) { return s[0] === nc && s[1] === nr; });
    if (hitEdge || self || walls[nr * COLS + nc]) return die();
    snake.unshift([nc, nr]);
    if (grew > 0) grew--; else if (!willEat) snake.pop();
    if (willEat) {
      eaten++; score += save.speed;
      blip(880, .06, .04); buzz(8);
      food = place();
      if (eaten % 5 === 0 && !bonus) { var p = place(); if (p) bonus = { c: p[0], r: p[1], life: 30, max: 30 }; blip(1320, .08, .03); }
    }
    if (bonus) {
      if (bonus.c === nc && bonus.r === nr) {
        var pts = Math.max(save.speed, Math.round(bonus.life / bonus.max * save.speed * 10));
        score += pts; pops.push({ c: nc, r: nr, s: '+' + pts, t: 1 }); bonus = null;
        [990, 1320, 1760].forEach(function (f, i) { setTimeout(function () { blip(f, .08, .035); }, i * 60); }); buzz([10, 30, 10]);
      } else if (--bonus.life <= 0) bonus = null;
    }
    if (!food) return win();
    hud();
  }
  var pops = [];
  function die() {
    state = 'dead'; deadAt = performance.now(); save.games = (save.games || 0) + 1;
    blip(220, .25, .05, 'sawtooth'); setTimeout(function () { blip(150, .35, .05, 'sawtooth'); }, 120); buzz([40, 50, 80]);
    var k = bestKey(), pb = save.best[k] || 0, nb = score > pb;
    if (nb) save.best[k] = score; persist();
    $('[data-over-score]').textContent = score;
    $('[data-over-best]').innerHTML = nb && score > 0 ? (pb ? '<b>New best!</b> Was ' + pb : '<b>First score on this setup</b>') : 'Best ' + pb;
    $('[data-over-len]').textContent = snake.length;
    setTimeout(function () { openOverlay('over'); }, 900);
  }
  function win() { state = 'dead'; $('[data-over-title]').textContent = 'Board cleared'; die(); }
  function hud() {
    $('[data-score]').textContent = score;
    $('[data-len]').textContent = snake.length;
    var b = $('[data-bonus]');
    b.hidden = !bonus; if (bonus) b.style.setProperty('--f', bonus.life / bonus.max);
  }

  /* ---------- render ---------- */
  function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
  function draw(now) {
    var dpr = cv.width / (COLS * S);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.fillStyle = T.bg; cx.fillRect(0, 0, COLS * S, ROWS * S);
    // faint grid dots
    cx.fillStyle = T.grid;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) cx.fillRect(c * S + S / 2 - 1, r * S + S / 2 - 1, 2, 2);
    // walls
    for (var i = 0; i < walls.length; i++) if (walls[i]) { var wr = Math.floor(i / COLS), wc = i - wr * COLS; cx.fillStyle = T.wall; cx.fillRect(wc * S, wr * S, S, S); cx.fillStyle = T.wallTop; cx.fillRect(wc * S, wr * S, S, 2); }
    var g = 2;
    // food
    if (food) { var p = 1 + Math.sin(now / 180) * .08, fs = (S - 6) * p; cx.fillStyle = T.food; rr(food[0] * S + (S - fs) / 2, food[1] * S + (S - fs) / 2, fs, fs, 2); cx.fill(); }
    // bonus
    if (bonus && !(bonus.life < 8 && Math.sin(now / 60) < 0)) {
      var bx = bonus.c * S + S / 2, by = bonus.r * S + S / 2, bs = S * .62;
      cx.save(); cx.translate(bx, by); cx.rotate(Math.PI / 4 + now / 900); cx.fillStyle = T.bonus; cx.fillRect(-bs / 2, -bs / 2, bs, bs); cx.restore();
      cx.beginPath(); cx.arc(bx, by, S * .62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * bonus.life / bonus.max); cx.strokeStyle = T.bonus; cx.lineWidth = 1.5; cx.stroke();
    }
    // snake
    var n = snake.length, dead = state === 'dead', flash = dead && Math.floor((now - deadAt) / 120) % 2 === 0 && now - deadAt < 900;
    for (var k = n - 1; k >= 0; k--) {
      var s = snake[k], f = n > 1 ? k / (n - 1) : 0, l = Math.round(T.body[0] + (T.body[1] - T.body[0]) * f);
      cx.fillStyle = k === 0 ? (flash ? T.dead : T.head) : 'rgb(' + l + ',' + l + ',' + l + ')';
      cx.fillRect(s[0] * S + g, s[1] * S + g, S - g * 2, S - g * 2);
    }
    // eyes on head
    if (n) {
      var h = snake[0], ex = h[0] * S + S / 2, ey = h[1] * S + S / 2, px = dir[1] !== 0 ? 3.5 : 0, py = dir[0] !== 0 ? 3.5 : 0;
      cx.fillStyle = T.bg; cx.fillRect(ex + dir[0] * 3 - px - 1.5, ey + dir[1] * 3 - py - 1.5, 3, 3); cx.fillRect(ex + dir[0] * 3 + px - 1.5, ey + dir[1] * 3 + py - 1.5, 3, 3);
    }
    // pops
    cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = '800 13px "Open Sans",system-ui,sans-serif';
    for (var q = pops.length - 1; q >= 0; q--) { var pp = pops[q]; pp.t -= .025; if (pp.t <= 0) { pops.splice(q, 1); continue; } cx.globalAlpha = Math.min(1, pp.t * 1.5); cx.fillStyle = T.food; cx.fillText(pp.s, pp.c * S + S / 2, pp.r * S - (1 - pp.t) * 22); }
    cx.globalAlpha = 1;
  }
  function loop(now) {
    requestAnimationFrame(loop);
    if (!document.body.classList.contains('is-playing')) { last = now; return; }
    if (state === 'play') { acc += now - last; while (acc >= stepMs && state === 'play') { acc -= stepMs; step(); } }
    last = now;
    draw(now);
    var b = $('[data-bonus]'); if (bonus && !b.hidden) b.style.setProperty('--f', bonus.life / bonus.max);
  }
  function resize() {
    var box = $('[data-stage]'), bw = box.clientWidth, bh = box.clientHeight; if (!bw || !bh) return;
    var cs = Math.floor(Math.min(bw / COLS, bh / ROWS)), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.style.width = cs * COLS + 'px'; cv.style.height = cs * ROWS + 'px';
    cv.width = Math.round(cs * COLS * dpr); cv.height = Math.round(cs * ROWS * dpr);
    if (walls) draw(performance.now());
  }
  window.addEventListener('resize', resize);

  /* ---------- input ---------- */
  var KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
  document.addEventListener('keydown', function (e) {
    if (!document.body.classList.contains('is-playing')) return;
    var k = KEYS[e.key];
    if (k) { e.preventDefault(); turn(k[0], k[1]); return; }
    if (e.key === ' ') { e.preventDefault(); if (state === 'ready') go(); else if (state === 'play') pause(); else if (state === 'paused') resume(); }
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (state === 'play') pause(); else if (state === 'paused') resume(); }
  });
  var stage = $('[data-stage]'), sx = 0, sy = 0, tracking = false;
  stage.addEventListener('touchstart', function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; tracking = true; ac(); }, { passive: true });
  stage.addEventListener('touchmove', function (e) {
    if (!tracking) return; e.preventDefault();
    var t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy, th = 22;
    if (Math.abs(dx) < th && Math.abs(dy) < th) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0); else turn(0, dy > 0 ? 1 : -1);
    sx = t.clientX; sy = t.clientY;
  }, { passive: false });
  stage.addEventListener('touchend', function () { if (state === 'ready') go(); tracking = false; });
  stage.addEventListener('click', function () { if (state === 'ready') go(); });
  $$('[data-pad]').forEach(function (b) {
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); var d = b.getAttribute('data-pad').split(','); turn(+d[0], +d[1]); ac(); });
  });

  /* ---------- overlays & actions ---------- */
  function hideOverlays() { $$('[data-ov]').forEach(function (o) { o.hidden = true; }); $('[data-over-title]').textContent = 'Game over'; }
  function openOverlay(n) { $$('[data-ov]').forEach(function (o) { o.hidden = o.getAttribute('data-ov') !== n; }); }
  var before = 'play';
  function pause() { if (state !== 'play' && state !== 'ready') return; before = state; state = 'paused'; openOverlay('pause'); }
  function resume() { if (state !== 'paused') return; hideOverlays(); state = before; last = performance.now(); acc = 0; }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]'); if (!t) return;
    var a = t.getAttribute('data-act'); ac();
    if (a === 'play' || a === 'again') start();
    else if (a === 'home') { state = 'idle'; show('home'); }
    else if (a === 'pause') pause();
    else if (a === 'resume') resume();
    else if (a === 'help') $('[data-help]').hidden = false;
    else if (a === 'help-close') $('[data-help]').hidden = true;
    else if (a === 'mute') { save.muted = !save.muted; persist(); syncMute(); }
    else if (a === 'theme') setTheme(save.theme === 'day' ? 'night' : 'day');
    else if (a === 'pad-toggle') { save.pad = !save.pad; persist(); syncPad(); }
  });
  function syncMute() { $$('[data-act=mute]').forEach(function (b) { b.classList.toggle('is-off', !!save.muted); }); }
  function syncPad() { document.body.classList.toggle('has-pad', !!save.pad); $$('[data-act=pad-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', save.pad ? 'true' : 'false'); }); requestAnimationFrame(resize); }

  setTheme(save.theme === 'day' ? 'day' : 'night'); syncMute(); syncPad(); show('home'); requestAnimationFrame(loop);
  window.__sn = { start: start, turn: turn, get state() { return state; }, get score() { return score; }, get len() { return snake ? snake.length : 0; }, get food() { return food; }, get head() { return snake && snake[0]; } };
})();
