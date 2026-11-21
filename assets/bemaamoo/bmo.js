/* Bemaamoo · BLACC Universal — app */
(function () {
  'use strict';
  var B = window.BMO;
  var WORDS_V = 4;
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
    if (name === 'online') paintOnline();
    if (name === 'room') { if (NET) NET.unread = 0; paintRoom(); }
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
      if (isHost() && now - lastClockPub > 1000) { lastClockPub = now; pubNow(); }
      if (r.left <= 0) { B.endRound(G); save(); roundOver(); }
      else if (Math.floor(r.left) % 5 === 0) save();
    }, 250);
  }
  var lastClockPub = 0;
  function stopClock() { if (tick) clearInterval(tick); tick = null; }
  function paintClock() {
    var c = $('[data-clock]');
    if (!G.settings.timer) { c.hidden = true; return; }
    c.hidden = false;
    var left = R().left;
    $('[data-clocktx]').textContent = fmt(left);
    c.classList.toggle('is-low', left <= 15 && !R().done);
    c.classList.toggle('is-paused', !running);
    c.disabled = !!(NET && !isHost());
    c.querySelector('use').setAttribute('href', running ? '#i-pause' : '#i-play');
    c.setAttribute('aria-label', running ? 'Pause timer' : 'Resume timer');
  }

  function paintGame() {
    var lbn = $('[data-lobbybtn]'); if (lbn) lbn.hidden = !NET;
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
        var pd = G.players[i] && G.players[i].dev;
        h += '<div class="pchip' + (i === G.turn ? ' is-on' : '') + (NET && pd && !isOn(pd) ? ' is-off' : '') + '"><i style="background:' + color(i) + '"></i><span>' + esc(s.name) + (NET && pd === DEV ? ' (you)' : '') + '</span><b>' + s.total + '</b></div>';
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
    c = Math.max(16, Math.min(window.innerWidth >= 1000 ? 46 : 42, c));
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
    var inp = $('[data-in]'), goB = $('.entry__go');
    inp.placeholder = 'Type ' + (/^names/.test(r.cat) ? 'a name' : 'a word') + ' · ' + B.catName(r.cat);
    if (NET) {
      var mine = myTurn(), cp = pname(G.turn), stale = !isHost() && hostStale();
      $('[data-turn]').textContent = stale ? 'Waiting for ' + hostName() + ' to reconnect…' : r.done ? 'Round over' : (mine ? 'Your turn' : cp + '’s turn');
      var off = r.done || !mine || !running || !!NET.pend || stale;
      inp.disabled = off; goB.disabled = off;
      if (!mine && !r.done) inp.placeholder = 'Waiting for ' + cp + '…';
      if (NET.pend) inp.placeholder = 'Sending…';
      var sk = $('[data-act="skip"]'); sk.hidden = r.done || !(mine || isHost()); sk.textContent = mine ? 'Skip turn' : 'Skip ' + cp;
      $('[data-act="undo"]').hidden = !isHost(); $('[data-act="end"]').hidden = !isHost();
    } else {
      inp.disabled = false; goB.disabled = false;
      $('[data-act="undo"]').hidden = false; $('[data-act="end"]').hidden = false; $('[data-act="skip"]').textContent = 'Skip turn';
    }
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
        msg('<span><b>' + esc(c.w) + '</b> isn’t in our ' + esc(B.catName(r.cat)) + ' list.</span><button type="button" class="is-pri" data-act="retry">Try another</button>', true);
      } else if (c.why === 'unknown') {
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
    if (NET) { notifyTurn(); return; }
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
    var gw = NET && !isHost();
    $('[data-sumbtns]').hidden = gw; $('[data-sumwait]').hidden = !gw;
    if (gw) $('[data-sumwait]').textContent = 'Waiting for ' + hostName() + ' to start the next round.';
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
    $('[data-act="again"]', $('[data-ov="final"]')).hidden = !!(NET && !isHost());
    $('[data-act="again"]', $('[data-ov="final"]')).textContent = NET ? 'Play again, same room' : 'Play again';
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
        failoverCheck();
      }
      netPaint();
    }, 3000);
  }
  /* If the host's phone goes quiet (minimised, locked, offline) the first player still online takes over, so the game carries on. */
  function failoverCheck() {
    if (!NET || isHost() || !NET.lobby || !netOn()) return;
    var r = G && !G.over ? R() : null, lim = (r && r.run && !r.done && G.settings.timer) ? 8000 : 11000, now = Date.now();
    if (now - Math.max(NET.gotAt || 0, NET.upAt || 0) < lim) return;
    var L = NET.lobby, hd = L.hd || (L.players[0] || {}).dev;
    if (!L.players.some(function (p) { return p.dev === DEV; })) return;
    var cands = L.players.filter(function (p) { return p.dev !== hd && (p.dev === DEV || now - ((NET.gseen || {})[p.dev] || 0) < 9000); });
    if (cands.length && cands[0].dev === DEV) promote();
  }
  /* a player whose phone has gone quiet is skipped, so the others are never stuck waiting for their turn */
  function autoSkip() {
    if (!isHost() || !G || G.over) return;
    var r = R(), cp = G.players[G.turn];
    if (!cp || !r.run || r.done || cp.dev === DEV || isOn(cp.dev)) return;
    B.skip(G); save(); msg(''); paintGame(); toast(cp.name + ' is away, skipped'); notifyTurn();
  }
  function promote() {
    var me = NET, L = me.lobby, T = NTOPIC + me.code + '/';
    var old = (L.players.filter(function (p) { return p.dev === L.hd; })[0] || L.players[0] || {}).name || 'The host';
    me.role = 'host'; me.ep = (me.ep || 0) + 1; me.hs = newHs(); me.seq = (me.lastSeq || 0) + 1; me.hold = 0; me.lastPub = 0; me.rej = null;
    me.seen = {}; L.players.forEach(function (p) { me.seen[p.dev] = Date.now(); });
    me.seen[L.hd] = 0; L.hd = DEV;
    me.cls.forEach(function (c) { if (c.connected) try { c.subscribe(T + 'j/+'); } catch (e) {} });
    storeRoom(); toast(old + ' went quiet. You are hosting now.'); buzz(25);
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
    toast('Hosting moved to ' + h);
    guestMsg(st);
  }
  function netSend(topic, obj, retain) { if (!NET || !NET.cls) return; var t = JSON.stringify(obj); NET.cls.forEach(function (c) { if (c.connected) try { c.publish(topic, t, { qos: 0, retain: !!retain }); } catch (e) {} }); }
  function netOn() { return !!(NET && NET.cls && NET.cls.some(function (c) { return c.connected; })); }
  function sendIn(m) {
    if (!NET) return; m.dev = DEV; netSend(NTOPIC + NET.code + '/in', m);
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
  function netPaint() { if (cur === 'room') paintRoom(); else if (cur === 'game' && G) { paintDock(); paintStrip(); } paintWait(); paintLobbySheet(); }
  function storeRoom() {
    if (!NET) return;
    if (isHost()) store(KEY_ROOM, { role: 'host', code: NET.code, name: NET.name, hs: NET.hs, ep: NET.ep || 0, seq: NET.seq, lobby: NET.lobby, G: G });
    else store(KEY_ROOM, { role: 'guest', code: NET.code, name: NET.name });
  }

  /* host: publish the whole game (retained, so late joiners get it at once) */
  var pubT = null;
  function pubSoon() { if (!isHost() || pubT) return; pubT = setTimeout(function () { pubT = null; pubNow(); }, 0); }
  function pubNow() {
    if (!isHost()) return;
    if (NET.hold && Date.now() < NET.hold) return;
    var on = {};
    var w = NET.lobby.wait; if (w && w.length) NET.lobby.wait = w.filter(function (x) { return Date.now() - (NET.seen[x.dev] || x.ts || 0) < 120000; });
    NET.lastPub = Date.now();
    NET.lobby.players.forEach(function (p) { on[p.dev] = isOn(p.dev); });
    NET.seq = (NET.seq || 0) + 1;
    netSend(NTOPIC + NET.code + '/state', { v: 1, code: NET.code, hs: NET.hs, ep: NET.ep || 0, seq: NET.seq, lobby: NET.lobby, G: G, rej: NET.rej || null, on: on, cl: (NET.chat || []).slice(-15) }, true);
  }
  function syncLobby() { if (!isHost()) return; NET.lobby.cat = S.cat; NET.lobby.timer = S.timer; NET.lobby.limit = S.limit; storeRoom(); pubSoon(); }
  function hostMsg(m) {
    if (!m || !m.dev || m.dev === DEV) return;
    var wasOn = isOn(m.dev); NET.seen[m.dev] = Date.now();
    var L = NET.lobby, p = L.players.filter(function (x) { return x.dev === m.dev; })[0];
    if (m.t === 'join' || m.t === 'here') {
      if (!p && m.t === 'join' && G) {
        if ((L.dec || []).indexOf(m.dev) > -1) { pubSoon(); return; }
        L.wait = L.wait || [];
        if (!L.wait.some(function (x) { return x.dev === m.dev; })) { L.wait.push({ dev: m.dev, name: cleanName(m.name), ts: Date.now() }); toast(cleanName(m.name) + ' wants to join'); buzz(20); storeRoom(); netPaint(); pubSoon(); }
        return;
      }
      if (!p && m.t === 'join' && !G) {
        if (L.players.length >= 8) return;
        L.players.push({ dev: m.dev, name: cleanName(m.name) }); toast(cleanName(m.name) + ' joined'); buzz(15);
        storeRoom(); paintRoom(); pubSoon(); return;
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
    var r = R(), cp = G.players[G.turn];
    if (!cp || cp.dev !== m.dev || r.done || !r.run) { pubSoon(); return; }
    if (m.t === 'skip') { if (m.n != null && m.n !== r.entries.length) { pubSoon(); return; } B.skip(G); save(); msg(''); paintGame(); toast(cp.name + ' skipped'); notifyTurn(); return; }
    if (m.t === 'word') {
      getList(r.cat).then(function (Lst) { hostAdd(m, Lst); }, function () { hostAdd(m, null); });
    }
  }
  function hostAdd(m, Lst) {
    var r = R(), cp = G.players[G.turn];
    if (!cp || cp.dev !== m.dev || r.done || m.n !== r.entries.length) { pubSoon(); return; }
    var c = B.check(G, m.w, Lst ? Lst.full : null);
    if (!c.ok) { NET.rej = { dev: m.dev, w: c.w, why: c.why, k: Date.now() }; pubNow(); return; }
    NET.rej = null;
    var e = B.add(G, c.w, { mav: Lst ? Lst.mav : null });
    lastAdded = r.entries.length - 1;
    save(); celebrate(e); paintGame(); lastAdded = -1;
    if (r.done) { setTimeout(roundOver, 900); return; }
    notifyTurn();
  }

  /* guest: follow the host's game */
  function guestMsg(st) {
    if (!st || st.v !== 1 || st.code !== NET.code || !st.lobby) return;
    var sep = st.ep || 0;
    if (sep < (NET.ep || 0)) return;
    if (sep === (NET.ep || 0) && NET.hs && st.hs !== NET.hs && String(st.hs) < String(NET.hs)) return;
    if (st.hs === NET.hs && st.seq <= NET.lastSeq) return;
    NET.ep = sep; chatMerge(st.cl);
    NET.hs = st.hs; NET.lastSeq = st.seq; NET.gotAt = Date.now(); NET.lobby = st.lobby; NET.on = st.on || {};
    if (NET.jq && st.lobby.players.some(function (p) { return p.dev === DEV; })) clearJoin();
    clearTimeout(NET.noRoomT);
    if (!st.G) {
      NET.live = false; G = null; closeSheets(); $$('[data-ov]').forEach(function (o) { o.hidden = true; });
      if (cur !== 'room') show('room'); else paintRoom();
      return;
    }
    if (!st.G.players.some(function (p) { return p.dev === DEV; })) {
      NET.live = true; G = null; closeSheets(); $$('[data-ov]').forEach(function (o) { o.hidden = true; });
      if ((st.lobby.dec || []).indexOf(DEV) > -1) { netClose(); store(KEY_ROOM, null); show('online'); toast('The host couldn’t add you to this game.'); return; }
      if (cur !== 'room') show('room'); else paintRoom();
      return;
    }
    NET.live = false;
    if (NET.jq) clearJoin();
    var prev = G, wasMine = prev && myTurn();
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
      var t = { unknown: '<b>' + esc(st.rej.w) + '</b> isn’t in our ' + esc(B.catName(r.cat)) + ' list.', repeat: '<b>' + esc(st.rej.w) + '</b> is already on the board.', short: 'Use at least ' + B.RULES.MIN_LEN + ' letters.' }[st.rej.why] || 'Try another word.';
      msg('<span>' + t + '</span>', true); shake();
    }
    running = !!(r.run && !r.done);
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
        var t = { unknown: '<b>' + esc(c.w) + '</b> isn’t in our ' + esc(B.catName(r.cat)) + ' list.', repeat: '<b>' + esc(c.w) + '</b> is already on the board.', short: 'Use at least ' + B.RULES.MIN_LEN + ' letters.' }[c.why] || 'Try another word.';
        msg('<span>' + t + '</span><button type="button" class="is-pri" data-act="retry">Try another</button>', true); shake(); return;
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
    var n = $('[data-oname]'); if (!n.value) n.value = load('bmo_name') || (S.names[0] || '');
    var q = new URLSearchParams(location.search).get('room');
    if (q && !$('[data-ocode]').value) $('[data-ocode]').value = q.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    $('[data-oerr]').hidden = true;
  }
  function oName() { var v = cleanName($('[data-oname]').value); store('bmo_name', v); return v; }
  function createRoom() {
    var name = oName();
    netClose();
    NET = { role: 'host', code: newCode(), name: name, hs: newHs(), ep: 0, fresh: true, seq: 0, seen: {}, lobby: { hd: DEV, players: [{ dev: DEV, name: name }], cat: S.cat, timer: S.timer, limit: S.limit } };
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
    G = B.create({ players: NET.lobby.players.map(function (p) { return { name: p.name }; }), category: S.cat, timer: S.timer, limit: S.limit });
    G.players.forEach(function (p, i) { p.dev = NET.lobby.players[i].dev; });
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
    $('[data-rnet]').textContent = netOn() ? (host ? 'Online · keep this page open' : (hostStale() ? 'Host is away' : 'Online')) : (NET.wasOn ? 'Reconnecting…' : 'Connecting…');
    $('[data-rnet]').classList.toggle('is-on', netOn());
    if (!L) { $('[data-rplayers]').innerHTML = ''; $('[data-rhost]').hidden = true; $('[data-rguest]').hidden = false; $('[data-rwait]').textContent = 'Connecting to room ' + NET.code + '…'; $('[data-ostart]').hidden = true; return; }
    var list = L.players.slice();
    if (!host && !G && !NET.live && !list.some(function (p) { return p.dev === DEV; })) list.push({ dev: DEV, name: NET.name, joining: 1 });
    $('[data-rplayers]').innerHTML = list.map(function (p, i) {
      return '<li class="rp' + (isOn(p.dev) ? '' : ' is-off') + '"><i style="background:' + color(i) + '"></i><b>' + esc(p.name) + '</b><small>' + (p.dev === (L.hd || L.players[0].dev) ? 'Host' : '') + (p.dev === DEV ? (p.dev === (L.hd || L.players[0].dev) ? ' · you' : 'You') : '') + (p.joining ? ' · joining…' : '') + (isOn(p.dev) ? '' : ' · away') + '</small></li>';
    }).join('');
    $('[data-rhost]').hidden = !host; $('[data-rguest]').hidden = host;
    if (host) {
      $('[data-rcatname]').textContent = B.catName(S.cat); $('[data-rcatgroup]').textContent = groupOf(S.cat);
      seg('[data-ropt="timer"]', TIMERS, S.timer, 'timer'); seg('[data-ropt="limit"]', LIMITS, S.limit, 'limit');
      var st = $('[data-ostart]'); st.hidden = false; st.disabled = L.players.length < 2;
      st.textContent = L.players.length < 2 ? 'Waiting for players to join' : 'Start game · ' + pl(L.players.length, 'player');
    } else {
      $('[data-ostart]').hidden = true;
      var tl = function (a, v) { for (var i = 0; i < a.length; i++) if (a[i][0] === v) return a[i][1]; return v; };
      $('[data-rwait]').textContent = NET.live ? 'A game is in progress. ' + hostName() + ' can add you, and you jump in on the next turn. You can chat while you wait.' : (hostStale() ? hostName() + ' looks to be away. You are in the queue and will join as soon as they are back. ' : 'Waiting for ' + hostName() + ' to start. ') + B.catName(L.cat) + ' · timer ' + tl(TIMERS, L.timer) + ' · words per round ' + tl(LIMITS, L.limit) + '.';
    }
    paintWait(); paintChat();
  }

  /* ---------- waiting list, lobby sheet and chat ---------- */
  function paintWait() {
    var L = NET && NET.lobby, w = (L && L.wait) || [], host = isHost();
    $$('[data-wl]').forEach(function (ul) {
      ul.innerHTML = w.map(function (x) {
        return '<li class="wi"><b>' + esc(x.name) + '</b><span>' + (host && G ? '<button class="btn" type="button" data-act="wadd" data-dev="' + esc(x.dev) + '">Add to game</button><button class="lnk" type="button" data-act="wno" data-dev="' + esc(x.dev) + '">Not now</button>' : '<small>waiting</small>') + '</span></li>';
      }).join('');
      var sec = ul.closest('[data-wlsec]'); if (sec) sec.hidden = !w.length;
    });
    paintBadge();
  }
  function paintBadge() {
    var n = (NET && NET.unread || 0) + (isHost() && NET && NET.lobby && NET.lobby.wait ? NET.lobby.wait.length : 0);
    $$('[data-bdg]').forEach(function (b) { b.hidden = !n; b.textContent = n > 9 ? '9+' : n; });
  }
  function paintLobbySheet() {
    var sh = $('[data-sheet="lobby"]'); if (!sh || sh.hidden || !NET || !NET.lobby) return;
    var L = NET.lobby, hd = L.hd || L.players[0].dev;
    $('[data-lcode]').textContent = NET.code;
    $('[data-lplayers]').innerHTML = L.players.map(function (p, i) {
      return '<li class="rp' + (isOn(p.dev) ? '' : ' is-off') + '"><i style="background:' + color(i) + '"></i><b>' + esc(p.name) + '</b><small>' + (p.dev === hd ? 'Host' : '') + (p.dev === DEV ? (p.dev === hd ? ' · you' : 'You') : '') + (isOn(p.dev) ? '' : ' · away') + '</small></li>';
    }).join('');
  }
  function chatOpen() { var sh = $('[data-sheet="lobby"]'); return cur === 'room' || (sh && !sh.hidden); }
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
    if (G.players.length >= 8) { toast('The room is full (8 players).'); return; }
    L.wait = L.wait.filter(function (x) { return x.dev !== dev; });
    L.players.push({ dev: w.dev, name: w.name });
    G.players.push({ id: G.players.length, name: w.name, dev: w.dev });
    NET.seen[dev] = Date.now(); save(); toast(w.name + ' added to the game'); paintGame(); netPaint();
  }
  function declineWait(dev) {
    if (!isHost()) return; var L = NET.lobby;
    L.wait = (L.wait || []).filter(function (x) { return x.dev !== dev; }); L.dec = (L.dec || []).concat(dev);
    storeRoom(); pubSoon(); netPaint();
  }

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
      case 'close': closeSheets(); if (cur === 'game' && running) focusIn(); break;
      case 'setup': show('setup'); break;
      case 'home': leave(); break;
      case 'continue': resume(); break;
      case 'cats': openCats('setup'); break;
      case 'start': startGame(); break;
      case 'go': go(); break;
      case 'menu':
        $$('[data-ho]').forEach(function (b) { b.hidden = !!(NET && !isHost()); });
        $('[data-act="home"]', $('[data-sheet="menu"]')).textContent = NET ? (isHost() ? 'Leave (the room stays saved on this phone)' : 'Leave the room') : 'Leave (your game is saved)';
        openSheet('menu'); break;
      case 'lobby': if (!NET) break; NET.unread = 0; openSheet('lobby'); paintLobbySheet(); paintWait(); paintChat(); break;
      case 'wadd': addMid(t.getAttribute('data-dev')); break;
      case 'wno': declineWait(t.getAttribute('data-dev')); break;
      case 'online': show('online'); break;
      case 'ocreate': createRoom(); break;
      case 'ojoin': joinRoom($('[data-ocode]').value, oName()); break;
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
        if (NET) { if (!isHost()) break; ov('final', false); G = null; var Lw = NET.lobby; (Lw.wait || []).forEach(function (w) { if (Lw.players.length < 8) Lw.players.push({ dev: w.dev, name: w.name }); }); Lw.wait = []; Lw.dec = []; storeRoom(); pubNow(); show('room'); break; }
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
  if (location.hash === '#new') show('setup');
  (function () {   // back into a room after a refresh, or open the join screen from a room link
    var q = (new URLSearchParams(location.search).get('room') || '').toUpperCase(), rm = load(KEY_ROOM);
    if (rm && rm.code && (!q || q === rm.code)) { resumeRoom(); return; }
    if (q) show('online');
  })();
  setInterval(function () { if (NET && !isHost() && cur === 'game' && G) paintDock(); }, 5000);
})();
