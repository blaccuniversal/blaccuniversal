/* PQT · Superstar round stage (screen only). Needs /assets/superstar/beat.js (window.Beat). */
(function () {
  'use strict';
  var GAME = null, FAMS = null;
  var gameP = null;
  function loadGame() {
    if (!gameP) gameP = fetch('/assets/superstar/game.json').then(function (r) { return r.json(); }).then(function (g) { GAME = g; FAMS = Object.keys(g); });
    return gameP;
  }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function makeRows(level, bars, seed) {
    if (level === 'free') { var f = []; for (var i = 0; i < bars; i++) f.push({ w: null, show: false }); return f; }
    var r = rng(seed), used = {}, out = [];
    var depth = { beginner: 8, intermediate: 12, advanced: 16, expert: 22 }[level] || 10, group = level === 'expert' ? 4 : 2;
    var guard = 0;
    while (out.length < bars && guard++ < 2000) {
      var fam = FAMS[Math.floor(r() * FAMS.length)]; if (used[fam]) continue;
      var pool = GAME[fam].slice(0, depth), ws = [], tries = 0;
      while (ws.length < group && tries++ < 60) { var w = pool[Math.floor(r() * pool.length)]; if (ws.some(function (o) { return o === w || o.endsWith(w) || w.endsWith(o); })) continue; ws.push(w); }
      if (ws.length < group) continue;
      used[fam] = 1;
      ws.forEach(function (w, i) { out.push({ w: w, show: level === 'beginner' ? true : level === 'intermediate' ? i === 0 : level === 'advanced' ? i === 1 : i === 3 }); });
    }
    return out.slice(0, bars);
  }

  var cur = null;
  function stop() {
    if (!cur) return;
    cancelAnimationFrame(cur.raf); cur.dead = true;
    try { window.Beat && window.Beat.stop(); } catch (e) {}
    cur = null;
  }
  function mount(el, o) {
    stop();
    var me = cur = { raf: 0, dead: false, key: o.key };
    el.innerHTML = '<div class="sst"><div class="sst__top"><span class="sst__team"></span><span class="sst__bar" data-sst-bar>Get ready</span></div><div class="sst__prompt"><div class="sst__rows"></div><div class="sst__ball"></div></div><div class="sst__beat"><i></i><i></i><i></i><i></i></div></div>';
    el.querySelector('.sst__team').textContent = o.team || '';
    loadGame().then(function () {
      if (me.dead) return;
      var rows = [{ count: true }].concat(makeRows(o.level, o.bars, o.seed));
      var rowsEl = el.querySelector('.sst__rows'), prompt = el.querySelector('.sst__prompt'), ball = el.querySelector('.sst__ball'), barEl = el.querySelector('[data-sst-bar]'), beats = el.querySelectorAll('.sst__beat i');
      rows.forEach(function (r, i) {
        var d = document.createElement('div'); d.className = 'sst__row' + (r.count ? ' is-count' : ''); d.style.top = 'calc(var(--row) * ' + i + ')';
        var sq = r.count ? '<i class="sst__sq">1</i><i class="sst__sq">2</i><i class="sst__sq">3</i>' : '<i class="sst__sq"></i><i class="sst__sq"></i><i class="sst__sq"></i>';
        var word = r.count ? '<span class="sst__w">Go</span>' : !r.w ? '<span class="sst__w sst__w--free"></span>' : r.show ? '<span class="sst__w">' + esc(r.w) + '</span>' : '<span class="sst__w sst__w--hide">' + esc(r.w) + '</span>';
        d.innerHTML = sq + word; rowsEl.appendChild(d); r.el = d;
      });
      var B = window.Beat;
      if (!B) { barEl.textContent = 'Beat engine not loaded'; return; }
      B.start({ preset: o.preset, bpm: o.bpm, delay: 0.3, countIn: 1, steps: (o.bars + 1) * 16, mix: { drums: 1, keys: 1, bass: 1, vinyl: 1 }, onStop: function () { if (!me.dead) { barEl.textContent = 'Time’s up'; if (o.onEnd) o.onEnd(); } } });
      var lastBar = -1, lastBeat = -1;
      function geo() {
        var h = rows[0].el.offsetHeight, nowY = prompt.clientHeight * 0.42, pr = prompt.getBoundingClientRect();
        return { h: h, nowY: nowY, pr: pr };
      }
      var G = geo(); window.addEventListener('resize', function () { G = geo(); rows.forEach(function (r) { r.cols = null; r.wx = null; }); });
      function cols(r) { if (r.cols) return r.cols; r.cols = Array.prototype.map.call(r.el.querySelectorAll('.sst__sq'), function (q) { var b = q.getBoundingClientRect(); return b.left + b.width / 2 - G.pr.left; }); return r.cols; }
      function wx(r) { if (r.wx != null) return r.wx; var b = r.el.querySelector('.sst__w').getBoundingClientRect(); r.wx = b.left + b.width / 2 - G.pr.left; return r.wx; }
      function frame() {
        if (me.dead) return; me.raf = requestAnimationFrame(frame);
        var spb = B.secPerBeat, bt = Math.max(0, (B.now() - B.startTime) / spb), bar = Math.floor(bt / 4), inBar = bt - bar * 4, beat = Math.floor(inBar);
        var maxBar = rows.length - 1; if (bar > maxBar) { bar = maxBar; inBar = 3.99; beat = 3; }
        var e = inBar > 3.5 && bar < maxBar ? (function (x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; })((inBar - 3.5) / 0.5) : 0;
        rowsEl.style.transform = 'translateY(' + (G.nowY - G.h / 2 - (bar + e) * G.h) + 'px)';
        if (bar !== lastBar) {
          lastBar = bar;
          rows.forEach(function (r, i) { r.el.classList.toggle('is-now', i === bar); r.el.classList.toggle('is-past', i < bar); if (i < bar) { var hw = r.el.querySelector('.sst__w--hide'); if (hw) hw.classList.add('is-shown'); } });
          barEl.textContent = bar < 1 ? 'Get ready' : 'Bar ' + bar + ' / ' + o.bars;
        }
        if (beat !== lastBeat) {
          lastBeat = beat;
          Array.prototype.forEach.call(beats, function (x, i) { x.classList.toggle('is-on', i <= beat); x.classList.toggle('is-four', i === 3); });
          var rr = rows[bar];
          if (rr && beat < 3) { var s = rr.el.querySelectorAll('.sst__sq'); if (s[beat]) s[beat].classList.add('is-on'); }
          if (rr && beat === 3 && !rr.count) { rr.el.classList.add('is-hit'); var hw2 = rr.el.querySelector('.sst__w--hide'); if (hw2) hw2.classList.add('is-shown'); setTimeout(function () { rr.el.classList.remove('is-hit'); }, 260); }
        }
        var r = rows[bar]; if (!r) return;
        var c = cols(r), pts = [c[0], c[1], c[2], wx(r)], nx = rows[bar + 1], f = inBar - beat;
        var x0 = pts[beat], x1 = beat < 3 ? pts[beat + 1] : (nx ? cols(nx)[0] : pts[3]);
        var sqH = r.el.querySelector('.sst__sq').offsetHeight / 2, wH = r.el.querySelector('.sst__w').offsetHeight / 2, br = ball.offsetWidth / 2 + 1;
        var b0 = (beat === 3 ? wH : sqH) + br, b1 = (beat === 2 ? wH : sqH) + br;
        var y = G.nowY - (b0 + (b1 - b0) * f) - G.h * 0.36 * 4 * f * (1 - f);
        ball.style.transform = 'translate(' + (x0 + (x1 - x0) * f) + 'px,' + y + 'px)';
      }
      me.raf = requestAnimationFrame(frame);
    });
  }
  window.PQTStar = { mount: mount, stop: stop, get key() { return cur ? cur.key : null; }, preload: loadGame };
})();
