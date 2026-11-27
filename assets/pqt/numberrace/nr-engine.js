/* PQT · NUMBER RACE tournament engine.
   Same tournament engine as Word Race: a battle is won by the first correct answer, worth 3 points;
   a matchup (1v1 or 3-team Bangarang) is 3 battles (a 1v1 ends once a team has won 2); formats, scoring,
   corrections and the audit log all work exactly as in Word Race. The only thing that differs is what a
   battle is: instead of two letters and a word, two numbers spin like a randomiser and settle, and the
   first team to call the right answer — the chosen operation applied to the two numbers — wins the battle.
   Pure logic, no DOM. Works in the browser (window.NREngine) and in Node (module.exports) for the tests. */
(function (root) {
  'use strict';

  /* ---------- central configuration ---------- */
  var DEFAULTS = {
    battleSecs: 30,      // countdown per number pair, once settled
    spinSecs: 10,        // numbers spin like a randomiser before they stop and the clock starts
    battlePoints: 3,     // points for winning a battle
    battles: 3,          // battles in every matchup
    operation: 'add',    // add | sub | mul | div — chosen by the host at the start of the round
    tier: 'mixed',       // easy | medium | hard | mixed
    answerMode: 'voice'  // voice (host awards) | phones (teams type)
  };
  var GAME_POINTS = 3;   // PQT game points for winning a 1v1 or finishing 1st in a Bangarang
  var OPS = ['add', 'sub', 'mul', 'div'];
  var SYM = { add: '+', sub: '−', mul: '×', div: '÷' };
  var OP_NAME = { add: 'Addition', sub: 'Subtraction', mul: 'Multiplication', div: 'Division' };
  var RANGE = { easy: [1, 10], medium: [2, 20], hard: [3, 50] };
  var MUL_Y = { easy: [1, 5], medium: [2, 9], hard: [2, 12] };
  var DIV_D = { easy: [2, 5], medium: [2, 9], hard: [2, 12] };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function now() { return Date.now(); }
  function mergeConfig(c) {
    var out = clone(DEFAULTS);
    if (c) Object.keys(c).forEach(function (k) { if (k in DEFAULTS) out[k] = c[k]; });
    ['battleSecs', 'spinSecs'].forEach(function (k) { out[k] = Math.max(0, +out[k] || 0); });
    out.spinSecs = Math.min(30, out.spinSecs); out.battleSecs = Math.max(5, out.battleSecs);
    if (OPS.indexOf(out.operation) < 0) out.operation = 'add';
    if (['easy', 'medium', 'hard', 'mixed'].indexOf(out.tier) < 0) out.tier = 'mixed';
    out.battlePoints = 3; out.battles = 3; // fixed by the rules
    return out;
  }
  function log(T, act, data) { var e = { at: now(), act: act }; if (data) Object.keys(data).forEach(function (k) { e[k] = data[k]; }); T.audit.push(e); T.updated = e.at; return e; }
  function err(code, msg) { var e = new Error(msg || code); e.code = code; throw e; }
  function team(T, id) { for (var i = 0; i < T.teams.length; i++) if (T.teams[i].id === id) return T.teams[i]; return null; }
  function tname(T, id) { var t = team(T, id); return t ? t.name : '?'; }

  /* ---------- formats (identical to Word Race: same path for every team) ---------- */
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
    var T = { v: 1, id: 'nr' + now().toString(36) + Math.random().toString(36).slice(2, 6), name: String(name || 'Number Race').trim().slice(0, 60) || 'Number Race',
      created: now(), updated: now(), status: 'setup', config: mergeConfig(config), teams: [], stages: [], matchups: {}, pairsUsed: {},
      audit: [], champion: null, seq: 0, paused: false };
    log(T, 'create', { name: T.name });
    return T;
  }
  function addTeam(T, name) {
    if (T.status !== 'setup') err('locked', 'Teams are locked once the tournament starts.');
    name = String(name || '').trim().slice(0, 40); if (!name) err('name', 'Give the team a name.');
    if (T.teams.length >= 12) err('max', 'Number Race takes up to 12 teams.');
    if (T.teams.some(function (t) { return t.name.toLowerCase() === name.toLowerCase(); })) err('dup', 'There is already a team with that name.');
    var t = { id: 't' + (++T.seq), name: name }; T.teams.push(t); log(T, 'team-add', { team: t.id, name: name }); return t;
  }
  function removeTeam(T, id) { if (T.status !== 'setup') err('locked'); T.teams = T.teams.filter(function (t) { return t.id !== id; }); log(T, 'team-remove', { team: id }); }
  function moveTeam(T, id, dir) { if (T.status !== 'setup') err('locked'); var i = T.teams.findIndex(function (t) { return t.id === id; }), j = i + dir; if (i < 0 || j < 0 || j >= T.teams.length) return; var x = T.teams[i]; T.teams[i] = T.teams[j]; T.teams[j] = x; log(T, 'team-move', { team: id, dir: dir }); }
  function shuffleTeams(T, rnd) { if (T.status !== 'setup') err('locked'); rnd = rnd || Math.random; for (var i = T.teams.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), x = T.teams[i]; T.teams[i] = T.teams[j]; T.teams[j] = x; } log(T, 'team-shuffle'); }
  function setConfig(T, c) { var before = clone(T.config); T.config = mergeConfig(Object.assign({}, T.config, c)); log(T, 'config', { before: before, after: clone(T.config) }); }
  function rename(T, name) { T.name = String(name || '').trim().slice(0, 60) || T.name; log(T, 'rename', { name: T.name }); }

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
    T.status = 'live'; T.format = T.teams.length; log(T, 'start', { teams: T.teams.map(function (t) { return t.id; }), format: FORMAT_TEXT[T.format], operation: T.config.operation });
    openStage(T, 0, T.teams.map(function (t) { return t.id; }));
    return T;
  }

  /* ---------- stages (identical to Word Race) ---------- */
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

  function table(T, st) {
    var rows = {}; st.pool.forEach(function (x) { rows[x] = { team: x, pts: 0, won: 0, played: 0, firsts: 0 }; });
    st.matchups.forEach(function (id) { var m = T.matchups[id]; m.teams.forEach(function (x) { var r = rows[x]; if (!r) return; r.pts += m.pts[x]; r.won += m.wins[x]; if (m.battles.length) r.played++; if (m.done && m.rank && m.rank[0] === x) r.firsts++; }); });
    return st.pool.map(function (x) { return rows[x]; }).sort(function (a, b) { return b.pts - a.pts; });
  }
  function leagueCut(T, st) {
    var rows = table(T, st), cut = 2;
    if (rows.length <= cut || rows[cut - 1].pts !== rows[cut].pts) return { top: rows.slice(0, cut).map(function (r) { return r.team; }) };
    var p = rows[cut - 1].pts, above = rows.filter(function (r) { return r.pts > p; }).map(function (r) { return r.team; }), tied = rows.filter(function (r) { return r.pts === p; }).map(function (r) { return r.team; });
    var slots = cut - above.length;
    if (tied.length === 2 && slots === 1) {
      var shared = st.matchups.map(function (id) { return T.matchups[id]; }).filter(function (m) { return m.teams.indexOf(tied[0]) > -1 && m.teams.indexOf(tied[1]) > -1; })[0];
      if (shared && shared.pts[tied[0]] !== shared.pts[tied[1]]) return { top: above.concat([shared.pts[tied[0]] > shared.pts[tied[1]] ? tied[0] : tied[1]]), h2h: true };
    }
    if (st.tb) { var tm = T.matchups[st.tb]; if (tm.done) return { top: above.concat(tm.rank.slice(0, slots)) }; return { wait: true }; }
    return { tie: tied, slots: slots, above: above };
  }

  /* ---------- ranking inside a matchup (identical to Word Race) ---------- */
  function key(m, x) { var i = m.tbOrder.indexOf(x); return [-m.pts[x], i < 0 ? 99 : i]; }
  function cmp(m) { return function (a, b) { var ka = key(m, a), kb = key(m, b); return ka[0] - kb[0] || ka[1] - kb[1]; }; }
  function same(m, a, b) { var ka = key(m, a), kb = key(m, b); return ka[0] === kb[0] && ka[1] === kb[1]; }
  function boundaries(m) {
    if (m.kind === 'tb') { var b = []; for (var i = 1; i <= m.slots; i++) b.push(i); return b; }
    if (m.kind === 'duel') return [1];
    var out = [1]; if (m.keep === 2) out.push(2); return out;
  }
  function unresolved(m) {
    var order = m.teams.slice().sort(cmp(m)), bs = boundaries(m);
    for (var i = 0; i < bs.length; i++) { var p = bs[i]; if (p >= order.length) continue; var a = order[p - 1], b = order[p]; if (same(m, a, b)) return order.filter(function (x) { return same(m, x, a); }); }
    return null;
  }
  function regular(m) { return m.battles.filter(function (b) { return !b.tb; }); }

  /* ---------- numbers ---------- */
  function randInt(lo, hi, rnd) { return lo + Math.floor(rnd() * (hi - lo + 1)); }
  /* Draws the two numbers for a battle under the chosen operation and tier, always with a clean integer answer. */
  function drawNumbers(T, rnd) {
    rnd = rnd || Math.random;
    var tier = T.config.tier === 'mixed' ? ['easy', 'medium', 'hard'][Math.floor(rnd() * 3)] : T.config.tier;
    var op = T.config.operation, r = RANGE[tier], x, y, target, tries = 0;
    do {
      tries++;
      if (op === 'add') { x = randInt(r[0], r[1], rnd); y = randInt(r[0], r[1], rnd); target = x + y; }
      else if (op === 'sub') {
        var a = randInt(r[0], r[1], rnd), b = randInt(r[0], r[1], rnd);
        x = Math.max(a, b); y = Math.min(a, b); if (x === y) y = y > r[0] ? y - 1 : y + 1;
        target = x - y;
      } else if (op === 'mul') { var my = MUL_Y[tier]; x = randInt(r[0], r[1], rnd); y = randInt(my[0], my[1], rnd); target = x * y; }
      else { var dd = DIV_D[tier]; y = randInt(dd[0], dd[1], rnd); var q = randInt(r[0], r[1], rnd); x = q * y; target = q; }
    } while (T.pairsUsed[x + ':' + y + ':' + op] && tries < 12);
    T.pairsUsed[x + ':' + y + ':' + op] = 1;
    return { x: x, y: y, op: op, target: target, tier: tier };
  }

  /* ---------- battles ---------- */
  function openMatchups(T) { var st = lastStage(T); if (!st || T.status === 'done') return []; return stageIds(st).map(function (id) { return T.matchups[id]; }).filter(function (m) { return m && !m.done; }); }
  function liveMatchup(T) { var o = openMatchups(T); return o.filter(function (m) { return curBattle(m); })[0] || o[0] || null; }
  function getM(T, mid) { var m = T.matchups[mid]; if (!m) err('matchup', 'No such matchup.'); return m; }
  function curBattle(m) { var b = m.battles[m.battles.length - 1]; return b && !b.winner ? b : null; }
  function nextParticipants(m) {
    if (m.kind === 'tb') { var placed = m.tbOrder.slice(); return m.teams.filter(function (x) { return placed.indexOf(x) < 0; }); }
    if (regular(m).length < 3) return m.teams.slice();
    return unresolved(m) || [];
  }
  function startBattle(T, mid, numbers, rnd) {
    if (T.status !== 'live') err('status', 'The tournament is not live.');
    if (T.paused) err('paused', 'The tournament is paused.');
    var m = getM(T, mid); if (m.done) err('done', 'This matchup is finished.');
    if (openMatchups(T).indexOf(m) < 0) err('order', 'That matchup is not open yet.');
    if (curBattle(m)) err('running', 'A battle is already running in this matchup.');
    var part = nextParticipants(m); if (part.length < 2) err('done', 'This matchup is finished.');
    var p = numbers ? computeTarget(T, numbers) : drawNumbers(T, rnd);
    var t0 = now(), tb = m.kind === 'tb' || regular(m).length >= 3;
    var b = { n: m.battles.length + 1, x: p.x, y: p.y, op: p.op, target: p.target, tier: p.tier, startedAt: t0, rollAt: t0 + T.config.spinSecs * 1000, secs: T.config.battleSecs, rolls: [], attempts: [], part: part, tb: tb, winner: null };
    m.battles.push(b);
    log(T, 'battle-start', { matchup: mid, battle: b.n, x: p.x, y: p.y, op: p.op, target: p.target, tier: p.tier, tb: tb, part: part });
    return b;
  }
  /* Host-chosen numbers: work out the target from them under the current operation. */
  function computeTarget(T, n) {
    var x = +n.x, y = +n.y, op = T.config.operation, target;
    if (op === 'add') target = x + y; else if (op === 'sub') target = x - y; else if (op === 'mul') target = x * y; else target = y ? x / y : NaN;
    return { x: x, y: y, op: op, target: target, tier: n.tier || 'medium' };
  }
  function parseAnswer(raw) {
    var s = String(raw == null ? '' : raw).trim().replace(/,/g, '').replace(/^\+/, '');
    if (!s || !/^-?\d+(\.\d+)?$/.test(s)) return null;
    return parseFloat(s);
  }
  /* Checks a submitted answer against the battle's target. Returns {ok, reason, v}. */
  function check(T, b, answer) {
    var v = parseAnswer(answer);
    if (v == null) return { ok: false, reason: 'empty', v: null };
    if (Math.abs(v - b.target) > 1e-9) return { ok: false, reason: 'wrong', v: v };
    return { ok: true, reason: 'correct', v: v };
  }
  /* A team answers. opts.verdict true/false from the host overrides the automatic check. First correct answer wins the battle. */
  function submit(T, mid, teamId, answer, opts) {
    opts = opts || {};
    if (T.status !== 'live' || T.paused) err('status', 'The tournament is not live.');
    var m = getM(T, mid); if (m.teams.indexOf(teamId) < 0) err('team', 'That team is not in this matchup.');
    var b = curBattle(m); if (!b) err('nobattle', 'Start a battle first.');
    if (b.part.indexOf(teamId) < 0) err('team', 'That team is not in this battle.');
    if (opts.ms == null && now() < (b.rollAt || 0)) err('spinning', 'The numbers are still spinning.');
    var ms = opts.ms != null ? Math.max(0, +opts.ms) : now() - (b.rollAt || b.startedAt);
    var c = check(T, b, answer), ok = c.ok, by = 'auto';
    if (opts.verdict === true || opts.verdict === false) { ok = opts.verdict; by = 'host'; }
    var a = { team: teamId, value: c.v, raw: String(answer == null ? '' : answer).slice(0, 20), ok: ok, reason: c.reason, by: by, ms: ms, at: now(), roll: b.rolls.length };
    if (ok) { b.winner = teamId; b.endedAt = a.at; }
    b.attempts.push(a);
    log(T, 'answer', { matchup: mid, battle: b.n, team: teamId, value: a.value, ok: ok, reason: c.reason, by: by, ms: ms, tb: b.tb });
    settle(T, m);
    return a;
  }
  function award(T, mid, teamId, answer, opts) { opts = opts || {}; opts.verdict = true; return submit(T, mid, teamId, answer != null ? answer : '', opts); }
  /* Time ran out with no correct answer: new numbers, same battle (a battle can't be drawn). */
  function timeout(T, mid, rnd, numbers) {
    var m = getM(T, mid), b = curBattle(m); if (!b) err('nobattle', 'No battle is running.');
    b.rolls.push({ x: b.x, y: b.y, op: b.op, target: b.target, tier: b.tier, endedAt: now() });
    var p = numbers ? computeTarget(T, numbers) : drawNumbers(T, rnd);
    b.x = p.x; b.y = p.y; b.op = p.op; b.target = p.target; b.tier = p.tier; b.rollAt = now() + T.config.spinSecs * 1000;
    log(T, 'timeout', { matchup: mid, battle: b.n, next: p.x + ' ' + SYM[p.op] + ' ' + p.y });
    return b;
  }

  /* ---------- scoring & progression (identical to Word Race) ---------- */
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
    var clinched = m.kind === 'duel' && !curBattle(m) && m.teams.some(function (x) { return m.wins[x] >= 2; });
    var finished = m.kind === 'tb' ? m.tbOrder.length >= m.slots : clinched || (regular(m).length >= 3 && !curBattle(m) && !unresolved(m));
    if (m.kind === 'tb' && finished) m.rank = m.tbOrder.slice().concat(m.teams.filter(function (x) { return m.tbOrder.indexOf(x) < 0; }));
    else if (finished) m.rank = m.teams.slice().sort(cmp(m));
    m.done = finished;
    if (finished && !wasDone) { log(T, 'matchup-done', { matchup: m.id, kind: m.kind, rank: m.rank.slice(), pts: clone(m.pts) }); progress(T); }
  }
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

  /* ---------- corrections (all logged, identical to Word Race) ---------- */
  function laterStarted(T, m) {
    var st = stageOf(T, m), i = T.stages.indexOf(st), started = false;
    T.stages.slice(i + 1).forEach(function (x) { stageIds(x).forEach(function (id) { if (T.matchups[id].battles.length) started = true; }); });
    if (st.tb && st.tb !== m.id && T.matchups[st.tb].battles.length) started = true;
    return started;
  }
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
    if (stDone) rewind(T, m);
    m.done = false; m.rank = null;
    settle(T, m); trimDeciders(T, m);
    log(T, 'override', { matchup: mid, battle: bn, answer: ai, value: a.value, ok: ok, note: note || '', ptsBefore: before, ptsAfter: clone(m.pts) });
    return a;
  }
  function trimDeciders(T, m) {
    if (m.kind === 'tb') return;
    while (m.battles.length > 3 && m.battles[m.battles.length - 1].tb && m.battles[m.battles.length - 1].winner && !needDecider(T, m, m.battles.length - 1)) { m.battles.pop(); m.done = false; m.rank = null; settle(T, m); }
  }
  function needDecider(T, m, upto) { var keep = m.battles; m.battles = keep.slice(0, upto); recalc(T, m); var u = regular(m).length >= 3 && unresolved(m); m.battles = keep; recalc(T, m); return !!u; }
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
  function pause(T, on) { T.paused = !!on; log(T, on ? 'pause' : 'resume'); }

  /* ---------- read helpers (identical to Word Race) ---------- */
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
  var REASONS = { empty: 'No answer', wrong: 'Not correct', correct: 'Correct' };

  var API = { DEFAULTS: DEFAULTS, GAME_POINTS: GAME_POINTS, FORMATS: FORMATS, FORMAT_TEXT: FORMAT_TEXT, REASONS: REASONS, OPS: OPS, SYM: SYM, OP_NAME: OP_NAME, matchCount: matchCount,
    create: create, addTeam: addTeam, removeTeam: removeTeam, moveTeam: moveTeam, shuffleTeams: shuffleTeams, setConfig: setConfig, rename: rename, preview: preview, start: start,
    startBattle: startBattle, submit: submit, award: award, timeout: timeout, override: override, correct: correct, pause: pause, check: check, drawNumbers: drawNumbers,
    liveMatchup: liveMatchup, openMatchups: openMatchups, curBattle: curBattle, nextParticipants: nextParticipants, summary: summary, table: table,
    team: team, tname: tname, mergeConfig: mergeConfig, lastStage: lastStage, stageOf: stageOf, stageIds: stageIds, regular: regular };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.NREngine = API;
})(this);
