/* Word Race engine tests. Run: node tests/wordrace.test.js */
'use strict';
const E = require('../assets/pqt/wordrace/wr-engine.js');
const { Dict } = require('../assets/pqt/wordrace/wr-dict.js');
const fs = require('fs'), path = require('path');
const dict = new Dict(fs.readFileSync(path.join(__dirname, '../assets/pqt/wordrace/words.txt'), 'utf8'));
let pass = 0, fail = 0;
function ok(c, msg) { if (c) pass++; else { fail++; console.log('  ✗ ' + msg); } }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), msg + ' — got ' + JSON.stringify(a) + ', expected ' + JSON.stringify(b)); }
function test(name, fn) { const f0 = fail; try { fn(); } catch (e) { fail++; console.log('  ✗ threw: ' + e.stack); } console.log((fail === f0 ? '✓ ' : '✗ ') + name); }
function seeded(s) { return function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }
const L = { s: 's', e: 't', tier: 'easy' }; // fixed letters for predictable points (10 a win, no bonus at 20s)
const N = 'ABCDEFGHIJKL'.split('');
function make(n, cfg) { const T = E.create('Test', Object.assign({ difficulty: 'easy' }, cfg)); for (let i = 0; i < n; i++) E.addTeam(T, N[i]); E.start(T); return T; }
const id = (T, name) => T.teams.find(t => t.name === name).id;
const nm = (T, tid) => E.tname(T, tid);
// play a matchup by script of battle winners ('a'/'b'); voice mode awards, 20s response → 10 pts each
function play(T, m, script) { script.forEach(w => { E.startBattle(T, m.id, dict, L); E.award(T, m.id, m[w], '', dict, { ms: 20000 }); }); }
function names(T, ids) { return ids.map(x => nm(T, x)); }
function cur(T) { return E.lastRound(T); }
function mm(T, ids) { return ids.map(i => T.matchups[i]).map(m => nm(T, m.a) + '-' + nm(T, m.b)); }

