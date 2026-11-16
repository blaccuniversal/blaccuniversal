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
      '<label class="pp-lab">Code on the screen<input class="hc-input pp-code" name="code" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD" value="' + esc(me.code) + '" required></label>' +
      '<label class="pp-lab">Team name<input class="hc-input" name="name" maxlength="24" autocomplete="off" placeholder="Your team’s name" value="' + esc(me.name) + '" required></label>' +
      '<p class="pp-err" role="alert"' + (err ? '' : ' hidden') + '>' + esc(err || '') + '</p>' +
      '<button class="pbtn pbtn--o pbtn--lg pbtn--block" type="submit">Join</button>' +
      '<p class="hc-note">Use your team’s exact name if the host already added it. One phone per team is enough.</p></form>';
    var f = root.querySelector('form');
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
    if (q.f != null) return '<div class="pp-asf"><b>' + esc(q.f) + '</b><span>[</span><b>' + esc(q.t) + '</b>' + (q.n ? '<span>·</span><b>' + esc(q.n) + '</b>' : '') + '<span>]</span><b>' + esc(q.l) + '</b></div><p class="pp-q pp-q--clue">' + esc(q.c) + '</p>';
    return '<p class="pp-q">' + esc(q.q) + '</p>';
  }
  function render() {
    var t = team();
    if (!t) { viewWait('Joining as ' + me.name + '…', 'Waiting for the host. Keep this page open.'); return; }
    if (!S.on) {
      root.innerHTML = '<div class="pp-card pp-wait">' + head(t) + MARK + '<p class="eyebrow">You’re in</p><h1 class="pp-h">Hold tight, ' + esc(t.name) + '.</h1><p class="pp-sub">Questions show up here in Written Round and AlphaSum. Keep this page open.</p></div>';
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
    out += '<div class="pp-qhead"><p class="eyebrow pp-k">' + esc(S.name) + ' · ' + unit + ' ' + (ci + 1) + ' of ' + S.n + '</p><span class="pp-timer" data-timer></span></div>' + puzzle(list[ci]) +
      '<form class="pp-ans" data-ans="' + ci + '"><input class="hc-input" name="a" maxlength="80" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Your answer" value="' + esc(ans[ci] || '') + '"><button class="pbtn pbtn--white pbtn--lg" type="submit">' + (ans[ci] ? 'Update' : 'Send') + '</button></form>' +
      '<p class="pp-saved" data-saved>' + (ans[ci] ? 'Sent: ' + esc(ans[ci]) : '') + '</p>';
    if (list.length > 1) {
      out += '<p class="eyebrow pp-k" style="margin-top:28px">Your answers · change any before the reveal</p><ol class="pp-list">';
      for (var i = list.length - 1; i >= 0; i--) {
        if (i === ci) continue;
        out += '<li><span>' + (i + 1) + '</span><form class="pp-ans pp-ans--sm" data-ans="' + i + '"><input class="hc-input" name="a" maxlength="80" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(list[i].q || list[i].c || '') + '" value="' + esc(ans[i] || '') + '"><button class="pbtn" type="submit">Save</button></form></li>';
      }
      out += '</ol>';
    }
    var focusIdx = document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-ans]') ? document.activeElement.closest('[data-ans]').getAttribute('data-ans') : null;
    var typed = focusIdx != null ? document.activeElement.value : null;
    root.innerHTML = '<div class="pp-card pp-game">' + out + '</div>';
    if (focusIdx != null) { var inp = root.querySelector('[data-ans="' + focusIdx + '"] input'); if (inp) { inp.value = typed; inp.focus(); } }
    paintTimer();
  }
  function paintTimer() {
    var el = root.querySelector('[data-timer]'); if (!el || !S || !S.timer) return;
    var left = S.timer.running ? Math.max(0, S._end - Date.now()) : S.timer.left;
    el.textContent = Math.ceil(left / 1000) + 's'; el.classList.toggle('is-low', left < 4000 && S.timer.running);
  }

  /* ---------- link ---------- */
  function base() { return TOPIC + me.code + '/'; }
  function send(m) { if (cl && cl.connected) try { cl.publish(base() + 'in', JSON.stringify(m), { qos: 0 }); } catch (e) {} }
  function sendAns(i) { send({ t: 'ans', dev: dev, rk: rk, i: +i, a: ans[i] || '' }); sentT[i] = Date.now(); }
  function start() {
    joined = false; S = null; viewWait('Joining as ' + me.name + '…', 'Waiting for the host. Keep this page open.');
    if (cl) try { cl.end(true); } catch (e) {}
    if (!window.mqtt) { viewJoin('Couldn’t load. Check your connection and reload.'); return; }
    var url = BROKERS[bi % BROKERS.length], ok = false;
    cl = window.mqtt.connect(url, { clientId: 'pqtp_' + dev + '_' + Math.random().toString(16).slice(2, 6), clean: true, connectTimeout: 8000, reconnectPeriod: 2500, keepalive: 20 });
    var fail = setTimeout(function () { if (!ok) { bi++; start(); } }, 10000);
    cl.on('connect', function () { ok = true; clearTimeout(fail); cl.subscribe(base() + 'play'); send({ t: 'join', dev: dev, name: me.name }); });
    cl.on('message', function (tp, p) {
      var m; try { m = JSON.parse(p.toString()); } catch (e) { return; }
      if (tp !== base() + 'play' || !m || m.v !== 1) return;
      if (S && m.seq && S.seq && m.seq < S.seq) return;   // an older state arrived late
      S = m; if (S.timer) S._end = Date.now() + S.timer.left;
      if (!S.devs || S.devs[dev] == null) { if (!joined) send({ t: 'join', dev: dev, name: me.name }); }
      else if (!joined) joined = true;
      // the host missed something: send our answers again
      var t = team();
      if (t && S.on && S.phase === 'ask' && S.rk === rk) {
        var mine = Object.keys(ans).filter(function (k) { return ans[k]; }).length;
        if ((S.count && S.count[t.i] || 0) < mine) Object.keys(ans).forEach(function (k) { if (ans[k] && Date.now() - (sentT[k] || 0) > 3000) sendAns(k); });
      }
      var h = JSON.stringify([S.on, S.rk, S.phase, S.cur, (S.qs || []).length, (S.rev || []).length, S.res && t ? S.res[t.i] : 0, t && t.name, t && t.color]);
      if (h !== lastHash) { lastHash = h; render(); } else paintTimer();
    });
  }
  root.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-ans]'); if (!f) return; e.preventDefault();
    var i = f.getAttribute('data-ans'), v = f.a.value.replace(/\s+/g, ' ').trim().slice(0, 80);
    ans[i] = v; ls('pqt_play_ans:' + rk, JSON.stringify(ans)); sendAns(i);
    var saved = root.querySelector('[data-saved]');
    if (+i === Math.min(S.cur, (S.qs || []).length - 1)) { if (saved) saved.textContent = v ? 'Sent: ' + v : 'Answer cleared'; f.querySelector('button').textContent = 'Update'; }
    else { var b = f.querySelector('button'); b.textContent = 'Saved'; setTimeout(function () { b.textContent = 'Save'; }, 1200); }
    f.a.blur();
  });
  root.addEventListener('click', function (e) {
    if (e.target.closest('[data-leave]')) { if (cl) try { cl.end(true); } catch (x) {} cl = null; S = null; lastHash = ''; viewJoin(); }
  });
  tick = setInterval(paintTimer, 250);
  if (me.code && me.name && qs.get('c') == null && ls('pqt_play_code')) start(); else viewJoin();
})();
