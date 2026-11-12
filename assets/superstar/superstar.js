/* Superstar — freestyle rap trainer · BLACC Universal */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var B = window.Beat;

  // ---------- storage ----------
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var S = Object.assign({ preset: 'late-night', bpm: {}, mix: { drums: 1, keys: 1, bass: 1, vinyl: 1 }, level: 'beginner', len: 16, rec: false, countin: true, ball: true, reveal: true }, load('ss_settings', {}));
  var ST = Object.assign({ sessions: 0, bars: 0, streak: 0, best: 0, lastDay: null, daily: null, secs: 0 }, load('ss_stats', {}));
  function persist() { save('ss_settings', S); }

  var LEVELS = [
    { id: 'free', name: 'Freestyle', scheme: '—', desc: 'No words. Just you, the beat and the bars.' },
    { id: 'beginner', name: 'Beginner', scheme: 'AABB', desc: 'Every rhyme shown, in pairs.' },
    { id: 'intermediate', name: 'Intermediate', scheme: 'AABB', desc: 'First word of each pair shown. You find the rhyme.' },
    { id: 'advanced', name: 'Advanced', scheme: 'AABB', desc: 'Second word shown. Rhyme your way into it.' },
    { id: 'expert', name: 'Expert', scheme: 'AAAA', desc: 'Four bars, one sound. Only the last word shown.' }
  ];
  var LENS = [8, 16, 32, 64, 0]; // 0 = endless

  // ---------- helpers ----------
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function daySeed() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function presetById(id) { return B.PRESETS.filter(function (p) { return p.id === id; })[0] || B.PRESETS[0]; }
  function bpmFor(id) { return S.bpm[id] || presetById(id).bpm; }
  function levelById(id) { return LEVELS.filter(function (l) { return l.id === id; })[0] || LEVELS[1]; }
  var toastT;
  function toast(msg, ms) { var t = $('[data-toast]'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, ms || 2600); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- data ----------
  var GAME = null, FAMS = null, DICT = null, W2K = null, SIG = null;
  var gameP = fetch('/assets/superstar/game.json').then(function (r) { return r.json(); }).then(function (g) { GAME = g; FAMS = Object.keys(g); });
  function loadDict() {
    if (DICT) return Promise.resolve();
    return fetch('/assets/superstar/dict.json').then(function (r) { return r.json(); }).then(function (d) {
      DICT = d; W2K = Object.create(null); SIG = Object.create(null);
      Object.keys(d).forEach(function (k) {
        d[k].forEach(function (w, i) { (W2K[w] = W2K[w] || []).push(k); });
        var s = vowelSig(k); (SIG[s] = SIG[s] || []).push(k);
      });
    });
  }
  var VOW = { AA: 1, AE: 1, AH: 1, AO: 1, AW: 1, AY: 1, EH: 1, ER: 1, EY: 1, IH: 1, IY: 1, OW: 1, OY: 1, UH: 1, UW: 1 };
  function vowelSig(k) { return k.split(' ').filter(function (p) { return VOW[p]; }).join(' '); }

  // ---------- word generation ----------
  function pickWords(fam, n, depth, r) {
    var pool = GAME[fam].slice(0, depth), out = [], tries = 0;
    while (out.length < n && tries++ < 60) {
      var w = pool[Math.floor(r() * pool.length)];
      if (out.some(function (o) { return o === w || o.endsWith(w) || w.endsWith(o); })) continue;
      out.push(w);
    }
    return out.length === n ? out : null;
  }
  function makeGen(level, seed) {
    var r = rng(seed), used = {}, buf = [];
    var depth = { beginner: 8, intermediate: 12, advanced: 16, expert: 22 }[level] || 10;
    var group = level === 'expert' ? 4 : 2;
    function nextGroup() {
      for (var t = 0; t < 200; t++) {
        var fam = FAMS[Math.floor(r() * FAMS.length)];
        if (used[fam]) continue;
        var ws = pickWords(fam, group, depth, r);
        if (!ws) continue;
        used[fam] = 1;
        ws.forEach(function (w, i) {
          var show = level === 'beginner' ? true : level === 'intermediate' ? i === 0 : level === 'advanced' ? i === 1 : i === 3;
          buf.push({ w: w, show: show, fam: fam });
        });
        return;
      }
      used = {}; nextGroup();
    }
    return function () {
      if (level === 'free') return { w: null, show: false };
      if (!buf.length) nextGroup();
      return buf.shift();
    };
  }

  // ---------- routing ----------
  var current = 'home';
  function show(name) {
    if (current === 'play' && name !== 'play' && session && session.running) { endSession(false); return; }
    if (current === 'setup' && name !== 'setup') stopPreview();
    $$('[data-scr]').forEach(function (s) { s.hidden = s.getAttribute('data-scr') !== name; });
    current = name;
    window.scrollTo(0, 0);
    if (name === 'home') paintHome();
    if (name === 'setup') paintSetup();
    if (name === 'word') nextRandomWord();
    if (name === 'dict') setTimeout(function () { $('[data-dq]').focus(); }, 60);
  }
  function go(name) {
    if (name !== current) { try { history.pushState(null, '', name === 'home' ? location.pathname : '#' + name); } catch (e) {} }
    show(name);
  }
  window.addEventListener('popstate', function () { var h = location.hash.slice(1) || 'home'; if (h === 'play' && !(session && session.running)) h = 'setup'; if (h === 'done' && !lastResult) h = 'home'; show(h); });

  // ---------- home ----------
  function streakLive() { if (!ST.lastDay) return false; var y = new Date(); y.setDate(y.getDate() - 1); return ST.lastDay === dayKey() || ST.lastDay === dayKey(y); }
  function paintHome() {
    var live = streakLive(), s = live ? ST.streak : 0;
    $('[data-st="streak"]').textContent = s;
    $('[data-st="sessions"]').textContent = ST.sessions;
    $('[data-st="bars"]').textContent = ST.bars.toLocaleString();
    $('[data-st="best"]').textContent = ST.best;
    var sk = $('[data-streak]'); sk.querySelector('b').textContent = s; sk.classList.toggle('is-live', live && s > 0);
    var d = new Date();
    $('[data-daily-date]').textContent = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    var dp = presetById(dailyPreset());
    var done = ST.daily === dayKey();
    $('[data-daily-title]').textContent = done ? 'Done for today' : '16 bars on ' + dp.name;
    $('[data-daily-sub]').textContent = done ? 'Come back tomorrow to keep your streak.' : 'Intermediate · same words for everyone today.';
    $('[data-daily]').classList.toggle('is-done', done);
    $('.daily__go').textContent = done ? 'Play again' : 'Play';
  }
  function dailyPreset() { var list = B.PRESETS.filter(function (p) { return p.id !== 'metronome'; }); return list[daySeed() % list.length].id; }

  // ---------- setup ----------
  var previewing = null;
  function paintSetup() {
    var bx = $('[data-beats]');
    bx.innerHTML = B.PRESETS.map(function (p) {
      return '<div class="beat' + (p.id === S.preset ? ' is-on' : '') + '" data-preset="' + p.id + '" role="button" tabindex="0" aria-pressed="' + (p.id === S.preset) + '"><b>' + esc(p.name) + '</b><span>' + esc(p.vibe) + ' · ' + bpmFor(p.id) + ' BPM</span>' +
        '<button class="beat__pv' + (previewing === p.id ? ' is-playing' : '') + '" data-pv="' + p.id + '" aria-label="Preview ' + esc(p.name) + '">' + (previewing === p.id ? stopIc : playIc) + '</button></div>';
    }).join('');
    $('[data-levels]').innerHTML = LEVELS.map(function (l) {
      return '<button class="lvl' + (l.id === S.level ? ' is-on' : '') + '" data-level="' + l.id + '" aria-pressed="' + (l.id === S.level) + '"><span class="lvl__r"></span><span class="lvl__t"><b>' + l.name + '</b><span>' + l.desc + '</span></span><span class="lvl__s">' + l.scheme + '</span></button>';
    }).join('');
    $('[data-lens]').innerHTML = LENS.map(function (n) { return '<button data-len="' + n + '" class="' + (n === S.len ? 'is-on' : '') + '">' + (n ? n + ' bars' : 'Endless') + '</button>'; }).join('');
    var bpm = bpmFor(S.preset); $('[data-bpm]').value = bpm; $('[data-bpm-out]').textContent = bpm + ' BPM';
    $$('[data-mixk]').forEach(function (b) { b.classList.toggle('is-on', !!S.mix[b.getAttribute('data-mixk')]); });
    var p = presetById(S.preset);
    $('[data-mix]').hidden = !!p.click;
    $$('[data-opt]').forEach(function (i) { i.checked = !!S[i.getAttribute('data-opt')]; });
  }
  var playIc = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';
  var stopIc = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="1"/></svg>';
  function stopPreview() { if (previewing) { B.stop(); previewing = null; $$('.beat__pv').forEach(function (b) { b.classList.remove('is-playing'); b.innerHTML = playIc; }); } }
  function togglePreview(id) {
    if (previewing === id) { stopPreview(); return; }
    stopPreview(); B.unlock(); previewing = id;
    B.start({ preset: id, bpm: bpmFor(id), mix: S.mix, steps: 16 * 4, onStop: function () { previewing = null; paintSetup(); } });
    paintSetup();
  }
  var taps = [];
  function tap() {
    var t = performance.now();
    if (taps.length && t - taps[taps.length - 1] > 2000) taps = [];
    taps.push(t); if (taps.length > 6) taps.shift();
    if (taps.length >= 3) {
      var iv = []; for (var i = 1; i < taps.length; i++) iv.push(taps[i] - taps[i - 1]);
      var avg = iv.reduce(function (a, b) { return a + b; }, 0) / iv.length;
      setBpm(Math.round(60000 / avg));
    } else toast('Keep tapping on the beat…', 1200);
  }
  function setBpm(v) {
    v = Math.max(55, Math.min(120, v));
    S.bpm[S.preset] = v; persist();
    $('[data-bpm]').value = v; $('[data-bpm-out]').textContent = v + ' BPM';
    var cur = $('.beat.is-on span'); if (cur) cur.textContent = presetById(S.preset).vibe + ' · ' + v + ' BPM';
    if (previewing) { var id = previewing; previewing = null; togglePreview(id); }
  }

  // ---------- play ----------
  var session = null, lastResult = null, raf = 0, wake = null;
  var rowsEl, promptEl, ballEl, countEl;
  function rowH() { return rowsEl.firstChild ? rowsEl.firstChild.offsetHeight : 80; }

  function startSession(opts) {
    gameP.then(function () {
      B.unlock(); stopPreview();
      var level = opts.level, preset = opts.preset, bpm = opts.bpm, len = opts.len;
      var gen = makeGen(level, opts.seed || (Math.random() * 1e9) | 0);
      var offset = opts.countin ? 1 : 0;
      session = { opts: opts, gen: gen, rows: [], offset: offset, len: len, level: level, preset: preset, bpm: bpm, running: false, hitBar: -1, lastBeat: -1, startedAt: 0, rec: null };
      rowsEl.innerHTML = '';
      if (offset) addRow({ count: true });
      var initial = len ? len : 16;
      for (var i = 0; i < initial; i++) addRow(gen());
      $('[data-p-lvl]').textContent = levelById(level).name;
      $('[data-p-bpm]').textContent = bpm + ' BPM';
      ballEl.hidden = !opts.ball;
      $('[data-p-rec]').hidden = true;
      $('[data-cam]').hidden = true;
      go('play');
      layout();
      var begin = function () {
        var steps = len ? (len + offset) * 16 : 0;
        B.start({ preset: preset, bpm: bpm, mix: S.mix, delay: 0.35, steps: steps || undefined, onStop: function () { endSession(true); } });
        session.running = true; session.startedAt = performance.now();
        if (session.rec) startRecorder();
        try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {}); } catch (e) {}
        cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
      };
      if (opts.rec) setupRecording().then(begin, function (err) { toast('Camera or mic not available. Playing without recording.', 3500); begin(); });
      else begin();
    });
  }
  function addRow(r) {
    var i = session.rows.length; session.rows.push(r);
    var el = document.createElement('div');
    el.className = 'row' + (r.count ? ' row--count' : '');
    el.style.top = 'calc(var(--row) * ' + i + ')';
    var n = r.count ? '' : (i - session.offset + 1);
    var word;
    if (r.count) word = '<span class="row__w">Go</span>';
    else if (!r.w) word = '<span class="row__w row__w--free"></span>';
    else if (r.show) word = '<span class="row__w">' + esc(r.w) + '</span>';
    else word = '<span class="row__w row__w--hide">' + esc(r.w) + '</span>';
    el.innerHTML = '<span class="row__n">' + n + '</span><i class="row__d"></i><i class="row__d"></i><i class="row__d"></i>' + word;
    rowsEl.appendChild(el); r.el = el;
  }
  var geo = { nowY: 0, h: 80, cols: [0, 0, 0] };
  function layout() {
    if (!session) return;
    geo.h = rowH();
    geo.nowY = promptEl.clientHeight * 0.38;
    var first = session.rows[0].el, pr = promptEl.getBoundingClientRect();
    var ds = first.querySelectorAll('.row__d');
    geo.cols = Array.prototype.map.call(ds, function (d) { var b = d.getBoundingClientRect(); return b.left + b.width / 2 - pr.left; });
    session.rows.forEach(function (r) { r.wx = null; });
  }
  function wordX(r) {
    if (r.wx != null) return r.wx;
    var w = r.el.querySelector('.row__w'), pr = promptEl.getBoundingClientRect(), b = w.getBoundingClientRect();
    var x = b.width > 4 ? b.left + Math.min(b.width / 2, 60) - pr.left : b.left + 30 - pr.left;
    r.wx = x; return x;
  }
  function wordTopOff(r) { var w = r.el.querySelector('.row__w'); return (w.offsetHeight || 40) * 0.5 + 10; }
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!session || !session.running) return;
    var spb = B.secPerBeat, t = B.now() - B.startTime, beats = t / spb;
    if (beats < 0) beats = 0;
    var bar = Math.floor(beats / 4), inBar = beats - bar * 4, beat = Math.floor(inBar);
    // endless: keep rows ahead
    if (!session.len) while (session.rows.length < bar + 12) addRow(session.gen());
    var maxBar = session.rows.length - 1;
    var scrollF = inBar > 3.5 && bar < maxBar ? ease((inBar - 3.5) / 0.5) : 0;
    var off = bar + scrollF;
    rowsEl.style.transform = 'translateY(' + (geo.nowY - geo.h / 2 - off * geo.h) + 'px)';
    if (bar !== session.curBar) {
      session.curBar = bar;
      session.rows.forEach(function (r, i) {
        if (!r.el) return;
        r.el.classList.toggle('is-now', i === bar);
        r.el.classList.toggle('is-past', i < bar);
        if (i < bar && S.reveal) { var h = r.el.querySelector('.row__w--hide'); if (h) h.classList.add('is-shown'); }
      });
      // recycle old rows in endless
      if (!session.len) session.rows.forEach(function (r, i) { if (r.el && i < bar - 8) { r.el.remove(); r.el = null; } });
      var wb = bar - session.offset + 1;
      var total = session.len;
      $('[data-p-bar]').textContent = bar < session.offset ? 'Get ready' : 'Bar ' + Math.min(wb, total || wb) + (total ? ' / ' + total : '');
    }
    // count-in overlay
    if (bar < session.offset) {
      var c = String(4 - beat);
      if (countEl.textContent !== c) { countEl.hidden = false; countEl.textContent = c; countEl.classList.remove('is-pop'); void countEl.offsetWidth; countEl.classList.add('is-pop'); }
    } else if (!countEl.hidden) countEl.hidden = true;
    // beat bar
    if (beat !== session.lastBeat) {
      session.lastBeat = beat;
      $$('.beatbar i').forEach(function (el, i) { el.classList.toggle('is-on', i <= beat); el.classList.toggle('is-four', i === 3); });
      if (beat === 3 && session.rows[bar] && session.rows[bar].el && !session.rows[bar].count) {
        var el = session.rows[bar].el; el.classList.add('is-hit'); setTimeout(function () { el.classList.remove('is-hit'); }, 260);
      }
    }
    // ball
    if (session.opts.ball && session.rows[bar] && session.rows[bar].el) {
      var f = inBar - beat, r = session.rows[bar];
      var pts = [geo.cols[0], geo.cols[1], geo.cols[2], wordX(r)];
      var nxt = session.rows[bar + 1];
      var x0 = pts[beat], x1 = beat < 3 ? pts[beat + 1] : (nxt && nxt.el ? geo.cols[0] : pts[3]);
      var b0 = beat === 3 ? wordTopOff(r) : 14, b1 = beat === 2 ? wordTopOff(r) : 14;
      var x = x0 + (x1 - x0) * f, base = b0 + (b1 - b0) * f;
      var amp = Math.min(geo.h * 0.75, 90);
      var y = geo.nowY - base - amp * 4 * f * (1 - f);
      ballEl.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }
    if (session.recDraw) session.recDraw(bar, inBar);
  }
  function endSession(complete) {
    if (!session || !session.running) return;
    session.running = false;
    cancelAnimationFrame(raf);
    var spb = B.secPerBeat, beats = Math.max(0, (B.now() - B.startTime) / spb);
    B.stop();
    try { if (wake) wake.release(); } catch (e) {} wake = null;
    countEl.hidden = true;
    var bars = complete ? session.len : Math.max(0, Math.floor(beats / 4) - session.offset);
    if (!session.len && complete === false) bars = Math.max(0, Math.floor(beats / 4) - session.offset);
    var secs = Math.round((performance.now() - session.startedAt) / 1000);
    var words = session.rows.slice(session.offset, session.offset + bars).filter(function (r) { return r.w; }).map(function (r) { return r.w; });
    lastResult = { complete: complete, bars: bars, secs: secs, words: words, s: session };
    if (bars >= 8 || complete) recordStats(bars, secs, session.opts.daily && complete);
    var rec = session.rec;
    if (rec) stopRecorder();
    paintDone();
    go('done');
  }
  function recordStats(bars, secs, daily) {
    var today = dayKey(), y = new Date(); y.setDate(y.getDate() - 1);
    ST.sessions++; ST.bars += bars; ST.secs += secs;
    if (ST.lastDay !== today) { ST.streak = ST.lastDay === dayKey(y) ? ST.streak + 1 : 1; ST.lastDay = today; }
    ST.best = Math.max(ST.best, ST.streak);
    if (daily) ST.daily = today;
    save('ss_stats', ST);
  }
  function paintDone() {
    var r = lastResult, s = r.s, p = presetById(s.preset);
    var lines = ['Nice run.', 'Bars on bars.', 'That was smooth.', 'Superstar behaviour.', 'Clean landing.'];
    $('[data-d-title]').textContent = r.complete ? lines[Math.floor(Math.random() * lines.length)] : (r.bars ? 'Session stopped.' : 'Stopped early.');
    $('[data-d-sub]').textContent = (s.len ? s.len + ' bars' : 'Endless') + ' · ' + p.name + ' · ' + s.bpm + ' BPM · ' + levelById(s.level).name + (s.opts.daily ? ' · Daily set' : '');
    var m = Math.floor(r.secs / 60), sec = r.secs % 60;
    $('[data-d-stats]').innerHTML = [['Bars', r.bars], ['Rhymes', r.words.length], ['Time', m + ':' + String(sec).padStart(2, '0')], ['Day streak', streakLive() ? ST.streak : 0]]
      .map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('');
    $('[data-d-words]').innerHTML = r.words.length ? r.words.map(function (w) { return '<span>' + esc(w) + '</span>'; }).join('') : '';
    $('[data-vid]').hidden = true;
  }

  // ---------- recording ----------
  var cam = null, recorder = null, chunks = [], micNode = null, canvas = null, cctx = null, recBlob = null, recMime = '';
  function setupRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) return Promise.reject(new Error('unsupported'));
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      .then(function (stream) {
        cam = stream;
        var v = $('[data-cam]'); v.srcObject = stream; v.hidden = false; var p = v.play(); if (p && p.catch) p.catch(function () {});
        var portrait = window.innerHeight > window.innerWidth;
        canvas = document.createElement('canvas'); canvas.width = portrait ? 720 : 1280; canvas.height = portrait ? 1280 : 720;
        cctx = canvas.getContext('2d');
        session.rec = true;
        session.recDraw = drawRec;
      });
  }
  function pickMime() {
    var c = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (var i = 0; i < c.length; i++) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c[i])) return c[i];
    return '';
  }
  function startRecorder() {
    try {
      var ac = B.ctx, dest = B.recordStream();
      micNode = ac.createMediaStreamSource(cam); micNode.connect(dest);
      var vt = canvas.captureStream ? canvas.captureStream(30).getVideoTracks() : cam.getVideoTracks();
      var ms = new MediaStream(vt.concat(dest.stream.getAudioTracks()));
      recMime = pickMime(); chunks = [];
      recorder = new MediaRecorder(ms, recMime ? { mimeType: recMime, videoBitsPerSecond: 4e6 } : undefined);
      recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = finishRecording;
      recorder.start(1000);
      $('[data-p-rec]').hidden = false;
    } catch (e) { toast('Recording could not start on this device.'); session.rec = null; session.recDraw = null; }
  }
  function stopRecorder() {
    try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch (e) {}
    try { if (micNode) micNode.disconnect(); } catch (e) {}
    if (cam) cam.getTracks().forEach(function (t) { t.stop(); });
    $('[data-cam]').hidden = true; $('[data-cam]').srcObject = null;
  }
  function finishRecording() {
    recBlob = new Blob(chunks, { type: (recorder && recorder.mimeType) || recMime || 'video/webm' });
    cam = null; recorder = null;
    var v = $('[data-vid-el]'); if (v.src) URL.revokeObjectURL(v.src);
    v.src = URL.createObjectURL(recBlob);
    $('[data-vid]').hidden = false;
    $('[data-vid-note]').textContent = 'Stays on your device. Nothing is uploaded.';
  }
  function saveVideo() {
    if (!recBlob) return;
    var ext = /mp4/.test(recBlob.type) ? 'mp4' : 'webm';
    var name = 'superstar-' + dayKey() + '-' + Date.now().toString(36) + '.' + ext;
    var file; try { file = new File([recBlob], name, { type: recBlob.type }); } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Superstar freestyle' }).catch(function () {});
      return;
    }
    var a = document.createElement('a'); a.href = URL.createObjectURL(recBlob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function drawRec(bar, inBar) {
    var W = canvas.width, H = canvas.height, c = cctx, v = $('[data-cam]');
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    if (v.videoWidth) {
      var s = Math.max(W / v.videoWidth, H / v.videoHeight), vw = v.videoWidth * s, vh = v.videoHeight * s;
      c.save(); c.translate(W, 0); c.scale(-1, 1); c.drawImage(v, (W - vw) / 2, (H - vh) / 2, vw, vh); c.restore();
    }
    var g = c.createLinearGradient(0, H * 0.45, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.85)');
    c.fillStyle = g; c.fillRect(0, H * 0.45, W, H * 0.55);
    var unit = Math.min(W, H) / 720;
    var r = session.rows[bar], n = session.rows[bar + 1];
    var beat = Math.floor(inBar);
    c.textBaseline = 'alphabetic';
    // beat ticks
    var tw = 60 * unit, gap = 10 * unit, tx = (W - (tw * 4 + gap * 3)) / 2, ty = H - 70 * unit;
    for (var i = 0; i < 4; i++) { c.fillStyle = i <= beat ? (i === 3 ? '#ffd23f' : '#fff') : 'rgba(255,255,255,.25)'; c.fillRect(tx + i * (tw + gap), ty, tw, 5 * unit); }
    c.textAlign = 'center';
    if (bar < session.offset) {
      c.fillStyle = '#fff'; c.font = '300 ' + (180 * unit) + 'px "Open Sans",sans-serif'; c.fillText(String(4 - beat), W / 2, H * 0.62);
    } else if (r) {
      var shown = r.w && r.show;
      c.font = '700 ' + (84 * unit) + 'px "Open Sans",sans-serif';
      c.fillStyle = beat === 3 ? '#ffd23f' : '#fff';
      c.fillText(r.w ? (shown ? r.w : '_____') : '', W / 2, H - 130 * unit);
      if (n && n.w) { c.font = '600 ' + (34 * unit) + 'px "Open Sans",sans-serif'; c.fillStyle = 'rgba(255,255,255,.55)'; c.fillText(n.show ? n.w : '_____', W / 2, H - 215 * unit); }
    }
    c.textAlign = 'left'; c.font = '600 ' + (22 * unit) + 'px "Open Sans",sans-serif'; c.fillStyle = 'rgba(255,255,255,.85)';
    c.fillText('★ SUPERSTAR', 28 * unit, 50 * unit);
    c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,.6)';
    c.fillText(presetById(session.preset).name + ' · ' + session.bpm + ' BPM', W - 28 * unit, 50 * unit);
  }

  // ---------- dictionary ----------
  function dictSearch(q) {
    q = String(q || '').trim().toLowerCase().replace(/[^a-z']/g, '');
    var out = $('[data-dres]');
    if (!q) return;
    $('[data-dq]').value = q;
    out.innerHTML = '<p class="muted">Loading rhymes…</p>';
    loadDict().then(function () {
      var keys = W2K[q];
      if (!keys) { out.innerHTML = '<p class="muted">No rhymes found for <b>' + esc(q) + '</b>. Check the spelling or try a similar word.</p>'; return; }
      var perfect = [], seen = Object.create(null); seen[q] = 1;
      keys.forEach(function (k) { DICT[k].forEach(function (w, i) { if (!seen[w]) { seen[w] = 1; perfect.push([w, i]); } }); });
      var near = [], nk = [];
      keys.forEach(function (k) { (SIG[vowelSig(k)] || []).forEach(function (k2) { if (keys.indexOf(k2) < 0 && nk.indexOf(k2) < 0) nk.push(k2); }); });
      nk.sort(function (a, b) { return DICT[b].length - DICT[a].length; });
      for (var round = 0; round < 12 && near.length < 120; round++) nk.forEach(function (k) { var w = DICT[k][round]; if (w && !seen[w]) { seen[w] = 1; near.push([w, round]); } });
      out.innerHTML = '<div class="dres"><div class="dhead"><b>' + esc(q) + '</b></div>' +
        group('Perfect rhymes', perfect, 60) + group('Near rhymes', near, 40) + '</div>';
    }).catch(function () { out.innerHTML = '<p class="muted">Couldn\'t load the dictionary. Check your connection and try again.</p>'; });
  }
  function group(title, list, cap) {
    if (!list.length) return '<section class="dgroup"><h3 class="eyebrow">' + title + '</h3><p class="muted">None found.</p></section>';
    var head = '<h3 class="eyebrow">' + title + ' <small>' + list.length + '</small></h3>';
    var btns = function (arr) { return arr.map(function (x) { return '<button data-w="' + esc(x[0]) + '" class="' + (x[1] < 12 ? 'is-common' : 'is-rare') + '">' + esc(x[0]) + '</button>'; }).join(''); };
    var more = list.length > cap ? '<button class="more" data-more>Show all ' + list.length + '</button><div class="wlist" hidden>' + btns(list.slice(cap)) + '</div>' : '';
    return '<section class="dgroup">' + head + '<div class="wlist">' + btns(list.slice(0, cap)) + '</div>' + more + '</section>';
  }

  // ---------- random word ----------
  var rwWord = '';
  function nextRandomWord() {
    gameP.then(function () {
      var fam = FAMS[Math.floor(Math.random() * FAMS.length)], list = GAME[fam];
      var top = list.slice(0, 10), w = top[Math.floor(Math.random() * top.length)];
      rwWord = w;
      $('[data-rw]').textContent = w;
      $('[data-rwl]').innerHTML = list.filter(function (x) { return x !== w; }).slice(0, 14).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('');
    });
  }

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button,[data-preset],[data-close]');
    if (!t) return;
    if (t.hasAttribute('data-go')) { go(t.getAttribute('data-go')); return; }
    if (t.hasAttribute('data-open')) { var sh = $('[data-sheet="' + t.getAttribute('data-open') + '"]'); sh.hidden = false; return; }
    if (t.hasAttribute('data-close')) { t.closest('[data-sheet]').hidden = true; return; }
    if (t.hasAttribute('data-pv')) { e.stopPropagation(); togglePreview(t.getAttribute('data-pv')); return; }
    if (t.hasAttribute('data-preset')) { S.preset = t.getAttribute('data-preset'); persist(); if (previewing && previewing !== S.preset) togglePreview(S.preset); paintSetup(); return; }
    if (t.hasAttribute('data-level')) { S.level = t.getAttribute('data-level'); persist(); paintSetup(); return; }
    if (t.hasAttribute('data-len')) { S.len = +t.getAttribute('data-len'); persist(); paintSetup(); return; }
    if (t.hasAttribute('data-mixk')) { var k = t.getAttribute('data-mixk'); S.mix[k] = S.mix[k] ? 0 : 1; persist(); B.setMix(S.mix); t.classList.toggle('is-on', !!S.mix[k]); return; }
    if (t.hasAttribute('data-tap')) { tap(); return; }
    if (t.hasAttribute('data-bpm-reset')) { delete S.bpm[S.preset]; persist(); setBpm(presetById(S.preset).bpm); delete S.bpm[S.preset]; persist(); return; }
    if (t.hasAttribute('data-start')) { startSession({ preset: S.preset, bpm: bpmFor(S.preset), level: S.level, len: S.len, rec: S.rec, countin: S.countin, ball: S.ball }); return; }
    if (t.hasAttribute('data-daily')) { startSession({ preset: dailyPreset(), bpm: presetById(dailyPreset()).bpm, level: 'intermediate', len: 16, rec: false, countin: S.countin, ball: S.ball, seed: daySeed(), daily: true }); return; }
    if (t.hasAttribute('data-stop')) { endSession(false); return; }
    if (t.hasAttribute('data-again')) { var o = lastResult.s.opts; startSession(Object.assign({}, o, { seed: o.daily ? o.seed : null })); return; }
    if (t.hasAttribute('data-vid-save')) { saveVideo(); return; }
    if (t.hasAttribute('data-w')) { dictSearch(t.getAttribute('data-w')); window.scrollTo(0, 0); return; }
    if (t.hasAttribute('data-more')) { t.nextElementSibling.hidden = false; t.remove(); return; }
    if (t.hasAttribute('data-rw-next')) { nextRandomWord(); return; }
    if (t.hasAttribute('data-rw-dict')) { go('dict'); dictSearch(rwWord); return; }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var sh = $('[data-sheet]:not([hidden])'); if (sh) sh.hidden = true; else if (current === 'play') endSession(false); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-preset]')) { e.preventDefault(); e.target.click(); }
  });
  $('[data-bpm]').addEventListener('input', function (e) { setBpm(+e.target.value); });
  $$('[data-opt]').forEach(function (i) { i.addEventListener('change', function () { S[i.getAttribute('data-opt')] = i.checked; persist(); }); });
  $('[data-dsearch]').addEventListener('submit', function (e) { e.preventDefault(); dictSearch($('[data-dq]').value); $('[data-dq]').blur(); });
  window.addEventListener('resize', function () { if (session && session.running) layout(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && session && session.running) endSession(false); });

  rowsEl = $('[data-rows]'); promptEl = $('[data-prompt]'); ballEl = $('[data-ball]'); countEl = $('[data-count]');
  var h = location.hash.slice(1); show(['setup', 'dict', 'word'].indexOf(h) >= 0 ? h : 'home');
  if (h && ['setup', 'dict', 'word'].indexOf(h) < 0) history.replaceState(null, '', location.pathname);

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/superstar/sw.js', { scope: '/superstar/' }).catch(function () {});
})();
