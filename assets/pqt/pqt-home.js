/* PQT home: leaderboard built from games the host ended on this device */
(function () {
  var list = document.querySelector('[data-stand-list]'); if (!list) return;
  var hist = [];
  try { hist = JSON.parse(localStorage.getItem('pqt_history') || '[]') || []; } catch (e) {}
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function weekStart() { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
  var foot = document.querySelector('[data-stand-n]');
  function draw(mode) {
    var games = mode === 'week' ? hist.filter(function (g) { return g.at >= weekStart(); }) : hist;
    if (!games.length) { list.innerHTML = '<p class="pq-stand__empty">' + (hist.length ? 'No games played this week yet.' : 'No games played yet. When a host ends a game, the scores are added here.') + '</p>'; if (foot) foot.textContent = ''; return; }
    var by = {};
    games.forEach(function (g) {
      var best = g.teams.length ? g.teams[0].score : 0;
      g.teams.forEach(function (t) {
        var k = String(t.name).trim().toLowerCase(); var r = by[k] || (by[k] = { name: t.name, color: t.color, pts: 0, wins: 0, played: 0 });
        r.pts += +t.score || 0; r.played++; if (t.score === best && best > 0) r.wins++; r.color = t.color;
      });
    });
    var rows = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.pts - a.pts || b.wins - a.wins; });
    list.innerHTML = '<div class="pq-lb pq-lb--head"><span>#</span><span>Team</span><span>Wins</span><span>Points</span></div>' +
      rows.map(function (r, i) { return '<div class="pq-lb"><span class="pq-rank__n">' + (i + 1) + '</span><span class="pq-lb__t"><i style="background:' + esc(r.color) + '"></i><span>' + esc(r.name) + '</span></span><span class="pq-lb__w">' + r.wins + '</span><b>' + r.pts + '</b></div>'; }).join('');
    if (foot) foot.textContent = games.length + (games.length === 1 ? ' game' : ' games') + (mode === 'week' ? ' this week' : ' played') + ' · saved on this device';
  }
  var btns = document.querySelectorAll('[data-lb]');
  Array.prototype.forEach.call(btns, function (b) { b.addEventListener('click', function () { Array.prototype.forEach.call(btns, function (x) { x.classList.toggle('is-on', x === b); }); draw(b.getAttribute('data-lb')); }); });
  draw('all');
})();
