/* PQT leaderboard: season standings from /pqt/data/season-1.json
   Weekly score  W = (P × B) + (S × 0.25)
   P raw points · B entry boost = 1 + missed/12 on debut week only · S consecutive-week streak */
(function () {
  var root = document.querySelector('[data-lbroot]'); if (!root) return;
  var SRC = '/pqt/data/season-1.json';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function roman(n) { var m = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']], r = ''; m.forEach(function (p) { while (n >= p[0]) { r += p[1]; n -= p[0]; } }); return r; }
  function pad(s, w) { while (s.length < w) s = '\u2007' + s; return s; }
  function f2(n) { return (Math.round(n * 100) / 100).toFixed(2); }
  function ord(d) { var s = ['th', 'st', 'nd', 'rd'], v = d % 100; return d + (s[(v - 20) % 10] || s[v] || s[0]); }
  function longDate(iso) { var d = new Date(iso + 'T12:00:00'); var M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], D = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; return { day: D[d.getDay()], date: M[d.getMonth()] + ' ' + ord(d.getDate()) + ', ' + d.getFullYear() }; }
  function key(n) { return String(n).trim().toLowerCase(); }

  function compute(S) {
    var len = S.length || 12, bonus = S.streakBonus == null ? 0.25 : S.streakBonus;
    var st = {}, order = [], missing = [];
    (S.start ? S.start.teams : []).forEach(function (t) { st[key(t.team)] = { name: t.team, total: t.total || 0, streak: t.streak, debut: t.debut, rank: t.rank, prev: t.prevRank }; order.push(key(t.team)); });
    var after = S.start ? S.start.afterWeek : 0, last = after;
    S.weeks.slice().sort(function (a, b) { return a.week - b.week; }).forEach(function (w) {
      if (w.week <= after) return;
      var before = {}; order.forEach(function (k) { before[k] = st[k].rank; });
      var came = {};
      w.results.forEach(function (r) {
        var k = key(r.team), t = st[k];
        if (!t) { t = st[k] = { name: r.team, total: 0, streak: 0, debut: w.week, rank: null }; order.push(k); }
        if (t.streak == null) { missing.push(t.name); t.streak = 0; }
        if (t.debut == null) t.debut = 0;
        t.streak += 1;
        var B = t.debut === w.week ? 1 + (w.week - 1) / len : 1;
        t.week = { P: r.points, B: B, S: t.streak, W: r.points * B + t.streak * bonus };
        t.total += t.week.W; came[k] = 1;
      });
      order.forEach(function (k) { if (!came[k]) { st[k].streak = 0; st[k].week = null; } });
      rank(); order.forEach(function (k) { st[k].prev = before[k] == null ? null : before[k]; });
      last = w.week;
    });
    function rank() { order.slice().sort(function (a, b) { return st[b].total - st[a].total; }).forEach(function (k, i) { st[k].rank = i + 1; }); }
    if (!S.start) rank();
    var rows = order.map(function (k) { return st[k]; }).sort(function (a, b) { return a.rank - b.rank; });
    return { rows: rows, after: last, missing: missing };
  }

  function moveHtml(t) {
    if (t.prev == null) return '<span class="lb-mv lb-mv--new">NEW</span>';
    var d = t.prev - t.rank;
    if (!d) return '<span class="lb-mv lb-mv--eq" aria-label="Same position">–</span>';
    return d > 0 ? '<span class="lb-mv lb-mv--up" aria-label="Up ' + d + '">↑ ' + d + '</span>' : '<span class="lb-mv lb-mv--dn" aria-label="Down ' + -d + '">↓ ' + -d + '</span>';
  }

  function draw(S) {
    var C = compute(S), weeks = S.weeks.slice().sort(function (a, b) { return a.week - b.week; });
    var mode = 'all', wk = weeks.length ? weeks[weeks.length - 1].week : 0;
    $('[data-lb-season]').textContent = S.name || 'Season ' + roman(S.season || 1);
    function paint() {
      root.querySelectorAll('[data-lbtab]').forEach(function (b) { var on = b.getAttribute('data-lbtab') === mode; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      var body = $('[data-lb-body]');
      if (mode === 'all') {
        var w = Math.max.apply(null, C.rows.map(function (t) { return f2(t.total).length; }));
        body.innerHTML = '<p class="lb-sub"><span>After Gameweek ' + C.after + '</span></p>' +
          '<ol class="lb-list">' + C.rows.map(function (t, i) { return '<li class="lb-row' + (i === 0 ? ' is-top' : '') + '"><span class="lb-n">' + t.rank + '</span><span class="lb-t">' + esc(t.name) + '</span>' + moveHtml(t) + '<b class="lb-p">' + f2(t.total) + '</b></li>'; }).join('') + '</ol>' +
          '<details class="lb-fx"><summary><i class="lb-math lb-fxl">fx</i><b class="lb-math"><var>W</var> = (<var>P</var> × <var>B</var>) + (<var>S</var> × 0.25)</b><em>How it works</em></summary><dl>' +
          '<div><dt class="lb-math"><var>P</var></dt><dd>Raw points the team earned that week.</dd></div>' +
          '<div><dt class="lb-math"><var>B</var></dt><dd>Entry boost for teams that join late: 1 + weeks missed ÷ ' + (S.length || 12) + '. Only on a team’s first week.</dd></div>' +
          '<div><dt class="lb-math"><var>S</var></dt><dd>Weeks in a row the team has played. Each one adds 0.25. Missing a week resets it.</dd></div>' +
          '<div><dt class="lb-math"><var>W</var></dt><dd>The week’s score, added to the season total. Absent teams get 0 but stay on the board.</dd></div></dl></details>' +
          (C.missing.length ? '<p class="lb-warn">Streak history missing for ' + esc(C.missing.join(', ')) + '. Their bonus is counted from this week.</p>' : '');
      } else {
        var w = weeks.filter(function (x) { return x.week === wk; })[0];
        var res = w.results.slice().sort(function (a, b) { return b.points - a.points; }), dt = longDate(w.date);
        body.innerHTML = (weeks.length > 1 ? '<div class="lb-wks"><span class="lb-wks__k">Week</span>' + weeks.map(function (x) { return '<button type="button" data-lbwk="' + x.week + '"' + (x.week === wk ? ' class="is-on"' : '') + ' aria-label="Week ' + x.week + '">' + x.week + '</button>'; }).join('') + '</div>' : '') +
          '<div class="lb-gw"><h2>Gameweek ' + w.week + '</h2><div class="lb-gw__row"><b>Final results</b><span>' + dt.day + ', ' + dt.date + '</span></div></div>' +
          '<ol class="lb-list">' + res.map(function (r, i) { return '<li class="lb-row lb-row--gw' + (i === 0 ? ' is-top' : '') + '"><span class="lb-n">' + (i > 0 && r.points === res[i - 1].points ? '=' : i + 1) + '</span><span class="lb-t">' + esc(r.team) + (i === 0 && r.players && r.players.length ? '<span class="lb-team"><span class="lb-star" aria-hidden="true">★</span><span class="lb-ppl">' + r.players.map(function (n) { return '<span>' + esc(n) + '</span>'; }).join('') + '</span></span>' : '') + '</span><b class="lb-p">' + r.points + '</b></li>'; }).join('') + '</ol>';
      }
    }
    function eol() { root.querySelectorAll('.lb-ppl').forEach(function (box) { var sp = box.children; for (var i = 0; i < sp.length; i++) { sp[i].classList.remove('eol'); } for (var k = 0; k < sp.length - 1; k++) { if (sp[k + 1].offsetTop > sp[k].offsetTop) sp[k].classList.add('eol'); } }); }
    window.addEventListener('resize', eol);
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lbtab],[data-lbwk]'); if (!b) return;
      if (b.hasAttribute('data-lbtab')) mode = b.getAttribute('data-lbtab'); else wk = +b.getAttribute('data-lbwk');
      paint();
    });
    paint();
  }
  function $(s) { return root.querySelector(s); }
  fetch(SRC, { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(draw).catch(function () {
    $('[data-lb-body]').innerHTML = '<p class="pq-stand__empty">The leaderboard couldn’t load. Check your connection and try again.</p>';
  });
})();
