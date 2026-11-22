/* Bemaamoo · BLACC Universal — app */
(function () {
  'use strict';
  var B = window.BMO;
  var WORDS_V = 4;
  var KEY_GAME = 'bmo_game_v1', KEY_SETUP = 'bmo_setup_v1';
  var COLORS = ['#ffffff', '#3ddc97', '#c792ff', '#ff7ab6', '#5ee0e0', '#ffb347', '#a3e635', '#8fa2ff', '#ff6b6b', '#ffd23f', '#4dabf7', '#e599f7', '#63e6be', '#ff922b', '#b2f2bb', '#d0bfff'];
  var TIMERS = [[0, 'Off'], [60, '1m'], [120, '2m'], [180, '3m'], [300, '5m'], [600, '10m']];
  var LIMITS = [[0, 'Off'], [10, '10'], [20, '20'], [30, '30'], [50, '50']];
  var MAXP = 50;
  var TURNS = [[0, 'Off'], [15, '15 sec'], [30, '30 sec'], [60, '1 min']];
  var ORDERS = [[0, 'Me first'], [1, 'Shuffle']];
  var ALPHA = [[0, 'Off'], [1, 'Sorted'], [2, 'Ladder'], [3, 'Lap']];
  var KEY_ROOMS = 'bmo_rooms_v1';

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

  /* warm a category's word list in the background so Start is instant (skipped on data saver) */
  function warm(cat) { try { var c = navigator.connection; if (c && c.saveData) return; getList(cat).catch(function () {}); } catch (e) {} }

  /* ---------- screens ---------- */
  var cur = 'home';
  /* keep the screen awake during a room or game, so a locked phone doesn't freeze play for everyone */
  var wl = null;
  function wake() {
    var want = (cur === 'game' || (cur === 'room' && NET)) && !document.hidden;
    if (!want) { if (wl) { try { wl.release(); } catch (e) {} wl = null; } return; }
    if (wl || !navigator.wakeLock) return;
    navigator.wakeLock.request('screen').then(function (l) { wl = l; l.addEventListener('release', function () { if (wl === l) wl = null; }); if (!(cur === 'game' || cur === 'room')) wake(); }, function () {});
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });
  function show(name) {
    cur = name; setTimeout(wake, 0);
    $$('[data-scr]').forEach(function (s) { s.hidden = s.getAttribute('data-scr') !== name; });
    document.body.classList.toggle('in-game', name === 'game');
    window.scrollTo(0, 0);
    if (name === 'home') paintHome();
    if (name === 'setup') paintSetup();
    if (name === 'game') { fitVh(); paintGame(); }
    if (name === 'online') paintOnline();
    if (name === 'room') paintRoom();
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
    var rm = load(KEY_ROOM), rb = $('[data-roombtn]');
    rb.hidden = !(rm && rm.code); if (rm && rm.code) rb.textContent = 'Back to room ' + rm.code;
  }

  /* ---------- setup ---------- */
  var S = load(KEY_SETUP) || {};
  S = { count: S.count || 1, names: S.names || [], cat: S.cat || 'names_all', timer: S.timer != null ? S.timer : 0, limit: S.limit != null ? S.limit : 0, tl: S.tl != null && S.tl !== 20 ? S.tl : 15, sh: S.sh ? 1 : 0, al: +S.al || 0 };
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
    seg('[data-opt="limit"]', LIMITS, S.limit, 'limit'); seg('[data-opt="alpha"]', ALPHA, S.al, 'al');
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
  function save() { if (NET) { if (isHost()) { storeRoom(); pubSoon(); } return; } store(KEY_GAME, G); }
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
    G = B.create({ players: players, category: S.cat, timer: S.timer, limit: S.limit, alpha: +S.al || 0 });
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
    var tx, gb = $('[data-ov="ready"] [data-act="go"]');
    gb.hidden = !!(NET && !isHost());
    if (NET) {
      if (isHost()) tx = r.started ? 'Paused. ' + pname(G.turn) + ' is up next.' : pname(G.turn) + ' starts. Everyone plays on their own phone.';
      else tx = 'Waiting for ' + hostName() + ' to ' + (r.started ? 'resume' : 'start') + ' the round.';
      $('[data-rdtx]').textContent = tx;
      gb.textContent = r.started ? 'Resume' : 'Start round';
      ov('ready', true);
      return;
    }
    if (r.started) tx = 'Paused. ' + (solo() ? 'Ready when you are.' : pname(G.turn) + ' is up next.');
    else tx = solo() ? (G.settings.timer ? 'You have ' + fmt(G.settings.timer) + '. Go for long words.' : 'Take your time. Go for long words.') : pname(G.turn) + ' starts. Pass the phone after each word.';
    $('[data-rdtx]').textContent = tx;
    $('[data-ov="ready"] [data-act="go"]').textContent = r.started ? 'Resume' : 'Start round';
    ov('ready', true);
  }

  function go() {
    if (NET && !isHost()) return;
    ov('ready', false);
    running = true;
    if (NET) { R().run = true; save(); }
    startClock();
    paintGame();
    focusIn();
  }
  function focusIn() { var ae = document.activeElement; if (ae && ae.hasAttribute && ae.hasAttribute('data-chatin')) return; var i = $('[data-in]'); if (i && !R().done) { try { i.focus({ preventScroll: true }); } catch (e) { i.focus(); } } }

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
      if (isHost() && now - lastClockPub > 2000) { lastClockPub = now; pubNow(); }
      if (r.left <= 0) { B.endRound(G); save(); roundOver(); }
      else if (now - lastClockSave > 5000) { lastClockSave = now; save(); }
    }, 250);
  }
  var lastClockPub = 0, lastClockSave = 0;
  function stopClock() { if (tick) clearInterval(tick); tick = null; }
  function clockLeft() {
    var r = R(), c = NET && !isHost() ? NET.clk : null;
    if (c && c.n === r.n && running && !r.done) return Math.max(0, c.left - (Date.now() - c.at) / 1000);
    return r.left;
  }
  function paintClock() {
    var c = $('[data-clock]');
    if (!G.settings.timer) { setp(c, 'hidden', true); return; }
    setp(c, 'hidden', false);
    var left = clockLeft(), low = left <= 15 && !R().done;
    tx($('[data-clocktx]'), fmt(left));
    if (c._low !== low) { c._low = low; c.classList.toggle('is-low', low); }
    if (c._run !== running) {
      c._run = running; c.classList.toggle('is-paused', !running);
      c.querySelector('use').setAttribute('href', running ? '#i-pause' : '#i-play');
      c.setAttribute('aria-label', running ? 'Pause timer' : 'Resume timer');
    }
    setp(c, 'disabled', !!(NET && !isHost()));
  }

  function paintGame() {
    $$('[data-netbtn]').forEach(function (b) { b.hidden = !NET; });
    if (!G) return;
    var r = R();
    $('[data-gcat]').textContent = B.catName(r.cat);
    var sub = 'Round ' + r.n + ' · ' + pl(r.entries.length, 'word');
    if (G.settings.limit) sub = 'Round ' + r.n + ' · ' + r.entries.length + ' of ' + G.settings.limit + ' words';
    if (G.settings.alpha) sub += ' · ' + alphaTag();
    $('[data-gsub]').textContent = sub;
    paintClock();
    paintStrip();
    paintBoard();
    paintDock();
    paintSide();
    paintPerks();
    paintVq();
  }

  function paintStrip() {
    var el = $('[data-pstrip]'), h = '';
    var t = B.tally(G, R()), ov_ = B.tally(G), multi = G.rounds.length > 1;
    el.classList.toggle('pstrip--solo', solo());
    if (solo()) {
      var s = t[0];
      h = '<div class="pchip is-on"><span>' + (multi ? 'This round' : 'Score') + '</span><b>' + s.total + '</b>' + (multi ? '<small>Overall ' + ov_[0].total + '</small>' : '') + '</div>' +
        '<div class="pchip pchip--part"><span class="c-mav">Maverick</span><b>' + s.mav + '</b></div>' +
        '<div class="pchip pchip--part"><span class="c-con">Concord</span><b>' + s.con + '</b></div>' +
        '<div class="pchip pchip--part"><span class="c-acc">Regen</span><b>' + s.acc + '</b></div>' +
        '<div class="pchip pchip--part"><span class="c-key">Keystone</span><b>' + s.key + '</b></div>';
    } else {
      t.forEach(function (s, i) {
        var pd = G.players[i] && G.players[i].dev;
        if (G.players[i] && G.players[i].out) return;
        h += '<div class="pchip' + (i === G.turn ? ' is-on' : '') + (NET && pd && !isOn(pd) ? ' is-off' : '') + '">' + dotHtml(G.players[i] && G.players[i].av, i) + '<span>' + esc(s.name) + (NET && pd === DEV ? ' (you)' : '') + '</span><b>' + s.total + '</b>' + (multi ? '<small>Overall ' + ov_[i].total + '</small>' : '') + '</div>';
      });
    }
    if (el._h !== h) { el._h = h; el.innerHTML = h; }
    var on = el.querySelector('.is-on');
    if (on && !solo() && el._t !== G.turn + ':' + G.rounds.length) { el._t = G.turn + ':' + G.rounds.length; var l = on.offsetLeft - el.clientWidth / 2 + on.clientWidth / 2; el.scrollTo({ left: l, behavior: 'smooth' }); }
  }

  function sizeBoard() {
    var b = $('[data-board]'); if (!b || !G) return;
    var r = R();
    var longest = 6, maxTags = 0;
    r.entries.forEach(function (e) {
      if (e.w.length > longest) longest = e.w.length;
      var t = (e.mavs.length ? 1 : 0) + (e.con ? 1 : 0) + (e.acc ? 1 : 0) + (e.key ? 1 : 0) + (e.forced ? 2 : 0);
      if (t > maxTags) maxTags = t;
    });
    var ptsW = 46 + maxTags * 24;
    var cs = getComputedStyle(b);
    var avail = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 30 - ptsW - 6;
    var gap = window.innerWidth < 420 ? 3 : 4;
    var c = Math.floor((avail - gap * longest) / longest);
    c = Math.max(16, Math.min(window.innerWidth >= 1000 ? 46 : 42, c));
    b.style.setProperty('--c', c + 'px');
    b.style.setProperty('--gap', gap + 'px');
  }

  function paintBoard() {
    var b = $('[data-board]'), r = R();
    sizeBoard();
    var bk = [b.clientWidth, r.n, r.cat, r.entries.map(function (e) { return e.w + (e.mavs.length ? 'm' : '') + (e.con ? 'c' : '') + (e.acc ? 'r' : '') + (e.key ? 'k' : '') + (e.forced ? 'f' : ''); }).join(','), (r.gaps || []).map(function (g) { return g.a + ':' + g.p; }).join(','), G.players.map(function (p) { return p.name; }).join(','), r.entries.length ? '' : G.turn].join('|');
    if (b._k === bk && lastAdded < 0 && !b._dirty) return;
    b._k = bk;
    if (!r.entries.length && !(r.gaps || []).length) {
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
    var h = '<div class="rows">', gaps = r.gaps || [], gi = 0, seq = 0;
    function gapRow(g) {
      seq++;
      return '<div class="row row--skip"><span class="row__n"><i style="background:' + color(g.p) + '"></i>' + seq + '</span>' + '<span class="cell"></span><span class="cell"></span><span class="cell"></span><span class="cell"></span><span class="cell"></span>' + '<span class="row__pts row__pts--skip">' + esc(pname(g.p)) + ' skipped</span></div>';
    }
    r.entries.forEach(function (e, i) {
      while (gi < gaps.length && gaps[gi].a <= i) { h += gapRow(gaps[gi]); gi++; }
      seq++;
      var cls = 'row' + (conAt[i] != null ? ' is-con' + conAt[i] : '') + (i === r.entries.length - 1 ? ' is-last' : '') + (e.acc ? ' is-acc' : '');
      h += '<div class="' + cls + '" data-row="' + i + '"><span class="row__n">' + (solo() ? '' : '<i style="background:' + color(e.p) + '"></i>') + seq + '</span>';
      for (var c = 0; c < e.w.length; c++) {
        var k = i + ':' + (c + 1);
        var cc = 'cell' + (mav[k] ? ' is-mav' : '') + (i === lastAdded ? ' is-new' : '') + (fresh[k] && i !== lastAdded ? ' is-glow' : '');
        h += '<span class="' + cc + '" style="--i:' + c + '">' + e.w[c] + '</span>';
      }
      var tags = '';
      if (e.mavs.length) tags += '<span class="tag tag--mav" title="Maverick">M</span>';
      if (e.con) tags += '<span class="tag tag--con" title="Concord">C</span>';
      if (e.acc) tags += '<span class="tag tag--acc" title="Regen">R</span>';
      if (e.key) tags += '<span class="tag tag--key" title="Keystone">K</span>';
      if (e.forced) tags += '<span class="tag tag--f" title="Counted by the table">table</span>';
      h += '<span class="row__pts">+' + e.total + tags + '</span></div>';
    });
    while (gi < gaps.length) { h += gapRow(gaps[gi]); gi++; }
    h += '</div>';
    b.innerHTML = h;
    requestAnimationFrame(function () { b.scrollTop = b.scrollHeight; });
  }

  function lastWord() { var e = G ? R().entries : null; return e && e.length ? e[e.length - 1].w : ''; }
  function orderMsg() {
    var h = B.alphaHint(G);
    return h.mode === 1 ? 'Sorted play is on. Play a word that comes after <b>' + esc(h.after) + '</b> in the alphabet.' : 'The next word must start with <b>' + esc(h.letter) + '</b>.';
  }
  function alphaTag() { var h = G ? B.alphaHint(G) : { mode: 0 }; return h.mode === 1 ? 'A to Z' : h.mode === 2 ? 'Ladder' : h.mode === 3 ? 'Lap' : ''; }
  /* accounts (all optional: nothing here runs unless bmo-config.js has Supabase keys) */
  function acctOn() { return !!(window.BMA && window.BMA.enabled); }
  function okAv(u) { return acctOn() ? window.BMA.okAv(u) : ''; }
  function guestGames() { var v = load('bmo_gg'); return Array.isArray(v) ? v : []; }
  function needAcct() { return acctOn() && window.BMA.ready && !window.BMA.user && guestGames().length >= 1; }
  function gateAcct() { if (!needAcct()) return false; window.BMA.open('You have played your free game. Create a free account to keep playing and save your scores.'); return true; }
  function dotHtml(av, i) { var u = okAv(av); return u ? '<img class="av av--s" src="' + esc(u) + '" alt="" decoding="async">' : '<i style="background:' + color(i) + '"></i>'; }
  var lastRes = null;
  function afterGame(all) {
    if (!acctOn()) return;
    var A = window.BMA, fa = $('[data-finacct]'), idx = solo() ? 0 : (NET ? meIdx() : -1), me = null;
    all.forEach(function (x) { if (x.id === idx) me = x; });
    if (me) lastRes = { id: G.id, players: G.players.length, place: solo() ? 1 : me.place, points: me.total, rounds: G.rounds.length, category: G.rounds[0].cat, rule: G.settings.alpha | 0 };
    if (!A.user) {
      var gg = guestGames(); if (gg.indexOf(G.id) < 0) { gg.push(G.id); store('bmo_gg', gg.slice(-20)); }
      if (fa) { fa.hidden = false; $('[data-finacct-t]').textContent = lastRes ? 'Create a free account to save this score and keep playing.' : 'Create a free account to keep your scores and play more games.'; }
      return;
    }
    if (fa) fa.hidden = true;
    if (lastRes && A.profile) { A.record(lastRes); lastRes = null; }
  }
  if (window.BMA && window.BMA.enabled) window.BMA.onChange(function (A) { if (A.user && A.profile && lastRes) { A.record(lastRes); lastRes = null; var fa = $('[data-finacct]'); if (fa) fa.hidden = true; } });
  function tx(el, v) { if (el.textContent !== v) el.textContent = v; }
  function setp(el, k, v) { if (el[k] !== v) el[k] = v; }
  function paintDock() {
    var r = R(), d = $('.dock');
    d.classList.toggle('is-done', !!r.done);
    var td = $('[data-turndot]'), tc = color(G.turn); if (td._c !== tc) { td._c = tc; td.style.background = tc; }
    setp($('[data-turndot]'), 'hidden', solo());
    tx($('[data-turn]'), r.done ? 'Round over' : (solo() ? 'Your word' : pname(G.turn) + '’s turn'));
    var lv = B.live(r), el = $('[data-live]');
    if (lv.streak >= 2 && lv.len >= B.RULES.CON_MIN_LEN) {
      var need = B.RULES.CON_STREAK - lv.streak;
      tx(el, need > 0 ? lv.streak + ' × ' + lv.len + ' letters · ' + need + ' more for Concord' : 'Concord × ' + lv.streak + ' · keep it at ' + lv.len + ' letters');
      el.classList.toggle('is-hot', need <= 1);
    } else { tx(el, ''); el.classList.remove('is-hot'); }
    setp($('[data-act="skip"]'), 'hidden', solo());
    setp($('[data-act="undo"]'), 'disabled', !r.entries.length || r.done);
    var inp = $('[data-in]'), goB = $('.entry__go');
    setp(inp, 'placeholder', 'Type ' + (/^names/.test(r.cat) ? 'a name' : 'a word') + (function () { var h = B.alphaHint(G); return h.mode === 1 && h.after ? ' after ' + h.after : h.letter ? ' starting with ' + h.letter : ''; })() + ' · ' + B.catName(r.cat));
    if (NET) {
      var mine = myTurn(), cp = pname(G.turn), stale = !isHost() && hostStale();
      tx($('[data-turn]'), stale ? 'Waiting for ' + hostName() + ' to reconnect…' : r.done ? 'Round over' : (mine ? 'Your turn' : cp + '’s turn'));
      var off = r.done || !mine || !running || !!NET.pend || stale;
      setp(inp, 'disabled', off); setp(goB, 'disabled', off);
      if (!mine && !r.done) setp(inp, 'placeholder', 'Waiting for ' + cp + '…');
      if (NET.pend) setp(inp, 'placeholder', 'Sending…');
      var sk = $('[data-act="skip"]'); setp(sk, 'hidden', r.done || !(mine || isHost())); tx(sk, mine ? 'Skip turn' : 'Skip ' + cp);
      setp($('[data-act="undo"]'), 'hidden', !isHost()); setp($('[data-act="end"]'), 'hidden', !isHost());
    } else {
      setp(inp, 'disabled', false); setp(goB, 'disabled', false);
      setp($('[data-act="undo"]'), 'hidden', false); setp($('[data-act="end"]'), 'hidden', false); tx($('[data-act="skip"]'), 'Skip turn');
    }
  }

  function paintSide() {
    if (window.innerWidth < 1000) return;
    var t = B.ranking(G, R()), h = '', ovl = B.tally(G), multi = G.rounds.length > 1;
    t.forEach(function (s) {
      if (G.players[s.id] && G.players[s.id].out) return;
      h += '<div class="score' + (s.id === G.turn && !solo() ? ' is-on' : '') + '"><span class="score__p">' + s.place + '</span><span class="score__n"><b><i style="background:' + color(s.id) + '"></i><u style="color:' + color(s.id) + '">' + esc(s.name) + '</u></b><small>' + pl(s.words, 'word') + ' · M ' + s.mav + ' · C ' + s.con + ' · A ' + s.acc + ' · K ' + s.key + (multi ? ' · overall ' + ovl[s.id].total : '') + '</small></span><span class="score__t">' + s.total + '</span></div>';
    });
    var sc = $('[data-scores]'); if (sc._h !== h) { sc._h = h; sc.innerHTML = h; }
    $('[data-feed]').innerHTML = perkItems();
  }
  function perkItems() {
    var f = [], r = R();
    function who(e) { return solo() ? '' : ' · <b class="pn" style="color:' + color(e.p) + '">' + esc(pname(e.p)) + '</b>'; }
    r.entries.forEach(function (e) {
      e.mavs.forEach(function (m) { f.push('<li><span class="tag tag--mav">M</span><span>' + esc(m.w) + who(e) + '</span><em>+' + m.pts + '</em></li>'); });
      if (e.con) f.push('<li><span class="tag tag--con">C</span><span>' + e.streak + ' × ' + e.w.length + ' letters' + who(e) + '</span><em>+' + e.con + '</em></li>');
      if (e.acc) f.push('<li><span class="tag tag--acc">R</span><span>Regen · ' + esc(e.w) + who(e) + '</span><em>+' + e.acc + '</em></li>');
      if (e.key) f.push('<li><span class="tag tag--key">K</span><span>Keystone · ' + esc(e.w) + who(e) + '</span><em>+' + e.key + '</em></li>');
    });
    return f.length ? f.reverse().slice(0, 60).join('') : '<li class="feed__none">None yet</li>';
  }
  function paintPerks() {
    var sh = $('[data-sheet="perks"]'); if (!sh || sh.hidden || !G) return;
    $('[data-pscores]').innerHTML = sumRows(B.ranking(G, R()).filter(function (s) { return !(G.players[s.id] && G.players[s.id].out); }));
    $('[data-pfeed]').innerHTML = perkItems();
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
    if (NET && !myTurn()) { toast('It’s ' + pname(G.turn) + '’s turn'); return; }
    if (NET && !isHost()) { guestSubmit(raw); return; }
    var cat = R().cat;
    getList(cat).then(function (L) { tryAdd(raw, L, false); }, function () { tryAdd(raw, null, false, true); });
  }
  function tryAdd(raw, L, forced, offline) {
    var r = R();
    var c = B.check(G, raw, forced || !L ? null : L.full);
    if (!c.ok) {
      if (c.why === 'unknown' && NET) {
        NET.lastRej = { w: c.w, n: r.entries.length };
        msg('<span><b>' + esc(c.w) + '</b> isn’t in our ' + esc(B.catName(r.cat)) + ' list.</span>' + vreqBtn() + '<button type="button" class="is-pri" data-act="retry">Try another</button>', true);
      } else if (c.why === 'unknown') {
        pending = raw;
        msg('<span><b>' + esc(c.w) + '</b> isn’t in our ' + esc(B.catName(r.cat)) + ' list.</span><button type="button" data-act="force">Count it anyway</button><button type="button" class="is-pri" data-act="retry">Try another</button>', true);
      } else {
        var t = { short: 'Use at least ' + B.RULES.MIN_LEN + ' letters.', long: 'That’s too long. ' + B.RULES.MAX_LEN + ' letters at most.', repeat: '<b>' + esc(c.w) + '</b> is already on the board.', order: orderMsg(), letter: orderMsg(), done: 'This round is over.' }[c.why] || 'Try another word.';
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
    if (r.done) { roundOverSoon(r); return; }
    if (NET) { notifyTurn(); return; }
    focusIn();
  }

  var flashQ = [], flashing = false;
  function celebrate(e) {
    var who = solo() ? '' : ' · ' + pname(e.p);
    e.mavs.forEach(function (m) { flashQ.push({ c: 'var(--mav)', t: 'Maverick', s: m.w + ' · +' + m.pts + who }); });
    if (e.con) flashQ.push({ c: 'var(--con)', t: e.streak === B.RULES.CON_STREAK ? 'Concord' : 'Concord × ' + e.streak, s: e.w.length + '-letter streak · +' + e.con + who });
    if (e.acc) flashQ.push({ c: 'var(--acc)', t: 'Regen', s: 'Same letters as the word above · +' + e.acc + who });
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

  function roundOverSoon(r) { setTimeout(function () { if (G && R() === r && r.done) roundOver(); }, 900); }
  function roundOver() {
    if (!G || !R().done) return;   // only ever shows the scoreboard for a round that has really ended
    running = false; stopClock();
    var r = R(); save();
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
    var gw = NET && !isHost();
    $('[data-sumbtns]').hidden = gw; $('[data-sumwait]').hidden = !gw;
    if (gw) $('[data-sumwait]').textContent = 'Waiting for ' + hostName() + ' to start the next round.';
    ov('summary', true);
  }
  function sumRows(list, compact) {
    var head = compact ? '' : '<div class="sum__h"><span></span><span>Player</span><span title="Word points">W</span><span class="c-mav" title="Maverick">M</span><span class="c-con" title="Concord">C</span><span class="c-acc" title="Regen">R</span><span class="c-key" title="Keystone">K</span><span>Total</span></div>';
    var rows = list.map(function (s) {
      var st = compact ? '' : '<span>' + s.base + '</span><span class="c-mav">' + s.mav + '</span><span class="c-con">' + s.con + '</span><span class="c-acc">' + s.acc + '</span><span class="c-key">' + s.key + '</span>';
      return '<div class="sum__r' + (compact ? ' sum__r--c' : '') + (G.players[s.id] && G.players[s.id].out ? ' is-out' : '') + '"><span class="sum__p">' + s.place + '</span><span class="sum__n"><b><i style="background:' + color(s.id) + '"></i><u style="color:' + color(s.id) + '">' + esc(s.name) + '</u></b></span>' + st + '<span class="sum__t">' + s.total + '</span></div>';
    }).join('');
    var legend = compact ? '' : '<p class="sum__lg">W words · M Maverick · C Concord · R Regen · K Keystone</p>';
    return '<div class="sum' + (list.length > 6 ? ' sum--scroll' : '') + '">' + head + rows + '</div>' + legend;
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
    var fh = sumRows(all);
    if (G.rounds.length > 1) {
      fh += '<p class="sum__d">Points by round</p><div class="sum sum--rounds">' + G.rounds.map(function (rd) {
        var rk = B.ranking(G, rd).filter(function (x) { return rd.entries.some(function (e) { return e.p === x.id; }); });
        return '<div class="sum__rr"><span>Round ' + rd.n + ' · ' + esc(B.catName(rd.cat)) + '</span></div>' + rk.map(function (x) { return '<div class="sum__rr"><i style="background:' + color(x.id) + ';width:8px;height:8px;border-radius:50%"></i><span>' + esc(x.name) + '</span><b>' + x.total + '</b></div>'; }).join('');
      }).join('') + '</div>';
    }
    $('[data-fin]').innerHTML = fh;
    $('[data-act="again"]', $('[data-ov="final"]')).hidden = !!(NET && !isHost());
    $('[data-act="again"]', $('[data-ov="final"]')).textContent = NET ? 'Play again, same room' : 'Play again';
    afterGame(all);
    ov('final', true);
  }

  function leave() {
    running = false; stopClock();
    closeSheets(); $$('[data-ov]').forEach(function (o) { o.hidden = true; });
    if (NET) {
      if (isHost()) { if (G && G.over) { G = null; NET.lobby.started = false; } storeRoom(); pubNow(); }
      else { sendIn({ t: 'bye' }); store(KEY_ROOM, null); }
      netClose(); G = null; show('home'); return;
    }
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


  /* ---------- online rooms (live, turn by turn) ----------
     The player who creates the room keeps the game on their phone and sends it to everyone else
     through two public relays (the same ones PQT uses). Nothing is stored on a server. */
  var BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];
  var NTOPIC = 'blaccuniversal/bemaamoo/v1/', KEY_ROOM = 'bmo_room_v1';
  var qbk = new URLSearchParams(location.search).get('broker');
  if (qbk && /^wss?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(qbk)) BROKERS = [qbk];
  var DEV = load('bmo_dev'); if (!DEV) { DEV = Math.random().toString(36).slice(2, 10); store('bmo_dev', DEV); }
  var NET = null;
  function isHost() { return !!(NET && NET.role === 'host'); }
  function meIdx() { if (!G) return -1; for (var i = 0; i < G.players.length; i++) if (G.players[i].dev === DEV) return i; return -1; }
  function myTurn() { return !NET || (G && G.players[G.turn] && G.players[G.turn].dev === DEV); }
  function hostName() { if (!NET || !NET.lobby) return 'the host'; var L = NET.lobby, h = L.players.filter(function (p) { return p.dev === L.hd; })[0] || L.players[0]; return h ? h.name : 'the host'; }
  function hostStale() { return !!(NET && !isHost() && NET.gotAt && Date.now() - NET.gotAt > 25000); }
  function isOn(dev) { if (!NET || dev === DEV) return true; if (isHost()) return Date.now() - (NET.seen[dev] || 0) < 30000; return !NET.on || NET.on[dev] !== false; }
  function cleanName(n) { return String(n || '').replace(/\s+/g, ' ').trim().slice(0, 18) || 'Player'; }
  function newCode() { var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ', c = ''; for (var i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)]; return c; }
  var mqP = null;
  function loadMqtt() {
    if (window.mqtt) return Promise.resolve();
    if (!mqP) mqP = new Promise(function (ok, no) { var sc = document.createElement('script'); sc.src = '/assets/bemaamoo/mqtt.min.js?v=1'; sc.onload = ok; sc.onerror = function () { mqP = null; no(); }; document.head.appendChild(sc); });
    return mqP;
  }
  function newHs() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function netLink() {
    var T = NTOPIC + NET.code + '/', me = NET;
    me.cls = [];
    keepAwake();
    BROKERS.forEach(function (url) {
      var c; try { c = window.mqtt.connect(url, { clientId: 'bmo_' + DEV + '_' + Math.random().toString(16).slice(2, 6), clean: true, connectTimeout: 8000, reconnectPeriod: 1500, keepalive: 20 }); } catch (e) { return; }
      me.cls.push(c);
      c.on('connect', function () {
        if (NET !== me) return;
        me.upAt = Date.now(); me.wasOn = true;
        c.subscribe([T + 'state', T + 'in', T + 'chat']);
        if (isHost()) {
          c.subscribe(T + 'j/+');
          // a host that comes back first listens for a newer host before it speaks, so it never overwrites the room with stale state
          if (me.fresh) { me.fresh = false; pubNow(); } else { me.hold = Date.now() + 1500; setTimeout(function () { if (NET === me) pubNow(); }, 1600); }
        } else sendIn({ t: 'join', name: me.name });
        netPaint();
      });
      c.on('close', function () { if (NET === me) netPaint(); });
      c.on('message', function (tp, pl) {
        if (NET !== me) return; var m; try { m = JSON.parse(pl.toString()); } catch (e) { return; }
        if (tp === T + 'chat') { chatIn(m); return; }
        if (isHost()) {
          if (tp === T + 'state') { hostSawState(m); return; }
          if (tp.indexOf(T + 'j/') === 0 && (!m.ts || Math.abs(Date.now() - m.ts) > 900000)) return;
          hostMsg(m);
        } else if (tp === T + 'in') { if (m && m.dev) { me.gseen = me.gseen || {}; me.gseen[m.dev] = Date.now(); } guestMove(m); }
        else if (tp === T + 'state') guestMsg(m);
      });
      c.on('error', function () {});
    });
    clearInterval(me.beatT);
    me.beatT = setInterval(function () {
      if (NET !== me) return;
      if (isHost()) { if (Date.now() - (me.lastPub || 0) >= 2900) pubNow(); autoSkip(); }
      else {
        sendIn({ t: 'here', name: me.name });
        if (!me.lobby || (!G && !me.lobby.players.some(function (p) { return p.dev === DEV; }))) sendIn({ t: 'join', name: me.name });
        failoverCheck(); autoReclaim();
      }
      netPaint();
    }, 3000);
  }
  /* If the host's phone goes quiet (minimised, locked, offline) the first player still online takes over, so the game carries on. */
  function failoverCheck() {
    if (!NET || isHost() || !NET.lobby || !netOn()) return;
    if (G && G.over) return;   // nothing left to run, and a stale copy must never be re-published over the results
    var r = G ? R() : null, lim = (r && r.done) ? 45000 : 15000, now = Date.now();   // a stand-in steps in after 15s of silence (45s on a scoreboard)
    if (now - Math.max(NET.gotAt || 0, NET.upAt || 0) < lim) return;
    var L = NET.lobby, hd = L.hd || (L.players[0] || {}).dev;
    if (!L.players.some(function (p) { return p.dev === DEV; })) return;
    var cands = L.players.filter(function (p) { return p.dev !== hd && (p.dev === DEV || now - ((NET.gseen || {})[p.dev] || 0) < 9000); });
    var cr = L.cr; cands.sort(function (a, b) { return (b.dev === cr) - (a.dev === cr); });   // the creator always comes first
    if (cands.length && cands[0].dev === DEV) promote();
  }
  /* the creator owns the room: as soon as they are back, hosting returns to them, with no button to press */
  function autoReclaim() {
    var L = NET && NET.lobby;
    if (!L || !L.so || document.hidden || !canReclaim() || Date.now() - (NET.gotAt || 0) > 6000) return;
    if (G && !G.over && R().done && cur !== 'game') return;
    promote(true);
  }
  /* turn limit: a player who does not play within the limit is skipped (the host keeps the clock; everyone sees the warning) */
  function syncTurn() {
    if (!isHost() || !G || G.over) return;
    var r = R(), key = r.n + ':' + r.entries.length + ':' + (r.skips || 0) + ':' + G.turn + ':' + (running && !r.done ? 1 : 0) + ':' + G.players.length;
    if (NET.tk !== key) { NET.tk = key; NET.turnAt = Date.now(); }
  }
  function turnLeftMs() {
    if (!NET || !G || G.over) return null;
    var tl = (G.settings.turn || 0) * 1000, r = R();
    if (!tl || !running || r.done) return null;
    if (isHost()) return Math.max(0, tl - (Date.now() - (NET.turnAt || Date.now())));
    return NET.turnEnds ? Math.max(0, NET.turnEnds - Date.now()) : null;
  }
  function turnWatch() {
    if (!isHost() || !G || G.over) return;
    syncTurn();
    if (turnLeftMs() !== 0) return;
    var cp = G.players[G.turn]; if (!cp) return;
    B.skip(G); save(); msg(''); paintGame(); toast(cp.dev === DEV ? 'Time’s up. Your turn was skipped.' : cp.name + ' ran out of time and was skipped'); notifyTurn();
  }
  function paintTurnWarn() {
    var el = $('[data-twarn]'); if (!el) return;
    var left = NET && cur === 'game' && G ? turnLeftMs() : null;
    if (left == null || left > 10000) { if (!el.hidden) el.hidden = true; return; }
    var cp = G.players[G.turn]; if (!cp) { el.hidden = true; return; }
    var sec = Math.max(1, Math.ceil(left / 1000)), mine = cp.dev === DEV, r = R();
    el.hidden = false; el.classList.toggle('is-me', mine);
    tx(el, mine ? 'Type or tap within ' + sec + 's or your turn is skipped' : cp.name + ' will be skipped in ' + sec + 's');
    var k = G.turn + ':' + r.entries.length + ':' + (r.skips || 0);
    if (mine && NET.twk !== k) { NET.twk = k; buzz([60, 40, 60]); }
  }
  setInterval(function () { turnWatch(); paintTurnWarn(); if (NET && !isHost() && cur === 'game' && G && running && G.settings.timer && !document.hidden) paintClock(); }, 400);
  /* the turn clock is an idle clock: any typing or touching by the player on turn starts it over */
  var lastAct = 0;
  function noteActivity() {
    if (!NET || !G || G.over || cur !== 'game' || !running) return;
    var tl = (G.settings.turn || 0) * 1000; if (!tl || !myTurn()) return;
    var now = Date.now(); if (now - lastAct < 700) return; lastAct = now;
    if (isHost()) { NET.turnAt = now; return; }
    NET.turnEnds = now + tl; sendIn({ t: 'act' });
  }
  ['keydown', 'input', 'pointerdown', 'touchstart', 'touchmove', 'focusin', 'scroll'].forEach(function (ev) { document.addEventListener(ev, noteActivity, { passive: true, capture: true }); });
  /* a player whose phone has gone quiet is skipped, so the others are never stuck waiting for their turn (after a 15 second grace) */
  function autoSkip() {
    if (!isHost() || !G || G.over) return;
    syncTurn();
    var r = R(), cp = G.players[G.turn];
    if (G.settings.turn || !NET.turnAt || Date.now() - NET.turnAt < 15000) return;
    if (!cp || !r.run || r.done || cp.dev === DEV || isOn(cp.dev)) return;
    B.skip(G); save(); msg(''); paintGame(); toast(cp.name + ' is away, skipped'); notifyTurn();
  }
  function promote(back) {
    var me = NET, L = me.lobby, T = NTOPIC + me.code + '/';
    var old = (L.players.filter(function (p) { return p.dev === L.hd; })[0] || L.players[0] || {}).name || 'The host';
    me.role = 'host'; me.ep = (me.ep || 0) + 1; me.hs = newHs(); me.seq = (me.lastSeq || 0) + 1; me.hold = 0; me.lastPub = 0; me.rej = null;
    me.seen = {}; L.players.forEach(function (p) { me.seen[p.dev] = Date.now(); });
    me.seen[L.hd] = 0; L.hd = DEV; L.so = back ? 0 : 1;   // so = a stand-in is hosting for the creator
    me.cls.forEach(function (c) { if (c.connected) try { c.subscribe(T + 'j/+'); } catch (e) {} });
    storeRoom(); toast(back ? 'You are hosting again.' : old + ' went quiet. You are hosting until they are back.'); buzz(25);
    if (G && !G.over) { var r = R(); if (r.done) roundOver(); else if (!r.run) { running = false; readyScreen(); } else { running = true; startClock(); } }
    pubNow(); netPaint(); if (cur === 'game') paintGame();
  }
  function hostSawState(st) {
    if (!st || st.v !== 1 || st.code !== NET.code || !st.lobby || st.hs === NET.hs) return;
    var ep = st.ep || 0, mine = NET.ep || 0;
    if (ep > mine || (ep === mine && String(st.hs) > String(NET.hs))) demote(st);
  }
  function demote(st) {
    var me = NET; stopClock(); running = false;
    me.role = 'guest'; me.lastSeq = 0; me.ep = 0; me.hs = ''; me.gotAt = 0; me.seen = null; me.lobby = st.lobby;
    storeRoom();
    var h = (st.lobby.players.filter(function (p) { return p.dev === st.lobby.hd; })[0] || {}).name || 'another player';
    toast(st.lobby.so ? h + ' is hosting for now' : 'Hosting moved to ' + h);
    guestMsg(st); autoReclaim();
  }
  function netSend(topic, obj, retain) { if (!NET || !NET.cls) return; var t = JSON.stringify(obj); NET.cls.forEach(function (c) { if (c.connected) try { c.publish(topic, t, { qos: 0, retain: !!retain }); } catch (e) {} }); }
  function netOn() { return !!(NET && NET.cls && NET.cls.some(function (c) { return c.connected; })); }
  function sendIn(m) {
    if (!NET) return; m.dev = DEV; if (m.t === 'join' || m.t === 'here') m.av = acctOn() ? window.BMA.myAv() : ''; netSend(NTOPIC + NET.code + '/in', m);
    if (!isHost() && m.t === 'join') { m.ts = Date.now(); netSend(NTOPIC + NET.code + '/j/' + DEV, m, true); NET.jq = true; }
  }
  function clearJoin() { if (!NET || !NET.jq || !NET.cls) return; NET.jq = false; NET.cls.forEach(function (c) { if (c.connected) try { c.publish(NTOPIC + NET.code + '/j/' + DEV, '', { qos: 0, retain: true }); } catch (e) {} }); }
  /* phones pause a page that is minimised or locked: reconnect the moment it is back, and keep the screen awake while a room is open */
  var wl = null, hiddenAt = 0;
  function keepAwake() { try { if (NET && !document.hidden && navigator.wakeLock && !wl) navigator.wakeLock.request('screen').then(function (l) { wl = l; l.addEventListener('release', function () { wl = null; }); }, function () {}); } catch (e) {} }
  function relink() {
    if (!NET || !window.mqtt) return;
    var me = NET; (me.cls || []).forEach(function (c) { try { c.end(true); } catch (e) {} });
    me.cls = []; netLink(); netPaint();
  }
  function resumeNet() {
    if (!NET) return; keepAwake();
    var away = hiddenAt ? Date.now() - hiddenAt : 0; hiddenAt = 0;
    if (away > 6000 || !netOn()) relink();
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) hiddenAt = Date.now(); else resumeNet(); });
  window.addEventListener('pageshow', function () { resumeNet(); });
  window.addEventListener('online', function () { if (NET) relink(); });
  window.addEventListener('focus', function () { if (NET && !netOn()) relink(); });
  function netClose() { if (!NET) return; clearJoin(); clearInterval(NET.beatT); (NET.cls || []).forEach(function (c) { try { c.end(true); } catch (e) {} }); NET = null; document.title = baseTitle; }
  function netPaint() { if (cur === 'room') paintRoom(); else if (cur === 'game' && G) { paintDock(); paintStrip(); } paintWait(); paintPeople(); }
  function storeRoom() {
    if (!NET) return;
    var o = isHost() ? { role: 'host', code: NET.code, name: NET.name, hs: NET.hs, ep: NET.ep || 0, seq: NET.seq, lobby: NET.lobby, G: G } : { role: 'guest', code: NET.code, name: NET.name };
    store(KEY_ROOM, o);
    if (savedIdx(NET.code) > -1) putSaved(o);
  }
  /* saved rooms: a list on this phone you can come back to */
  function rooms() { var a = load(KEY_ROOMS); return Array.isArray(a) ? a : []; }
  function savedIdx(code) { var a = rooms(); for (var i = 0; i < a.length; i++) if (a[i].code === code) return i; return -1; }
  function putSaved(o) {
    var a = rooms().filter(function (x) { return x.code !== o.code; });
    o = JSON.parse(JSON.stringify(o)); o.ts = Date.now(); a.unshift(o); store(KEY_ROOMS, a.slice(0, 12));
  }
  function dropSaved(code) { store(KEY_ROOMS, rooms().filter(function (x) { return x.code !== code; })); }
  function paintSaved() {
    var a = rooms(), sec = $('[data-savedsec]'); if (!sec) return;
    sec.hidden = !a.length;
    $('[data-saved]').innerHTML = a.map(function (x) {
      var host = x.role === 'host', n = x.lobby && x.lobby.players ? x.lobby.players.length : 0;
      return '<li class="wi"><b>' + esc(x.code) + ' <small>' + (host ? 'You host' + (n ? ' · ' + pl(n, 'player') : '') : 'Guest') + '</small></b><span><button class="btn" type="button" data-act="ropen" data-code="' + esc(x.code) + '">Open</button><button class="lnk" type="button" data-act="rrm" data-code="' + esc(x.code) + '">Remove</button></span></li>';
    }).join('');
  }
  function paintRoomBtns() {
    var sv = NET && savedIdx(NET.code) > -1;
    $$('[data-rsave]').forEach(function (b) { b.textContent = sv ? 'Saved ✓ (tap to unsave)' : 'Save room'; });
    $$('[data-rdel]').forEach(function (b) { b.hidden = !(NET && isHost()) || (b.hasAttribute('data-onl') && !NET); b.textContent = armed === 'del' ? 'Tap again to delete for everyone' : 'Delete room'; });
    $$('[data-onl]').forEach(function (b) { if (b.hasAttribute('data-rsave')) b.hidden = !NET; });
  }
  function saveRoomToggle() {
    if (!NET) return;
    if (savedIdx(NET.code) > -1) { dropSaved(NET.code); toast('Removed from saved rooms'); }
    else { storeRoom(); putSaved(isHost() ? { role: 'host', code: NET.code, name: NET.name, hs: NET.hs, ep: NET.ep || 0, seq: NET.seq, lobby: NET.lobby, G: G } : { role: 'guest', code: NET.code, name: NET.name }); toast('Room ' + NET.code + ' saved. Find it under Play online.'); }
    paintRoomBtns();
  }
  function deleteRoom(btn) {
    if (!NET || !isHost()) return;
    if (armed !== 'del') { armed = 'del'; clearTimeout(armT); armT = setTimeout(function () { armed = ''; paintRoomBtns(); }, 4000); paintRoomBtns(); return; }
    armed = '';
    var code = NET.code;
    NET.seq = (NET.seq || 0) + 1;
    netSend(NTOPIC + code + '/state', { v: 1, code: code, hs: NET.hs, ep: NET.ep || 0, seq: NET.seq, closed: 1, lobby: { hd: DEV, players: [], wait: [] }, G: null }, true);
    dropSaved(code); store(KEY_ROOM, null);
    setTimeout(function () { netClose(); }, 350);
    G = null; closeSheets(); $$('[data-ov]').forEach(function (o) { o.hidden = true; }); show('home'); toast('Room ' + code + ' deleted');
  }
  var armed = '', armT = null;
  function kick(dev, btn) {
    if (!isHost() || !NET.lobby || dev === DEV) return;
    if (armed !== 'k' + dev) { armed = 'k' + dev; clearTimeout(armT); armT = setTimeout(function () { armed = ''; paintPeople(); }, 3500); paintPeople(); return; }
    armed = '';
    var L = NET.lobby, p = L.players.filter(function (x) { return x.dev === dev; })[0]; if (!p) return;
    L.players = L.players.filter(function (x) { return x.dev !== dev; });
    L.kk = (L.kk || []).concat(dev); L.wait = (L.wait || []).filter(function (x) { return x.dev !== dev; });
    if (G && !G.over) {
      var gp = G.players.filter(function (x) { return x.dev === dev; })[0];
      if (gp) { gp.out = true; var r = R(); if (!r.done && G.players[G.turn] === gp) { B.skip(G, true); } }
      save();
    }
    toast(p.name + ' removed'); storeRoom(); pubNow(); if (G && cur === 'game') paintGame(); netPaint();
  }

  /* host: publish the whole game (retained, so late joiners get it at once) */
  var pubT = null;
  function pubSoon() { if (!isHost() || pubT) return; pubT = setTimeout(function () { pubT = null; pubNow(); }, 0); }
  function pubNow() {
    if (!isHost()) return;
    if (NET.hold && Date.now() < NET.hold) return;
    var on = {};
    if (NET.vq && (!G || G.over || R().entries.length !== NET.vq.n || !G.players[G.turn] || G.players[G.turn].dev !== NET.vq.dev)) NET.vq = null;
    var w = NET.lobby.wait; if (w && w.length) NET.lobby.wait = w.filter(function (x) { return Date.now() - (NET.seen[x.dev] || x.ts || 0) < 120000; });
    syncTurn(); NET.lastPub = Date.now();
    NET.lobby.players.forEach(function (p) { on[p.dev] = isOn(p.dev); });
    NET.seq = (NET.seq || 0) + 1;
    netSend(NTOPIC + NET.code + '/state', { v: 1, code: NET.code, hs: NET.hs, ep: NET.ep || 0, seq: NET.seq, lobby: NET.lobby, G: G, rej: NET.rej || null, vq: NET.vq || null, vs: (NET.vstrk && G && !G.over && NET.vstrk.k === vkey()) ? { dev: NET.vstrk.dev, n: NET.vstrk.n } : null, on: on, td: turnLeftMs(), cl: (NET.chat || []).slice(-15) }, true);
  }
  function syncLobby() { if (!isHost()) return; NET.lobby.cat = S.cat; NET.lobby.timer = S.timer; NET.lobby.limit = S.limit; NET.lobby.tl = S.tl; NET.lobby.sh = S.sh; NET.lobby.al = S.al; storeRoom(); pubSoon(); }
  function hostMsg(m) {
    if (!m || !m.dev || m.dev === DEV) return;
    var wasOn = isOn(m.dev); NET.seen[m.dev] = Date.now();
    var L = NET.lobby, p = L.players.filter(function (x) { return x.dev === m.dev; })[0];
    if (!p && (L.kk || []).indexOf(m.dev) > -1) { pubSoon(); return; }
    if (m.t === 'join' || m.t === 'here') {
      if (!p && m.t === 'join' && G) {
        if ((L.dec || []).indexOf(m.dev) > -1) { pubSoon(); return; }
        L.wait = L.wait || [];
        if (!L.wait.some(function (x) { return x.dev === m.dev; })) { L.wait.push({ dev: m.dev, name: cleanName(m.name), av: okAv(m.av), ts: Date.now() }); toast(cleanName(m.name) + ' wants to join'); buzz(20); storeRoom(); netPaint(); pubSoon(); }
        return;
      }
      if (!p && m.t === 'join' && !G) {
        if (L.players.length >= MAXP) return;
        L.players.push({ dev: m.dev, name: cleanName(m.name), av: okAv(m.av) }); toast(cleanName(m.name) + ' joined'); buzz(15);
        storeRoom(); paintRoom(); pubSoon(); return;
      }
      if (p && okAv(m.av) !== (p.av || '')) {
        p.av = okAv(m.av); var gp = G ? G.players.filter(function (x) { return x.dev === m.dev; })[0] : null; if (gp) gp.av = p.av; storeRoom(); pubSoon();
      }
      if (p && !G && m.name && cleanName(m.name) !== p.name) { p.name = cleanName(m.name); paintRoom(); pubSoon(); return; }
      if (!wasOn || m.t === 'join') { pubSoon(); netPaint(); }
      return;
    }
    if (m.t === 'bye') {
      NET.seen[m.dev] = 0;
      if (!G) L.players = L.players.filter(function (x) { return x.dev !== m.dev; });
      if (p) toast(p.name + ' left');
      storeRoom(); netPaint(); pubSoon(); return;
    }
    if (!G) return;
    if (m.t === 'act') { var ca = G.players[G.turn]; if (ca && ca.dev === m.dev && !R().done) NET.turnAt = Date.now(); return; }
    if (m.t === 'vreq' || m.t === 'vouch' || m.t === 'vno' || m.t === 'vcancel') { vouchMsg(m); return; }
    var r = R(), cp = G.players[G.turn];
    if (!cp || cp.dev !== m.dev || r.done || !r.run) { pubSoon(); return; }
    if (m.t === 'skip') { if (m.n != null && m.n !== r.entries.length) { pubSoon(); return; } B.skip(G); save(); msg(''); paintGame(); toast(cp.name + ' skipped'); notifyTurn(); return; }
    if (m.t === 'word') {
      getList(r.cat).then(function (Lst) { hostAdd(m, Lst); }, function () { hostAdd(m, null); });
    }
  }
  /* vouching: a word that isn't in the list counts if another player vouches for it */
  function vouchMsg(m) {
    if (!isHost() || !G || G.over) return;
    var r = R(), cp = G.players[G.turn], vq = NET.vq;
    if (m.t === 'vreq') {
      if (!cp || cp.dev !== m.dev || r.done || !r.run || m.n !== r.entries.length) { pubSoon(); return; }
      var c = B.check(G, m.w, null); if (!c.ok) { pubSoon(); return; }
      if (vstrikes(m.dev) >= VMAX) { NET.rej = { dev: m.dev, w: c.w, why: 'vmax', k: Date.now() }; pubNow(); if (m.dev === DEV) vouchDenied(c.w); return; }
      NET.vq = { w: c.w, n: r.entries.length, dev: m.dev, name: cp.name, k: Date.now(), no: [], yes: [] };
      vqTally(NET.vq); NET.turnAt = Date.now(); paintVq(); pubNow(); return;
    }
    if (!vq) return;
    if (m.t === 'vcancel') { if (m.dev === vq.dev) { NET.vq = null; paintVq(); pubNow(); } return; }
    if (m.dev === vq.dev || m.k !== vq.k) return;
    if (!G.players.some(function (p) { return p.dev === m.dev && !p.out; })) return;
    if (m.t !== 'vouch' && m.t !== 'vno') return;
    vq.yes = vq.yes || []; vq.no = vq.no || [];
    vq.yes = vq.yes.filter(function (d) { return d !== m.dev; }); vq.no = vq.no.filter(function (d) { return d !== m.dev; });
    (m.t === 'vouch' ? vq.yes : vq.no).push(m.dev);
    var t = vqTally(vq);
    if (t.yes >= t.need) { vouchAccept(); return; }
    if (t.no > t.voters - t.need) { var vk = vkey(); NET.vstrk = { k: vk, dev: vq.dev, n: vstrikes(vq.dev) + 1 }; NET.rej = { dev: vq.dev, w: vq.w, why: 'vno', n: NET.vstrk.n, k: Date.now() }; NET.vq = null; if (vq.dev === DEV) vouchDenied(vq.w); }
    paintVq(); pubNow();
  }
  /* a word outside the list counts only when at least 60% of the other players in the room vouch for it */
  function vqTally(vq) {
    var voters = G.players.filter(function (p) { return p.dev && p.dev !== vq.dev && !p.out && isOn(p.dev); }).map(function (p) { return p.dev; });
    vq.yes = (vq.yes || []).filter(function (d) { return voters.indexOf(d) > -1; });
    vq.no = (vq.no || []).filter(function (d) { return voters.indexOf(d) > -1; });
    vq.voters = voters.length; vq.need = Math.max(1, Math.ceil(voters.length * 0.6 - 1e-9));
    return { voters: voters.length, need: vq.need, yes: vq.yes.length, no: vq.no.length };
  }
  /* three strikes: a player whose vouches are refused three times in one turn must play a word from the list (or risk being skipped) */
  var VMAX = 3;
  function vkey() { var r = R(); return r.n + ':' + r.entries.length + ':' + (r.skips || 0) + ':' + G.turn; }
  function vstrikes(dev) { var v = NET && NET.vstrk; return v && G && v.k === vkey() && v.dev === dev ? v.n : 0; }
  function myStrikes() { if (!NET || !G) return 0; if (isHost()) return vstrikes(DEV); return NET.vs && NET.vs.dev === DEV ? NET.vs.n : 0; }
  function vreqBtn() { return myStrikes() >= VMAX ? '<span class="vq__x">No vouches left this turn. Play a word from the list or your turn can be skipped.</span>' : '<button type="button" data-act="vreq">Ask the room to vouch</button>'; }
  function vouchDenied(w) { NET.lastRej = null; var n = myStrikes(); msg('<span>The room didn’t vouch for <b>' + esc(w) + '</b>. Strike ' + n + ' of ' + VMAX + '.</span>' + (n >= VMAX ? '<span class="vq__x">No vouches left this turn. Play a word from the list or your turn can be skipped.</span>' : '') + '<button type="button" class="is-pri" data-act="retry">Try another</button>', true); shake(); }
  function vouchAccept() {
    var vq = NET.vq; if (!vq) return;
    var r = R(), cp = G.players[G.turn];
    if (!cp || cp.dev !== vq.dev || r.done || r.entries.length !== vq.n) { NET.vq = null; pubNow(); return; }
    NET.vq = null; NET.rej = null;
    getList(r.cat).then(function (L) { return L; }, function () { return null; }).then(function (L) {
      if (R() !== r || r.done || r.entries.length !== vq.n) return;
      var e = B.add(G, vq.w, { mav: L ? L.mav : null, forced: true });
      lastAdded = r.entries.length - 1;
      if (vq.dev === DEV) { $('[data-in]').value = ''; msg(''); }
      save(); celebrate(e); paintVq(); paintGame(); lastAdded = -1; toast('Vouched: ' + vq.w + ' counts');
      if (r.done) { roundOverSoon(r); pubNow(); return; }
      pubNow(); notifyTurn();
    });
  }
  function paintVq() {
    var el = $('[data-vq]'); if (!el) return;
    var vq = NET && NET.vq;
    if (!vq || cur !== 'game' || !G || G.over) { if (!el.hidden) { el.hidden = true; el.innerHTML = ''; el._k = ''; } return; }
    var mine = vq.dev === DEV, voted = (vq.no || []).indexOf(DEV) > -1 || (vq.yes || []).indexOf(DEV) > -1, said = (vq.yes || []).indexOf(DEV) > -1 ? 'yes' : 'no';
    var cnt = (vq.yes || []).length + ' of ' + (vq.need || 1) + ' needed';
    var k = vq.k + ':' + (mine ? 'm' : voted ? 'v' + said : 'o') + ':' + (vq.yes || []).length + ':' + (vq.need || 1); if (el._k === k && !el.hidden) return; el._k = k;
    el.hidden = false;
    if (mine) el.innerHTML = '<span>Waiting for the room to vouch for <b>' + esc(vq.w) + '</b> · ' + cnt + ' (60% must agree)</span><button type="button" data-act="vcancel">Cancel</button>';
    else if (voted) el.innerHTML = '<span>You said ' + said + ' to <b>' + esc(vq.w) + '</b> · ' + cnt + '. Waiting for the others.</span>';
    else el.innerHTML = '<span><b>' + esc(vq.name) + '</b> played <b>' + esc(vq.w) + '</b>, which isn’t in our list. Is it a real word? ' + cnt + '. 60% must agree.</span><span class="vq__b"><button type="button" class="is-pri" data-act="vouch">Vouch for it</button><button type="button" data-act="vno">Not right</button></span>';
  }
  function vouchSend(t) {
    var vq = NET && NET.vq; if (!vq) return;
    var m = { t: t, k: vq.k };
    if (isHost()) { m.dev = DEV; vouchMsg(m); } else sendIn(m);
    if (!isHost()) { if (t === 'vno') vq.no = (vq.no || []).concat(DEV); else vq.yes = (vq.yes || []).concat(DEV); }
    el_vqRefresh();
  }
  function el_vqRefresh() { var el = $('[data-vq]'); if (el) el._k = ''; paintVq(); }
  function hostAdd(m, Lst) {
    var r = R(), cp = G.players[G.turn];
    if (!cp || cp.dev !== m.dev || r.done || m.n !== r.entries.length) { pubSoon(); return; }
    var c = B.check(G, m.w, Lst ? Lst.full : null);
    if (!c.ok) { NET.rej = { dev: m.dev, w: c.w, why: c.why, k: Date.now() }; pubNow(); return; }
    NET.rej = null;
    var e = B.add(G, c.w, { mav: Lst ? Lst.mav : null });
    lastAdded = r.entries.length - 1;
    save(); celebrate(e); paintGame(); lastAdded = -1;
    if (r.done) { roundOverSoon(r); return; }
    notifyTurn();
  }

  /* guest: follow the host's game */
  function gsig(g) {
    var r = g.rounds[g.rounds.length - 1], l = r.entries[r.entries.length - 1];
    return [g.rounds.length, r.n, r.cat, r.entries.length, l ? l.w : '', r.skips || 0, (r.gaps || []).length, g.turn, r.done ? 1 : 0, r.run ? 1 : 0, g.over ? 1 : 0, g.players.length, g.players.map(function (p) { return p.out ? 1 : 0; }).join(''), g.settings.limit || 0].join('|');
  }
  function guestMsg(st) {
    if (!st || st.v !== 1 || st.code !== NET.code || !st.lobby) return;
    if (st.closed) { var cc = NET.code; dropSaved(cc); store(KEY_ROOM, null); netClose(); G = null; closeSheets(); $$('[data-ov]').forEach(function (o) { o.hidden = true; }); show('online'); toast('Room ' + cc + ' was closed by the host.'); return; }
    if ((st.lobby.kk || []).indexOf(DEV) > -1) { var kc = NET.code; dropSaved(kc); store(KEY_ROOM, null); netClose(); G = null; closeSheets(); $$('[data-ov]').forEach(function (o) { o.hidden = true; }); show('online'); toast('The host removed you from the room.'); return; }
    var sep = st.ep || 0;
    if (sep < (NET.ep || 0)) return;
    if (sep === (NET.ep || 0) && NET.hs && st.hs !== NET.hs && String(st.hs) < String(NET.hs)) return;
    if (st.hs === NET.hs && st.seq <= NET.lastSeq) return;
    NET.ep = sep; chatMerge(st.cl); NET.turnEnds = st.td != null ? Date.now() + st.td : 0;
    NET.hs = st.hs; NET.lastSeq = st.seq; NET.gotAt = Date.now(); NET.lobby = st.lobby; NET.on = st.on || {}; NET.vq = st.vq || null; NET.vs = st.vs || null; paintVq(); setTimeout(autoReclaim, 0);
    if (NET.jq && st.lobby.players.some(function (p) { return p.dev === DEV; })) clearJoin();
    clearTimeout(NET.noRoomT);
    if (!st.G) {
      var hadG = !!G; NET.gsig = null; NET.live = false; G = null;
      if (hadG) { closeSheets(); $$('[data-ov]').forEach(function (o) { o.hidden = true; }); }   // only when a game has just ended; a heartbeat must never close the chat box
      if (cur !== 'room') show('room'); else paintRoom();
      return;
    }
    if (!st.G.players.some(function (p) { return p.dev === DEV; })) {
      var wasLive = NET.live || !!G; NET.live = true; G = null;
      if (!wasLive) { closeSheets(); $$('[data-ov]').forEach(function (o) { o.hidden = true; }); }
      if ((st.lobby.dec || []).indexOf(DEV) > -1) { netClose(); store(KEY_ROOM, null); show('online'); toast('The host couldn’t add you to this game.'); return; }
      if (cur !== 'room') show('room'); else paintRoom();
      return;
    }
    NET.live = false;
    if (NET.jq) clearJoin();
    var prev = G, wasMine = prev && myTurn();
    var nsig = gsig(st.G), same = NET.gsig === nsig && !!prev && cur === 'game'; NET.gsig = nsig;
    var pr = prev && prev.rounds.length === st.G.rounds.length ? prev.rounds[prev.rounds.length - 1] : null;
    G = st.G;
    var r = R();
    getList(r.cat);
    if (cur !== 'game') show('game');
    if (pr && r.entries.length === pr.entries.length + 1) {
      lastAdded = r.entries.length - 1;
      var e = r.entries[lastAdded];
      if (e.p === meIdx()) { $('[data-in]').value = ''; msg(''); }
      celebrate(e);
    }
    if (NET.pend && (r.entries.length > NET.pend.n || !myTurn())) NET.pend = null;
    if (st.rej && st.rej.dev === DEV && st.rej.k !== NET.rejSeen) {
      NET.rejSeen = st.rej.k; NET.pend = null;
      var t = { unknown: '<b>' + esc(st.rej.w) + '</b> isn’t in our ' + esc(B.catName(r.cat)) + ' list.', repeat: '<b>' + esc(st.rej.w) + '</b> is already on the board.', short: 'Use at least ' + B.RULES.MIN_LEN + ' letters.', order: orderMsg(), letter: orderMsg(), vno: 'The room didn’t vouch for <b>' + esc(st.rej.w) + '</b>. Strike ' + (st.rej.n || myStrikes()) + ' of ' + VMAX + '.', vmax: 'No vouches left this turn. Play a word from the list or your turn can be skipped.' }[st.rej.why] || 'Try another word.';
      if (st.rej.why === 'unknown') NET.lastRej = { w: st.rej.w, n: r.entries.length };
      msg('<span>' + t + '</span>' + (st.rej.why === 'vno' && (st.rej.n || 0) >= VMAX ? '<span class="vq__x">No vouches left this turn. Play a word from the list or your turn can be skipped.</span>' : '') + (st.rej.why === 'unknown' ? vreqBtn() : '') + (st.rej.why === 'unknown' || st.rej.why === 'vno' || st.rej.why === 'vmax' ? '<button type="button" class="is-pri" data-act="retry">Try another</button>' : ''), true); shake();
    }
    running = !!(r.run && !r.done);
    NET.clk = { n: r.n, left: r.left, at: Date.now() };
    if (same && !G.over && !r.done) {   // a heartbeat with nothing new: refresh clock, chips and presence only, so nothing flickers or loses focus
      paintClock(); paintStrip(); paintBadge(); paintPeople(); lastAdded = -1;
      return;
    }
    paintGame(); lastAdded = -1;
    if (G.over) { if ($('[data-ov="final"]').hidden) finish(); return; }
    ov('final', false);
    if (r.done) { ov('ready', false); if ($('[data-ov="summary"]').hidden) roundOver(); return; }
    ov('summary', false);
    if (!r.run) readyScreen(); else ov('ready', false);
    if (running && myTurn() && !wasMine) yourTurn();
    else if (running && myTurn()) focusIn();
  }
  // Moves travel straight to every phone; each phone applies them with the same rules and word list,
  // so words land at once. The host's copy of the game still has the final say a moment later.
  function applyMove(m, L) {
    if (!G) return false;
    var r = R(), cp = G.players[G.turn];
    if (!cp || cp.dev !== m.dev || r.done || !r.run || m.n !== r.entries.length) return false;
    if (m.t === 'skip') { B.skip(G); msg(''); paintGame(); if (cp.dev !== DEV) toast(cp.name + ' skipped'); notifyTurn(); return true; }
    var c = B.check(G, m.w, L ? L.full : null);
    if (!c.ok) return false;
    var e = B.add(G, c.w, { mav: L ? L.mav : null });
    lastAdded = r.entries.length - 1;
    if (m.dev === DEV) { $('[data-in]').value = ''; msg(''); }
    celebrate(e); paintGame(); lastAdded = -1;
    if (NET && !isHost()) NET.gsig = gsig(G);   // the host's echo of this same move then changes nothing on screen
    if (!r.done) notifyTurn();
    return true;
  }
  function guestMove(m) {
    if (!m || !G || (m.t !== 'word' && m.t !== 'skip') || m.dev === DEV) return;
    if (m.t === 'skip') { applyMove(m, null); return; }
    getList(R().cat).then(function (L) { applyMove(m, L); }, function () {});
  }
  function guestSubmit(raw) {
    var r = R(), n = r.entries.length;
    var L0 = null;
    function send(w) {
      var at = Date.now();
      sendIn({ t: 'word', w: w, n: n });
      if (L0 && applyMove({ t: 'word', dev: DEV, w: w, n: n }, L0)) return;
      NET.pend = { w: w, n: n, at: at }; paintDock();
      setTimeout(function () { if (NET && NET.pend && NET.pend.at === at) { NET.pend = null; paintDock(); toast('Not sent. Check your connection and try again.'); } }, 7000);
    }
    getList(r.cat).then(function (L) {
      L0 = L;
      var c = B.check(G, raw, L.full);
      if (!c.ok) {
        var t = { unknown: '<b>' + esc(c.w) + '</b> isn’t in our ' + esc(B.catName(r.cat)) + ' list.', repeat: '<b>' + esc(c.w) + '</b> is already on the board.', order: orderMsg(), letter: orderMsg(), short: 'Use at least ' + B.RULES.MIN_LEN + ' letters.' }[c.why] || 'Try another word.';
        if (c.why === 'unknown') NET.lastRej = { w: c.w, n: r.entries.length };
        msg('<span>' + t + '</span>' + (c.why === 'unknown' ? vreqBtn() : '') + '<button type="button" class="is-pri" data-act="retry">Try another</button>', true); shake(); return;
      }
      send(c.w);
    }, function () { send(B.norm(raw)); });
  }
  var baseTitle = document.title, titleT = null;
  function yourTurn() {
    buzz([30, 60, 30]); toast('Your turn'); focusIn();
    if (document.hidden) { clearInterval(titleT); var f = 0; titleT = setInterval(function () { document.title = (f = !f) ? '● Your turn · Bemaamoo' : baseTitle; if (!document.hidden) { clearInterval(titleT); document.title = baseTitle; } }, 1000); }
  }
  function notifyTurn() { if (myTurn() && running) yourTurn(); }

  /* screens: create / join, and the room lobby */
  function paintOnline() {
    var n = $('[data-oname]'); if (!n.value) n.value = (acctOn() && window.BMA.profile && window.BMA.profile.name) || load('bmo_name') || (S.names[0] || '');
    var q = new URLSearchParams(location.search).get('room');
    if (q && !$('[data-ocode]').value) $('[data-ocode]').value = q.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    $('[data-oerr]').hidden = true;
  }
  function oName() { var v = cleanName($('[data-oname]').value); store('bmo_name', v); return v; }
  function createRoom() {
    var name = oName();
    netClose();
    NET = { role: 'host', code: newCode(), name: name, hs: newHs(), ep: 0, fresh: true, seq: 0, seen: {}, lobby: { hd: DEV, cr: DEV, players: [{ dev: DEV, name: name, av: acctOn() ? window.BMA.myAv() : '' }], cat: S.cat, timer: S.timer, limit: S.limit, tl: S.tl, sh: S.sh, al: S.al } };
    G = null; storeRoom(); show('room');
    loadMqtt().then(netLink, function () { toast('Couldn’t go online. Check your connection.'); });
  }
  function joinRoom(code, name) {
    code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (code.length !== 4) { var er = $('[data-oerr]'); er.textContent = 'Room codes have 4 letters.'; er.hidden = false; return; }
    netClose();
    NET = { role: 'guest', code: code, name: name, lastSeq: 0, lobby: null };
    G = null; storeRoom(); show('room');
    var me = NET;
    me.noRoomT = setTimeout(function () { if (NET === me && !me.lobby) { $('[data-rwait]').textContent = 'No open room with code ' + code + ' yet. Check the code, or ask the host to open Bemaamoo.'; } }, 9000);
    loadMqtt().then(netLink, function () { toast('Couldn’t go online. Check your connection.'); });
  }
  function resumeRoom() {
    var rm = load(KEY_ROOM); if (!rm || !rm.code) return;
    if (rm.role === 'guest') { joinRoom(rm.code, rm.name); return; }
    netClose();
    NET = { role: 'host', code: rm.code, name: rm.name, hs: newHs(), ep: rm.ep || 0, seq: 0, seen: {}, lobby: rm.lobby };
    if (NET.lobby && !NET.lobby.hd) NET.lobby.hd = DEV;
    if (NET.lobby && !NET.lobby.cr && NET.lobby.hd === DEV) NET.lobby.cr = DEV;
    if (NET.lobby && NET.lobby.tl === 20) NET.lobby.tl = 15;
    G = rm.G || null;
    if (G) {
      if (G.over) { G = null; }
      else { var r = R(); r.run = false; running = false; getList(r.cat); show('game'); if (r.done) roundOver(); else readyScreen(); }
    }
    if (!G) show('room');
    loadMqtt().then(netLink, function () { toast('Couldn’t go online. Check your connection.'); });
  }
  function startOnline() {
    if (!isHost() || NET.lobby.players.length < 2) return;
    syncLobby();
    G = B.create({ players: NET.lobby.players.map(function (p) { return { name: p.name }; }), category: S.cat, timer: S.timer, limit: S.limit, fixed: true, shuffle: !!NET.lobby.sh, alpha: +NET.lobby.al || 0 });
    G.players.forEach(function (p, i) { p.dev = NET.lobby.players[i].dev; if (NET.lobby.players[i].av) p.av = NET.lobby.players[i].av; });
    G.settings.turn = NET.lobby.tl != null && NET.lobby.tl !== 20 ? NET.lobby.tl : 15;
    NET.rej = null;
    getList(S.cat); save(); show('game'); readyScreen();
  }
  function roomLink() { return location.origin + '/bemaamoo/?room=' + NET.code; }
  function shareRoom(how) {
    var url = roomLink(), text = 'Play Bemaamoo with me. Room ' + NET.code + ': ' + url;
    if (how === 'wa') { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); return; }
    if (how !== 'copy' && navigator.share) { navigator.share({ title: 'Bemaamoo', text: 'Play Bemaamoo with me. Room ' + NET.code, url: url }).catch(function () {}); return; }
    try { navigator.clipboard.writeText(url).then(function () { toast('Link copied'); }, function () { toast(url); }); } catch (e) { toast(url); }
  }
  function paintRoom() {
    if (!NET) return;
    var host = isHost(), L = NET.lobby;
    $('[data-rcode]').textContent = NET.code;
    $('[data-rnet]').textContent = netOn() ? (host ? 'Online · keep page open' : (hostStale() ? 'Host is away' : 'Online')) : (NET.wasOn ? 'Reconnecting…' : 'Connecting…');
    $('[data-rnet]').classList.toggle('is-on', netOn());
    if (!L) { paintPeople(); $('[data-rhost]').hidden = true; $('[data-rguest]').hidden = false; $('[data-rwait]').textContent = 'Connecting to room ' + NET.code + '…'; $('[data-ostart]').hidden = true; return; }
    $('[data-rhost]').hidden = !host; $('[data-rguest]').hidden = host;
    if (host) {
      $('[data-rcatname]').textContent = B.catName(S.cat); $('[data-rcatgroup]').textContent = groupOf(S.cat);
      seg('[data-ropt="timer"]', TIMERS, S.timer, 'timer'); seg('[data-ropt="limit"]', LIMITS, S.limit, 'limit'); seg('[data-ropt="turn"]', TURNS, S.tl, 'tl'); seg('[data-ropt="order"]', ORDERS, S.sh ? 1 : 0, 'sh'); seg('[data-ropt="alpha"]', ALPHA, +S.al || 0, 'al');
      var st = $('[data-ostart]'); st.hidden = false; st.disabled = L.players.length < 2;
      st.textContent = L.players.length < 2 ? 'Waiting for players to join' : 'Start game · ' + pl(L.players.length, 'player');
    } else {
      $('[data-ostart]').hidden = true;
      var tl = function (a, v) { for (var i = 0; i < a.length; i++) if (a[i][0] === v) return a[i][1]; return v; };
      $('[data-rwait]').textContent = NET.live ? 'A game is in progress. ' + hostName() + ' can add you, and you jump in on the next turn. You can chat while you wait.' : (hostStale() ? hostName() + ' looks to be away. You are in the queue and will join as soon as they are back. ' : 'Waiting for ' + hostName() + ' to start. ') + B.catName(L.cat) + ' · timer ' + tl(TIMERS, L.timer) + ' · words per round ' + tl(LIMITS, L.limit) + '.';
    }
    paintWait(); paintPeople(); paintChat(); paintRoomBtns();
  }

  /* ---------- waiting list, lobby sheet and chat ---------- */
  function paintWait() {
    var L = NET && NET.lobby, w = (L && L.wait) || [], host = isHost();
    $$('[data-wl]').forEach(function (ul) {
      var wh = w.map(function (x) {
        return '<li class="wi"><b>' + esc(x.name) + '</b><span>' + (host && G ? '<button class="btn" type="button" data-act="wadd" data-dev="' + esc(x.dev) + '">Add to game</button><button class="lnk" type="button" data-act="wno" data-dev="' + esc(x.dev) + '">Not now</button>' : '<small>waiting</small>') + '</span></li>';
      }).join('') + (host && G ? 'h' : 'g');
      if (ul._h !== wh) { ul._h = wh; ul.innerHTML = wh.slice(0, -1); }
      var sec = ul.closest('[data-wlsec]'); if (sec) setp(sec, 'hidden', !w.length);
    });
    paintBadge();
  }
  function paintBadge() {
    var nc = NET && NET.unread || 0, np = isHost() && NET && NET.lobby && NET.lobby.wait ? NET.lobby.wait.length : 0;
    $$('[data-bdgc]').forEach(function (b) { setp(b, 'hidden', !nc); tx(b, String(nc > 9 ? '9+' : nc)); });
    $$('[data-bdgp]').forEach(function (b) { setp(b, 'hidden', !np); tx(b, String(np > 9 ? '9+' : np)); });
  }
  function canReclaim() { var L = NET && NET.lobby; return !!(L && L.cr === DEV && !isHost() && L.players.some(function (p) { return p.dev === DEV; }) && netOn()); }
  function paintPeople() {
    if (!NET) return;
    var L = NET.lobby, w = (L && L.wait) || [];
    var rc = !canReclaim(); $$('[data-reclaim]').forEach(function (b) { setp(b, 'hidden', rc); });
    var list = L ? L.players.slice() : [];
    if (L && !isHost() && !G && !NET.live && !list.some(function (p) { return p.dev === DEV; })) list.push({ dev: DEV, name: NET.name, joining: 1 });
    $$('[data-pcount]').forEach(function (e) { tx(e, L ? list.length + (list.length === 1 ? ' person in the room' : ' people in the room') : 'Connecting…'); });
    $$('[data-wcount]').forEach(function (e) { tx(e, w.length ? w.length + ' waiting to join' : 'Tap to see who is here'); });
    $$('[data-ppl-n]').forEach(function (e) { tx(e, String(list.length)); });
    var sh = $('[data-sheet="people"]'); if (!sh || sh.hidden || !L) return;
    var hd = L.hd || L.players[0].dev;
    tx($('[data-ptitle]'), 'Room ' + NET.code + ' · ' + list.length + (list.length === 1 ? ' person' : ' people'));
    var lp = $('[data-lplayers]'), lh = list.map(function (p, i) {
      return '<li class="rp' + (isOn(p.dev) ? '' : ' is-off') + '">' + dotHtml(p.av, i) + '<b>' + esc(p.name) + '</b><small>' + (p.dev === hd ? 'Host' : '') + (p.dev === DEV ? (p.dev === hd ? ' · you' : 'You') : '') + (p.joining ? ' · joining…' : '') + (isOn(p.dev) ? '' : ' · away') + '</small>' + (isHost() && p.dev !== DEV && !p.joining ? '<button class="kick' + (armed === 'k' + p.dev ? ' is-arm' : '') + '" type="button" data-act="kick" data-dev="' + esc(p.dev) + '">' + (armed === 'k' + p.dev ? 'Tap to confirm' : 'Remove') + '</button>' : '') + '</li>';
    }).join('');
    if (lp._h !== lh) { lp._h = lh; lp.innerHTML = lh; }
  }
  function chatOpen() { var sh = $('[data-sheet="chat"]'); return !!(sh && !sh.hidden); }
  function chatIn(m, quiet) {
    if (!NET || !m || !m.id || !m.txt || !m.dev) return;
    NET.chat = NET.chat || [];
    for (var i = 0; i < NET.chat.length; i++) if (NET.chat[i].id === m.id) return;
    NET.chat.push({ id: String(m.id).slice(0, 40), dev: String(m.dev).slice(0, 20), name: String(m.name || 'Player').slice(0, 18), txt: String(m.txt).slice(0, 300), ts: +m.ts || Date.now() });
    NET.chat.sort(function (a, b) { return a.ts - b.ts; });
    if (NET.chat.length > 60) NET.chat.shift();
    if (!quiet && m.dev !== DEV && !chatOpen()) NET.unread = (NET.unread || 0) + 1;
    if (!quiet) { paintChat(); paintBadge(); }
  }
  function chatMerge(arr) { if (!arr || !arr.length) return; var n = NET.chat ? NET.chat.length : 0; arr.forEach(function (m) { chatIn(m, true); }); if (NET.chat && NET.chat.length !== n) paintChat(); }
  function paintChat() {
    if (!NET) return;
    var list = NET.chat || [];
    $$('[data-chatlog]').forEach(function (el) {
      if (!el.offsetParent && el.getClientRects().length === 0) return;
      var ck = list.length + ':' + (list.length ? list[list.length - 1].id : '');
      if (el._ck === ck) return; el._ck = ck;
      var near = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      el.innerHTML = list.length ? list.map(function (x) { return '<div class="cm' + (x.dev === DEV ? ' is-me' : '') + '"><small>' + (x.dev === DEV ? 'You' : esc(x.name)) + '</small><p>' + esc(x.txt) + '</p></div>'; }).join('') : '<p class="cm__e">No messages yet. Say hi.</p>';
      if (near || !el._seen) el.scrollTop = el.scrollHeight; el._seen = true;
    });
  }
  function chatSend(txt) {
    if (!NET) return; txt = String(txt || '').replace(/\s+/g, ' ').trim().slice(0, 300); if (!txt) return;
    var now = Date.now(); if (now - (NET.lastChat || 0) < 600) return; NET.lastChat = now;
    var m = { id: DEV + now.toString(36) + Math.random().toString(36).slice(2, 4), dev: DEV, name: NET.name, txt: txt, ts: now };
    netSend(NTOPIC + NET.code + '/chat', m); chatIn(m);
  }
  function addMid(dev) {
    if (!isHost() || !G || G.over) return;
    var L = NET.lobby, w = (L.wait || []).filter(function (x) { return x.dev === dev; })[0]; if (!w) return;
    if (G.players.length >= MAXP) { toast('The room is full (' + MAXP + ' players).'); return; }
    L.wait = L.wait.filter(function (x) { return x.dev !== dev; });
    L.players.push({ dev: w.dev, name: w.name, av: w.av || '' });
    G.players.push({ id: G.players.length, name: w.name, dev: w.dev, av: w.av || '' });
    var ro = R().order; if (ro) ro.push(G.players.length - 1);
    NET.seen[dev] = Date.now(); save(); toast(w.name + ' added to the game'); paintGame(); netPaint();
  }
  function declineWait(dev) {
    if (!isHost()) return; var L = NET.lobby;
    L.wait = (L.wait || []).filter(function (x) { return x.dev !== dev; }); L.dec = (L.dec || []).concat(dev);
    storeRoom(); pubSoon(); netPaint();
  }

  /* the chat popup follows the visible area, so it stays above the phone keyboard */
  function vvFit() {
    var v = window.visualViewport, d = document.documentElement.style;
    if (!v) { d.removeProperty('--vvh'); d.removeProperty('--vvt'); return; }
    d.setProperty('--vvh', v.height + 'px'); d.setProperty('--vvt', v.offsetTop + 'px');
    var lg = $('[data-sheet="chat"] [data-chatlog]'); if (lg && chatOpen()) lg.scrollTop = lg.scrollHeight;
  }
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', vvFit); window.visualViewport.addEventListener('scroll', vvFit); }

  /* ---------- events ---------- */
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('button,[data-act]');
    if (!t) { if (ev.target.classList && ev.target.classList.contains('sheet')) closeSheets(); return; }
    var a = t.getAttribute('data-act');
    if (t.hasAttribute('data-pc')) { S.count = +t.getAttribute('data-pc'); saveSetup(); paintSetup(); return; }
    if (t.hasAttribute('data-set')) { S[t.getAttribute('data-set')] = +t.getAttribute('data-v'); saveSetup(); if (cur === 'room') { syncLobby(); paintRoom(); } else paintSetup(); return; }
    if (t.hasAttribute('data-cat')) {
      var k = t.getAttribute('data-cat');
      closeSheets();
      if (catMode === 'setup') { S.cat = k; saveSetup(); if (cur === 'room') { syncLobby(); paintRoom(); } else paintSetup(); getList(k); }
      else nextRound(k);
      return;
    }
    switch (a) {
      case 'help': openSheet('help'); break;
      case 'perks': openSheet('perks'); paintPerks(); break;
      case 'close': closeSheets(); if (cur === 'game' && running) focusIn(); break;
      case 'setup': show('setup'); break;
      case 'home': leave(); break;
      case 'continue': resume(); break;
      case 'cats': openCats('setup'); break;
      case 'start': if (gateAcct()) break; startGame(); break;
      case 'go': go(); break;
      case 'menu':
        $$('[data-ho]').forEach(function (b) { b.hidden = !!(NET && !isHost()); });
        $('[data-act="home"]', $('[data-sheet="menu"]')).textContent = NET ? (isHost() ? 'Leave (the room stays saved on this phone)' : 'Leave the room') : 'Leave (your game is saved)';
        paintRoomBtns(); openSheet('menu'); break;
      case 'people': if (!NET) break; openSheet('people'); paintPeople(); paintWait(); break;
      case 'chat': if (!NET) break; NET.unread = 0; openSheet('chat'); $$('[data-chatlog]').forEach(function (e) { e._seen = false; e._ck = null; }); vvFit(); paintBadge(); paintChat(); setTimeout(function () { var i = $('[data-sheet="chat"] [data-chatin]'); if (i) i.focus(); }, 60); break;
      case 'reclaim': if (canReclaim()) { promote(true); closeSheets(); } break;
      case 'kick': kick(t.getAttribute('data-dev'), t); break;
      case 'rsave': saveRoomToggle(); break;
      case 'rdel': deleteRoom(t); break;
      case 'ropen': var sr = rooms().filter(function (x) { return x.code === t.getAttribute('data-code'); })[0]; if (sr) { store(KEY_ROOM, sr); resumeRoom(); } break;
      case 'rrm': dropSaved(t.getAttribute('data-code')); paintSaved(); break;
      case 'wadd': addMid(t.getAttribute('data-dev')); break;
      case 'wno': declineWait(t.getAttribute('data-dev')); break;
      case 'online': show('online'); paintSaved(); break;
      case 'ocreate': if (gateAcct()) break; createRoom(); break;
      case 'ojoin': if (gateAcct()) break; joinRoom($('[data-ocode]').value, oName()); break;
      case 'room': resumeRoom(); break;
      case 'oshare': shareRoom(); break;
      case 'ocopy': shareRoom('copy'); break;
      case 'owa': shareRoom('wa'); break;
      case 'ostart': startOnline(); break;
      case 'oleave': if (NET) { if (!isHost()) sendIn({ t: 'bye' }); store(KEY_ROOM, null); netClose(); } G = null; show('home'); break;
      case 'clock':
        if (R().done || (NET && !isHost())) break;
        if (NET && running) { running = false; R().run = false; save(); paintClock(); readyScreen(); break; }
        if (running) { running = false; paintClock(); readyScreen(); } else go();
        break;
      case 'info': toast(B.catName(R().cat) + ' · ' + pl(R().entries.length, 'word') + ' on the board'); break;
      case 'skip':
        if (!running || R().done) break;
        if (NET && !isHost()) { if (myTurn()) { var sm = { t: 'skip', n: R().entries.length }; sendIn(sm); sm.dev = DEV; applyMove(sm, null); } break; }
        var who = pname(G.turn); B.skip(G); save(); msg(''); paintGame(); toast(who + ' skipped'); if (NET) notifyTurn(); else focusIn(); break;
      case 'undo':
        if (NET && !isHost()) break;
        var e = B.undo(G); if (!e) break; save(); msg(''); paintGame(); toast('Removed ' + e.w); focusIn(); break;
      case 'end': if (NET && !isHost()) break; closeSheets(); if (G && !R().done) { B.endRound(G); save(); roundOver(); } break;
      case 'quit': if (NET && !isHost()) break; if (NET) { G.over = true; save(); } finish(); break;
      case 'next': if (NET && !isHost()) break; nextRound(); break;
      case 'nextcat': openCats('round'); break;
      case 'again':
        if (gateAcct()) break;
        if (NET) { if (!isHost()) break; ov('final', false); G = null; var Lw = NET.lobby; (Lw.wait || []).forEach(function (w) { if (Lw.players.length < MAXP) Lw.players.push({ dev: w.dev, name: w.name }); }); Lw.wait = []; Lw.dec = []; storeRoom(); pubNow(); show('room'); break; }
        ov('final', false); store(KEY_GAME, null); G = null; show('setup'); break;
      case 'vreq': if (NET && NET.lastRej && myTurn()) { var lr = NET.lastRej; msg('<span>Asking the room to vouch for <b>' + esc(lr.w) + '</b>…</span>'); if (isHost()) vouchMsg({ t: 'vreq', dev: DEV, w: lr.w, n: lr.n }); else sendIn({ t: 'vreq', w: lr.w, n: lr.n }); } break;
      case 'vouch': vouchSend('vouch'); break;
      case 'vno': vouchSend('vno'); break;
      case 'vcancel': if (isHost()) vouchMsg({ t: 'vcancel', dev: DEV }); else sendIn({ t: 'vcancel' }); msg(''); break;
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
  document.addEventListener('submit', function (ev) { var f = ev.target; if (f && f.hasAttribute && f.hasAttribute('data-chatform')) { ev.preventDefault(); var i = f.querySelector('[data-chatin]'); chatSend(i.value); i.value = ''; } });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { if (!$$('[data-sheet]').every(function (s) { return s.hidden; })) { closeSheets(); ev.preventDefault(); } }
  });
  window.addEventListener('resize', function () { if (cur === 'game' && G) { sizeBoard(); paintSide(); } });
  document.addEventListener('visibilitychange', function () {
    if (NET && !document.hidden && cur === 'game' && G) paintGame();
    if (NET) return;
    if (document.hidden && running && G && G.settings.timer && !R().done) { running = false; save(); paintClock(); readyScreen(); }
  });

  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('/bemaamoo/sw.js').catch(function () {}); });

  show('home');
  setTimeout(function () { loadMqtt().catch(function () {}); }, 1200);
  (window.requestIdleCallback || function (f) { setTimeout(f, 2500); })(function () { warm(S.cat); }, { timeout: 4000 });
  if (location.hash === '#new') show('setup');
  (function () {   // back into a room after a refresh, or open the join screen from a room link
    var q = (new URLSearchParams(location.search).get('room') || '').toUpperCase(), rm = load(KEY_ROOM);
    if (rm && rm.code && (!q || q === rm.code)) { resumeRoom(); return; }
    if (q) show('online');
  })();
  setInterval(function () { if (NET && !isHost() && cur === 'game' && G) paintDock(); }, 5000);
})();
