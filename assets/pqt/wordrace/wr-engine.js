/* PQT · WORD RACE tournament engine (v2: fair formats).
   Pure logic, no DOM. The whole tournament is one JSON-safe object (T): saved after every action, restored after a refresh.
   Every change goes through a function here and is written to T.audit.

   Matchups are either a 1v1 ("duel") or a 3-team Bangarang ("bang"). Both are exactly 3 battles.
   A battle is won by the first correct word and is worth 3 points, so 9 is the most a team can score in a matchup.
   Where teams are level on points and the order matters, sudden-death battles (worth nothing) settle it.

   Formats (the same path for every team, so everyone has an equal chance):
     2  Final
     3  Bangarang (top 2) → Final
     4  Semi-finals → Final
     5  League of 5 Bangarangs (each team plays 3) → top 2 → Final
     6  2 group Bangarangs (top 2) → cross semi-finals → Final
     7  League of 7 Bangarangs (each pair meets once) → top 2 → Final
     8  Quarter-finals → Semi-finals → Final
     9  3 group Bangarangs (winners) → Winners' Bangarang (top 2) → Final
     10 Round 1 (5 duels) → League of the 5 winners → Final
     11 League of 11 Bangarangs (each team plays 3) → top 2 → Final
     12 4 group Bangarangs (winners) → Semi-finals → Final
   Works in the browser (window.WREngine) and in Node (module.exports) for the tests. */
