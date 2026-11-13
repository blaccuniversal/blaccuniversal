/* PQT · WORD RACE public page: published tournaments, brackets, battle results and team stats.
   Reads the PQT results sheet. Shows only what has actually been recorded. */
(function () {
  'use strict';
  var V = window.WRView, esc = V.esc, root = document.querySelector('[data-wrp]');
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwlYm7KzVBhDFraAMpyDYUcqV1EhbY1HUNlimdzXe9yyUNtZS169ok9eeKW73Kv7gFO7g/exec';
  var list = [];
  function date(t) { return new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
  function nm(T, id) { var t = T.teams.filter(function (x) { return x.id === id; })[0]; return t ? t.name : '?'; }

  function stats() {
    var s = {};
    list.filter(function (T) { return T.v === 2; }).forEach(function (T) {
      function row(id) { return s[nm(T, id).trim().toLowerCase()]; }
      T.teams.forEach(function (t) { var k = t.name.trim().toLowerCase(); var x = s[k] || (s[k] = { name: t.name, apps: 0, titles: 0, won: 0, pts: 0, mWon: 0, finals: 0 }); x.apps++; if (T.champion === t.id) x.titles++; });
      Object.keys(T.matchups).forEach(function (id) {
        var m = T.matchups[id]; if (m.kind === 'tb') return;
        m.teams.forEach(function (x) { var r = row(x); if (r) { r.won += m.wins[x]; r.pts += m.pts[x]; } });
        if (m.done && m.rank) { var w = row(m.rank[0]); if (w) w.mWon++; }
      });
      (T.stages || []).forEach(function (st) { if (st.t === 'final') T.matchups[st.matchups[0]].teams.forEach(function (x) { var r = row(x); if (r) r.finals++; }); });
    });
    return Object.keys(s).map(function (k) { return s[k]; }).sort(function (a, b) { return b.titles - a.titles || b.mWon - a.mWon || b.pts - a.pts; });
  }
  function home() {
    if (!list.length) { root.innerHTML = '<section class="card wrp-sec"><h2>Tournaments</h2><p class="wr-empty">No Word Race tournaments have been published yet.</p></section>'; return; }
    var st = stats();
    root.innerHTML = '<section class="card wrp-sec"><h2>Tournaments</h2>' + list.map(function (T) {
      var ch = T.champion ? nm(T, T.champion) : null;
      return '<button class="wrp-t" data-t="' + esc(T.id) + '" type="button">' + (ch ? V.badge({ name: ch, c: V.color(T.teams.findIndex(function (x) { return x.id === T.champion; })) }) : '<span class="wr-badge">…</span>') +
        '<div><b>' + esc(T.name) + '</b><span>' + date(T.created) + ' · ' + T.teams.length + ' teams · ' + (ch ? 'Champion: ' + esc(ch) : T.status === 'setup' ? 'Not started' : 'In progress') + '</span></div><i>→</i></button>';
    }).join('') + '</section>' +
      '<section class="card wrp-sec"><h2>Team stats</h2><div class="wrp-scroll"><table class="wrp-stats"><thead><tr><th>Team</th><th>Played</th><th>Titles</th><th>Finals</th><th>Matchups won</th><th>Battles won</th><th>Points</th></tr></thead><tbody>' +
      st.map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td>' + x.apps + '</td><td>' + x.titles + '</td><td>' + x.finals + '</td><td>' + x.mWon + '</td><td>' + x.won + '</td><td>' + x.pts + '</td></tr>'; }).join('') + '</tbody></table></div><p class="hc-note">From published Word Race tournaments only.</p></section>';
  }
  function detail(id) {
    var T = list.filter(function (x) { return x.id === id; })[0]; if (!T) return home();
    var M = V.model(T);
    var rounds = (M.stages || []).map(function (r) {
      var ms = r.matchups.concat(r.tb ? [r.tb] : []);
      return '<p class="wr-k">' + esc(r.label) + '</p>' + ms.map(function (m) {
        var order = m.done ? m.teams.slice().sort(function (a, b) { return a.place - b.place; }) : m.teams;
        return '<div class="wrp-mu"><div class="wrp-mu__h"><b>' + (m.label && m.label !== r.label ? esc(m.label) + ' · ' : '') + order.map(function (x) { return esc(x.t.name) + (m.kind === 'tb' ? '' : ' ' + x.pts); }).join(m.kind === 'duel' ? ' v ' : ' · ') + '</b><span>' + (m.kind === 'tb' ? 'Tie-break' : m.kind === 'duel' ? '1v1' : 'Bangarang') + '</span></div>' +
          m.battles.map(function (b) { return '<div class="wrp-bt"><span>' + (b.tb ? 'Decider' : 'Battle ' + b.n) + '</span><span>' + b.s.toUpperCase() + ' → ' + b.e.toUpperCase() + (b.w ? ' · <b>' + esc(b.w.name) + '</b>' + (b.word ? ' with “' + esc(b.word) + '”' : '') : ' · not finished') + (b.rolls ? ' · ' + b.rolls + ' re-roll' + (b.rolls > 1 ? 's' : '') : '') + '</span><span>' + (b.ms != null ? (b.ms / 1000).toFixed(1) + 's' : '') + '</span></div>'; }).join('') + '</div>';
      }).join('');
    }).join('');
    root.innerHTML = '<section class="card wrp-sec"><h2>' + esc(T.name) + '<button class="pbtn pbtn--sm" data-back type="button">All tournaments</button></h2><p class="hc-note" style="margin-top:0">' + date(T.created) + (M.champion ? ' · Champion: <b style="color:#fff">' + esc(M.champion.name) + '</b>' : ' · In progress') + '</p></section>' +
      '<section class="card wrp-sec"><h2>Bracket</h2>' + V.bracket(M) + '</section><section class="card wrp-sec"><h2>Results</h2>' + rounds + '</section>';
    window.scrollTo(0, 0);
  }
  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-t]'); if (t) { history.pushState(null, '', '?t=' + encodeURIComponent(t.dataset.t)); detail(t.dataset.t); return; }
    if (e.target.closest('[data-back]')) { history.pushState(null, '', location.pathname); home(); }
  });
  window.addEventListener('popstate', route);
  function route() { var id = new URLSearchParams(location.search).get('t'); if (id) detail(id); else home(); }
  root.innerHTML = '<section class="card wrp-sec"><p class="wr-empty">Loading results…</p></section>';
  fetch(ENDPOINT + '?wr=all', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
    list = ((j && j.ok && j.tournaments) || []).filter(function (T) { return T.v === 2; }); list.sort(function (a, b) { return b.created - a.created; }); route();
  }).catch(function () { root.innerHTML = '<section class="card wrp-sec"><h2>Tournaments</h2><p class="wr-empty">Results couldn’t load right now. Check your connection and try again.</p></section>'; });
})();
