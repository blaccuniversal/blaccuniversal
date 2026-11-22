/* Bemaamoo Daily Challenge: one word a day, spell as many words from its letters as you can. One try. */
(function () {
  'use strict';
  var W = window.BMO_DAILY_WORDS || [];
  var START = Date.UTC(2026, 10, 23) / 86400000;            // day #1 = 23 Nov 2026
  var KEY = 'bmo_daily_v1', MIN = 3;
  var env = null, el = {}, today = 0, base = '', st = null, dict = null, busy = false;

  function $(s, r) { return (r || document).querySelector(s); }
  function dayNo() { return Math.floor((Date.now() + 3600000) / 86400000); }   // Lagos (UTC+1) midnight
  function num() { return today - START + 1; }
  function wordFor(n) { return W.length ? W[((n - 1) % W.length + W.length) % W.length] : 'TARNATION'; }
  function pts(w) { return w.length * (w.length + 1) / 2; }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(all) {
    var ks = Object.keys(all).sort(); while (ks.length > 90) delete all[ks.shift()];
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
  }
  function mine() { var a = load(); return a[num()] || { found: [], done: false }; }
  function put(s) { var a = load(); a[num()] = s; save(a); }
  function total(s) { return s.found.reduce(function (n, w) { return n + pts(w); }, 0); }
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
    if (!dict) dict = env.getList('words_en').then(function (L) { return L.full; });
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
  function paintFound() {
    var f = st.found.slice().sort(function (a, b) { return b.length - a.length || (a < b ? -1 : 1); });
    el.list.innerHTML = f.map(function (w) { return '<li><b>' + w + '</b><i>+' + pts(w) + '</i></li>'; }).join('');
    el.pts.textContent = total(st);
    el.cnt.textContent = pl(st.found.length, 'word');
    el.empty.hidden = !!st.found.length;
  }
  function paintHomeBtn() {
    var b = $('[data-daily-btn]'); if (!b) return;
    today = dayNo(); var s = mine();
    var sub = $('[data-daily-sub]');
    if (s.done) sub.textContent = 'Done today · ' + total(s) + ' pts';
    else if (s.found.length) sub.textContent = 'In progress · ' + pl(s.found.length, 'word');
    else sub.textContent = 'New word today';
  }
  function paint() {
    today = dayNo(); base = wordFor(num()); st = mine();
    $('[data-d-num]').textContent = '#' + num();
    el.play.hidden = st.done; el.res.hidden = !st.done;
    el.fin.hidden = true;
    if (st.done) return paintResult();
    el.tiles.innerHTML = shuffled(base, num()).map(function (l) { return '<button type="button" class="dtile" data-l="' + l + '">' + l + '</button>'; }).join('');
    el.inp.value = ''; msg('Words of 3+ letters. Each letter once per tile.');
    paintTiles(); paintFound();
    dictP().catch(function () { msg('Couldn’t load the dictionary. Check your connection.', true); });
  }

  /* ---------- play ---------- */
  function add(raw) {
    var w = (raw || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (!w) return;
    if (w.length < MIN) return msg('At least ' + MIN + ' letters.', true);
    if (w === base) return msg('That is the word itself. Find others.', true);
    if (!canMake(w, counts(base))) return msg(w + ' uses letters that aren’t there.', true);
    if (st.found.indexOf(w) >= 0) return msg('Already have ' + w + '.', true);
    if (busy) return; busy = true;
    dictP().then(function (D) {
      busy = false;
      if (!D.has(w)) return msg(w + ' isn’t in the dictionary.', true);
      st.found.push(w); put(st); el.inp.value = ''; paintTiles(); paintFound();
      msg('+' + pts(w) + ' for ' + w);
      el.list.parentNode.scrollTop = 0;
    }, function () { busy = false; msg('Couldn’t check that word. Try again.', true); });
  }

  /* ---------- result ---------- */
  function paintResult() {
    var a = load(); st = a[num()];
    $('[data-d-score]').textContent = total(st);
    $('[data-d-word]').textContent = base;
    var sk = streak();
    $('[data-d-meta]').textContent = pl(st.found.length, 'word') + (sk > 1 ? ' · ' + sk + '-day streak' : '');
    var f = st.found.slice().sort(function (x, y) { return y.length - x.length || (x < y ? -1 : 1); });
    $('[data-d-found]').innerHTML = f.map(function (w) { return '<li><b>' + w + '</b><i>+' + pts(w) + '</i></li>'; }).join('') || '<li class="dnone">No words this time.</li>';
    $('[data-d-missed]').textContent = '';
    dictP().then(function (D) {
      var c = counts(base), all = 0, miss = [];
      D.forEach(function (w) { if (w.length >= MIN && w.length < base.length && canMake(w, c)) { all++; if (st.found.indexOf(w) < 0) miss.push(w); } });
      miss.sort(function (x, y) { return y.length - x.length || (x < y ? -1 : 1); });
      $('[data-d-meta]').textContent = st.found.length + ' of ' + all + ' words' + (sk > 1 ? ' · ' + sk + '-day streak' : '');
      $('[data-d-missed]').innerHTML = miss.length ? '<b>You missed</b> ' + miss.slice(0, 12).join(', ') + (miss.length > 12 ? ' and ' + (miss.length - 12) + ' more' : '') : '<b>You found every word.</b>';
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
  function shareText() {
    var f = st.found.slice().sort(function (x, y) { return y.length - x.length || (x < y ? -1 : 1); });
    var out = 'Bemaamoo Daily #' + num() + ' · ' + base + '\n' + total(st) + ' pts · ' + pl(f.length, 'word') + '\n';
    var by = {}; f.forEach(function (w) { (by[w.length] = by[w.length] || []).push(w); });
    Object.keys(by).sort(function (x, y) { return y - x; }).forEach(function (n) { out += '\n' + n + ': ' + by[n].join(' '); });
    return out + '\n\nCan you beat me? blaccuniversal.com/bemaamoo/';
  }
  function share() {
    var t = shareText(), b = $('[data-d-share] span');
    function copied() { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Share my sheet'; }, 1800); }
    function copy() {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(copied, function () { b.textContent = 'Copy failed'; });
      else { var x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); copied(); } catch (e) {} x.remove(); }
    }
    if (navigator.share) navigator.share({ text: t }).catch(function (e) { if (!e || e.name !== 'AbortError') copy(); });
    else copy();
  }

  /* ---------- wire ---------- */
  function init(e) {
    env = e;
    el = { play: $('[data-d-play]'), res: $('[data-d-res]'), tiles: $('[data-d-tiles]'), inp: $('[data-d-in]'), msg: $('[data-d-msg]'), list: $('[data-d-list]'), pts: $('[data-d-pts]'), cnt: $('[data-d-cnt]'), empty: $('[data-d-empty]'), fin: $('[data-d-fin]') };
    $('[data-scr="daily"]').addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-d]'); if (!t) { var q = ev.target.closest('.dtile'); if (q) { el.inp.value += q.getAttribute('data-l'); paintTiles(); } return; }
      var a = t.getAttribute('data-d');
      if (a === 'back') { clearInterval(tmr); env.show('home'); }
      else if (a === 'del') { el.inp.value = el.inp.value.slice(0, -1); paintTiles(); }
      else if (a === 'shuffle') { var o = shuffled(base, Date.now() % 9973); el.tiles.innerHTML = o.map(function (l) { return '<button type="button" class="dtile" data-l="' + l + '">' + l + '</button>'; }).join(''); paintTiles(); }
      else if (a === 'finish') { el.fin.hidden = false; }
      else if (a === 'no') { el.fin.hidden = true; }
      else if (a === 'yes') { st.done = true; put(st); paint(); }
      else if (a === 'share') share();
    });
    $('[data-d-form]').addEventListener('submit', function (ev) { ev.preventDefault(); add(el.inp.value); });
    el.inp.addEventListener('input', paintTiles);
    paintHomeBtn();
  }
  window.BmoDaily = { init: init, paint: paint, paintHomeBtn: paintHomeBtn };
})();