test('2 teams: one matchup, winner is champion', () => {
  const T = make(2); const r = cur(T); eq(r.label, 'Grand Final', 'label'); eq(mm(T, r.matchups), ['A-B'], 'pairs');
  play(T, T.matchups[r.matchups[0]], ['b', 'b']); eq(nm(T, T.champion), 'B', 'champion'); eq(T.status, 'done', 'status');
});
test('4 teams: semis then final', () => {
  const T = make(4); eq(cur(T).label, 'Semi-finals', 'semis'); eq(mm(T, cur(T).matchups), ['A-B', 'C-D'], 'pairs');
  cur(T).matchups.forEach(i => play(T, T.matchups[i], ['a', 'a']));
  eq(cur(T).label, 'Grand Final', 'final'); eq(mm(T, cur(T).matchups), ['A-C'], 'final pair');
  play(T, T.matchups[cur(T).matchups[0]], ['a', 'b', 'b']); eq(nm(T, T.champion), 'C', 'champion C');
});
test('Matchups stop at 2–0 and run to 3 at 1–1', () => {
  const T = make(2); const m = T.matchups[cur(T).matchups[0]];
  play(T, m, ['a', 'a']); eq(m.battles.length, 2, '2–0 uses two battles'); eq([m.wins.a, m.wins.b], [2, 0], '2–0');
  let threw = false; try { E.startBattle(T, m.id, dict, L); } catch (e) { threw = true; } ok(threw, 'no third battle after 2–0');
  const T2 = make(2); const m2 = T2.matchups[cur(T2).matchups[0]]; play(T2, m2, ['a', 'b', 'a']); eq(m2.battles.length, 3, '2–1 uses three'); eq(nm(T2, m2.winner), 'A', '2–1 winner');
});
test('Seven teams, unique best loser faces the unmatched team', () => {
  const T = make(7); const r = cur(T);
  eq(mm(T, r.matchups), ['A-B', 'C-D', 'E-F'], 'initial pairs'); eq(nm(T, r.unmatched), 'G', 'G unmatched'); ok(!r.bye, 'no bye');
  play(T, T.matchups[r.matchups[0]], ['a', 'b', 'a']); // B 10
  play(T, T.matchups[r.matchups[1]], ['a', 'a']);      // D 0
  play(T, T.matchups[r.matchups[2]], ['a', 'a']);      // F 0
  eq(nm(T, r.bestLoser), 'B', 'B is best loser'); eq(mm(T, r.revival.matchups), ['B-G'], 'B vs G');
  play(T, T.matchups[r.revival.matchups[0]], ['b', 'b']);
  eq(nm(T, r.revival.qualified), 'G', 'G qualifies'); eq(cur(T).label, 'Semi-finals', 'semis'); eq(names(T, cur(T).pool), ['A', 'C', 'E', 'G'], 'four qualified');
});
test('Seven teams, all three losers tied: B v D, F v G, winners meet, winner joins A C E', () => {
  const T = make(7); const r = cur(T);
  r.matchups.forEach(i => play(T, T.matchups[i], ['a', 'b', 'a'])); // B, D, F all 10
  eq(r.losers.map(l => l.pts), [10, 10, 10], 'equal aggregates');
  eq(r.bestLoser, null, 'no single best loser'); eq(names(T, r.tiedLosers), ['B', 'D', 'F'], 'tied');
  eq(mm(T, r.revival.matchups), ['B-D', 'F-G'], 'revival round B v D, F v G');
  ok(!T.decision, 'no decision needed: rule is defined');
  play(T, T.matchups[r.revival.matchups[0]], ['b', 'a', 'b']); // D
  eq(r.revival.final, null, 'final waits for both revival matchups');
  play(T, T.matchups[r.revival.matchups[1]], ['b', 'b']);      // G
  eq(mm(T, [r.revival.final]), ['D-G'], 'revival final D v G');
  eq(T.matchups[r.revival.final].battles.length, 0, 'not started yet');
  play(T, T.matchups[r.revival.final], ['a', 'b', 'a']); // D
  eq(nm(T, r.revival.qualified), 'D', 'D joins');
  const s = cur(T); eq(s.label, 'Semi-finals', 'semis'); eq(names(T, s.pool), ['A', 'C', 'E', 'D'], 'A C E + D');
  eq(mm(T, s.matchups), ['A-C', 'E-D'], 'semi pairs');
  s.matchups.forEach(i => play(T, T.matchups[i], ['b', 'b']));
  const f = cur(T); eq(f.label, 'Grand Final', 'grand final'); eq(mm(T, f.matchups), ['C-D'], 'final C v D');
  play(T, T.matchups[f.matchups[0]], ['b', 'a', 'b']); eq(nm(T, T.champion), 'D', 'D champion via revival'); eq(T.status, 'done', 'done');
  const st = E.summary(T); ok(st[id(T, 'D')].revival && st[id(T, 'D')].status === 'champion', 'stats: revival + champion');
});
test('Tied best losers outside the defined case pause for the host (5 teams)', () => {
  const T = make(5); const r = cur(T); eq(nm(T, r.unmatched), 'E', 'E unmatched');
  r.matchups.forEach(i => play(T, T.matchups[i], ['a', 'a'])); // B 0, D 0
  eq(T.status, 'decision', 'paused'); eq(T.decision.type, 'best-loser-tie', 'type'); eq(names(T, T.decision.teams), ['B', 'D'], 'tied B D');
  let threw = false; try { E.startBattle(T, Object.keys(T.matchups)[0], dict, L); } catch (e) { threw = true; } ok(threw, 'nothing runs during a decision');
  E.decide(T, { team: id(T, 'D') }); eq(mm(T, r.revival.matchups), ['D-E'], 'host picked D');
  play(T, T.matchups[r.revival.matchups[0]], ['a', 'a']);
  eq(T.decision && T.decision.type, 'odd-pool', '3 qualified → host decides'); eq(names(T, T.decision.pool), ['A', 'C', 'D'], 'pool');
});
test('Odd pool after round 1 (6 teams): host chooses revival or bye', () => {
  const T = make(6); eq(mm(T, cur(T).matchups), ['A-B', 'C-D', 'E-F'], 'three matchups'); ok(!cur(T).unmatched, 'nobody unmatched');
  cur(T).matchups.forEach(i => play(T, T.matchups[i], ['a', 'a']));
  eq(T.status, 'decision', 'decision'); E.decide(T, { mode: 'revival', team: id(T, 'E') });
  const r2 = cur(T); eq(nm(T, r2.unmatched), 'E', 'E unmatched in round 2'); eq(mm(T, r2.matchups), ['A-C'], 'A v C');
  play(T, T.matchups[r2.matchups[0]], ['a', 'b', 'a']); eq(mm(T, r2.revival.matchups), ['C-E'], 'loser C v E');
  play(T, T.matchups[r2.revival.matchups[0]], ['a', 'a']); eq(cur(T).label, 'Grand Final', 'final'); eq(mm(T, cur(T).matchups), ['A-C'], 'A v C again');
  const T2 = make(6); cur(T2).matchups.forEach(i => play(T2, T2.matchups[i], ['a', 'a'])); E.decide(T2, { mode: 'bye', team: id(T2, 'A') });
  const b = cur(T2); eq(nm(T2, b.bye), 'A', 'A bye'); eq(mm(T2, b.matchups), ['C-E'], 'C v E'); play(T2, T2.matchups[b.matchups[0]], ['b', 'b']);
  eq(names(T2, cur(T2).pool), ['E', 'A'], 'final E v A');
});
test('Answers: invalid, wrong letters, repeat, short, timeout, no draw', () => {
  const T = make(2, { minLength: 4 }); const m = T.matchups[cur(T).matchups[0]];
  E.startBattle(T, m.id, dict, { s: 's', e: 't', tier: 'easy' });
  let a = E.submit(T, m.id, m.a, 'sxqt', dict, { ms: 3000 }); eq([a.ok, a.reason, a.pts], [false, 'unknown', -2], 'not a word → penalty');
  a = E.submit(T, m.id, m.b, 'start', dict, { ms: 4000 }); eq([a.ok, a.pts], [true, 15], 'valid within speed window 10+5');
  eq(m.battles[0].winner, m.b, 'first valid wins');
  E.startBattle(T, m.id, dict, { s: 's', e: 't', tier: 'hard' });
  a = E.submit(T, m.id, m.a, 'start', dict, { ms: 20000 }); eq(a.reason, 'repeat', 'repeat rejected');
  a = E.submit(T, m.id, m.a, 'sat', dict, { ms: 20000 }); eq(a.reason, 'short', 'min length');
  a = E.submit(T, m.id, m.a, 'boat', dict, { ms: 20000 }); eq(a.reason, 'start', 'wrong start');
  a = E.submit(T, m.id, m.a, 'sore', dict, { ms: 20000 }); eq(a.reason, 'end', 'wrong end');
  const before = m.battles[1].s + m.battles[1].e; E.timeout(T, m.id, dict, seeded(7));
  const b = m.battles[1]; ok(!b.winner && b.rolls.length === 1 && (b.s + b.e) !== before, 'timeout → new letters, same battle');
  E.timeout(T, m.id, dict, null, { s: 'b', e: 'e', tier: 'easy' });
  a = E.submit(T, m.id, m.a, 'Brave!', dict, { ms: 2000 }); eq([a.ok, a.word], [true, 'brave'], 'normalised and valid');
  eq(m.pts.a, -2 - 2 - 2 - 2 - 2 + 15, 'penalties add up (5 wrong + 15)');
  E.addCustomWord(T, 'bukke'); E.startBattle(T, m.id, dict, { s: 'b', e: 'e', tier: 'easy' }); a = E.submit(T, m.id, m.b, 'bukke', dict, { ms: 30000 }); eq(a.reason, 'custom', 'custom dictionary');
});
test('Manual validation mode needs the host', () => {
  const T = make(2, { autoValidate: false }); const m = T.matchups[cur(T).matchups[0]]; E.startBattle(T, m.id, dict, L);
  let threw = null; try { E.submit(T, m.id, m.a, 'street', dict); } catch (e) { threw = e.code; } eq(threw, 'manual', 'blocked');
  const a = E.submit(T, m.id, m.a, 'street', dict, { verdict: true, ms: 12000 }); eq([a.ok, a.by], [true, 'host'], 'host accepts');
});
test('Host override flips a result and rebuilds what follows', () => {
  const T = make(4); const [m1, m2] = cur(T).matchups.map(i => T.matchups[i]);
  E.startBattle(T, m1.id, dict, L); E.submit(T, m1.id, m1.a, 'street', dict, { ms: 20000 });
  E.startBattle(T, m1.id, dict, L); E.submit(T, m1.id, m1.b, 'stxt', dict, { ms: 5000 }); E.submit(T, m1.id, m1.a, 'sweet', dict, { ms: 20000 });
  eq(nm(T, m1.winner), 'A', 'A wins 2–0'); play(T, m2, ['a', 'a']); eq(cur(T).label, 'Grand Final', 'final built');
  E.override(T, m1.id, 2, 0, true, 'regional spelling');
  eq(m1.battles[1].winner, m1.b, 'battle 2 now B'); eq([m1.wins.a, m1.wins.b, m1.done], [1, 1, false], 'back to 1–1'); eq(cur(T).label, 'Semi-finals', 'final removed');
  play(T, m1, ['b']); eq(nm(T, m1.winner), 'B', 'B wins decider'); eq(mm(T, cur(T).matchups), ['B-C'], 'final rebuilt B v C');
  ok(T.audit.some(e => e.act === 'override' && e.note === 'regional spelling'), 'override logged');
  play(T, T.matchups[cur(T).matchups[0]], ['a']);
  let threw = null; try { E.override(T, m1.id, 1, 0, false); } catch (e) { threw = e.code; } eq(threw, 'locked', 'locked once the final has started');
});
test('Score corrections are logged and can change the Best Loser', () => {
  const T = make(7); const r = cur(T); r.matchups.forEach(i => play(T, T.matchups[i], ['a', 'b', 'a']));
  ok(r.revival.twoStage, 'tied path first');
  const mD = T.matchups[r.matchups[1]]; E.correct(T, mD.id, 2, id(T, 'D'), 3, 'speed bonus missed');
  eq(nm(T, r.bestLoser), 'D', 'D now best loser'); eq(mm(T, r.revival.matchups), ['D-G'], 'revival rebuilt D v G');
  const e = T.audit.filter(x => x.act === 'correction')[0]; ok(e && e.delta === 3 && e.reason === 'speed bonus missed' && e.ptsBefore.b === 10 && e.ptsAfter.b === 13, 'audit has before/after');
  let threw = null; try { E.correct(T, mD.id, 2, id(T, 'D'), 1, ''); } catch (x) { threw = x.code; } eq(threw, 'reason', 'reason required');
});
test('Refresh mid-tournament: JSON round trip keeps going', () => {
  let T = make(7); const r = cur(T); play(T, T.matchups[r.matchups[0]], ['a', 'b']);
  T = JSON.parse(JSON.stringify(T)); // what the host page saves and reloads
  const m = T.matchups[cur(T).matchups[0]]; play(T, m, ['a']); eq(nm(T, m.winner), 'A', 'battle 3 after reload');
  cur(T).matchups.slice(1).forEach(i => play(T, T.matchups[i], ['a', 'a']));
  T = JSON.parse(JSON.stringify(T)); eq(nm(T, cur(T).bestLoser), 'B', 'state intact');
});
test('Pause blocks play; finished matchups cannot be replayed; no double advancement', () => {
  const T = make(4); const m = T.matchups[cur(T).matchups[0]]; E.pause(T, true);
  let threw = null; try { E.startBattle(T, m.id, dict, L); } catch (e) { threw = e.code; } eq(threw, 'paused', 'paused');
  E.pause(T, false); play(T, m, ['a', 'a']);
  threw = null; try { E.award(T, m.id, m.a, '', dict); } catch (e) { threw = e.code; } eq(threw, 'nobattle', 'no answers after finish');
  const m2 = T.matchups[cur(T).matchups[1]]; threw = null; try { E.startBattle(T, 'mX', dict, L); } catch (e) { threw = e.code; } eq(threw, 'matchup', 'unknown matchup');
  play(T, m2, ['b', 'b']); const rounds = T.rounds.length; E.override(T, m2.id, 1, 0, true); eq(T.rounds.length, rounds, 'no-op override does not add rounds');
});
test('Every team count 2–12 reaches a champion (random results, host picks first option)', () => {
  for (let n = 2; n <= 12; n++) for (let seed = 1; seed <= 40; seed++) {
    const rnd = seeded(seed * 31 + n); const T = make(n); let guard = 0;
    while (T.status !== 'done' && guard++ < 500) {
      if (T.status === 'decision') { const d = T.decision; E.decide(T, d.type === 'odd-pool' ? { mode: rnd() < .5 ? 'revival' : 'bye', team: d.pool[Math.floor(rnd() * d.pool.length)] } : { team: d.teams[0] }); continue; }
      const m = E.liveMatchup(T); if (!m) { ok(false, 'stuck n=' + n); break; }
      E.startBattle(T, m.id, dict, null, rnd);
      if (rnd() < .2) E.timeout(T, m.id, dict, rnd);
      if (rnd() < .3) E.submit(T, m.id, rnd() < .5 ? m.a : m.b, 'qqq', dict, { ms: 5000 });
      E.award(T, m.id, rnd() < .5 ? m.a : m.b, '', dict, { ms: Math.floor(rnd() * 30000) });
    }
    if (T.status !== 'done') { ok(false, 'no champion n=' + n + ' seed=' + seed); continue; }
    const all = Object.values(T.matchups);
    ok(all.every(m => m.done && m.battles.length >= 2 && m.battles.length <= 3 && Math.max(m.wins.a, m.wins.b) === 2), 'matchups well formed n=' + n);
    // nobody plays after being knocked out for good
    const st = E.summary(T); ok(Object.values(st).filter(s => s.status === 'champion').length === 1, 'one champion n=' + n);
    const lastFinal = T.rounds[T.rounds.length - 1]; ok(lastFinal.label === 'Grand Final' || n === 2, 'ends with grand final n=' + n);
  }
});
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
