/* PQT · WORD RACE big screen. Shows whatever the host console sends. Read-only. */
(function () {
  'use strict';
  var V = window.WRView, esc = V.esc, root = document.querySelector('[data-screen]');
  var S = null, link = null, endAt = 0, seenEv = 0, lastLetters = '', ovT = null, ovEl = null, lastScene = '';
  function q(k) { return new URLSearchParams(location.search).get(k); }

  function enter() {
    root.innerHTML = '<div class="wrs-enter"><form class="card" data-f><p class="eyebrow">PQT · Word Race</p><input class="hc-input" data-c maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="CODE" aria-label="Room code"><button class="pbtn pbtn--white pbtn--lg pbtn--block" type="submit">Show the game</button><p class="hc-note">The code is on the host console.</p></form></div>';
    var f = root.querySelector('[data-f]'); f.querySelector('input').focus();
    f.addEventListener('submit', function (e) { e.preventDefault(); var c = WRLink.clean(f.querySelector('input').value); if (c.length === 4) { history.replaceState(null, '', '?c=' + c); connect(c); } });
  }
  function connect(c) {
    root.innerHTML = '<div class="sc wrs"><div class="sc-top"><span class="wrs-brand">Word Race</span><span class="sc-tag">Connecting to ' + esc(c) + '…</span></div><div class="sc-main"></div></div>';
    link = WRLink.view(c, function (s) { if (s.gone) return; S = s; S.rx = Date.now(); paint(); });
  }

  function ring(ms, secs) {
    var C = 2 * Math.PI * 46, f = secs ? Math.max(0, Math.min(1, ms / (secs * 1000))) : 0;
    return '<div class="wrs-ring' + (ms <= 0 ? ' is-up' : ms < 6000 ? ' is-low' : '') + '" data-ring><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="46"/><circle class="fg" cx="50" cy="50" r="46" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - f)).toFixed(1) + '"/></svg><b>' + (ms <= 0 ? '0' : Math.ceil(ms / 1000)) + '</b></div>';
  }
  function team(t, cls) { return '<div class="wrs-team ' + (cls || '') + '">' + V.badge(t) + '<div class="wrs-team__n">' + esc(t.name) + '</div><span class="wr-dots">' + [0, 1].map(function (i) { return '<i' + (i < t.wins ? ' class="on"' : '') + '></i>'; }).join('') + '</span><span class="wrs-team__p">' + t.pts + ' pts</span></div>'; }

  function paint() {
    if (!S) return;
    var main, top = '<div class="sc-top"><span class="wrs-brand">Word Race</span><span class="wrs-round">' + esc(S.round || S.name || '') + '</span><span class="sc-tag">PQT · ' + esc(S.code) + '</span></div>';
    var b = S.battle, m = S.m;
    if (b && b.running) endAt = S.rx + b.left; else endAt = 0;
    if (S.status === 'done' && S.champion && S.scene === 'battle') { champion(); return; }
    if (S.status === 'setup' || !S.bracket || !S.bracket.rounds.length) main = lobby();
    else if (S.scene === 'bracket') main = '<div class="wrs-board"><p class="wrs-label">' + esc(S.name) + ' · Bracket</p>' + V.bracket(S.bracket) + '</div>';
    else if (S.scene === 'standings') main = standings();
    else main = battle();
    var flip = false, key = b ? b.s + b.e + ':' + b.n + ':' + (m && m.id) : '';
    if (key && key !== lastLetters && b.running) { flip = true; lastLetters = key; }
    root.innerHTML = '<div class="sc wrs">' + top + '<div class="sc-main">' + main + '</div><div class="sc-bot"><span>' + esc(S.name) + '</span><span>' + (S.next && S.next.length && S.scene === 'battle' ? 'Next · ' + esc(S.next[0]) : 'People, Quests &amp; Triumphs') + '</span></div></div>' + (S.paused ? '<div class="wrs-pause">Paused</div>' : '');
    if (flip) root.querySelectorAll('.wrs-letter').forEach(function (x) { x.classList.add('is-flip'); });
    if (ovEl) { if (S.scene !== 'battle') clearOv(); else root.appendChild(ovEl); }
    lastScene = S.scene;
    playEvent();
  }
  function lobby() {
    return '<div class="wrs-lobby"><span class="wrs-lobby__tag">Two letters. One word. Beat the clock.</span><h1 class="wrs-lobby__t">WORD RACE</h1><span class="wrs-lobby__name">' + esc(S.name) + '</span>' +
      '<div class="wrs-lobby__teams">' + (S.teams || []).map(function (t) { return '<span>' + V.badge(t) + esc(t.name) + '</span>'; }).join('') + '</div>' +
      (S.mode === 'phones' ? '<p class="wrs-join">Teams join at <b>blaccuniversal.com/pqt/wordrace/join</b> · code <b>' + esc(S.code) + '</b></p>' : '') + '</div>';
  }
  function battle() {
    var m = S.m, b = S.battle;
    if (S.decision) return '<div class="wrs-lobby"><span class="wrs-lobby__tag">Hold tight</span><p class="wrs-ov__mid">The host is settling who goes through.</p></div>';
    if (!m) return lobby();
    var running = b && b.running, ms = running ? Math.max(0, endAt - Date.now()) : 0;
    var wa = '', wb = '';
    if (b && !running && b.winner) { wa = b.winner === m.a.name ? 'is-win' : 'is-lose'; wb = b.winner === m.b.name ? 'is-win' : 'is-lose'; }
    var mid;
    if (b && (running || b.winner)) {
      mid = '<p class="wrs-label">' + esc(m.label || S.round) + ' · Battle ' + b.n + '</p>' +
        '<div class="wrs-letters"><div class="wrs-tile"><span class="wrs-tile__k">Starts with</span><span class="wrs-letter">' + b.s.toUpperCase() + '</span></div><span class="wrs-arrow">→</span><div class="wrs-tile"><span class="wrs-tile__k">Ends with</span><span class="wrs-letter">' + b.e.toUpperCase() + '</span></div></div>' +
        (running ? ring(ms, b.secs) : '<p class="wrs-idle">' + (b.winner ? esc(b.winner) + ' take battle ' + b.n + (b.last && b.last.ok && b.last.word ? ' with <b style="color:#fff">' + esc(b.last.word.toUpperCase()) + '</b>' : '') : '') + '</p>');
    } else {
      mid = '<p class="wrs-label">' + esc(m.label || S.round) + '</p><div class="wrs-letters"><div class="wrs-tile"><span class="wrs-tile__k">Starts with</span><span class="wrs-letter" style="opacity:.12">?</span></div><span class="wrs-arrow">→</span><div class="wrs-tile"><span class="wrs-tile__k">Ends with</span><span class="wrs-letter" style="opacity:.12">?</span></div></div><p class="wrs-idle">Battle ' + (m.n + 1) + ' up next</p>';
    }
    return '<div class="wrs-stage">' + team(m.a, wa) + '<div class="wrs-mid">' + mid + '</div>' + team(m.b, wb) + '</div>';
  }
  function standings() {
    var rows = (S.standings || []).slice().sort(function (a, b) { var o = { champion: 0, in: 1, waiting: 2, out: 3 }; return (o[a.status] - o[b.status]) || (b.won - a.won) || (b.pts - a.pts); });
    return '<div class="wrs-board" style="align-items:center"><p class="wrs-label">' + esc(S.name) + ' · Standings</p><table class="wrs-table"><thead><tr><th>Team</th><th>Battles won</th><th>Points</th><th>Status</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr class="' + (r.status === 'out' ? 'is-out' : '') + '"><td>' + V.badge(r) + esc(r.name) + '</td><td>' + r.won + '</td><td>' + r.pts + '</td><td><em>' + (r.status === 'champion' ? 'Champion' : r.status === 'out' ? 'Out' : r.status === 'waiting' ? 'Revival?' : r.revival ? 'Revived' : 'Still in') + '</em></td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function champion() {
    var t = (S.teams || []).filter(function (x) { return x.name === S.champion; })[0] || { name: S.champion, c: '#ff6a2b' };
    var sp = ''; for (var i = 0; i < 40; i++) sp += '<i class="wrs-spark" style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + ['#ff6a2b', '#fff', '#f2b23a'][i % 3] + ';animation-duration:' + (3 + Math.random() * 4).toFixed(1) + 's;animation-delay:-' + (Math.random() * 6).toFixed(1) + 's"></i>';
    root.innerHTML = '<div class="wrs-champ">' + sp + '<span class="wrs-champ__k">Word Race Champion</span>' + V.badge(t) + '<div class="wrs-champ__n">' + esc(t.name) + '</div><span class="wrs-ov__sub">' + esc(S.name) + '</span></div>';
  }

  /* one-shot moments driven by the host's event feed, played one after another */
  var queue = [], playing = false, evInit = false;
  function overlay(cls, html, ms) {
    clearTimeout(ovT); if (ovEl) ovEl.remove();
    ovEl = document.createElement('div'); ovEl.className = 'wrs-ov ' + cls; ovEl.innerHTML = html; root.appendChild(ovEl); playing = true;
    ovT = setTimeout(function () { if (!ovEl) { playing = false; return next(); } ovEl.classList.add('is-out'); var x = ovEl; ovEl = null; setTimeout(function () { x.remove(); playing = false; next(); }, 400); }, ms);
  }
  function clearOv() { clearTimeout(ovT); queue = []; playing = false; if (ovEl) { ovEl.remove(); ovEl = null; } }
  function playEvent() {
    var list = S.evs || [];
    if (!evInit) { evInit = true; seenEv = list.length ? list[list.length - 1].id : 0; return; } // a screen that joins late doesn't replay old moments
    list.forEach(function (e) { if (e.id <= seenEv) return; seenEv = e.id; if (e.k === 'letters' || e.k === 'reroll') clearOv(); else queue.push(e); });
    if (S.scene !== 'battle') { clearOv(); return; }
    if (!playing) next();
  }
  function next() {
    var e = queue.shift(); if (!e) return;
    var d = e.d || {};
    if (e.k === 'correct') overlay('wrs-ov--ok', '<span class="wrs-ov__k">' + esc(d.team) + '</span><div class="wrs-ov__big">' + esc((d.word || 'Correct').toUpperCase()) + '</div><span class="wrs-ov__sub">+' + d.pts + ' points</span>', 2400);
    else if (e.k === 'wrong') { overlay('wrs-ov--no', '<span class="wrs-ov__k">' + esc(d.team) + '</span><div class="wrs-ov__big">' + esc((d.word || '—').toUpperCase()) + '</div><span class="wrs-ov__sub">' + esc(reason(d.reason)) + (d.pts ? ' · ' + d.pts + ' points' : '') + '</span>', 1600); var st = root.querySelector('.wrs-letters'); if (st) st.classList.add('wrs-shake'); }
    else if (e.k === 'time') overlay('wrs-ov--time', '<div class="wrs-ov__big">TIME</div><span class="wrs-ov__sub">New letters coming</span>', 1500);
    else if (e.k === 'matchup') overlay('wrs-ov--win', '<span class="wrs-ov__k">Matchup winner</span><div class="wrs-ov__big" style="font-size:11vh">' + esc(d.team) + '</div><span class="wrs-ov__mid">' + esc(d.score) + '</span>', 3800);
    else if (e.k === 'revival') overlay('wrs-ov--rev', '<span class="wrs-ov__k">Best Loser Revival</span><div class="wrs-ov__mid">' + (d.tied ? 'Three losers tied on points' : esc(d.best || '') + ' get a second chance') + '</div><span class="wrs-ov__sub">' + d.pairs.map(function (p) { return esc(p[0]) + ' v ' + esc(p[1]); }).join(' · ') + '</span>', 4500);
    else if (e.k === 'revived') overlay('wrs-ov--rev', '<span class="wrs-ov__k">Back in the race</span><div class="wrs-ov__big" style="font-size:10vh">' + esc(d.team) + '</div><span class="wrs-ov__sub">qualified through the revival</span>', 3800);
    else if (e.k === 'round') overlay('', '<span class="wrs-ov__k">Next stage</span><div class="wrs-ov__big" style="font-size:12vh">' + esc(d.label) + '</div>', 2800);
    else next();
  }
  function reason(r) { return { start: 'Wrong first letter', end: 'Wrong last letter', short: 'Too short', repeat: 'Already used', unknown: 'Not a word', empty: 'Wrong', dictionary: '' }[r] || 'Wrong'; }

  /* countdown without repainting everything */
  setInterval(function () {
    if (!S || !endAt) return; var r = root.querySelector('[data-ring]'); if (!r) return;
    var ms = Math.max(0, endAt - Date.now()), C = 2 * Math.PI * 46, f = S.battle ? Math.min(1, ms / (S.battle.secs * 1000)) : 0;
    r.querySelector('.fg').setAttribute('stroke-dashoffset', (C * (1 - f)).toFixed(1)); r.querySelector('b').textContent = Math.ceil(ms / 1000);
    r.classList.toggle('is-low', ms > 0 && ms < 6000); r.classList.toggle('is-up', ms <= 0);
  }, 100);
  document.addEventListener('dblclick', function () { if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {}); });

  var c = WRLink.clean(q('c') || ''); if (c.length === 4) connect(c); else enter();
})();
