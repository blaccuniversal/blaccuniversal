/* Bemaamoo · BLACC Universal — app */
(function () {
  'use strict';
  var B = window.BMO;
  var WORDS_V = 1;
  var KEY_GAME = 'bmo_game_v1', KEY_SETUP = 'bmo_setup_v1';
  var COLORS = ['#ffffff', '#3ddc97', '#c792ff', '#ff7ab6', '#5ee0e0', '#ffb347', '#a3e635', '#8fa2ff'];
  var TIMERS = [[0, 'Off'], [60, '1m'], [120, '2m'], [180, '3m'], [300, '5m'], [600, '10m']];
  var LIMITS = [[0, 'Off'], [10, '10'], [20, '20'], [30, '30'], [50, '50']];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function pl(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
  function groupOf(k) { for (var i = 0; i < B.CATS.length; i++) for (var j = 0; j < B.CATS[i].c.length; j++) if (B.CATS[i].c[j][0] === k) return B.CATS[i].g; return ''; }

  /* ---------- viewport (keeps the input above phone keyboards) ---------- */
  function fitVh() {
    var vv = window.visualViewport;
    if (vv) document.documentElement.style.setProperty('--appH', vv.height + 'px');
  }
  if (window.visualViewport) { visualViewport.addEventListener('resize', function () { fitVh(); if (cur === 'game') { window.scrollTo(0, 0); sizeBoard(); } }); }

  /* ---------- word lists ---------- */
  var LISTS = {};
  function getList(cat) {
    if (LISTS[cat]) return LISTS[cat];
    function fetchSet(file) {
      return fetch('/assets/bemaamoo/words/' + file + '?v=' + WORDS_V).then(function (r) { if (!r.ok) throw 0; return r.text(); })
        .then(function (t) { return new Set(t.split('\n')); });
    }
    var p = fetchSet(B.listFile(cat)).then(function (full) {
      if (!B.hasMavList(cat)) return { full: full, mav: full };
      return fetchSet(B.listFile(cat, true)).then(function (mav) { return { full: full, mav: mav }; }, function () { return { full: full, mav: full }; });
    });
    LISTS[cat] = p;
    p.catch(function () { delete LISTS[cat]; });
    return p;
  }

  /* ---------- screens ---------- */
  var cur = 'home';
  function show(name) {
    cur = name;
    $$('[data-scr]').forEach(function (s) { s.hidden = s.getAttribute('data-scr') !== name; });
    document.body.classList.toggle('in-game', name === 'game');
    window.scrollTo(0, 0);
    if (name === 'home') paintHome();
    if (name === 'setup') paintSetup();
    if (name === 'game') { fitVh(); paintGame(); }
  }
  function openSheet(n) { $('[data-sheet="' + n + '"]').hidden = false; }
  function closeSheets() { $$('[data-sheet]').forEach(function (s) { s.hidden = true; }); }
  function ov(n, on) { $('[data-ov="' + n + '"]').hidden = !on; }
  var toastT;
  function toast(t) { var el = $('[data-toast]'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, 1800); }

  /* ---------- home ---------- */
  function paintHome() {
    var m = $('[data-mark]');
    if (!m.firstChild) {
      var rows = ['SARAH', 'ADELE', 'NAOMI'], h = '';
      rows.forEach(function (w) { for (var i = 0; i < 5; i++) h += '<i class="' + (i === 1 ? 'is-m' : '') + '">' + w[i] + '</i>'; });
      m.innerHTML = h;
    }
    var g = load(KEY_GAME), has = g && g.v === 1 && !g.over;
    $('[data-continue]').hidden = !has;
    var nb = $('[data-newbtn]');
    nb.classList.toggle('btn--ghost', !!has);
    var note = $('[data-contnote]');
    if (has) {
      var R = g.rounds[g.rounds.length - 1];
      note.textContent = 'Saved game: ' + B.catName(R.cat) + ', round ' + R.n + ', ' + pl(R.entries.length, 'word') + ' on the board';
      note.hidden = false;
    } else note.hidden = true;
  }

  /* ---------- setup ---------- */
  var S = load(KEY_SETUP) || {};
  S = { count: S.count || 1, names: S.names || [], cat: S.cat || 'names_all', timer: S.timer != null ? S.timer : 0, limit: S.limit != null ? S.limit : 0 };
  function saveSetup() { store(KEY_SETUP, S); }
  function paintSetup() {
    var pc = $('[data-pcount]'), h = '';
    for (var i = 1; i <= 8; i++) h += '<button type="button" data-pc="' + i + '" aria-pressed="' + (S.count === i) + '">' + i + '</button>';
    pc.innerHTML = h;
    var pn = $('[data-pnames]'); h = '';
    for (var j = 0; j < S.count; j++) {
      h += '<label class="pname"><i style="background:' + COLORS[j] + '"></i><input data-pn="' + j + '" maxlength="18" placeholder="' + (S.count === 1 ? 'Your name' : 'Player ' + (j + 1)) + '" value="' + esc(S.names[j] || '') + '" autocomplete="off" autocapitalize="words"></label>';
    }
    pn.innerHTML = h;
    $('[data-catname]').textContent = B.catName(S.cat);
    $('[data-catgroup]').textContent = groupOf(S.cat);
    seg('[data-opt="timer"]', TIMERS, S.timer, 'timer');
    seg('[data-opt="limit"]', LIMITS, S.limit, 'limit');
  }
  function seg(sel, opts, val, key) {
    $(sel).innerHTML = opts.map(function (o) { return '<button type="button" data-set="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (val === o[0]) + '">' + o[1] + '</button>'; }).join('');
  }

  /* ---------- categories sheet ---------- */
  var catMode = 'setup';
  function paintCats(q) {
    q = (q || '').trim().toLowerCase();
    var sel = catMode === 'setup' ? S.cat : (G && B.round(G).cat);
    var h = '';
    B.CATS.forEach(function (g) {
      var items = g.c.filter(function (c) { return !q || c[1].toLowerCase().indexOf(q) >= 0 || g.g.toLowerCase().indexOf(q) >= 0; });
      if (!items.length) return;
      h += '<h3>' + esc(g.g) + '</h3><div class="cats__g">' + items.map(function (c) { return '<button type="button" data-cat="' + c[0] + '" aria-pressed="' + (c[0] === sel) + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>';
    });
    $('[data-cats]').innerHTML = h || '<p class="cats__none">No category matches that.</p>';
  }
  function openCats(mode) {
    catMode = mode; $('[data-catq]').value = ''; paintCats(''); openSheet('cats');
    $('[data-cats]').scrollTop = 0;
    var on = $('[data-cats] [aria-pressed=true]'); if (on) on.scrollIntoView({ block: 'center' });
  }

  /* ---------- game ---------- */
  var G = null, running = false, tick = null, lastAdded = -1, feedOn = false;
  function save() { store(KEY_GAME, G); }
  function R() { return B.round(G); }
  function color(i) { return COLORS[i % COLORS.length]; }
  function pname(i) { return G.players[i] ? G.players[i].name : ''; }
  function solo() { return G.players.length === 1; }

  function startGame() {
    var players = [];
    for (var i = 0; i < S.count; i++) {
      var n = (S.names[i] || '').trim();
      players.push({ name: n || (S.count === 1 ? 'You' : 'Player ' + (i + 1)) });
    }
    G = B.create({ players: players, category: S.cat, timer: S.timer, limit: S.limit });
    save();
    getList(S.cat);
    show('game');
    readyScreen();
  }

  function readyScreen() {
    running = false; stopClock();
    var r = R();
    $('[data-rdround]').textContent = 'Round ' + r.n;
    $('[data-rdcat]').textContent = B.catName(r.cat);
    var tx;
    if (r.started) tx = 'Paused. ' + (solo() ? 'Ready when you are.' : pname(G.turn) + ' is up next.');
    else tx = solo() ? (G.settings.timer ? 'You have ' + fmt(G.settings.timer) + '. Go for long words.' : 'Take your time. Go for long words.') : pname(G.turn) + ' starts. Pass the phone after each word.';
    $('[data-rdtx]').textContent = tx;
    $('[data-ov="ready"] [data-act="go"]').textContent = r.started ? 'Resume' : 'Start round';
    ov('ready', true);
  }

  function go() {
    ov('ready', false);
    running = true;
    startClock();
    paintGame();
    focusIn();
  }
  function focusIn() { var i = $('[data-in]'); if (i && !R().done) { try { i.focus({ preventScroll: true }); } catch (e) { i.focus(); } } }

  /* clock */
  function startClock() {
    stopClock();
    if (!G.settings.timer) return;
    var last = Date.now();
    tick = setInterval(function () {
      var now = Date.now(), r = R();
      if (!running || r.done) { last = now; return; }
      r.left = Math.max(0, r.left - (now - last) / 1000); last = now;
      paintClock();
      if (r.left <= 0) { B.endRound(G); save(); roundOver(); }
      else if (Math.floor(r.left) % 5 === 0) save();
    }, 250);
  }
  function stopClock() { if (tick) clearInterval(tick); tick = null; }
  function paintClock() {
    var c = $('[data-clock]');
    if (!G.settings.timer) { c.hidden = true; return; }
    c.hidden = false;
    var left = R().left;
    $('[data-clocktx]').textContent = fmt(left);
    c.classList.toggle('is-low', left <= 15 && !R().done);
    c.classList.toggle('is-paused', !running);
    c.querySelector('use').setAttribute('href', running ? '#i-pause' : '#i-play');
    c.setAttribute('aria-label', running ? 'Pause timer' : 'Resume timer');
  }

  function paintGame() {
    if (!G) return;
    var r = R();
    $('[data-gcat]').textContent = B.catName(r.cat);
    var sub = 'Round ' + r.n + ' · ' + pl(r.entries.length, 'word');
    if (G.settings.limit) sub = 'Round ' + r.n + ' · ' + r.entries.length + ' of ' + G.settings.limit + ' words';
    $('[data-gsub]').textContent = sub;
    paintClock();
    paintStrip();
    paintBoard();
    paintDock();
    paintSide();
  }

  function paintStrip() {
    var el = $('[data-pstrip]'), h = '';
    var t = B.tally(G);
    el.classList.toggle('pstrip--solo', solo());
    if (solo()) {
      var s = t[0];
      h = '<div class="pchip is-on"><span>Score</span><b>' + s.total + '</b></div>' +
        '<div class="pchip pchip--part"><span class="c-mav">Maverick</span><b>' + s.mav + '</b></div>' +
        '<div class="pchip pchip--part"><span class="c-con">Concord</span><b>' + s.con + '</b></div>' +
        '<div class="pchip pchip--part"><span class="c-key">Keystone</span><b>' + s.key + '</b></div>';
    } else {
      t.forEach(function (s, i) {
        h += '<div class="pchip' + (i === G.turn ? ' is-on' : '') + '"><i style="background:' + color(i) + '"></i><span>' + esc(s.name) + '</span><b>' + s.total + '</b></div>';
      });
    }
    el.innerHTML = h;
    var on = el.querySelector('.is-on');
    if (on && !solo()) { var l = on.offsetLeft - el.clientWidth / 2 + on.clientWidth / 2; el.scrollTo({ left: l, behavior: 'smooth' }); }
  }

  function sizeBoard() {
    var b = $('[data-board]'); if (!b || !G) return;
    var r = R();
    var longest = 6;
    r.entries.forEach(function (e) { if (e.w.length > longest) longest = e.w.length; });
    var cs = getComputedStyle(b);
    var avail = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 30 - 64;
    var gap = window.innerWidth < 420 ? 3 : 4;
    var c = Math.floor((avail - gap * longest) / longest);
    c = Math.max(22, Math.min(window.innerWidth >= 1000 ? 46 : 42, c));
    b.style.setProperty('--c', c + 'px');
    b.style.setProperty('--gap', gap + 'px');
  }

  function paintBoard() {
    var b = $('[data-board]'), r = R();
    sizeBoard();
    if (!r.entries.length) {
      b.innerHTML = '<div class="board__empty"><b>' + esc(B.catName(r.cat)) + '</b><span>' + (solo() ? 'Add your first word.' : esc(pname(G.turn)) + ' goes first.') + '<br>Long words score more.</span></div>';
      return;
    }
    // cells that belong to Mavericks
    var mav = {}, fresh = {};
    r.entries.forEach(function (e, i) {
      e.mavs.forEach(function (m) {
        for (var k = m.from; k <= m.to; k++) { mav[k + ':' + m.col] = 1; if (i === lastAdded) fresh[k + ':' + m.col] = 1; }
      });
    });
    var cons = B.concords(r), conAt = {};
    cons.forEach(function (c) { for (var k = c.from; k <= c.to; k++) conAt[k] = (k === c.from ? ' is-con-s' : '') + (k === c.to ? ' is-con-e' : ''); });
    var h = '<div class="rows">';
    r.entries.forEach(function (e, i) {
      var cls = 'row' + (conAt[i] != null ? ' is-con' + conAt[i] : '') + (i === r.entries.length - 1 ? ' is-last' : '');
      h += '<div class="' + cls + '" data-row="' + i + '"><span class="row__n">' + (solo() ? '' : '<i style="background:' + color(e.p) + '"></i>') + (i + 1) + '</span>';
      for (var c = 0; c < e.w.length; c++) {
        var k = i + ':' + (c + 1);
        var cc = 'cell' + (mav[k] ? ' is-mav' : '') + (i === lastAdded ? ' is-new' : '') + (fresh[k] && i !== lastAdded ? ' is-glow' : '');
        h += '<span class="' + cc + '" style="--i:' + c + '">' + e.w[c] + '</span>';
      }
      var tags = '';
      if (e.mavs.length) tags += '<span class="tag tag--mav" title="Maverick">M</span>';
      if (e.con) tags += '<span class="tag tag--con" title="Concord">C</span>';
      if (e.key) tags += '<span class="tag tag--key" title="Keystone">K</span>';
      if (e.forced) tags += '<span class="tag tag--f" title="Counted by the table">table</span>';
      h += '<span class="row__pts">+' + e.total + tags + '</span></div>';
    });
    h += '</div>';
    b.innerHTML = h;
    requestAnimationFrame(function () { b.scrollTop = b.scrollHeight; });
  }

  function paintDock() {
    var r = R(), d = $('.dock');
    d.classList.toggle('is-done', r.done);
    $('[data-turndot]').style.background = color(G.turn);
    $('[data-turndot]').hidden = solo();
    $('[data-turn]').textContent = r.done ? 'Round over' : (solo() ? 'Your word' : pname(G.turn) + '’s turn');
    var lv = B.live(r), el = $('[data-live]');
    if (lv.streak >= 2 && lv.len >= B.RULES.CON_MIN_LEN) {
      var need = B.RULES.CON_STREAK - lv.streak;
      el.textContent = need > 0 ? lv.streak + ' × ' + lv.len + ' letters · ' + need + ' more for Concord' : 'Concord × ' + lv.streak + ' · keep it at ' + lv.len + ' letters';
      el.classList.toggle('is-hot', need <= 1);
    } else { el.textContent = ''; el.classList.remove('is-hot'); }
    $('[data-act="skip"]').hidden = solo();
    $('[data-act="undo"]').disabled = !r.entries.length || r.done;
    $('[data-in]').placeholder = 'Type ' + (/^names/.test(r.cat) ? 'a name' : 'a word') + ' · ' + B.catName(r.cat);
  }

  function paintSide() {
    if (window.innerWidth < 1000) return;
    var t = B.ranking(G), h = '';
    t.forEach(function (s) {
      h += '<div class="score' + (s.id === G.turn && !solo() ? ' is-on' : '') + '"><span class="score__p">' + s.place + '</span><span class="score__n"><b><i style="background:' + color(s.id) + '"></i>' + esc(s.name) + '</b><small>' + pl(s.words, 'word') + ' · M ' + s.mav + ' · C ' + s.con + ' · K ' + s.key + '</small></span><span class="score__t">' + s.total + '</span></div>';
    });
    $('[data-scores]').innerHTML = h;
    var f = [], r = R();
    r.entries.forEach(function (e) {
      e.mavs.forEach(function (m) { f.push('<li><span class="tag tag--mav">M</span><span>' + esc(m.w) + (solo() ? '' : ' · ' + esc(pname(e.p))) + '</span><em>+' + m.pts + '</em></li>'); });
      if (e.con) f.push('<li><span class="tag tag--con">C</span><span>' + e.streak + ' × ' + e.w.length + ' letters' + (solo() ? '' : ' · ' + esc(pname(e.p))) + '</span><em>+' + e.con + '</em></li>');
      if (e.key) f.push('<li><span class="tag tag--key">K</span><span>Keystone · ' + esc(e.w) + '</span><em>+' + e.key + '</em></li>');
    });
    $('[data-feed]').innerHTML = f.length ? f.reverse().slice(0, 30).join('') : '<li class="feed__none">None yet</li>';
  }

  /* messages under the board */
  function msg(html, bad) { $('[data-msg]').innerHTML = html ? '<div class="msg' + (bad ? ' msg--bad' : '') + '">' + html + '</div>' : ''; }
  function shake() { var f = $('[data-entry]'); f.classList.remove('is-shake'); void f.offsetWidth; f.classList.add('is-shake'); buzz(40); }

  var pending = null;
  function submit() {
    if (!G || R().done) return;
    if (!running) { readyScreen(); return; }
    var inp = $('[data-in]'), raw = inp.value;
    if (!B.norm(raw)) { shake(); return; }
    var cat = R().cat;
    getList(cat).then(function (L) { tryAdd(raw, L, false); }, function () { tryAdd(raw, null, false, true); });
  }
  function tryAdd(raw, L, forced, offline) {
    var r = R();
    var c = B.check(G, raw, forced || !L ? null : L.full);
    if (!c.ok) {
      if (c.why === 'unknown') {
        pending = raw;
        msg('<span><b>' + esc(c.w) + '</b> isn’t in our ' + esc(B.catName(r.cat)) + ' list.</span><button type="button" data-act="force">Count it anyway</button><button type="button" class="is-pri" data-act="retry">Try another</button>', true);
      } else {
        var t = { short: 'Use at least ' + B.RULES.MIN_LEN + ' letters.', long: 'That’s too long. ' + B.RULES.MAX_LEN + ' letters at most.', repeat: '<b>' + esc(c.w) + '</b> is already on the board.', done: 'This round is over.' }[c.why] || 'Try another word.';
        msg('<span>' + t + '</span>', true);
      }
      shake();
      return;
    }
    var e = B.add(G, c.w, { mav: L ? L.mav : null, forced: forced });
    lastAdded = r.entries.length - 1;
    pending = null;
    $('[data-in]').value = '';
    msg(offline ? '<span>Word list didn’t load, so words aren’t being checked right now.</span>' : '');
    save();
    celebrate(e);
    paintGame();
    lastAdded = -1;
    if (r.done) { setTimeout(roundOver, 900); return; }
    focusIn();
  }

  var flashQ = [], flashing = false;
  function celebrate(e) {
    var who = solo() ? '' : ' · ' + pname(e.p);
    e.mavs.forEach(function (m) { flashQ.push({ c: 'var(--mav)', t: 'Maverick', s: m.w + ' · +' + m.pts + who }); });
    if (e.con) flashQ.push({ c: 'var(--con)', t: e.streak === B.RULES.CON_STREAK ? 'Concord' : 'Concord × ' + e.streak, s: e.w.length + '-letter streak · +' + e.con + who });
    if (e.key) flashQ.push({ c: 'var(--key)', t: 'Keystone', s: '+' + e.key + who });
    if (flashQ.length) { buzz([20, 40, 30]); runFlash(); } else buzz(12);
  }
  function runFlash() {
    if (flashing || !flashQ.length) return;
    flashing = true;
    var f = flashQ.shift(), el = $('[data-flash]');
    el.innerHTML = '<div class="flash__i" style="color:' + f.c + '"><b>' + esc(f.t) + '</b><span>' + esc(f.s) + '</span></div>';
    setTimeout(function () { el.innerHTML = ''; flashing = false; runFlash(); }, 1450);
  }

  function roundOver() {
    running = false; stopClock();
    if (!G) return;
    var r = R(); r.done = true; save();
    paintGame();
    var rr = B.ranking(G, r), all = B.ranking(G);
    $('[data-sumround]').textContent = 'Round ' + r.n + ' over · ' + B.catName(r.cat);
    var title;
    if (solo()) title = rr[0].total + ' points';
    else if (rr.length > 1 && rr[0].total === rr[1].total) title = 'Level at the top';
    else title = rr[0].name + ' wins the round';
    $('[data-sumt]').textContent = title;
    var h = sumRows(rr);
    if (G.rounds.length > 1 && !solo()) h += '<p class="sum__d">Game total after ' + pl(G.rounds.length, 'round') + '</p>' + sumRows(all, true);
    else if (G.rounds.length > 1) h += '<p class="sum__d">Game total after ' + pl(G.rounds.length, 'round') + ': ' + all[0].total + ' points</p>';
    $('[data-sum]').innerHTML = h;
    ov('summary', true);
  }
  function sumRows(list, compact) {
    return '<div class="sum">' + list.map(function (s) {
      var parts = compact ? '' : '<span class="sum__b"><span><small>' + pl(s.words, 'word') + '</small>' + s.base + '</span><span><small class="c-mav">Maverick</small>' + s.mav + '</span><span><small class="c-con">Concord</small>' + s.con + '</span><span><small class="c-key">Keystone</small>' + s.key + '</span></span>';
      return '<div class="sum__r"><span class="sum__p">' + s.place + '</span><span class="sum__n"><b><i style="background:' + color(s.id) + '"></i>' + esc(s.name) + '</b></span><span class="sum__t">' + s.total + '</span>' + parts + '</div>';
    }).join('') + '</div>';
  }

  function nextRound(cat) {
    ov('summary', false);
    B.newRound(G, cat || R().cat);
    save();
    getList(R().cat);
    msg('');
    paintGame();
    readyScreen();
  }

  function finish() {
    running = false; stopClock();
    closeSheets(); ov('summary', false); ov('ready', false);
    var all = B.ranking(G);
    G.over = true; save();
    $('[data-finsub]').textContent = 'Game over · ' + pl(G.rounds.length, 'round');
    var t;
    if (solo()) t = all[0].total + ' points';
    else if (all.length > 1 && all[0].total === all[1].total) t = 'It’s a tie';
    else t = all[0].name + ' wins';
    $('[data-fint]').textContent = t;
    $('[data-fin]').innerHTML = sumRows(all);
    ov('final', true);
  }

  function leave() {
    running = false; stopClock();
    closeSheets(); $$('[data-ov]').forEach(function (o) { o.hidden = true; });
    if (G && G.over) { store(KEY_GAME, null); G = null; }
    show('home');
  }

  function resume() {
    var g = load(KEY_GAME);
    if (!g || g.v !== 1 || g.over) return show('home');
    G = g;
    getList(R().cat);
    show('game');
    if (R().done) roundOver(); else readyScreen();
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('button,[data-act]');
    if (!t) { if (ev.target.classList && ev.target.classList.contains('sheet')) closeSheets(); return; }
    var a = t.getAttribute('data-act');
    if (t.hasAttribute('data-pc')) { S.count = +t.getAttribute('data-pc'); saveSetup(); paintSetup(); return; }
    if (t.hasAttribute('data-set')) { S[t.getAttribute('data-set')] = +t.getAttribute('data-v'); saveSetup(); paintSetup(); return; }
    if (t.hasAttribute('data-cat')) {
      var k = t.getAttribute('data-cat');
      closeSheets();
      if (catMode === 'setup') { S.cat = k; saveSetup(); paintSetup(); getList(k); }
      else nextRound(k);
      return;
    }
    switch (a) {
      case 'help': openSheet('help'); break;
      case 'close': closeSheets(); if (cur === 'game' && running) focusIn(); break;
      case 'setup': show('setup'); break;
      case 'home': leave(); break;
      case 'continue': resume(); break;
      case 'cats': openCats('setup'); break;
      case 'start': startGame(); break;
      case 'go': go(); break;
      case 'menu': openSheet('menu'); break;
      case 'clock':
        if (R().done) break;
        if (running) { running = false; paintClock(); readyScreen(); } else go();
        break;
      case 'info': toast(B.catName(R().cat) + ' · ' + pl(R().entries.length, 'word') + ' on the board'); break;
      case 'skip':
        if (!running || R().done) break;
        var who = pname(G.turn); B.skip(G); save(); msg(''); paintGame(); toast(who + ' skipped'); focusIn(); break;
      case 'undo':
        var e = B.undo(G); if (!e) break; save(); msg(''); paintGame(); toast('Removed ' + e.w); focusIn(); break;
      case 'end': closeSheets(); if (G && !R().done) { B.endRound(G); save(); roundOver(); } break;
      case 'quit': finish(); break;
      case 'next': nextRound(); break;
      case 'nextcat': openCats('round'); break;
      case 'again':
        ov('final', false); store(KEY_GAME, null); G = null; show('setup'); break;
      case 'force': if (pending != null) getList(R().cat).then(function (L) { tryAdd(pending, L, true); }, function () { tryAdd(pending, null, true); }); break;
      case 'retry': msg(''); $('[data-in]').select(); focusIn(); break;
    }
  });
  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.hasAttribute('data-pn')) { S.names[+t.getAttribute('data-pn')] = t.value; saveSetup(); }
    if (t.hasAttribute('data-catq')) paintCats(t.value);
    if (t.hasAttribute('data-in') && $('[data-msg]').innerHTML) { msg(''); pending = null; }
  });
  $('[data-entry]').addEventListener('submit', function (ev) { ev.preventDefault(); submit(); });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { if (!$$('[data-sheet]').every(function (s) { return s.hidden; })) { closeSheets(); ev.preventDefault(); } }
  });
  window.addEventListener('resize', function () { if (cur === 'game' && G) { sizeBoard(); paintSide(); } });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && running && G && G.settings.timer && !R().done) { running = false; save(); paintClock(); readyScreen(); }
  });

  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('/bemaamoo/sw.js').catch(function () {}); });

  show('home');
  if (location.hash === '#new') show('setup');
})();
