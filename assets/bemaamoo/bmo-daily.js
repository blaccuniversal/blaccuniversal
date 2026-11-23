/* Bemaamoo Daily Challenge: one word a day, spell as many words from its letters as you can. One try. */
(function () {
  'use strict';
  var W = window.BMO_DAILY_WORDS || [];
  var START = Date.UTC(2026, 10, 23) / 86400000;            // day #1 = 23 Nov 2026
  var KEY = 'bmo_daily_v1', KEYN = 'bmo_daily_name', MIN = 3, LIMIT = 600000;
  var B = window.BMO, env = null, el = {}, today = 0, base = '', st = null, dict = null, busy = false;

  function $(s, r) { return (r || document).querySelector(s); }
  function dayNo() { return Math.floor((Date.now() + 3600000) / 86400000); }   // Lagos (UTC+1) midnight
  function num() { return today - START + 1; }
  function wordFor(n) { return W.length ? W[((n - 1) % W.length + W.length) % W.length] : 'TARNATION'; }
    function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(all) {
    var ks = Object.keys(all).sort(); while (ks.length > 90) delete all[ks.shift()];
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
  }
  function mine() {
    var a = load(), s = a[num()] || { g: null, done: false };
    if (!s.g) {
      s.g = B.create({ category: 'words_en' });
      (s.found || []).forEach(function (w) { B.add(s.g, w, {}); });   // older saves: replay the words in order
      delete s.found;
    }
    if (!s.done && !s.t0 && B.round(s.g).entries.length) { s.t0 = Date.now(); put(s); }   // game begun before the timer existed
    if (!s.done && s.t0 && Date.now() - s.t0 >= LIMIT) { s.done = true; put(s); }
    B.round(s.g).entries.forEach(function (e) { if (e.x && e.base === B.tri(e.w.length) * 2) { e.base = B.tri(e.w.length) * 3; e.total = e.base + e.mav + e.con + e.acc + e.key; } });   // older saves used x2
    return s;
  }
  function put(s) { var a = load(); a[num()] = s; save(a); }
  function entries(s) { return B.round(s.g).entries; }
  function words(s) { return entries(s).map(function (e) { return e.w; }); }
  function total(s) { return B.tally(s.g)[0].total; }
  function counts(w) { var c = {}; for (var i = 0; i < w.length; i++) c[w[i]] = (c[w[i]] || 0) + 1; return c; }
  function canMake(w, c) { var u = {}; for (var i = 0; i < w.length; i++) { u[w[i]] = (u[w[i]] || 0) + 1; if (u[w[i]] > (c[w[i]] || 0)) return false; } return true; }
  function streak() {
    var a = load(), n = 0, d = num();
    if (!(a[d] && a[d].done)) d--;
    while (a[d] && a[d].done) { n++; d--; }
    return n;
  }
  function shuffled(w, seed) {
    var a = w.split(''), s = seed * 9301 + 49297;
    for (var i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; var j = Math.floor(s / 233280 * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pl(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  function dictP() {
    if (!dict) dict = env.getList('words_en').then(function (L) { return L; });
    dict.catch(function () { dict = null; });
    return dict;
  }

  /* ---------- paint ---------- */
  function msg(t, bad) { el.msg.textContent = t || ''; el.msg.classList.toggle('is-bad', !!bad); }
  function paintTiles() {
    var c = counts(base), v = el.inp.value.toUpperCase().replace(/[^A-Z]/g, ''), u = {};
    for (var i = 0; i < v.length; i++) u[v[i]] = (u[v[i]] || 0) + 1;
    var seen = {};
    [].forEach.call(el.tiles.children, function (t) {
      var L = t.getAttribute('data-l'); seen[L] = (seen[L] || 0) + 1;
      t.classList.toggle('is-used', seen[L] <= (u[L] || 0));
    });
  }
  function board(box, hide) {
    var r = B.round(st.g), longest = 20, tags = 0;
    r.entries.forEach(function (e) { if (e.w.length > longest) longest = e.w.length; var t = (e.x ? 1 : 0) + (e.mavs.length ? 1 : 0) + (e.con ? 1 : 0) + (e.acc ? 1 : 0) + (e.key ? 1 : 0); if (t > tags) tags = t; });
    var cs0 = getComputedStyle(box), padx = (parseFloat(cs0.paddingLeft) || 0) + (parseFloat(cs0.paddingRight) || 0);
    var gap = 3, avail = box.clientWidth - padx - 30 - (46 + tags * 24) - 6, c = Math.max(box === el.board || box.classList.contains('dboard--res') ? 20 : 20, Math.min(40, Math.floor((avail - gap * longest) / longest)));
    box.style.setProperty('--c', c + 'px'); box.style.setProperty('--gap', gap + 'px'); box.style.setProperty('--dfs', Math.round(c * .54) + 'px');
    if (!r.entries.length && box === el.board) { box.innerHTML = '<div class="board__empty"><b>Daily ' + '#' + num() + '</b><span>Add your first word.<br>Long words score more.</span></div>'; return; }
    var mav = {};
    r.entries.forEach(function (e) { e.mavs.forEach(function (m) { for (var k = m.from; k <= m.to; k++) mav[k + ':' + m.col] = 1; }); });
    var conAt = {}; B.concords(r).forEach(function (q) { for (var k = q.from; k <= q.to; k++) conAt[k] = (k === q.from ? ' is-con-s' : '') + (k === q.to ? ' is-con-e' : ''); });
    var h = '<div class="rows">';
    r.entries.forEach(function (e, i) {
      h += '<div class="row' + (e.x ? ' is-x' : '') + (conAt[i] != null ? ' is-con' + conAt[i] : '') + (e.acc ? ' is-acc' : '') + '"><span class="row__n">' + (i + 1) + '</span>';
      for (var k = 0; k < e.w.length; k++) h += '<span class="cell' + (mav[i + ':' + (k + 1)] ? ' is-mav' : '') + '">' + (hide && e.x ? '' : e.w[k]) + '</span>';
      h += '<span class="row__pts">+' + e.total + (e.x ? '<span class="tag tag--x" title="The full word: triple points">3×</span>' : '') + (e.mavs.length ? '<span class="tag tag--mav" title="Maverick">M</span>' : '') + (e.con ? '<span class="tag tag--con" title="Concord">C</span>' : '') + (e.acc ? '<span class="tag tag--acc" title="Regen">R</span>' : '') + (e.key ? '<span class="tag tag--key" title="Keystone">K</span>' : '') + '</span></div>';
    });
    box.innerHTML = h + '</div>';
  }
  function strip() {
    var T = B.tally(st.g)[0];
    el.strip.innerHTML = '<div class="pchip is-on"><span>Score</span><b>' + T.total + '</b></div>' +
      '<button type="button" class="pchip pchip--part" data-d="perks"><span class="c-mav">Maverick</span><b>' + T.mav + '</b></button>' +
      '<button type="button" class="pchip pchip--part" data-d="perks"><span class="c-con">Concord</span><b>' + T.con + '</b></button>' +
      '<button type="button" class="pchip pchip--part" data-d="perks"><span class="c-acc">Regen</span><b>' + T.acc + '</b></button>' +
      '<button type="button" class="pchip pchip--part" data-d="perks"><span class="c-key">Keystone</span><b>' + T.key + '</b></button>';
  }
  function paintFound() {
    strip(); board(el.board);
    el.undo.hidden = !entries(st).length;
    requestAnimationFrame(function () { el.board.scrollTop = el.board.scrollHeight; });
  }
  function perks() {
    var f = [];
    entries(st).forEach(function (e) {
      if (e.x) f.push('<li><span class="tag tag--x">3×</span><span>The word · ' + e.w + '</span><em>+' + e.base + '</em></li>');
      e.mavs.forEach(function (m) { f.push('<li><span class="tag tag--mav">M</span><span>' + m.w + '</span><em>+' + m.pts + '</em></li>'); });
      if (e.con) f.push('<li><span class="tag tag--con">C</span><span>' + e.streak + ' × ' + e.w.length + ' letters</span><em>+' + e.con + '</em></li>');
      if (e.acc) f.push('<li><span class="tag tag--acc">R</span><span>Regen · ' + e.w + '</span><em>+' + e.acc + '</em></li>');
      if (e.key) f.push('<li><span class="tag tag--key">K</span><span>Keystone · ' + e.w + '</span><em>+' + e.key + '</em></li>');
    });
    el.feed.innerHTML = f.length ? f.reverse().join('') : '<li class="feed__none">None yet. Find a long word, a column word or an anagram.</li>';
    $('[data-sheet="dperks"]').hidden = false;
  }
  function paintHomeBtn() {
    var b = $('[data-daily-btn]'); if (!b) return;
    today = dayNo(); var s = mine();
    var sub = $('[data-daily-sub]');
    if (s.done) sub.textContent = 'Done today · ' + total(s) + ' pts';
    else if (s.t0) sub.textContent = 'In progress · ' + Math.ceil(Math.max(0, LIMIT - (Date.now() - s.t0)) / 60000) + ' min left';
    else sub.textContent = 'New word today';
  }
  function paint() {
    today = dayNo(); base = wordFor(num()); st = mine();
    [].forEach.call(document.querySelectorAll('[data-d-num],[data-d-num2]'), function (n) { n.textContent = '#' + num(); });
    clearInterval(ptm);
    el.fin.hidden = true;
    var playing = !!(st.t0 && !st.done), sec = $('[data-scr="daily"]');
    sec.classList.toggle('scr--game', playing); document.body.classList.toggle('in-game', playing);
    el.pre.hidden = playing; el.game.hidden = !playing;
    el.start.hidden = !!(st.done || st.t0); el.res.hidden = !st.done;
    if (playing && env.fit) env.fit();
    if (st.done) return paintResult();
    if (!st.t0) {
      try { el.name.value = localStorage.getItem(KEYN) || ''; } catch (e) {}
      dictP().catch(function () {});   // warm the dictionary while they read
      return;
    }
    playUI();
  }
  var ptm = 0;
  function playUI() {
    el.tiles.innerHTML = shuffled(base, num()).map(function (l) { return '<button type="button" class="dtile" data-l="' + l + '">' + l + '</button>'; }).join('');
    el.inp.value = ''; msg('');
    paintTiles(); paintFound(); clock();
    ptm = setInterval(clock, 500);
    dictP().catch(function () { msg('Couldn’t load the dictionary. Check your connection.', true); });
  }
  function left() { return Math.max(0, LIMIT - (Date.now() - st.t0)); }
  function clock() {
    var ms = left(), m = Math.floor(ms / 60000), sc = Math.ceil(ms % 60000 / 1000); if (sc === 60) { m++; sc = 0; }
    el.timer.textContent = m + ':' + (sc < 10 ? '0' : '') + sc;
    el.timer.classList.toggle('is-low', ms <= 60000);
    if (ms <= 0) { clearInterval(ptm); st.done = true; put(st); paint(); }
  }
  function begin() {
    var n = (el.name.value || '').trim().replace(/\s+/g, ' ').slice(0, 18);
    try { localStorage.setItem(KEYN, n); } catch (e) {}
    st.name = n || 'Player'; st.t0 = Date.now(); put(st); paint();
  }

  /* ---------- play ---------- */
  function add(raw) {
    var w = B.norm(raw);
    if (!w) return;
    if (left() <= 0) return clock();
    if (w.length < MIN) return msg('At least ' + MIN + ' letters.', true);
    if (!canMake(w, counts(base))) return msg(w + ' uses letters that aren’t there.', true);
    if (words(st).indexOf(w) >= 0) return msg('Already have ' + w + '.', true);
    if (busy) return; busy = true;
    dictP().then(function (D) {
      busy = false;
      if (w !== base && !D.full.has(w)) return msg(w + ' isn’t in the dictionary.', true);
      var e = B.add(st.g, w, { mav: D.mav });
      if (w === base) { e.x = 1; e.base *= 3; e.total = e.base + e.mav + e.con + e.acc + e.key; }
      put(st); el.inp.value = ''; paintTiles(); paintFound();
      var x = [e.mavs.length ? 'Maverick' : '', e.con ? 'Concord' : '', e.acc ? 'Regen' : '', e.key ? 'Keystone' : ''].filter(Boolean);
      msg(w === base ? 'You found the word! Triple points, +' + e.total : '+' + e.total + ' for ' + w + (x.length ? ' · ' + x.join(' + ') : ''));
      
    }, function () { busy = false; msg('Couldn’t check that word. Try again.', true); });
  }
  function undo() {
    if (!entries(st).length) return;
    B.undo(st.g); put(st); paintFound(); msg('Removed the last word.');
  }

  /* ---------- result ---------- */
  function stats() {
    var E = entries(st), T = B.tally(st.g)[0], rg = E.filter(function (e) { return e.acc; }).length;
    return { E: E, T: T, rg: rg, perks: T.mavs + T.cons + rg + T.keys, perkPts: T.mav + T.con + T.acc + T.key, found: E.some(function (e) { return e.x; }) };
  }
  function paintResult() {
    var a = load(); st = mine();
    var S = stats(), T = S.T, n = S.E.length, sk = streak();
    $('[data-d-score]').textContent = T.total;
    $('[data-d-who]').textContent = 'Daily #' + num() + ' · ' + (st.name || 'Player');
    $('[data-d-meta]').textContent = sk > 1 ? sk + '-day streak' : '';
    $('[data-d-brk]').innerHTML = '<span><i>W</i>' + T.base + '</span><span class="m"><i>M</i>' + T.mav + '</span><span class="c"><i>C</i>' + T.con + '</span><span class="r"><i>R</i>' + T.acc + '</span><span class="k"><i>K</i>' + T.key + '</span>';
    function rows(all, maxp) {
      var r = [['Words found', all ? n + ' of ' + all : String(n)], ['Points from words', String(T.base)], ['Perks earned', S.perks + ' · +' + S.perkPts + ' pts'],
        ['Possible, excluding perks', maxp ? maxp.toLocaleString('en') + ' pts' : '…'], ['Possible words', all ? String(all) : '…'], ['Today’s word', S.found ? 'Found · 3×' : 'Not found']];
      $('[data-d-sum]').innerHTML = r.map(function (x, i) { return '<div class="dsum__r' + (i === 5 && S.found ? ' is-x' : '') + '"><span>' + x[0] + '</span><b>' + x[1] + '</b></div>'; }).join('');
    }
    rows(st.all, st.max);
    dictP().then(function (D) {
      var c = counts(base), all = 0, maxp = 3 * B.tri(base.length);
      D.full.forEach(function (w) { if (w.length >= MIN && w.length < base.length && canMake(w, c)) { all++; maxp += B.tri(w.length); } });
      st.max = maxp; st.all = all; rows(all, maxp);
    }, function () {});
    tick();
  }
  var tmr = 0;
  function tick() {
    clearInterval(tmr);
    function f() {
      var ms = (START + num()) * 86400000 - 3600000 - Date.now(); // next Lagos midnight
      if (ms <= 0) { clearInterval(tmr); if (env.cur() === 'daily') paint(); return; }
      var h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
      $('[data-d-next]').textContent = 'Next word in ' + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
    f(); tmr = setInterval(f, 1000);
  }
  function css(n, d) { var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || d; }
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function sheetImage() {
    var S = stats(), T = S.T, W = 1080, pad = 70, FONT = '-apple-system,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif';
    var EM = '#6ee7b7', gold = css('--mav', '#ffd23f'), blue = css('--con', '#4aa8ff'), purple = css('--acc', '#b48cff'), key = css('--key', '#ff6a4d');
    var rows = [['Words found', st.all ? S.E.length + ' of ' + st.all : String(S.E.length)], ['Points from words', String(T.base)], ['Perks earned', S.perks + '  ·  +' + S.perkPts + ' pts'],
      ['Possible, excluding perks', st.max ? st.max.toLocaleString('en') + ' pts' : '-'], ['Possible words', st.all ? String(st.all) : '-'], ['Today’s word', S.found ? 'Found  ·  3×' : 'Not found']];
    var rh = 96, top = 640, H = top + rows.length * rh + 190;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var c = cv.getContext('2d');
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#222'; c.lineWidth = 2; rr(c, 24, 24, W - 48, H - 48, 18); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillStyle = '#8a8a8a'; c.font = '600 30px ' + FONT; c.fillText('BEMAAMOO  ·  DAILY #' + num() + (st.name ? '  ·  ' + st.name.toUpperCase() : ''), W / 2, 120);
    c.fillStyle = gold; c.font = '800 220px ' + FONT; c.fillText(String(T.total), W / 2, 360);
    c.fillStyle = '#9a9a9a'; c.font = '600 40px ' + FONT; c.fillText(st.max ? 'points out of a possible ' + st.max.toLocaleString('en') : 'points', W / 2, 430);
    var chips = [['W', T.base, '#fff'], ['M', T.mav, gold], ['C', T.con, blue], ['R', T.acc, purple], ['K', T.key, key]];
    c.font = '700 44px ' + FONT; var gapC = 46, ws = chips.map(function (t) { return c.measureText(t[0] + ' ' + t[1]).width; }), tot = ws.reduce(function (a, b) { return a + b; }, 0) + gapC * (chips.length - 1), x = (W - tot) / 2;
    c.textAlign = 'left';
    chips.forEach(function (t, i) { c.fillStyle = '#7a7a7a'; c.font = '700 34px ' + FONT; c.fillText(t[0], x, 540); var lw = c.measureText(t[0] + ' ').width; c.fillStyle = t[2]; c.font = '700 44px ' + FONT; c.fillText(String(t[1]), x + lw, 540); x += ws[i] + gapC; });
    rows.forEach(function (r, i) {
      var y = top + i * rh; c.strokeStyle = '#1f1f1f'; c.lineWidth = 2; c.beginPath(); c.moveTo(pad, y); c.lineTo(W - pad, y); c.stroke();
      c.textAlign = 'left'; c.fillStyle = '#b5b5b5'; c.font = '500 38px ' + FONT; c.fillText(r[0], pad, y + 62);
      c.textAlign = 'right'; c.fillStyle = (i === 5 && S.found) ? EM : '#fff'; c.font = '700 40px ' + FONT; c.fillText(r[1], W - pad, y + 62);
    });
    c.textAlign = 'center'; c.fillStyle = '#8a8a8a'; c.font = '500 32px ' + FONT; c.fillText('Can you beat my score, and win the day?', W / 2, H - 100);
    c.fillStyle = '#fff'; c.font = '700 34px ' + FONT; c.fillText('blaccuniversal.com/bemaamoo', W / 2, H - 52);
    return cv;
  }
  function shareText() {
    var T = B.tally(st.g)[0];
    return 'Bemaamoo Daily #' + num() + '\nI scored ' + T.total + (st.max ? ' out of a possible ' + st.max.toLocaleString('en') : '') + '.\nCan you beat my score, and win the day?\nPlay here: blaccuniversal.com/bemaamoo';
  }
  function share() {
    var b = $('[data-d-share] span');
    function say(t) { b.textContent = t; setTimeout(function () { b.textContent = 'Share my result'; }, 1800); }
    var cv; try { cv = sheetImage(); } catch (e) { return say('Couldn’t make the image'); }
    cv.toBlob(function (blob) {
      if (!blob) return say('Couldn’t make the image');
      var name = 'bemaamoo-daily-' + num() + '.png', file, txt = shareText();
      try { file = new File([blob], name, { type: 'image/png' }); } catch (e) { file = null; }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], text: txt, title: 'Bemaamoo Daily #' + num() }).catch(function (e) { if (e && e.name !== 'AbortError') save(); });
      } else save();
      function save() {
        try { navigator.clipboard.writeText(txt).catch(function () {}); } catch (e) {}
        var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 4000); say('Image saved, text copied');
      }
    }, 'image/png');
  }

  /* ---------- wire ---------- */
  function init(e) {
    env = e;
    el = { pre: $('[data-d-pre]'), game: $('[data-d-game]'), strip: $('[data-d-strip]'), feed: $('[data-d-feed]'), start: $('[data-d-start]'), name: $('[data-d-name]'), timer: $('[data-d-timer]'), board: $('[data-d-board]'), undo: $('[data-d-undo]'), play: $('[data-d-play]'), res: $('[data-d-res]'), tiles: $('[data-d-tiles]'), inp: $('[data-d-in]'), msg: $('[data-d-msg]'), list: $('[data-d-list]'), pts: $('[data-d-pts]'), cnt: $('[data-d-cnt]'), empty: $('[data-d-empty]'), fin: $('[data-d-fin]') };
    $('[data-scr="daily"]').addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-d]'); if (!t) { var q = ev.target.closest('.dtile'); if (q) { el.inp.value += q.getAttribute('data-l'); paintTiles(); } return; }
      var a = t.getAttribute('data-d');
      if (a === 'back') { clearInterval(tmr); clearInterval(ptm); document.body.classList.remove('in-game'); $('[data-scr="daily"]').classList.remove('scr--game'); env.show('home'); }
      else if (a === 'del') { el.inp.value = el.inp.value.slice(0, -1); paintTiles(); }
      else if (a === 'shuffle') { var o = shuffled(base, Date.now() % 9973); el.tiles.innerHTML = o.map(function (l) { return '<button type="button" class="dtile" data-l="' + l + '">' + l + '</button>'; }).join(''); paintTiles(); }
      else if (a === 'undo') undo();
      else if (a === 'perks') perks();
      else if (a === 'begin') begin();
      else if (a === 'finish') { el.fin.hidden = false; }
      else if (a === 'no') { el.fin.hidden = true; }
      else if (a === 'yes') { st.done = true; put(st); paint(); }
      else if (a === 'share') share();
    });
    $('[data-d-startform]').addEventListener('submit', function (ev) { ev.preventDefault(); begin(); });
    $('[data-d-form]').addEventListener('submit', function (ev) { ev.preventDefault(); add(el.inp.value); });
    el.inp.addEventListener('input', paintTiles);
    function toEnd() { if (el.board && !el.game.hidden) el.board.scrollTop = el.board.scrollHeight; }
    if (window.visualViewport) visualViewport.addEventListener('resize', function () { setTimeout(toEnd, 60); });
    el.inp.addEventListener('focus', function () { setTimeout(toEnd, 250); });
    paintHomeBtn();
  }
  window.BmoDaily = { init: init, paint: paint, paintHomeBtn: paintHomeBtn };
})();
