/* PQT home: final standings saved by the host on this device */
(function () {
  var list = document.querySelector('[data-stand-list]'); if (!list) return;
  var hist = [];
  try { hist = JSON.parse(localStorage.getItem('pqt_history') || '[]') || []; } catch (e) {}
  if (!hist.length) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function day(t) { try { return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } }
  var n = document.querySelector('[data-stand-n]'); if (n) n.textContent = hist.length + (hist.length === 1 ? ' game' : ' games');
  list.innerHTML = hist.map(function (g, k) {
    var top = g.teams[0] || { name: '—', score: 0 };
    return '<details class="pq-game"' + (k === 0 ? ' open' : '') + '><summary><span class="pq-game__d">' + esc(day(g.at)) + '</span><span class="pq-game__t"><b>' + esc(g.title) + '</b><span>' + g.rounds + (g.rounds === 1 ? ' round' : ' rounds') + (g.games && g.games.length ? ' · ' + esc(g.games.join(', ')) : '') + '</span></span><span class="pq-game__w"><i style="background:' + esc(top.color) + '"></i>' + esc(top.name) + '</span></summary>' +
      '<ol class="pq-rank">' + g.teams.map(function (t, i) { return '<li><span class="pq-rank__n">' + (i + 1) + '</span><i style="background:' + esc(t.color) + '"></i><span class="pq-rank__name">' + esc(t.name) + '</span><b>' + t.score + '</b></li>'; }).join('') + '</ol></details>';
  }).join('');
})();
