/* PQT · WORD RACE shared view helpers: bracket model (from a tournament), bracket HTML, team badges. */
(function (root) {
  'use strict';
  var COLORS = ['#ff6a2b', '#5aa8ff', '#5ad18f', '#f2b23a', '#c58cff', '#ff6fa3', '#4fd6d6', '#e9e9e9', '#ff8f5a', '#8fb3ff', '#b6e06a', '#ffd166'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function initials(n) { var p = String(n || '?').trim().split(/\s+/); return (p.length > 1 ? p[0][0] + p[1][0] : p[0].slice(0, 2)).toUpperCase(); }
  function color(i) { return COLORS[i % COLORS.length]; }
  function badge(t, cls) { if (!t) return '<span class="wr-badge ' + (cls || '') + '">?</span>'; return '<span class="wr-badge ' + (cls || '') + '" style="--c:' + t.c + '">' + esc(initials(t.name)) + '</span>'; }

  /* A compact, names-included model of the bracket. Safe to send to screens and publish. */
  function model(T) {
    var idx = {}; T.teams.forEach(function (t, i) { idx[t.id] = { id: t.id, name: t.name, c: color(i) }; });
    function mm(id) {
      var m = T.matchups[id]; if (!m) return null;
      return { id: m.id, label: m.label || '', a: idx[m.a], b: idx[m.b], wa: m.wins.a, wb: m.wins.b, pa: m.pts.a, pb: m.pts.b, w: m.winner, done: m.done, live: !m.done && m.battles.length > 0,
        battles: m.battles.map(function (b) { var win = b.attempts.filter(function (a) { return a.ok && a.counted !== false && a.team === b.winner; })[0]; return { n: b.n, s: b.s, e: b.e, tier: b.tier, w: b.winner, word: win ? win.word : '', ms: win ? win.ms : null, tries: b.attempts.length, rolls: b.rolls.length }; }) };
    }
    return {
      name: T.name, id: T.id, status: T.status, created: T.created, finished: T.finished || null, champion: T.champion ? idx[T.champion] : null,
      teams: T.teams.map(function (t) { return idx[t.id]; }),
      decision: T.decision ? { type: T.decision.type, teams: (T.decision.teams || T.decision.pool || []).map(function (x) { return idx[x]; }) } : null,
      rounds: T.rounds.map(function (r) {
        return { id: r.id, label: r.label, kind: r.kind, done: r.done, unmatched: r.unmatched ? idx[r.unmatched] : null, bye: r.bye ? idx[r.bye] : null,
          matchups: r.matchups.map(mm),
          losers: (r.losers || []).map(function (l) { return { t: idx[l.team], pts: l.pts }; }),
          bestLoser: r.bestLoser ? idx[r.bestLoser] : null, byHost: !!r.bestLoserByHost, tied: (r.tiedLosers || []).map(function (x) { return idx[x]; }),
          revival: r.revival ? { matchups: r.revival.matchups.map(mm), final: r.revival.final ? mm(r.revival.final) : null, qualified: r.revival.qualified ? idx[r.revival.qualified] : null, two: r.revival.twoStage } : null,
          qualified: (r.qualified || []).map(function (x) { return idx[x]; }) };
      })
    };
  }

  function mHTML(m, opts) {
    if (!m) return '';
    function side(t, w, p, isW) { return '<div class="wr-bm__t' + (m.done ? (isW ? ' is-w' : ' is-l') : '') + '">' + badge(t) + '<span class="wr-bm__n">' + esc(t ? t.name : '?') + '</span><span class="wr-bm__p" title="Points">' + p + '</span><b class="wr-bm__s">' + w + '</b></div>'; }
    return '<div class="wr-bm' + (m.live ? ' is-live' : '') + (m.done ? ' is-done' : '') + '" data-mid="' + m.id + '">' + (opts && opts.label && m.label ? '<span class="wr-bm__lab">' + esc(m.label) + '</span>' : '') +
      side(m.a, m.wa, m.pa, m.w && m.a && m.w === m.a.id) + side(m.b, m.wb, m.pb, m.w && m.b && m.w === m.b.id) + '</div>';
  }
  /* Bracket HTML: main path in columns, revival path in its own lane under the round it belongs to. */
  function bracket(M) {
    if (!M || !M.rounds.length) return '<p class="wr-empty">The bracket appears when the tournament starts.</p>';
    var cols = M.rounds.map(function (r) {
      var h = '<div class="wr-col"><p class="wr-col__h">' + esc(r.label) + '</p>' + r.matchups.map(function (m) { return mHTML(m); }).join('');
      if (r.unmatched) h += '<div class="wr-solo"><span class="wr-solo__k">Unmatched</span>' + badge(r.unmatched) + '<span>' + esc(r.unmatched.name) + '</span></div>';
      if (r.bye) h += '<div class="wr-solo"><span class="wr-solo__k">Bye (host)</span>' + badge(r.bye) + '<span>' + esc(r.bye.name) + '</span></div>';
      h += '</div>';
      if (!r.losers.length && !r.revival) return h;
      h += '<div class="wr-col wr-col--rev"><p class="wr-col__h">Revival · ' + esc(r.label) + '</p>';
      if (r.losers.length) {
        h += '<div class="wr-losers"><p class="wr-lane__h">Losers by aggregate points</p>' + r.losers.slice().sort(function (a, b) { return b.pts - a.pts; }).map(function (l) {
          var best = (r.bestLoser && r.bestLoser.id === l.t.id), tied = r.tied.some(function (x) { return x.id === l.t.id; });
          return '<div class="wr-loser' + (best ? ' is-best' : '') + (tied ? ' is-tied' : '') + '">' + badge(l.t) + '<span>' + esc(l.t.name) + '</span><b>' + l.pts + '</b>' + (best ? '<em>' + (r.byHost ? 'Best Loser (host pick)' : 'Best Loser') + '</em>' : tied ? '<em>Tied</em>' : '') + '</div>';
        }).join('') + '</div>';
      }
      if (r.revival) {
        h += '<div class="wr-lane"><p class="wr-lane__h">Revival round</p>' + r.revival.matchups.map(function (m) { return mHTML(m); }).join('') + (r.revival.final ? '<p class="wr-lane__h">Revival Final</p>' + mHTML(r.revival.final) : (r.revival.two ? '<p class="wr-lane__note">Winners meet in the Revival Final</p>' : '')) +
          (r.revival.qualified ? '<p class="wr-lane__q">' + badge(r.revival.qualified) + esc(r.revival.qualified.name) + ' qualifies</p>' : '') + '</div>';
      }
      return h + '</div>';
    });
    if (M.champion) cols.push('<div class="wr-col wr-col--champ"><p class="wr-col__h">Champion</p><div class="wr-champ">' + badge(M.champion, 'wr-badge--lg') + '<b>' + esc(M.champion.name) + '</b></div></div>');
    else if (M.decision) cols.push('<div class="wr-col"><p class="wr-col__h">Waiting</p><p class="wr-lane__note">The host is settling: ' + (M.decision.type === 'odd-pool' ? 'an odd number of qualified teams' : 'tied Best Losers') + '.</p></div>');
    return '<div class="wr-bracket">' + cols.join('') + '</div>';
  }
  function tierLabel(t) { return t === 'easy' ? 'Easy' : t === 'medium' ? 'Medium' : t === 'hard' ? 'Hard' : ''; }
  root.WRView = { esc: esc, initials: initials, color: color, badge: badge, model: model, bracket: bracket, matchup: mHTML, tierLabel: tierLabel };
})(this);