(function (root) {
  'use strict';

  /* ---------- central configuration ---------- */
  var DEFAULTS = {
    battleSecs: 30,      // countdown per letter pair
    spinSecs: 10,        // letters spin like a randomiser before they stop and the clock starts
    battlePoints: 3,     // points for winning a battle
    battles: 3,          // battles in every matchup
    minLength: 3,
    difficulty: 'mixed', // easy | medium | hard | mixed
    noRepeats: true,     // a word can only be used once per tournament
    autoValidate: true,  // dictionary check; host can always override
    answerMode: 'voice'  // voice (host awards) | phones (teams type)
  };
  var GAME_POINTS = 3;   // PQT game points for winning a 1v1 or finishing 1st in a Bangarang

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function now() { return Date.now(); }
  function mergeConfig(c) {
    var out = clone(DEFAULTS);
    if (c) Object.keys(c).forEach(function (k) { if (k in DEFAULTS) out[k] = c[k]; });
    ['battleSecs', 'spinSecs', 'minLength'].forEach(function (k) { out[k] = Math.max(0, +out[k] || 0); });
    out.spinSecs = Math.min(30, out.spinSecs); out.minLength = Math.max(2, out.minLength); out.battleSecs = Math.max(5, out.battleSecs);
    out.battlePoints = 3; out.battles = 3; // fixed by the rules
    return out;
  }
  function log(T, act, data) { var e = { at: now(), act: act }; if (data) Object.keys(data).forEach(function (k) { e[k] = data[k]; }); T.audit.push(e); T.updated = e.at; return e; }
  function err(code, msg) { var e = new Error(msg || code); e.code = code; throw e; }
  function team(T, id) { for (var i = 0; i < T.teams.length; i++) if (T.teams[i].id === id) return T.teams[i]; return null; }
  function tname(T, id) { var t = team(T, id); return t ? t.name : '?'; }

  /* ---------- formats ---------- */
  var LEAGUE_BASE = { 5: [0, 1, 2], 7: [0, 1, 3], 11: [0, 1, 3] };
  var FORMATS = {
    2: [{ t: 'final' }],
    3: [{ t: 'groups', keep: 2, label: 'Bangarang' }, { t: 'final' }],
    4: [{ t: 'duels', label: 'Semi-finals' }, { t: 'final' }],
    5: [{ t: 'league', label: 'League' }, { t: 'final' }],
    6: [{ t: 'groups', keep: 2, label: 'Groups' }, { t: 'cross', label: 'Semi-finals' }, { t: 'final' }],
    7: [{ t: 'league', label: 'League' }, { t: 'final' }],
    8: [{ t: 'duels', label: 'Quarter-finals' }, { t: 'duels', label: 'Semi-finals' }, { t: 'final' }],
    9: [{ t: 'groups', keep: 1, label: 'Groups' }, { t: 'groups', keep: 2, label: 'Winners’ Bangarang' }, { t: 'final' }],
    10: [{ t: 'duels', label: 'Round 1' }, { t: 'league', label: 'League' }, { t: 'final' }],
    11: [{ t: 'league', label: 'League' }, { t: 'final' }],
    12: [{ t: 'groups', keep: 1, label: 'Groups' }, { t: 'duels', label: 'Semi-finals' }, { t: 'final' }]
  };
  var FORMAT_TEXT = {
    2: 'Final', 3: 'Bangarang (top 2) → Final', 4: 'Semi-finals → Final', 5: 'League of 5 Bangarangs → top 2 → Final',
    6: '2 group Bangarangs (top 2) → Semi-finals → Final', 7: 'League of 7 Bangarangs → top 2 → Final', 8: 'Quarter-finals → Semi-finals → Final',
    9: '3 group Bangarangs (winners) → Winners’ Bangarang (top 2) → Final', 10: '5 duels → League of the 5 winners → Final',
    11: 'League of 11 Bangarangs → top 2 → Final', 12: '4 group Bangarangs (winners) → Semi-finals → Final'
  };
  function matchCount(n) {
    var c = 0, pool = n;
    (FORMATS[n] || []).forEach(function (s) {
      if (s.t === 'final') { c += 1; pool = 1; }
      else if (s.t === 'duels' || s.t === 'cross') { c += pool / 2; pool = pool / 2; }
      else if (s.t === 'groups') { c += pool / 3; pool = pool / 3 * s.keep; }
      else if (s.t === 'league') { c += pool; pool = 2; }
    });
    return c;
  }
  function leagueBlocks(ids) { var n = ids.length, base = LEAGUE_BASE[n]; return ids.map(function (_, i) { return base.map(function (b) { return ids[(i + b) % n]; }); }); }

  /* ---------- create & set up ---------- */
  function create(name, config) {
    var T = { v: 2, id: 'wr' + now().toString(36) + Math.random().toString(36).slice(2, 6), name: String(name || 'Word Race').trim().slice(0, 60) || 'Word Race',
      created: now(), updated: now(), status: 'setup', config: mergeConfig(config), teams: [], stages: [], matchups: {}, used: {}, custom: {}, pairsUsed: {},
      audit: [], champion: null, seq: 0, paused: false };
    log(T, 'create', { name: T.name });
    return T;
  }
  function addTeam(T, name) {
    if (T.status !== 'setup') err('locked', 'Teams are locked once the tournament starts.');
    name = String(name || '').trim().slice(0, 40); if (!name) err('name', 'Give the team a name.');
    if (T.teams.length >= 12) err('max', 'Word Race takes up to 12 teams.');
    if (T.teams.some(function (t) { return t.name.toLowerCase() === name.toLowerCase(); })) err('dup', 'There is already a team with that name.');
    var t = { id: 't' + (++T.seq), name: name }; T.teams.push(t); log(T, 'team-add', { team: t.id, name: name }); return t;
  }
  function removeTeam(T, id) { if (T.status !== 'setup') err('locked'); T.teams = T.teams.filter(function (t) { return t.id !== id; }); log(T, 'team-remove', { team: id }); }
  function moveTeam(T, id, dir) { if (T.status !== 'setup') err('locked'); var i = T.teams.findIndex(function (t) { return t.id === id; }), j = i + dir; if (i < 0 || j < 0 || j >= T.teams.length) return; var x = T.teams[i]; T.teams[i] = T.teams[j]; T.teams[j] = x; log(T, 'team-move', { team: id, dir: dir }); }
  function shuffleTeams(T, rnd) { if (T.status !== 'setup') err('locked'); rnd = rnd || Math.random; for (var i = T.teams.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), x = T.teams[i]; T.teams[i] = T.teams[j]; T.teams[j] = x; } log(T, 'team-shuffle'); }
  function setConfig(T, c) { var before = clone(T.config); T.config = mergeConfig(Object.assign({}, T.config, c)); log(T, 'config', { before: before, after: clone(T.config) }); }
  function rename(T, name) { T.name = String(name || '').trim().slice(0, 60) || T.name; log(T, 'rename', { name: T.name }); }

  /* What the first stage will look like, for the setup screen. */
  function preview(T) {
    var ids = T.teams.map(function (t) { return t.id; }), n = ids.length, f = FORMATS[n];
    if (!f) return { n: n, text: '', matches: 0, groups: [] };
    return { n: n, text: FORMAT_TEXT[n], matches: matchCount(n), label: f[0].label || 'Grand Final', groups: firstGroups(f[0], ids) };
  }
  function firstGroups(s, ids) {
    if (s.t === 'final' || s.t === 'duels' || s.t === 'cross') { var p = []; for (var i = 0; i + 1 < ids.length; i += 2) p.push([ids[i], ids[i + 1]]); return p; }
    if (s.t === 'groups') { var g = []; for (var k = 0; k + 2 < ids.length; k += 3) g.push(ids.slice(k, k + 3)); return g; }
    if (s.t === 'league') return leagueBlocks(ids);
    return [];
  }

  function start(T) {
    if (T.status !== 'setup') err('started', 'This tournament has already started.');
    if (T.teams.length < 2) err('few', 'Add at least 2 teams.');
    T.status = 'live'; T.format = T.teams.length; log(T, 'start', { teams: T.teams.map(function (t) { return t.id; }), format: FORMAT_TEXT[T.format] });
    openStage(T, 0, T.teams.map(function (t) { return t.id; }));
    return T;
  }

  /* ---------- stages ---------- */
  function newMatchup(T, st, kind, teams, label, extra) {
    var m = { id: 'm' + (++T.seq), stage: st.id, kind: kind, teams: teams.slice(), label: label || '', battles: [], pts: {}, wins: {}, adj: {}, tbOrder: [], rank: null, done: false };
    teams.forEach(function (x) { m.pts[x] = 0; m.wins[x] = 0; });
    if (extra) Object.keys(extra).forEach(function (k) { m[k] = extra[k]; });
    T.matchups[m.id] = m; st.matchups.push(m.id); return m;
  }
  function openStage(T, idx, pool) {
    var f = FORMATS[T.format][idx];
    if (!f) { T.champion = pool[0]; T.status = 'done'; T.finished = now(); log(T, 'champion', { team: pool[0] }); return null; }
    var st = { id: 's' + (idx + 1), idx: idx, t: f.t, label: f.t === 'final' ? 'Grand Final' : f.label, keep: f.keep || 0, pool: pool.slice(), matchups: [], tb: null, done: false, qualified: null };
    T.stages.push(st);
    var i;
    if (f.t === 'final' || f.t === 'duels') for (i = 0; i + 1 < pool.length; i += 2) newMatchup(T, st, 'duel', [pool[i], pool[i + 1]], f.t === 'final' ? 'Grand Final' : '');
    else if (f.t === 'cross') { newMatchup(T, st, 'duel', [pool[0], pool[3]], 'Semi-final 1'); newMatchup(T, st, 'duel', [pool[2], pool[1]], 'Semi-final 2'); }
    else if (f.t === 'groups') { var g = 0; for (i = 0; i + 2 < pool.length; i += 3) newMatchup(T, st, 'bang', pool.slice(i, i + 3), pool.length > 3 ? 'Group ' + (++g) : '', { keep: f.keep }); }
    else if (f.t === 'league') leagueBlocks(pool).forEach(function (b, k) { newMatchup(T, st, 'bang', b, 'Game ' + (k + 1), { keep: 0 }); });
    log(T, 'stage-open', { stage: st.id, label: st.label, matchups: st.matchups.slice() });
    return st;
  }
  function stageOf(T, m) { for (var i = 0; i < T.stages.length; i++) if (T.stages[i].id === m.stage) return T.stages[i]; return null; }
  function lastStage(T) { return T.stages[T.stages.length - 1] || null; }
  function stageIds(st) { return st.matchups.concat(st.tb ? [st.tb] : []); }

  /* League table: points across the league games. */
  function table(T, st) {
    var rows = {}; st.pool.forEach(function (x) { rows[x] = { team: x, pts: 0, won: 0, played: 0, firsts: 0 }; });
    st.matchups.forEach(function (id) { var m = T.matchups[id]; m.teams.forEach(function (x) { var r = rows[x]; if (!r) return; r.pts += m.pts[x]; r.won += m.wins[x]; if (m.battles.length) r.played++; if (m.done && m.rank && m.rank[0] === x) r.firsts++; }); });
    return st.pool.map(function (x) { return rows[x]; }).sort(function (a, b) { return b.pts - a.pts; });
  }
  /* Who qualifies from a finished league, or the teams that need a tie-break. */
  function leagueCut(T, st) {
    var rows = table(T, st), cut = 2;
    if (rows.length <= cut || rows[cut - 1].pts !== rows[cut].pts) return { top: rows.slice(0, cut).map(function (r) { return r.team; }) };
    var p = rows[cut - 1].pts, above = rows.filter(function (r) { return r.pts > p; }).map(function (r) { return r.team; }), tied = rows.filter(function (r) { return r.pts === p; }).map(function (r) { return r.team; });
    var slots = cut - above.length;
    if (tied.length === 2 && slots === 1) { // head-to-head in the game they shared
      var shared = st.matchups.map(function (id) { return T.matchups[id]; }).filter(function (m) { return m.teams.indexOf(tied[0]) > -1 && m.teams.indexOf(tied[1]) > -1; })[0];
      if (shared && shared.pts[tied[0]] !== shared.pts[tied[1]]) return { top: above.concat([shared.pts[tied[0]] > shared.pts[tied[1]] ? tied[0] : tied[1]]), h2h: true };
    }
    if (st.tb) { var tm = T.matchups[st.tb]; if (tm.done) return { top: above.concat(tm.rank.slice(0, slots)) }; return { wait: true }; }
    return { tie: tied, slots: slots, above: above };
  }

  /* ---------- ranking inside a matchup ---------- */
  function key(m, x) { var i = m.tbOrder.indexOf(x); return [-m.pts[x], i < 0 ? 99 : i]; }
  function cmp(m) { return function (a, b) { var ka = key(m, a), kb = key(m, b); return ka[0] - kb[0] || ka[1] - kb[1]; }; }
  function same(m, a, b) { var ka = key(m, a), kb = key(m, b); return ka[0] === kb[0] && ka[1] === kb[1]; }
  /* Positions whose order matters: 1st always (game points); the cut line for group Bangarangs; the slots in a tie-break. */
  function boundaries(m) {
    if (m.kind === 'tb') { var b = []; for (var i = 1; i <= m.slots; i++) b.push(i); return b; }
    if (m.kind === 'duel') return [1];
    var out = [1]; if (m.keep === 2) out.push(2); return out;
  }
  /* The teams still level at a boundary that matters, or null if the order is settled. */
  function unresolved(m) {
    var order = m.teams.slice().sort(cmp(m)), bs = boundaries(m);
    for (var i = 0; i < bs.length; i++) { var p = bs[i]; if (p >= order.length) continue; var a = order[p - 1], b = order[p]; if (same(m, a, b)) return order.filter(function (x) { return same(m, x, a); }); }
    return null;
  }
  function regular(m) { return m.battles.filter(function (b) { return !b.tb; }); }

  /* ---------- letters ---------- */
  function drawLetters(T, dict, rnd) {
    rnd = rnd || Math.random;
    var tier = T.config.difficulty === 'mixed' ? ['easy', 'medium', 'hard'][Math.floor(rnd() * 3)] : T.config.difficulty;
    var p = dict.pick(tier, T.config.minLength, T.pairsUsed, rnd);
    T.pairsUsed[p.s + p.e] = 1;
    return p;
  }

  /* ---------- battles ---------- */
  function openMatchups(T) { var st = lastStage(T); if (!st || T.status === 'done') return []; return stageIds(st).map(function (id) { return T.matchups[id]; }).filter(function (m) { return m && !m.done; }); }
  function liveMatchup(T) { var o = openMatchups(T); return o.filter(function (m) { return curBattle(m); })[0] || o[0] || null; }
  function getM(T, mid) { var m = T.matchups[mid]; if (!m) err('matchup', 'No such matchup.'); return m; }
  function curBattle(m) { var b = m.battles[m.battles.length - 1]; return b && !b.winner ? b : null; }
  /* The teams that take part in the next battle: everyone for the 3 regular battles, only the level teams for a decider. */
  function nextParticipants(m) {
    if (m.kind === 'tb') { var placed = m.tbOrder.slice(); return m.teams.filter(function (x) { return placed.indexOf(x) < 0; }); }
    if (regular(m).length < 3) return m.teams.slice();
    return unresolved(m) || [];
  }
  function startBattle(T, mid, dict, letters, rnd) {
    if (T.status !== 'live') err('status', 'The tournament is not live.');
    if (T.paused) err('paused', 'The tournament is paused.');
    var m = getM(T, mid); if (m.done) err('done', 'This matchup is finished.');
    if (openMatchups(T).indexOf(m) < 0) err('order', 'That matchup is not open yet.');
    if (curBattle(m)) err('running', 'A battle is already running in this matchup.');
    var part = nextParticipants(m); if (part.length < 2) err('done', 'This matchup is finished.');
    var p = letters ? { s: letters.s.toLowerCase(), e: letters.e.toLowerCase(), tier: letters.tier || (dict ? dict.tierOf(letters.s, letters.e, T.config.minLength) : 'medium') } : drawLetters(T, dict, rnd);
    if (letters) T.pairsUsed[p.s + p.e] = 1;
    var t0 = now(), tb = m.kind === 'tb' || regular(m).length >= 3;
    var b = { n: m.battles.length + 1, s: p.s, e: p.e, tier: p.tier, startedAt: t0, rollAt: t0 + T.config.spinSecs * 1000, secs: T.config.battleSecs, rolls: [], attempts: [], part: part, tb: tb, winner: null };
    m.battles.push(b);
    log(T, 'battle-start', { matchup: mid, battle: b.n, s: p.s, e: p.e, tier: p.tier, tb: tb, part: part });
    return b;
  }
  function norm(w) { return String(w || '').toLowerCase().replace(/[^a-z]/g, ''); }

  /* Checks a word against the battle letters, rules and dictionary. Returns {ok, reason}. */
  function check(T, b, word, dict) {
    var w = norm(word);
    if (!w) return { ok: false, reason: 'empty', w: w };
    if (w[0] !== b.s) return { ok: false, reason: 'start', w: w };
    if (w[w.length - 1] !== b.e) return { ok: false, reason: 'end', w: w };
    if (w.length < T.config.minLength) return { ok: false, reason: 'short', w: w };
    if (T.config.noRepeats && T.used[w]) return { ok: false, reason: 'repeat', w: w };
    if (T.custom[w]) return { ok: true, reason: 'custom', w: w };
    if (!T.config.autoValidate) return { ok: null, reason: 'manual', w: w };
    if (dict && dict.has(w)) return { ok: true, reason: 'dictionary', w: w };
    return { ok: false, reason: 'unknown', w: w };
  }
  /* A team answers. opts.verdict true/false from the host; otherwise the dictionary decides. First correct word wins the battle. */
  function submit(T, mid, teamId, word, dict, opts) {
    opts = opts || {};
    if (T.status !== 'live' || T.paused) err('status', 'The tournament is not live.');
    var m = getM(T, mid); if (m.teams.indexOf(teamId) < 0) err('team', 'That team is not in this matchup.');
    var b = curBattle(m); if (!b) err('nobattle', 'Start a battle first.');
    if (b.part.indexOf(teamId) < 0) err('team', 'That team is not in this battle.');
    if (opts.ms == null && now() < (b.rollAt || 0)) err('spinning', 'The letters are still spinning.');
    var ms = opts.ms != null ? Math.max(0, +opts.ms) : now() - (b.rollAt || b.startedAt);
    var c = check(T, b, word, dict), ok = c.ok, by = 'auto';
    if (opts.verdict === true || opts.verdict === false) { ok = opts.verdict; by = 'host'; }
    if (ok === null) err('manual', 'Manual checking is on. Accept or reject this word.');
    var a = { team: teamId, word: c.w, raw: String(word || '').slice(0, 40), ok: ok, reason: c.reason, by: by, ms: ms, at: now(), roll: b.rolls.length };
    if (ok) { b.winner = teamId; b.endedAt = a.at; if (a.word) T.used[a.word] = mid + ':' + b.n; }
    b.attempts.push(a);
    log(T, 'answer', { matchup: mid, battle: b.n, team: teamId, word: a.word, ok: ok, reason: c.reason, by: by, ms: ms, tb: b.tb });
    settle(T, m);
    return a;
  }
  function award(T, mid, teamId, word, dict, opts) { opts = opts || {}; opts.verdict = true; return submit(T, mid, teamId, word || '', dict, opts); }
  /* Time ran out with no correct word: new letters, same battle (a battle can't be drawn). */
  function timeout(T, mid, dict, rnd, letters) {
    var m = getM(T, mid), b = curBattle(m); if (!b) err('nobattle', 'No battle is running.');
    b.rolls.push({ s: b.s, e: b.e, tier: b.tier, endedAt: now() });
    var p = letters ? { s: letters.s.toLowerCase(), e: letters.e.toLowerCase(), tier: letters.tier || 'medium' } : drawLetters(T, dict, rnd);
    if (letters) T.pairsUsed[p.s + p.e] = 1;
    b.s = p.s; b.e = p.e; b.tier = p.tier; b.rollAt = now() + T.config.spinSecs * 1000;
    log(T, 'timeout', { matchup: mid, battle: b.n, next: p.s + p.e });
    return b;
  }

  /* Recount a matchup from its battles: winners, points, decider order, final ranking. */
  function recalc(T, m) {
    m.teams.forEach(function (x) { m.pts[x] = (m.adj && m.adj[x]) || 0; m.wins[x] = 0; });
    m.tbOrder = [];
    m.battles.forEach(function (b) {
      var w = null; b.attempts.forEach(function (a) { if (!w && a.ok) w = a; });
      b.winner = w ? w.team : null;
      if (!b.winner) return;
      if (b.tb) m.tbOrder.push(b.winner);
      else { m.wins[b.winner]++; m.pts[b.winner] += T.config.battlePoints; }
    });
  }
  function settle(T, m) {
    var wasDone = m.done; recalc(T, m);
    var finished = m.kind === 'tb' ? m.tbOrder.length >= m.slots : regular(m).length >= 3 && !curBattle(m) && !unresolved(m);
    if (m.kind === 'tb' && finished) m.rank = m.tbOrder.slice().concat(m.teams.filter(function (x) { return m.tbOrder.indexOf(x) < 0; }));
    else if (finished) m.rank = m.teams.slice().sort(cmp(m));
    m.done = finished;
    if (finished && !wasDone) { log(T, 'matchup-done', { matchup: m.id, kind: m.kind, rank: m.rank.slice(), pts: clone(m.pts) }); progress(T); }
  }
  /* After a matchup finishes: build what comes next, never twice. */
  function progress(T) {
    var st = lastStage(T); if (!st || T.status === 'done' || st.done) return;
    if (!st.matchups.every(function (id) { return T.matchups[id].done; })) return;
    var q;
    if (st.t === 'league') {
      var cut = leagueCut(T, st);
      if (cut.wait) return;
      if (cut.tie) { var tm = newMatchup(T, st, 'tb', cut.tie, 'Tie-break', { slots: cut.slots }); st.matchups.pop(); st.tb = tm.id; log(T, 'tiebreak-open', { stage: st.id, teams: cut.tie, slots: cut.slots }); return; }
      q = cut.top;
    } else if (st.t === 'groups') { q = []; st.matchups.forEach(function (id) { var m = T.matchups[id]; q = q.concat(m.rank.slice(0, m.keep)); }); }
    else q = st.matchups.map(function (id) { return T.matchups[id].rank[0]; });
    st.done = true; st.qualified = q.slice();
    log(T, 'stage-done', { stage: st.id, qualified: q.slice() });
    openStage(T, st.idx + 1, q);
  }

  /* ---------- corrections (all logged) ---------- */
  function laterStarted(T, m) {
    var st = stageOf(T, m), i = T.stages.indexOf(st), started = false;
    T.stages.slice(i + 1).forEach(function (x) { stageIds(x).forEach(function (id) { if (T.matchups[id].battles.length) started = true; }); });
    if (st.tb && st.tb !== m.id && T.matchups[st.tb].battles.length) started = true;
    return started;
  }
  /* Drop everything built from this stage's results so it can be rebuilt. */
  function rewind(T, m) {
    var st = stageOf(T, m), i = T.stages.indexOf(st);
    T.stages.slice(i + 1).forEach(function (x) { stageIds(x).forEach(function (id) { delete T.matchups[id]; }); });
    T.stages = T.stages.slice(0, i + 1);
    if (st.tb && st.tb !== m.id) { delete T.matchups[st.tb]; st.tb = null; }
    st.done = false; st.qualified = null; T.champion = null; T.finished = null; if (T.status === 'done') T.status = 'live';
  }
  function override(T, mid, bn, ai, ok, note) {
    var m = getM(T, mid), b = m.battles[bn - 1]; if (!b) err('battle', 'No such battle.'); var a = b.attempts[ai]; if (!a) err('answer', 'No such answer.');
    if (a.ok === ok) return a;
    var stDone = stageOf(T, m).done || m.done;
    if (stDone && laterStarted(T, m)) err('locked', 'Later matchups have already started, so this result is locked.');
    var before = clone(m.pts);
    a.ok = ok; a.by = 'host';
    if (ok && a.word) T.used[a.word] = mid + ':' + bn; else if (!ok && a.word && T.used[a.word] === mid + ':' + bn) delete T.used[a.word];
    if (stDone) rewind(T, m);
    m.done = false; m.rank = null;
    // battles after a reopened one stay as they were; drop trailing deciders that are no longer needed
    settle(T, m); trimDeciders(T, m);
    log(T, 'override', { matchup: mid, battle: bn, answer: ai, word: a.word, ok: ok, note: note || '', ptsBefore: before, ptsAfter: clone(m.pts) });
    return a;
  }
  function trimDeciders(T, m) {
    if (m.kind === 'tb') return;
    while (m.battles.length > 3 && m.battles[m.battles.length - 1].tb && m.battles[m.battles.length - 1].winner && !needDecider(T, m, m.battles.length - 1)) { m.battles.pop(); m.done = false; m.rank = null; settle(T, m); }
  }
  function needDecider(T, m, upto) { var keep = m.battles; m.battles = keep.slice(0, upto); recalc(T, m); var u = regular(m).length >= 3 && unresolved(m); m.battles = keep; recalc(T, m); return !!u; }
  /* Points correction on a battle (changes standings, not who won the battle). */
  function correct(T, mid, bn, teamId, delta, reason) {
    var m = getM(T, mid); if (!m.battles[bn - 1]) err('battle', 'No such battle.');
    if (m.teams.indexOf(teamId) < 0) err('team', 'That team is not in this matchup.');
    if (!String(reason || '').trim()) err('reason', 'Give a reason for the correction.');
    delta = Math.round(+delta || 0); if (!delta) err('delta', 'Enter the points to add or take away.');
    var stDone = stageOf(T, m).done || m.done;
    if (stDone && laterStarted(T, m)) err('locked', 'Later matchups have already started, so this result is locked.');
    var before = clone(m.pts);
    m.adj = m.adj || {}; m.adj[teamId] = (m.adj[teamId] || 0) + delta;
    if (stDone) rewind(T, m);
    m.done = false; m.rank = null; settle(T, m);
    log(T, 'correction', { matchup: mid, battle: bn, team: teamId, delta: delta, reason: String(reason).slice(0, 200), ptsBefore: before, ptsAfter: clone(m.pts) });
    if (!m.done) return m;
    progress(T); return m;
  }
  function addCustomWord(T, word) { var w = norm(word); if (!w) err('word', 'Enter a word.'); T.custom[w] = 1; log(T, 'custom-word', { word: w }); return w; }
  function pause(T, on) { T.paused = !!on; log(T, on ? 'pause' : 'resume'); }

  /* ---------- read helpers ---------- */
  /* Per team: battles won, points, matchups won (1v1 wins and Bangarang 1sts), PQT game points, status. */
  function summary(T) {
    var s = {};
    T.teams.forEach(function (t) { s[t.id] = { id: t.id, name: t.name, won: 0, pts: 0, played: 0, mWon: 0, game: 0, final: false, status: 'in' }; });
    Object.keys(T.matchups).forEach(function (id) {
      var m = T.matchups[id]; if (m.kind === 'tb') return;
      m.teams.forEach(function (x) { var r = s[x]; if (!r) return; r.won += m.wins[x]; r.pts += m.pts[x]; if (m.battles.length) r.played++; });
      if (m.done && m.rank) { var w = s[m.rank[0]]; if (w) { w.mWon++; w.game += GAME_POINTS; } }
    });
    var fin = T.stages.filter(function (st) { return st.t === 'final'; })[0];
    if (fin) T.matchups[fin.matchups[0]].teams.forEach(function (x) { s[x].final = true; });
    if (T.champion) { Object.keys(s).forEach(function (k) { s[k].status = k === T.champion ? 'champion' : 'out'; }); return s; }
    var st = lastStage(T);
    if (st) Object.keys(s).forEach(function (k) { s[k].status = st.pool.indexOf(k) > -1 ? 'in' : 'out'; });
    return s;
  }
  var REASONS = { empty: 'No word', start: 'Wrong first letter', end: 'Wrong last letter', short: 'Too short', repeat: 'Already used', unknown: 'Not in the dictionary', dictionary: 'In the dictionary', custom: 'On the custom list', manual: 'Needs a host check' };

  var API = { DEFAULTS: DEFAULTS, GAME_POINTS: GAME_POINTS, FORMATS: FORMATS, FORMAT_TEXT: FORMAT_TEXT, REASONS: REASONS, matchCount: matchCount,
    create: create, addTeam: addTeam, removeTeam: removeTeam, moveTeam: moveTeam, shuffleTeams: shuffleTeams, setConfig: setConfig, rename: rename, preview: preview, start: start,
    startBattle: startBattle, submit: submit, award: award, timeout: timeout, override: override, correct: correct, addCustomWord: addCustomWord, pause: pause, check: check,
    liveMatchup: liveMatchup, openMatchups: openMatchups, curBattle: curBattle, nextParticipants: nextParticipants, summary: summary, table: table,
    team: team, tname: tname, norm: norm, mergeConfig: mergeConfig, lastStage: lastStage, stageOf: stageOf, stageIds: stageIds, regular: regular };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.WREngine = API;
})(this);
