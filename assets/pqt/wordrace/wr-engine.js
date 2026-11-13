/* PQT · WORD RACE tournament engine.
   Pure logic: no DOM. The whole tournament is one JSON-safe object (T), so it can be saved after every action
   and restored after a refresh. Every change goes through a function here and is written to T.audit.
   Works in the browser (window.WREngine) and in Node (module.exports) for the test suite. */
(function (root) {
  'use strict';

  /* ---------- central configuration (the only place defaults live) ---------- */
  var DEFAULTS = {
    battleSecs: 30,          // countdown per letter pair
    spinSecs: 10,            // letters spin like a randomiser for this long before they stop and the clock starts
    validPoints: 10,         // a correct word
    speedBonus: 5,           // extra for a correct word inside the speed window
    speedSecs: 10,           // the speed window
    tierBonus: { easy: 0, medium: 3, hard: 6 }, // difficulty bonus by letter-pair tier
    invalidPenalty: 2,       // taken off for a wrong word
    minLength: 3,
    difficulty: 'mixed',     // easy | medium | hard | mixed
    noRepeats: true,         // a word can only be used once per tournament
    autoValidate: true,      // dictionary check; host can always override
    answerMode: 'voice'      // voice (host awards) | phones (teams type)
  };
  var BATTLES_TO_WIN = 2;    // best of three, stops at 2-0

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function now() { return Date.now(); }
  function mergeConfig(c) {
    var out = clone(DEFAULTS);
    if (c) Object.keys(c).forEach(function (k) {
      if (k === 'tierBonus' && c.tierBonus) Object.keys(c.tierBonus).forEach(function (t) { out.tierBonus[t] = +c.tierBonus[t] || 0; });
      else if (k in DEFAULTS) out[k] = c[k];
    });
    ['battleSecs', 'spinSecs', 'validPoints', 'speedBonus', 'speedSecs', 'invalidPenalty', 'minLength'].forEach(function (k) { out[k] = Math.max(0, +out[k] || 0); });
    out.spinSecs = Math.min(30, out.spinSecs);
    out.minLength = Math.max(2, out.minLength); out.battleSecs = Math.max(5, out.battleSecs);
    return out;
  }
  function log(T, act, data) { var e = { at: now(), act: act }; if (data) Object.keys(data).forEach(function (k) { e[k] = data[k]; }); T.audit.push(e); T.updated = e.at; return e; }
  function err(code, msg) { var e = new Error(msg || code); e.code = code; throw e; }
  function team(T, id) { for (var i = 0; i < T.teams.length; i++) if (T.teams[i].id === id) return T.teams[i]; return null; }
  function tname(T, id) { var t = team(T, id); return t ? t.name : '?'; }

  /* ---------- create & set up ---------- */
  function create(name, config) {
    var T = { v: 1, id: 'wr' + now().toString(36) + Math.random().toString(36).slice(2, 6), name: String(name || 'Word Race').trim().slice(0, 60) || 'Word Race',
      created: now(), updated: now(), status: 'setup', config: mergeConfig(config), teams: [], rounds: [], matchups: {}, used: {}, custom: {}, pairsUsed: {},
      audit: [], decision: null, champion: null, seq: 0, paused: false };
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

  /* Preview of the first round for the setup screen. */
  function preview(T) { var ids = T.teams.map(function (t) { return t.id; }), pairs = []; for (var i = 0; i + 1 < ids.length; i += 2) pairs.push([ids[i], ids[i + 1]]); return { pairs: pairs, unmatched: ids.length % 2 ? ids[ids.length - 1] : null }; }

  function start(T) {
    if (T.status !== 'setup') err('started', 'This tournament has already started.');
    if (T.teams.length < 2) err('few', 'Add at least 2 teams.');
    T.status = 'live'; log(T, 'start', { teams: T.teams.map(function (t) { return t.id; }) });
    openRound(T, T.teams.map(function (t) { return t.id; }), { initial: true });
    return T;
  }

  /* ---------- rounds ---------- */
  function poolLabel(n) { return n === 2 ? 'Grand Final' : n === 4 ? 'Semi-finals' : n === 8 ? 'Quarter-finals' : null; }
  function kindFor(n) { return n === 2 ? 'final' : n === 4 ? 'semi' : 'knockout'; }
  function newMatchup(T, round, a, b, label) {
    var m = { id: 'm' + (++T.seq), round: round.id, a: a, b: b, label: label || '', battles: [], wins: { a: 0, b: 0 }, pts: { a: 0, b: 0 }, winner: null, loser: null, done: false };
    T.matchups[m.id] = m; round.matchups.push(m.id); return m;
  }
  /* Opens the round for a pool of teams.
     opts.initial: first round (odd pool → one team left unmatched, revival applies).
     opts.unmatched / opts.bye: set by the host's decision for later odd pools. */
  function openRound(T, pool, opts) {
    opts = opts || {};
    var n = pool.length;
    if (n === 1) { T.champion = pool[0]; T.status = 'done'; T.finished = now(); log(T, 'champion', { team: pool[0] }); return null; }
    if (n % 2 && !opts.initial && !opts.unmatched && !opts.bye) {
      T.decision = { type: 'odd-pool', pool: pool.slice(), round: T.rounds.length ? T.rounds[T.rounds.length - 1].id : null, at: now() };
      T.status = 'decision'; log(T, 'decision-needed', { type: 'odd-pool', pool: pool.slice() });
      return null;
    }
    var idx = T.rounds.length + 1;
    var r = { id: 'r' + idx, n: idx, kind: opts.initial ? 'initial' : kindFor(n), label: '', pool: pool.slice(), matchups: [], unmatched: null, bye: null, done: false, next: false, revival: null };
    var play = pool.slice();
    if (n % 2) {
      var odd = opts.bye || opts.unmatched || play[play.length - 1];
      play = play.filter(function (x) { return x !== odd; });
      if (opts.bye) r.bye = odd; else r.unmatched = odd;
    }
    if (opts.initial) r.label = poolLabel(n) && !(n % 2) ? poolLabel(n) : 'Round 1';
    else r.label = n % 2 ? 'Qualifying round' : (poolLabel(n) || 'Round ' + idx);
    if (r.label === 'Grand Final') r.kind = 'final'; else if (r.label === 'Semi-finals') r.kind = 'semi';
    T.rounds.push(r);
    for (var i = 0; i + 1 < play.length; i += 2) newMatchup(T, r, play[i], play[i + 1]);
    log(T, 'round-open', { round: r.id, label: r.label, matchups: r.matchups.slice(), unmatched: r.unmatched, bye: r.bye });
    return r;
  }
  function roundOf(T, m) { for (var i = 0; i < T.rounds.length; i++) if (T.rounds[i].id === m.round) return T.rounds[i]; return null; }
  function lastRound(T) { return T.rounds[T.rounds.length - 1] || null; }
  function allDone(T, ids) { return ids.every(function (id) { return T.matchups[id].done; }); }

  /* Called after any matchup finishes. Builds what comes next, never twice. */
  function progress(T) {
    var r = lastRound(T); if (!r || T.status === 'done' || T.decision) return;
    var main = r.matchups;
    if (!allDone(T, main)) return;
    if (r.next) return; // already advanced (duplicate advancement guard)
    var winners = main.map(function (id) { return T.matchups[id].winner; });

    if (r.unmatched) {
      var rv = r.revival;
      if (!rv) {
        var losers = main.map(function (id) { var m = T.matchups[id]; return { team: m.loser, pts: m.pts[m.a === m.loser ? 'a' : 'b'], matchup: id }; });
        var top = Math.max.apply(null, losers.map(function (l) { return l.pts; }));
        var tied = losers.filter(function (l) { return l.pts === top; });
        r.losers = losers;
        if (tied.length === 1) { r.bestLoser = tied[0].team; openRevival(T, r, [[tied[0].team, r.unmatched]], false); }
        else if (losers.length === 3 && tied.length === 3) { // the defined seven-team procedure
          r.bestLoser = null; r.tiedLosers = tied.map(function (l) { return l.team; });
          openRevival(T, r, [[losers[0].team, losers[1].team], [losers[2].team, r.unmatched]], true);
        } else {
          T.decision = { type: 'best-loser-tie', round: r.id, teams: tied.map(function (l) { return l.team; }), pts: top, at: now() };
          T.status = 'decision'; log(T, 'decision-needed', { type: 'best-loser-tie', teams: T.decision.teams, pts: top });
        }
        return;
      }
      // revival in progress
      if (!allDone(T, rv.matchups)) return;
      if (rv.twoStage && !rv.final) {
        var w = rv.matchups.map(function (id) { return T.matchups[id].winner; });
        rv.final = newMatchup(T, r, w[0], w[1], 'Revival Final').id; r.matchups.pop();
        log(T, 'revival-final-open', { round: r.id, matchup: rv.final });
        return;
      }
      if (rv.final && !T.matchups[rv.final].done) return;
      rv.qualified = rv.final ? T.matchups[rv.final].winner : T.matchups[rv.matchups[0]].winner;
      log(T, 'revival-qualified', { round: r.id, team: rv.qualified });
      winners = winners.concat([rv.qualified]);
    } else if (r.bye) {
      winners = winners.concat([r.bye]);
    }
    r.done = true; r.next = true; r.qualified = winners.slice();
    log(T, 'round-done', { round: r.id, qualified: winners.slice() });
    openRound(T, winners, {});
  }
  function openRevival(T, r, pairs, twoStage) {
    r.revival = { matchups: [], twoStage: twoStage, final: null, qualified: null };
    pairs.forEach(function (p) { var m = newMatchup(T, r, p[0], p[1], 'Revival'); r.matchups.pop(); r.revival.matchups.push(m.id); });
    log(T, 'revival-open', { round: r.id, pairs: pairs, twoStage: twoStage, bestLoser: r.bestLoser || null, tied: r.tiedLosers || null });
  }
  /* The host settles something the rules don't define. */
  function decide(T, choice) {
    var d = T.decision; if (!d) err('none', 'Nothing to decide.');
    if (d.type === 'best-loser-tie') {
      if (d.teams.indexOf(choice.team) < 0) err('choice', 'Pick one of the tied teams.');
      var r = T.rounds.filter(function (x) { return x.id === d.round; })[0];
      T.decision = null; T.status = 'live'; r.bestLoser = choice.team; r.bestLoserByHost = true;
      log(T, 'decision', { type: d.type, team: choice.team, note: choice.note || '' });
      openRevival(T, r, [[choice.team, r.unmatched]], false);
    } else if (d.type === 'odd-pool') {
      if (d.pool.indexOf(choice.team) < 0) err('choice', 'Pick one of the qualified teams.');
      if (choice.mode !== 'revival' && choice.mode !== 'bye') err('choice', 'Choose revival or bye.');
      T.decision = null; T.status = 'live';
      log(T, 'decision', { type: d.type, mode: choice.mode, team: choice.team, note: choice.note || '' });
      var pool = d.pool.filter(function (x) { return x !== choice.team; }).concat([choice.team]);
      openRound(T, pool, choice.mode === 'bye' ? { bye: choice.team } : { unmatched: choice.team });
    }
  }

  /* ---------- letters ---------- */
  function drawLetters(T, dict, rnd) {
    rnd = rnd || Math.random;
    var tier = T.config.difficulty === 'mixed' ? ['easy', 'medium', 'hard'][Math.floor(rnd() * 3)] : T.config.difficulty;
    var p = dict.pick(tier, T.config.minLength, T.pairsUsed, rnd);
    T.pairsUsed[p.s + p.e] = 1;
    return p;
  }

  /* ---------- battles ---------- */
  function liveMatchup(T) {
    var r = lastRound(T); if (!r) return null;
    var ids = r.matchups.slice(); if (r.revival) ids = ids.concat(r.revival.matchups, r.revival.final ? [r.revival.final] : []);
    for (var i = 0; i < ids.length; i++) { var m = T.matchups[ids[i]]; if (!m.done) return m; }
    return null;
  }
  function openMatchups(T) { var r = lastRound(T); if (!r) return []; var ids = r.matchups.slice(); if (r.revival) ids = ids.concat(r.revival.matchups, r.revival.final ? [r.revival.final] : []); return ids.map(function (id) { return T.matchups[id]; }).filter(function (m) { return !m.done; }); }
  function getM(T, mid) { var m = T.matchups[mid]; if (!m) err('matchup', 'No such matchup.'); return m; }
  function curBattle(m) { var b = m.battles[m.battles.length - 1]; return b && !b.winner ? b : null; }
  function startBattle(T, mid, dict, letters, rnd) {
    if (T.status !== 'live') err('status', T.status === 'decision' ? 'Settle the pending decision first.' : 'The tournament is not live.');
    if (T.paused) err('paused', 'The tournament is paused.');
    var m = getM(T, mid); if (m.done) err('done', 'This matchup is finished.');
    if (openMatchups(T).indexOf(m) < 0) err('order', 'That matchup is not open yet.');
    if (curBattle(m)) err('running', 'A battle is already running in this matchup.');
    var p = letters ? { s: letters.s.toLowerCase(), e: letters.e.toLowerCase(), tier: letters.tier || (dict ? dict.tierOf(letters.s, letters.e, T.config.minLength) : 'medium') } : drawLetters(T, dict, rnd);
    if (letters) T.pairsUsed[p.s + p.e] = 1;
    var t0 = now(), b = { n: m.battles.length + 1, s: p.s, e: p.e, tier: p.tier, startedAt: t0, rollAt: t0 + T.config.spinSecs * 1000, secs: T.config.battleSecs, rolls: [], attempts: [], adj: { a: 0, b: 0 }, winner: null };
    m.battles.push(b);
    log(T, 'battle-start', { matchup: mid, battle: b.n, s: p.s, e: p.e, tier: p.tier });
    return b;
  }
  function side(m, teamId) { return m.a === teamId ? 'a' : m.b === teamId ? 'b' : null; }
  function norm(w) { return String(w || '').toLowerCase().replace(/[^a-z]/g, ''); }

  /* Checks a word against the battle letters, config and dictionary. Returns {ok, reason}. */
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
  function pointsFor(T, b, ms) { var c = T.config; return c.validPoints + (ms != null && ms <= c.speedSecs * 1000 ? c.speedBonus : 0) + (c.tierBonus[b.tier] || 0); }

  /* A team answers. opts.verdict: true/false from the host (voice mode or manual check); otherwise the dictionary decides.
     Returns the attempt. A valid word wins the battle at once (first valid word wins). */
  function submit(T, mid, teamId, word, dict, opts) {
    opts = opts || {};
    if (T.status !== 'live' || T.paused) err('status', 'The tournament is not live.');
    var m = getM(T, mid), sd = side(m, teamId); if (!sd) err('team', 'That team is not in this matchup.');
    var b = curBattle(m); if (!b) err('nobattle', 'Start a battle first.');
    if (opts.ms == null && now() < (b.rollAt || 0)) err('spinning', 'The letters are still spinning.');
    var ms = opts.ms != null ? Math.max(0, +opts.ms) : now() - (b.rollAt || b.startedAt);
    var c = check(T, b, word, dict), ok = c.ok, by = 'auto';
    if (opts.verdict === true || opts.verdict === false) { ok = opts.verdict; by = 'host'; }
    if (ok === null) err('manual', 'Manual validation is on. Accept or reject this word.');
    var a = { team: teamId, side: sd, word: c.w, raw: String(word || '').slice(0, 40), ok: ok, reason: c.reason, by: by, ms: ms, at: now(), pts: 0, roll: b.rolls.length };
    if (ok) {
      a.pts = pointsFor(T, b, ms);
      b.winner = teamId; b.endedAt = a.at;
      if (a.word) T.used[a.word] = mid + ':' + b.n;
    } else a.pts = -T.config.invalidPenalty;
    b.attempts.push(a);
    log(T, 'answer', { matchup: mid, battle: b.n, team: teamId, word: a.word, ok: ok, reason: c.reason, by: by, ms: ms, pts: a.pts });
    settle(T, m);
    return a;
  }
  /* Voice mode: the host names the team that said a correct word first. Word is optional but recommended. */
  function award(T, mid, teamId, word, dict, opts) { opts = opts || {}; opts.verdict = true; return submit(T, mid, teamId, word || '', dict, opts); }
  /* Time ran out with no correct word: new letters, same battle (a battle cannot be drawn). */
  function timeout(T, mid, dict, rnd, letters) {
    var m = getM(T, mid), b = curBattle(m); if (!b) err('nobattle', 'No battle is running.');
    b.rolls.push({ s: b.s, e: b.e, tier: b.tier, endedAt: now() });
    var p = letters ? { s: letters.s.toLowerCase(), e: letters.e.toLowerCase(), tier: letters.tier || 'medium' } : drawLetters(T, dict, rnd);
    if (letters) T.pairsUsed[p.s + p.e] = 1;
    b.s = p.s; b.e = p.e; b.tier = p.tier; b.rollAt = now() + T.config.spinSecs * 1000;
    log(T, 'timeout', { matchup: mid, battle: b.n, next: p.s + p.e });
    return b;
  }

  function recalc(T, m) {
    m.wins = { a: 0, b: 0 }; m.pts = { a: 0, b: 0 };
    m.battles.forEach(function (b) {
      var w = null; b.attempts.forEach(function (a) { a.counted = false; });
      b.attempts.forEach(function (a) { if (!w && a.ok) { w = a; a.counted = true; } else if (!a.ok) a.counted = true; }); // valid answers after the first one don't count
      b.winner = w ? w.team : null;
      ['a', 'b'].forEach(function (s) { m.pts[s] += b.attempts.filter(function (a) { return a.side === s && a.counted; }).reduce(function (t, a) { return t + a.pts; }, 0) + (b.adj[s] || 0); });
      if (b.winner) m.wins[side(m, b.winner)]++;
    });
  }
  function settle(T, m) {
    recalc(T, m);
    var was = m.winner;
    if (m.wins.a >= BATTLES_TO_WIN || m.wins.b >= BATTLES_TO_WIN) {
      m.winner = m.wins.a >= BATTLES_TO_WIN ? m.a : m.b; m.loser = m.winner === m.a ? m.b : m.a; m.done = true;
      if (was !== m.winner) log(T, 'matchup-won', { matchup: m.id, team: m.winner, score: Math.max(m.wins.a, m.wins.b) + '–' + Math.min(m.wins.a, m.wins.b), pts: clone(m.pts) });
      progress(T);
    }
  }

  /* ---------- corrections (all logged) ---------- */
  function downstreamStarted(T, m) {
    var r = roundOf(T, m), after = false, started = false;
    T.rounds.forEach(function (x) { if (x === r) { after = true; return; } if (after) x.matchups.forEach(function (id) { if (T.matchups[id].battles.length) started = true; }); });
    if (r.revival) { var inRev = r.revival.matchups.indexOf(m.id) > -1 || r.revival.final === m.id; var ids = r.revival.matchups.concat(r.revival.final ? [r.revival.final] : []); if (!inRev) ids.forEach(function (id) { if (T.matchups[id].battles.length) started = true; }); else if (r.revival.final && r.revival.final !== m.id && T.matchups[r.revival.final].battles.length) started = true; }
    return started;
  }
  /* Drops everything built after this round's results so it can be rebuilt from corrected results. */
  function rewind(T, m) {
    var r = roundOf(T, m), keep = T.rounds.indexOf(r);
    T.rounds.slice(keep + 1).forEach(function (x) { x.matchups.forEach(function (id) { delete T.matchups[id]; }); });
    T.rounds = T.rounds.slice(0, keep + 1);
    var inRev = r.revival && (r.revival.matchups.indexOf(m.id) > -1 || r.revival.final === m.id);
    if (r.revival && !inRev) { r.revival.matchups.concat(r.revival.final ? [r.revival.final] : []).forEach(function (id) { delete T.matchups[id]; }); r.revival = null; r.bestLoser = null; r.tiedLosers = null; r.losers = null; }
    else if (r.revival && r.revival.final && r.revival.final !== m.id) { delete T.matchups[r.revival.final]; r.revival.final = null; r.revival.qualified = null; }
    else if (r.revival) r.revival.qualified = null;
    r.done = false; r.next = false; r.qualified = null;
    if (T.decision) T.decision = null;
    T.champion = null; if (T.status === 'done' || T.status === 'decision') T.status = 'live';
  }
  function reopen(T, m) { m.done = false; m.winner = null; m.loser = null; }
  /* Flip a verdict on an answer (host override). */
  function override(T, mid, bn, ai, ok, note) {
    var m = getM(T, mid), b = m.battles[bn - 1]; if (!b) err('battle', 'No such battle.'); var a = b.attempts[ai]; if (!a) err('answer', 'No such answer.');
    if (a.ok === ok) return a;
    var beforeW = m.winner, beforeP = clone(m.pts);
    if (m.done && downstreamStarted(T, m)) err('locked', 'Later matchups have already started, so this result is locked. Use a points correction instead.');
    a.ok = ok; a.by = 'host'; a.pts = ok ? pointsFor(T, b, a.ms) : -T.config.invalidPenalty;
    if (ok && a.word) T.used[a.word] = mid + ':' + b.n; else if (!ok && a.word && T.used[a.word] === mid + ':' + b.n) delete T.used[a.word];
    if (m.done) { rewind(T, m); reopen(T, m); }
    settle(T, m);
    log(T, 'override', { matchup: mid, battle: bn, answer: ai, word: a.word, ok: ok, note: note || '', winnerBefore: beforeW, winnerAfter: m.winner, ptsBefore: beforeP, ptsAfter: clone(m.pts) });
    if (m.done && beforeW === m.winner) progress(T);
    return a;
  }
  /* Manual points correction on a battle. Changes aggregates (and so Best Loser), never who won the battle. */
  function correct(T, mid, bn, teamId, delta, reason) {
    var m = getM(T, mid), b = m.battles[bn - 1]; if (!b) err('battle', 'No such battle.');
    var sd = side(m, teamId); if (!sd) err('team', 'That team is not in this matchup.');
    if (!String(reason || '').trim()) err('reason', 'Give a reason for the correction.');
    delta = Math.round(+delta || 0); if (!delta) err('delta', 'Enter the points to add or take away.');
    if (m.done && downstreamStarted(T, m)) err('locked', 'Later matchups have already started, so this result is locked.');
    var before = clone(m.pts);
    b.adj[sd] = (b.adj[sd] || 0) + delta;
    var wasDone = m.done; if (wasDone) { rewind(T, m); reopen(T, m); }
    settle(T, m);
    log(T, 'correction', { matchup: mid, battle: bn, team: teamId, delta: delta, reason: String(reason).slice(0, 200), ptsBefore: before, ptsAfter: clone(m.pts) });
    return m;
  }
  function addCustomWord(T, word) { var w = norm(word); if (!w) err('word', 'Enter a word.'); T.custom[w] = 1; log(T, 'custom-word', { word: w }); return w; }
  function pause(T, on) { T.paused = !!on; log(T, on ? 'pause' : 'resume'); }

  /* ---------- read helpers ---------- */
  function summary(T) {
    var s = {};
    T.teams.forEach(function (t) { s[t.id] = { id: t.id, name: t.name, battles: 0, won: 0, pts: 0, matchups: 0, mWon: 0, revival: false, final: false, status: 'in' }; });
    Object.keys(T.matchups).forEach(function (id) { var m = T.matchups[id]; ['a', 'b'].forEach(function (k) { var x = s[m[k]]; if (!x) return; x.pts += m.pts[k]; x.won += m.wins[k]; x.battles += m.battles.filter(function (b) { return b.winner; }).length; if (m.battles.length) x.matchups++; if (m.winner === m[k]) x.mWon++; }); });
    T.rounds.forEach(function (r) { if (r.revival && r.revival.qualified && s[r.revival.qualified]) s[r.revival.qualified].revival = true; if (r.kind === 'final') r.matchups.forEach(function (id) { var m = T.matchups[id]; s[m.a].final = s[m.b].final = true; }); });
    if (T.champion) { Object.keys(s).forEach(function (k) { s[k].status = k === T.champion ? 'champion' : 'out'; }); return s; }
    T.rounds.forEach(function (r) {
      r.matchups.forEach(function (id) { var m = T.matchups[id]; if (m.done) s[m.loser].status = r.unmatched && !r.revival && !r.next ? 'waiting' : 'out'; });
      if (r.revival) r.revival.matchups.concat(r.revival.final ? [r.revival.final] : []).forEach(function (id) { var m = T.matchups[id]; s[m.a].status = s[m.b].status = 'in'; if (m.done) s[m.loser].status = 'out'; });
      if (r.unmatched && !r.revival && !r.next && s[r.unmatched]) s[r.unmatched].status = 'in';
    });
    return s;
  }
  var REASONS = { empty: 'No word', start: 'Wrong first letter', end: 'Wrong last letter', short: 'Too short', repeat: 'Already used', unknown: 'Not in the dictionary', dictionary: 'In the dictionary', custom: 'On the custom list', manual: 'Needs a host check' };

  var API = { DEFAULTS: DEFAULTS, BATTLES_TO_WIN: BATTLES_TO_WIN, REASONS: REASONS, create: create, addTeam: addTeam, removeTeam: removeTeam, moveTeam: moveTeam, shuffleTeams: shuffleTeams,
    setConfig: setConfig, rename: rename, preview: preview, start: start, decide: decide, startBattle: startBattle, submit: submit, award: award, timeout: timeout,
    override: override, correct: correct, addCustomWord: addCustomWord, pause: pause, check: check, liveMatchup: liveMatchup, openMatchups: openMatchups,
    curBattle: curBattle, summary: summary, team: team, tname: tname, norm: norm, mergeConfig: mergeConfig, lastRound: lastRound, roundOf: roundOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.WREngine = API;
})(this);
