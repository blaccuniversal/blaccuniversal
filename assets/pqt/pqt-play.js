/* PQT · Play: teams join a game on their phone with the screen code and answer Written Round / AlphaSum. */
(function () {
  'use strict';
  var BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];
  var TOPIC = 'blaccuniversal/pqt/v1/';
  var root = document.querySelector('[data-play]');
  function $(s) { return root.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  var dev = ls('pqt_dev'); if (!dev) { dev = Math.random().toString(36).slice(2, 12); ls('pqt_dev', dev); }
  var qs = new URLSearchParams(location.search);
  var me = { code: (qs.get('c') || ls('pqt_play_code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4), name: ls('pqt_play_name') || '' };
  var cl = null, bi = 0, S = null, joined = false, ans = {}, rk = '', lastHash = '', tick = null, sentT = {};
  var MARK = '<img class="pp-mark" src="/assets/pqt/pqt-mark.png" alt="PQT" width="371" height="400">';

  /* ---------- views ---------- */
  function viewJoin(err) {
    root.innerHTML = '<form class="pp-card pp-join" novalidate>' + MARK +
      '<p class="eyebrow">Play on your phone</p><h1 class="pp-h">Join the game.</h1>' +
      '<label class="pp-lab">Code on the screen<input class="hc-input hc-code pp-code" name="code" inputmode="text" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD" value="' + esc(me.code) + '" required></label>' +
      '<label class="pp-lab">Team name<input class="hc-input" name="name" maxlength="24" autocomplete="off" placeholder="Your team’s name" value="' + esc(me.name) + '" required></label>' +
      '<p class="pp-err" role="alert"' + (err ? '' : ' hidden') + '>' + esc(err || '') + '</p>' +
      '<button class="pbtn pbtn--o pbtn--lg pbtn--block" type="submit">Join</button>' +
      '<p class="hc-note">Use your team’s exact name if the host already added it. One phone per team is enough.</p></form>';
    var f = root.querySelector('form');
    f.code.addEventListener('input', function () { var c = f.code.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); if (c.length === 4) link(c); });
    if (me.code.length === 4) link(me.code);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var c = f.code.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4), n = f.name.value.replace(/\s+/g, ' ').trim().slice(0, 24);
      if (c.length !== 4) return viewJoin('Enter the 4-character code on the screen.');
      if (!n) return viewJoin('Enter your team name.');
      me.code = c; me.name = n; ls('pqt_play_code', c); ls('pqt_play_name', n);
      start();
    });
  }
  function viewWait(msg, sub) {
    root.innerHTML = '<div class="pp-card pp-wait">' + MARK + '<p class="eyebrow">' + esc(me.code) + '</p><h1 class="pp-h">' + esc(msg) + '</h1>' + (sub ? '<p class="pp-sub">' + esc(sub) + '</p>' : '') +
      '<span class="pp-spin" aria-hidden="true"></span><button class="pp-leave" type="button" data-leave>Leave</button></div>';
  }
  function team() { if (!S || !S.devs || S.devs[dev] == null) return null; var t = S.teams[S.devs[dev]]; return t ? { i: S.devs[dev], name: t.name, color: t.color } : null; }
  function head(t) {
    return '<header class="pp-top"><span class="pp-team" style="--c:' + t.color + '"><i></i>' + esc(t.name) + '</span><button class="pp-leave" type="button" data-leave>Leave</button></header>';
  }
  function puzzle(q) {
    if (!q) return '';
    if (q.f != null) return '<div class="pp-asf"><span class="pp-asf__c pp-asf__c--f">' + esc(q.f) + '</span><span class="pp-asf__b">[</span><span class="pp-asf__t">' + esc(q.t) + '</span>' + (q.n ? '<span class="pp-asf__d">·</span><span class="pp-asf__n">' + esc(q.n) + '</span>' : '') + '<span class="pp-asf__b">]</span><span class="pp-asf__c pp-asf__c--l">' + esc(q.l) + '</span></div>' +
      '<div class="pp-asf__rule"></div><p class="pp-asf__k">Clue</p><p class="pp-q pp-asf__q">' + esc(q.c) + '</p>';
    return '<p class="pp-q">' + esc(q.q) + '</p>';
  }
  /* AlphaSum answer card: same as the AlphaSum game. Letter tiles with their values, then 1ST / SUM / LEN / LAST checks. */
  function val(c) { return c.charCodeAt(0) - 64; }
  function asLive(q, v) {
    var g = String(v || '').toUpperCase().replace(/[^A-Z]/g, '').split('').filter(Boolean);
    var tiles = g.length ? g.map(function (c) { return '<div class="pp-lbox"><b>' + c + '</b><span>' + val(c) + '</span></div>'; }).join('') : '<span class="pp-lbox-ghost">_ _ _ _</span>';
    if (!g.length) return '<div class="pp-lrow">' + tiles + '</div>';
    var sum = g.reduce(function (a, c) { return a + val(c); }, 0), f = val(g[0]), l = val(g[g.length - 1]);
    function chip(lbl, cur, tgt, cls) { return '<div class="pp-cp ' + cls + '"><span class="pp-cp__l">' + lbl + '</span><span class="pp-cp__v">' + cur + '<i>/' + tgt + '</i></span></div>'; }
    var strip = chip('1st', f, q.f, f === +q.f ? 'is-ok' : 'is-bad') + chip('Sum', sum, q.t, sum === +q.t ? 'is-ok' : sum > +q.t ? 'is-over' : '') +
      (q.n ? chip('Len', g.length, q.n, g.length === +q.n ? 'is-ok' : g.length > +q.n ? 'is-bad' : '') : '') + chip('Last', l, q.l, l === +q.l ? 'is-ok' : 'is-bad');
    return '<div class="pp-lrow">' + tiles + '</div><div class="pp-cstrip">' + strip + '</div>';
  }
  function tleft() { return !S || !S.timer ? 1 : S.timer.running ? Math.max(0, S._end - Date.now()) : S.timer.left; }
  function timeUp() { return S && S.timer && tleft() <= 0; }
  function alphaLocked(q, v) {
    return '<div class="pp-asb pp-asb--done">' + (v ? asLive(q, v) : '<div class="pp-lrow"><span class="pp-lbox-ghost">_ _ _ _</span></div>') +
      '<p class="pp-lock">' + (v ? 'Answer locked in' : 'Time’s up · no answer') + '<span>Next puzzle when the time runs out.</span></p></div>';
  }
  function alphaPlay(q, ci, v) {
    return '<div class="pp-asb"><div data-aslive>' + asLive(q, v) + '</div>' +
      '<form class="pp-ans pp-ans--as" data-ans="' + ci + '"><input class="hc-input" name="a" maxlength="40" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" placeholder="TYPE YOUR ANSWER" value="' + esc(v || '') + '"><button class="pp-asgo" type="submit">SUBMIT →</button></form>' +
      '<p class="pp-ashint">Enter to submit · one answer per puzzle</p></div>';
  }
  function render() {
    var t = team();
    if (!t) { viewWait('Joining as ' + me.name + '…', 'Waiting for the host. Keep this page open.'); return; }
    if (!S.on) {
      var sc = (S.scores || []).map(function (v, i) { return { i: i, v: v, t: S.teams[i] }; }).filter(function (x) { return x.t; }).sort(function (a, b) { return b.v - a.v; });
      var board = sc.length ? '<p class="eyebrow pp-k" style="margin-top:30px">Scores</p><ol class="pp-scores">' + sc.map(function (x) { return '<li class="' + (x.i === t.i ? 'is-me' : '') + '" style="--c:' + x.t.color + '"><i></i><span>' + esc(x.t.name) + '</span><b>' + x.v + '</b></li>'; }).join('') + '</ol>' : '';
      var msg = S.over ? ['Game over', 'Thanks for playing, ' + t.name + '.'] : S.now ? ['Round ' + S.now.round + ' of ' + S.now.rounds + (S.now.name ? ' · ' + S.now.name : ''), 'This round is played in the room. Questions show up here when a phone round starts.'] : ['You’re in', 'Hold tight, ' + t.name + '. Questions show up here when a phone round starts.'];
      root.innerHTML = '<div class="pp-card pp-game">' + head(t) + '<p class="eyebrow pp-k">' + esc(msg[0]) + '</p><h1 class="pp-h">' + (S.over ? 'That’s a wrap.' : S.now ? 'Eyes on the screen.' : 'You’re in.') + '</h1><p class="pp-sub">' + esc(msg[1]) + '</p>' + board + '</div>';
      return;
    }
    if (S.rk !== rk) { rk = S.rk; try { ans = JSON.parse(ls('pqt_play_ans:' + rk) || '{}'); } catch (e) { ans = {}; } }
    var unit = S.type === 'alpha' ? 'Puzzle' : 'Question', out = head(t);
    if (S.phase === 'reveal') {
      var res = (S.res || {})[t.i] || [], ok = res.filter(Boolean).length;
      out += '<p class="eyebrow pp-k">Round ' + S.round + ' · ' + esc(S.name) + '</p><h1 class="pp-h">Answer reveal</h1><p class="pp-sub">' + (S.rev || []).length + ' of ' + S.n + ' revealed · ' + ok + ' correct so far</p><ol class="pp-rev">' +
        (S.rev || []).map(function (a, i) { var mine = ans[i] || ''; var r = res[i]; return '<li class="' + (r ? 'is-ok' : 'is-no') + '"><span>' + unit + ' ' + (i + 1) + '</span><b>' + esc(a) + '</b><em>' + (mine ? 'You: ' + esc(mine) : 'No answer') + '</em><i>' + (r ? '✓' : '✕') + '</i></li>'; }).reverse().join('') + '</ol>';
      root.innerHTML = '<div class="pp-card pp-game">' + out + '</div>'; return;
    }
    var list = S.qs || [], cur = S.cur;
    if (!list.length || cur < 0) {
      root.innerHTML = '<div class="pp-card pp-wait">' + head(t) + '<p class="eyebrow">Round ' + S.round + '</p><h1 class="pp-h">' + esc(S.name) + '</h1><p class="pp-sub">' + S.n + ' ' + unit.toLowerCase() + 's. Each one appears here when it goes up on the screen.</p><span class="pp-spin" aria-hidden="true"></span></div>';
      return;
    }
    var ci = Math.min(cur, list.length - 1);
    if (S.type === 'alpha') {
      var qa = list[ci] || {};
      var lockedA = ans[ci] != null || timeUp();
      out += '<div class="pp-asc"><div class="pp-asc__top"><span class="pp-pill' + (qa.h ? ' is-hard' : '') + '"><i></i>' + (qa.h ? 'Hard' : 'Easy') + '</span><span class="pp-asc__cat">AlphaSum</span><span class="pp-timer" data-timer></span><span class="pp-asc__no">' + (ci + 1) + '/' + S.n + '</span></div>' + puzzle(qa) + '</div>' + (lockedA ? alphaLocked(qa, ans[ci]) : alphaPlay(qa, ci, ''));
    } else
    out += '<div class="pp-qhead"><p class="eyebrow pp-k">' + esc(S.name) + ' · ' + unit + ' ' + (ci + 1) + ' of ' + S.n + '</p><span class="pp-timer" data-timer></span></div>' + puzzle(list[ci]) +
      '<form class="pp-ans" data-ans="' + ci + '"><input class="hc-input" name="a" maxlength="80" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Your answer" value="' + esc(ans[ci] || '') + '"><button class="pbtn pbtn--white pbtn--lg" type="submit">' + (ans[ci] ? 'Update' : 'Send') + '</button></form>' +
      '<p class="pp-saved" data-saved>' + (ans[ci] ? 'Sent: ' + esc(ans[ci]) : '') + '</p>';
    if (list.length > 1 && S.type !== 'alpha') {
      out += '<p class="eyebrow pp-k" style="margin-top:28px">Your answers · change any before the reveal</p><ol class="pp-list">';
      for (var i = list.length - 1; i >= 0; i--) {
        if (i === ci) continue;
        out += '<li><span>' + (i + 1) + '</span><form class="pp-ans pp-ans--sm" data-ans="' + i + '"><input class="hc-input" name="a" maxlength="80" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(list[i].q || list[i].c || '') + '" value="' + esc(ans[i] || '') + '"><button class="pbtn" type="submit">Save</button></form></li>';
      }
      out += '</ol>';
    }
    var asInp = root.querySelector('.pp-ans--as input'), asKeep = asInp ? [asInp.closest('[data-ans]').getAttribute('data-ans'), asInp.value] : null;
    var focusIdx = document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.closest('[data-ans]') ? document.activeElement.closest('[data-ans]').getAttribute('data-ans') : null;
    var typed = focusIdx != null ? document.activeElement.value : null;
    var newQ = render._q !== S.rk + ':' + ci; render._q = S.rk + ':' + ci;
    root.innerHTML = '<div class="pp-card pp-game">' + out + '</div>';
    if (newQ && focusIdx == null) window.scrollTo(0, 0);
    if (focusIdx != null) { var inp = root.querySelector('[data-ans="' + focusIdx + '"] input'); if (inp) { inp.value = typed; inp.focus(); } }
    if (asKeep) { var ni = root.querySelector('.pp-ans--as[data-ans="' + asKeep[0] + '"] input'); if (ni && ni !== document.activeElement && asKeep[1] !== (ans[asKeep[0]] || '')) { ni.value = asKeep[1]; paintBlanks(ni); } }
    paintTimer();
  }
  function paintTimer() {
    var el = root.querySelector('[data-timer]'); if (!el || !S || !S.timer) return;
    var left = S.timer.running ? Math.max(0, S._end - Date.now()) : S.timer.left;
    el.textContent = Math.ceil(left / 1000) + 's'; el.classList.toggle('is-low', left < 4000 && S.timer.running);
    if (S.type === 'alpha' && S.phase === 'ask' && left <= 0 && root.querySelector('.pp-ans--as')) {
      var inp = root.querySelector('.pp-ans--as input'), i = inp.closest('[data-ans]').getAttribute('data-ans');
      var v = inp.value.toUpperCase().replace(/[^A-Z]/g, '');
      if (v && ans[i] == null) { ans[i] = v; ls('pqt_play_ans:' + rk, JSON.stringify(ans)); sendAns(i); }
      render();
    }
  }

  /* ---------- link ---------- */
  function base() { return TOPIC + me.code + '/'; }
  function send(m) { var t = base() + 'in', p = JSON.stringify(m); cls.forEach(function (c) { if (c && c.connected) try { c.publish(t, p, { qos: 0 }); } catch (e) {} }); }
  function sendAns(i) { send({ t: 'ans', dev: dev, rk: rk, i: +i, a: ans[i] || '' }); sentT[i] = Date.now(); }
  var linkCode = '', wantJoin = false;
  // Connect to every broker at once; the host publishes on all of them, so whichever answers first wins.
  var cls = [], joinT = null;
  function link(code) {
    if (!window.mqtt || !code || code.length !== 4) return;
    if (cls.length && linkCode === code) return;
    cls.forEach(function (c) { try { c.end(true); } catch (e) {} }); cls = [];
    linkCode = code; S = null; lastHash = '';
    BROKERS.forEach(function (url) {
      var c; try { c = window.mqtt.connect(url, { clientId: 'pqtp_' + dev + '_' + Math.random().toString(16).slice(2, 6), clean: true, connectTimeout: 8000, reconnectPeriod: 1500, keepalive: 20 }); } catch (e) { return; }
      cls.push(c); cl = c;
      c.on('connect', function () { if (cls.indexOf(c) < 0) return; c.subscribe(TOPIC + code + '/play'); if (wantJoin && !joined) c.publish(TOPIC + code + '/in', JSON.stringify({ t: 'join', dev: dev, name: me.name }), { qos: 0 }); });
      c.on('message', function (tp, p) {
        var m; try { m = JSON.parse(p.toString()); } catch (e) { return; }
        if (tp !== TOPIC + linkCode + '/play' || !m || m.v !== 1) return;
        onPlay(m);
      });
      c.on('error', function () {});
    });
    // keep knocking until the host has us
    clearInterval(joinT);
    joinT = setInterval(function () { if (wantJoin && !joined) send({ t: 'join', dev: dev, name: me.name }); }, 2000);
  }
  function onPlay(m) {
      if (S && m.seq && S.seq && m.seq < S.seq) return;   // an older state arrived late
      S = m; if (S.timer) S._end = Date.now() + S.timer.left;
      if (!wantJoin) return;   // connected early; nothing to show until the team joins
      if (!S.devs || S.devs[dev] == null) { if (!joined) send({ t: 'join', dev: dev, name: me.name }); }
      else if (!joined) joined = true;
      // the host missed something: send our answers again
      var t = team();
      if (t && S.on && S.phase === 'ask' && S.rk === rk) {
        var nMine = Object.keys(ans).filter(function (k) { return ans[k]; }).length;
        if ((S.count && S.count[t.i] || 0) < nMine) Object.keys(ans).forEach(function (k) { if (ans[k] && Date.now() - (sentT[k] || 0) > 3000) sendAns(k); });
      }
      var h = JSON.stringify([S.on, S.rk, S.phase, S.cur, S.type === 'alpha' && timeUp(), S.on ? 0 : [S.scores, S.now, S.over], (S.qs || []).length, (S.rev || []).length, S.res && t ? S.res[t.i] : 0, t && t.name, t && t.color]);
      if (h !== lastHash) { lastHash = h; render(); } else paintTimer();
  }
  function start() {
    joined = false; wantJoin = true; lastHash = '';
    viewWait('Joining as ' + me.name + '…', 'Connecting to the game.');
    if (!window.mqtt) { viewJoin('Couldn’t load. Check your connection and reload.'); return; }
    if (cls.length && linkCode === me.code && cls.some(function (c) { return c.connected; })) { send({ t: 'join', dev: dev, name: me.name }); if (S) { var h0 = S; S = null; onPlay(h0); } }
    else link(me.code);
  }
  root.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-ans]'); if (!f) return; e.preventDefault();
    var i = f.getAttribute('data-ans'), v = f.a.value.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (f.classList.contains('pp-ans--as')) {
      v = v.toUpperCase().replace(/[^A-Z]/g, ''); if (!v || ans[i] != null || timeUp()) return;
      ans[i] = v; ls('pqt_play_ans:' + rk, JSON.stringify(ans)); sendAns(i); f.a.blur(); render(); return;
    }
    ans[i] = v; ls('pqt_play_ans:' + rk, JSON.stringify(ans)); sendAns(i);
    var saved = root.querySelector('[data-saved]');
    if (+i === Math.min(S.cur, (S.qs || []).length - 1)) { if (saved) saved.textContent = v ? 'Sent: ' + v + (S.type === 'alpha' ? ' · change it any time before the reveal' : '') : 'Answer cleared'; f.querySelector('button').textContent = S.type === 'alpha' ? 'UPDATE →' : 'Update'; }
    else { var b = f.querySelector('button'); b.textContent = 'Saved'; setTimeout(function () { b.textContent = 'Save'; }, 1200); }
    f.a.blur();
  });
  function paintBlanks(inp) {
    var box = root.querySelector('[data-aslive]'); if (!box || !inp.closest('.pp-ans--as') || !S) return;
    var i = +inp.closest('[data-ans]').getAttribute('data-ans'), q = (S.qs || [])[i]; if (q) box.innerHTML = asLive(q, inp.value);
  }
  root.addEventListener('input', function (e) {
    var inp = e.target; if (!inp.closest || !inp.closest('.pp-ans--as')) return;
    var v = inp.value.toUpperCase().replace(/[^A-Z]/g, ''); if (v !== inp.value) inp.value = v;
    paintBlanks(inp);
  });
  root.addEventListener('click', function (e) {
    if (e.target.closest('[data-leave]')) { wantJoin = false; joined = false; lastHash = ''; viewJoin(); }
  });
  tick = setInterval(paintTimer, 250);
  if (me.code && me.name && qs.get('c') == null && ls('pqt_play_code')) start(); else viewJoin();
})();
