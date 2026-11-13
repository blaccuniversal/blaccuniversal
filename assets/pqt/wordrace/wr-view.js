/* PQT · WORD RACE shared view helpers: bracket model (from a tournament), bracket HTML, team badges. */
(function (root) {
  'use strict';
  var COLORS = ['#ff6a2b', '#5aa8ff', '#5ad18f', '#f2b23a', '#c58cff', '#ff6fa3', '#4fd6d6', '#e9e9e9', '#ff8f5a', '#8fb3ff', '#b6e06a', '#ffd166'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function initials(n) { var p = String(n || '?').trim().split(/\s+/); return (p.length > 1 ? p[0][0] + p[1][0] : p[0].slice(0, 2)).toUpperCase(); }
  function color(i) { return COLORS[i % COLORS.length]; }
  function badge(t, cls) { if (!t) return '<span class="wr-badge ' + (cls || '') + '">?</span>'; return '<span class="wr-badge ' + (cls || '') + '" style="--c:' + t.c + '">' + esc(initials(t.name)) + '</span>'; }

  /* A compact, names-included model of the tournament. Safe to send to screens and publish. */
  function model(T) {
    var idx = {}; T.teams.forEach(function (t, i) { idx[t.id] = { id: t.id, name: t.name, c: color(i) }; });
    function mm(id) {
      var m = T.matchups[id]; if (!m) return null;
      var order = m.rank || m.teams;
      return { id: m.id, label: m.label || '', kind: m.kind, done: m.done, live: !m.done && m.battles.length > 0, slots: m.slots || 0,
        teams: m.teams.map(function (x) { return { t: idx[x], pts: m.pts[x], wins: m.wins[x], place: m.rank ? m.rank.indexOf(x) + 1 : 0 }; }),
        rank: (m.rank || []).map(function (x) { return idx[x]; }), keep: m.keep || 0,
        battles: m.battles.map(function (b) { var win = b.attempts.filter(function (a) { return a.ok && a.team === b.winner; })[0]; return { n: b.n, s: b.s, e: b.e, tier: b.tier, tb: !!b.tb, w: b.winner ? idx[b.winner] : null, word: win ? win.word : '', ms: win ? win.ms : null, tries: b.attempts.length, rolls: b.rolls.length }; }),
        order: order.map(function (x) { return idx[x]; }) };
    }
    return {
      name: T.name, id: T.id, status: T.status, created: T.created, finished: T.finished || null, champion: T.champion ? idx[T.champion] : null,
      teams: T.teams.map(function (t) { return idx[t.id]; }),
      stages: (T.stages || []).map(function (st) {
        var o = { id: st.id, label: st.label, t: st.t, done: st.done, keep: st.keep, matchups: st.matchups.map(mm), tb: st.tb ? mm(st.tb) : null, qualified: (st.qualified || []).map(function (x) { return idx[x]; }) };
        if (st.t === 'league') o.table = leagueTable(T, st).map(function (r) { return { t: idx[r.team], pts: r.pts, won: r.won, played: r.played }; });
        return o;
      })
    };
  }
  function leagueTable(T, st) {
    var rows = {}; st.pool.forEach(function (x) { rows[x] = { team: x, pts: 0, won: 0, played: 0 }; });
    st.matchups.forEach(function (id) { var m = T.matchups[id]; m.teams.forEach(function (x) { var r = rows[x]; if (!r) return; r.pts += m.pts[x]; r.won += m.wins[x]; if (m.battles.length) r.played++; }); });
    var q = st.qualified || [];
    return st.pool.map(function (x) { return rows[x]; }).sort(function (a, b) { return b.pts - a.pts || (q.indexOf(b.team) > -1) - (q.indexOf(a.team) > -1); });
  }

  function mHTML(m) {
    if (!m) return '';
    var sorted = m.done ? m.teams.slice().sort(function (a, b) { return a.place - b.place; }) : m.teams;
    return '<div class="wr-bm' + (m.live ? ' is-live' : '') + (m.done ? ' is-done' : '') + (m.kind !== 'duel' ? ' wr-bm--bang' : '') + '" data-mid="' + m.id + '">' + (m.label ? '<span class="wr-bm__lab">' + esc(m.label) + '</span>' : '') +
      sorted.map(function (x) {
        var through = m.done && (m.kind === 'tb' ? x.place <= m.slots : m.keep ? x.place <= m.keep : x.place === 1);
        return '<div class="wr-bm__t' + (m.done ? (through ? ' is-w' : ' is-l') : '') + '">' + badge(x.t) + '<span class="wr-bm__n">' + esc(x.t ? x.t.name : '?') + '</span><b class="wr-bm__s">' + (m.kind === 'tb' ? (x.place && x.place <= m.slots ? '✓' : '') : x.pts) + '</b></div>';
      }).join('') + '</div>';
  }
  function tableHTML(s) {
    if (!s.table) return '';
    return '<div class="wr-table"><div class="wr-table__h"><span>Team</span><span>Pts</span></div>' + s.table.map(function (r, i) {
      var q = s.done && s.qualified.some(function (x) { return x.id === r.t.id; });
      return '<div class="wr-table__r' + (q ? ' is-q' : '') + '"><span>' + (i + 1) + '</span>' + badge(r.t) + '<b>' + esc(r.t.name) + '</b><em>' + r.pts + '</em></div>';
    }).join('') + '</div>';
  }
  /* One column per stage; a league shows its table and its games. */
  function bracket(M) {
    if (!M || !M.stages || !M.stages.length) return '<p class="wr-empty">The bracket appears when the tournament starts.</p>';
    var cols = M.stages.map(function (s) {
      var h = '<div class="wr-col' + (s.t === 'league' ? ' wr-col--league' : '') + '"><p class="wr-col__h">' + esc(s.label) + '</p>';
      if (s.t === 'league') h += tableHTML(s) + (s.tb ? '<p class="wr-lane__h">Tie-break</p>' + mHTML(s.tb) : '') + '<div class="wr-games">' + s.matchups.map(mHTML).join('') + '</div>';
      else h += s.matchups.map(mHTML).join('');
      return h + '</div>';
    });
    if (M.champion) cols.push('<div class="wr-col wr-col--champ"><p class="wr-col__h">Champion</p><div class="wr-champ">' + badge(M.champion, 'wr-badge--lg') + '<b>' + esc(M.champion.name) + '</b></div></div>');
    return '<div class="wr-bracket">' + cols.join('') + '</div>';
  }
  function tierLabel(t) { return t === 'easy' ? 'Easy' : t === 'medium' ? 'Medium' : t === 'hard' ? 'Hard' : ''; }
  root.WRView = { esc: esc, initials: initials, color: color, badge: badge, model: model, bracket: bracket, matchup: mHTML, tierLabel: tierLabel };
})(this);
