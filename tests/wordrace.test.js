/* Word Race engine tests (v2 fair formats). Run: node tests/wordrace.test.js */
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
const L = { s: 's', e: 't', tier: 'easy' };
const N = 'ABCDEFGHIJKL'.split('');
function make(n, cfg) { const T = E.create('Test', Object.assign({ spinSecs: 0 }, cfg)); for (let i = 0; i < n; i++) E.addTeam(T, N[i]); E.start(T); return T; }
const id = (T, name) => T.teams.find(t => t.name === name).id;
const nm = (T, x) => E.tname(T, x);
const names = (T, ids) => ids.map(x => nm(T, x));
const st = T => E.lastStage(T);
const ms = T => st(T).matchups.map(i => T.matchups[i]);
const teamsOf = (T, m) => names(T, m.teams).join('');
/* Play a matchup. script: list of team names winning each battle (regular + any deciders). */
function play(T, m, script) { script.forEach(w => { E.startBattle(T, m.id, dict, L); E.award(T, m.id, id(T, w), '', dict, { ms: 5000 }); }); }

test('2 teams: one 3-battle final', () => {
  const T = make(2); eq(st(T).label, 'Grand Final', 'final'); const m = ms(T)[0];
  play(T, m, ['A', 'A']); ok(!m.done, 'not finished after 2–0: every matchup is 3 battles');
  play(T, m, ['B']); ok(m.done, 'done after 3'); eq([m.pts[id(T, 'A')], m.pts[id(T, 'B')]], [6, 3], '3 points per battle');
  eq(nm(T, T.champion), 'A', 'A champion'); eq(T.status, 'done', 'done');
});
test('3 teams: one Bangarang, top 2 to the final', () => {
  const T = make(3); const m = ms(T)[0]; eq(m.kind, 'bang', 'bangarang'); eq(teamsOf(T, m), 'ABC', 'all three');
  play(T, m, ['A', 'B', 'A']); ok(m.done, 'done'); eq(names(T, m.rank), ['A', 'B', 'C'], 'ranked by points');
  eq(st(T).label, 'Grand Final', 'final'); eq(teamsOf(T, ms(T)[0]), 'AB', 'A v B');
});
test('Bangarang 1–1–1: sudden-death battles settle 1st and the cut', () => {
  const T = make(3); const m = ms(T)[0];
  play(T, m, ['A', 'B', 'C']); ok(!m.done, 'level, so not finished'); eq(names(T, E.nextParticipants(m)), ['A', 'B', 'C'], 'all three race the decider');
  play(T, m, ['C']); ok(!m.done, 'still need 2nd v 3rd'); eq(names(T, E.nextParticipants(m)), ['A', 'B'], 'A and B race for 2nd');
  let threw = null; E.startBattle(T, m.id, dict, L); try { E.award(T, m.id, id(T, 'C'), '', dict); } catch (e) { threw = e.code; } eq(threw, 'team', 'C not in this decider');
  E.award(T, m.id, id(T, 'B'), '', dict, { ms: 1 }); ok(m.done, 'done'); eq(names(T, m.rank), ['C', 'B', 'A'], 'order from deciders');
  eq([m.pts[id(T, 'A')], m.pts[id(T, 'B')], m.pts[id(T, 'C')]], [3, 3, 3], 'deciders score nothing');
});
test('Bangarang 3–0–0 in a top-2 group: 2nd v 3rd decider', () => {
  const T = make(3); const m = ms(T)[0]; play(T, m, ['A', 'A', 'A']); ok(!m.done, 'B and C level for the cut');
  play(T, m, ['C']); eq(names(T, m.rank), ['A', 'C', 'B'], 'C 2nd');
});
test('4 teams: semis then final', () => {
  const T = make(4); eq(st(T).label, 'Semi-finals', 'semis'); eq(ms(T).map(m => teamsOf(T, m)), ['AB', 'CD'], 'pairs');
  play(T, ms(T)[0], ['A', 'B', 'A']); play(T, ms(T)[1], ['D', 'D', 'D']); eq(teamsOf(T, ms(T)[0]), 'AD', 'final A v D');
});
test('5 teams: league of 5 Bangarangs, each team plays 3, top 2 final', () => {
  const T = make(5); eq(ms(T).map(m => teamsOf(T, m)), ['ABC', 'BCD', 'CDE', 'DEA', 'EAB'], 'rotation');
  const c = {}; ms(T).forEach(m => m.teams.forEach(x => c[x] = (c[x] || 0) + 1)); ok(Object.values(c).every(v => v === 3), 'everyone plays 3');
  // A wins everything it plays, B second-best
  const games = ms(T); play(T, games[0], ['A', 'A', 'B']); play(T, games[1], ['B', 'B', 'C']); play(T, games[2], ['D', 'D', 'E']); play(T, games[3], ['A', 'A', 'D']); play(T, games[4], ['A', 'A', 'B']);
  eq(st(T).label, 'Grand Final', 'final'); eq(teamsOf(T, ms(T)[0]), 'AB', 'top 2: A and B');
});
test('7 teams: every pair meets exactly once', () => {
  const T = make(7); eq(ms(T).length, 7, '7 Bangarangs'); const seen = {};
  ms(T).forEach(m => { for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) { const k = [m.teams[i], m.teams[j]].sort().join(); seen[k] = (seen[k] || 0) + 1; } });
  eq(Object.keys(seen).length, 21, 'all 21 pairs'); ok(Object.values(seen).every(v => v === 1), 'each once');
});
test('6 teams: two groups, cross semis (1st v other 2nd)', () => {
  const T = make(6); eq(ms(T).map(m => teamsOf(T, m)), ['ABC', 'DEF'], 'groups');
  play(T, ms(T)[0], ['A', 'A', 'B']); play(T, ms(T)[1], ['D', 'E', 'D']);
  eq(st(T).label, 'Semi-finals', 'semis'); eq(ms(T).map(m => teamsOf(T, m)), ['AE', 'DB'], 'A v E, D v B');
});
test('8 teams: quarter-finals, semis, final', () => {
  const T = make(8); eq(st(T).label, 'Quarter-finals', 'QF'); eq(ms(T).length, 4, '4 QFs');
});
test('9 teams: 3 groups, winners Bangarang (top 2), final', () => {
  const T = make(9); eq(ms(T).map(m => teamsOf(T, m)), ['ABC', 'DEF', 'GHI'], 'groups');
  play(T, ms(T)[0], ['A', 'A', 'B']); play(T, ms(T)[1], ['E', 'E', 'D']); play(T, ms(T)[2], ['I', 'G', 'I']);
  eq(st(T).label, 'Winners’ Bangarang', 'winners'); eq(teamsOf(T, ms(T)[0]), 'AEI', 'A E I');
  play(T, ms(T)[0], ['E', 'I', 'E']); eq(teamsOf(T, ms(T)[0]), 'EI', 'final E v I');
});
test('10 teams: 5 duels then a league of the winners', () => {
  const T = make(10); eq(ms(T).length, 5, '5 duels'); ms(T).forEach(m => play(T, m, [nm(T, m.teams[0]), nm(T, m.teams[0]), nm(T, m.teams[1])]));
  eq(st(T).label, 'League', 'league'); eq(ms(T).map(m => teamsOf(T, m)), ['ACE', 'CEG', 'EGI', 'GIA', 'IAC'], 'rotation of winners');
});
test('11 teams: league of 11, each plays 3; 12 teams: 4 groups → semis', () => {
  const T = make(11); eq(ms(T).length, 11, '11 Bangarangs'); const c = {}; ms(T).forEach(m => m.teams.forEach(x => c[x] = (c[x] || 0) + 1)); ok(Object.values(c).every(v => v === 3), 'each plays 3');
  const U = make(12); eq(ms(U).length, 4, '4 groups'); ms(U).forEach(m => play(U, m, [nm(U, m.teams[1]), nm(U, m.teams[1]), nm(U, m.teams[0])]));
  eq(st(U).label, 'Semi-finals', 'semis'); eq(ms(U).map(m => teamsOf(U, m)), ['BE', 'HK'], 'group winners paired');
});
test('Match counts match the table', () => {
  eq([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(E.matchCount), [1, 2, 3, 6, 5, 8, 7, 5, 11, 12, 7], 'counts');
});
test('League tie on the cut: head-to-head, else a tie-break', () => {
  const T = make(5); const g = ms(T);
  play(T, g[0], ['A', 'A', 'B']);       // A6 B3
  play(T, g[1], ['B', 'D', 'C']); ok(!g[1].done, 'level 1–1–1 needs a decider for 1st'); play(T, g[1], ['B']); // B3 C3 D3
  play(T, g[2], ['D', 'E', 'E']);       // D3 E6
  play(T, g[3], ['A', 'A', 'D']);       // A6 D3
  play(T, g[4], ['E', 'B', 'A', 'A']);  // E3 B3 A3 (+decider A)
  // totals: A15, B9, D9, E9, C3 -> B, D, E level for the last place in the final
  ok(st(T).tb, 'tie-break opened'); const tb = T.matchups[st(T).tb]; eq(names(T, tb.teams).sort(), ['B', 'D', 'E'], 'B D E');
  play(T, tb, ['D']); eq(st(T).label, 'Grand Final', 'final'); eq(teamsOf(T, ms(T)[0]), 'AD', 'A v D');
});
test('Answers: wrong words, repeats, short, timeouts, no draws', () => {
  const T = make(2, { minLength: 4 }); const m = ms(T)[0];
  E.startBattle(T, m.id, dict, { s: 's', e: 't', tier: 'easy' });
  let a = E.submit(T, m.id, m.teams[0], 'sxqt', dict, { ms: 1000 }); eq([a.ok, a.reason], [false, 'unknown'], 'not a word');
  a = E.submit(T, m.id, m.teams[1], 'start', dict, { ms: 2000 }); ok(a.ok, 'valid'); eq(m.pts[m.teams[1]], 3, '3 points, no penalty for A');
  eq(m.pts[m.teams[0]], 0, 'no penalty points');
  E.startBattle(T, m.id, dict, L); eq(E.submit(T, m.id, m.teams[0], 'start', dict, { ms: 1 }).reason, 'repeat', 'repeat');
  eq(E.submit(T, m.id, m.teams[0], 'sat', dict, { ms: 1 }).reason, 'short', 'short');
  const before = m.battles[1].s + m.battles[1].e; E.timeout(T, m.id, dict, seeded(3)); ok(!m.battles[1].winner && m.battles[1].rolls.length === 1, 'timeout → new letters');
  ok(m.battles[1].s + m.battles[1].e !== before, 'different letters');
});
test('Spin: no answers until the letters stop', () => {
  const T = make(2, { spinSecs: 10 }); const m = ms(T)[0]; E.startBattle(T, m.id, dict, L);
  let t = null; try { E.submit(T, m.id, m.teams[0], 'street', dict); } catch (e) { t = e.code; } eq(t, 'spinning', 'blocked while spinning');
});
test('Override flips a result and rebuilds what follows', () => {
  const T = make(4); const [m1, m2] = ms(T);
  E.startBattle(T, m1.id, dict, L); E.submit(T, m1.id, m1.teams[0], 'street', dict, { ms: 1 });
  E.startBattle(T, m1.id, dict, L); E.submit(T, m1.id, m1.teams[1], 'stxt', dict, { ms: 1 }); E.submit(T, m1.id, m1.teams[0], 'sweet', dict, { ms: 2 });
  E.startBattle(T, m1.id, dict, L); E.submit(T, m1.id, m1.teams[1], 'stout', dict, { ms: 1 });
  eq(names(T, m1.rank), ['A', 'B'], 'A wins 2–1'); play(T, m2, ['C', 'C', 'C']); eq(st(T).label, 'Grand Final', 'final built');
  E.override(T, m1.id, 2, 0, true, 'accepted spelling'); eq(names(T, m1.rank), ['B', 'A'], 'now B wins 2–1'); eq(teamsOf(T, ms(T)[0]), 'BC', 'final rebuilt B v C');
  ok(T.audit.some(e => e.act === 'override' && e.note === 'accepted spelling'), 'logged');
  play(T, ms(T)[0], ['B']); let t = null; try { E.override(T, m1.id, 1, 0, false); } catch (e) { t = e.code; } eq(t, 'locked', 'locked after the final starts');
});
test('Points correction is logged and changes the table', () => {
  const T = make(5); const g = ms(T); play(T, g[0], ['A', 'A', 'B']);
  E.correct(T, g[0].id, 1, id(T, 'C'), 2, 'judge error'); eq(g[0].pts[id(T, 'C')], 2, 'C +2');
  const e = T.audit.filter(x => x.act === 'correction')[0]; ok(e && e.reason === 'judge error' && e.ptsAfter[id(T, 'C')] === 2, 'audit before/after');
  let t = null; try { E.correct(T, g[0].id, 1, id(T, 'C'), 1, ''); } catch (x) { t = x.code; } eq(t, 'reason', 'reason required');
});
test('Refresh: JSON round trip keeps going', () => {
  let T = make(6); play(T, ms(T)[0], ['A', 'B']); T = JSON.parse(JSON.stringify(T)); play(T, ms(T)[0], ['A']); ok(ms(T)[0].done, 'finished after reload');
});
test('Game points: 3 for a 1v1 win or a Bangarang 1st', () => {
  const T = make(3); play(T, ms(T)[0], ['A', 'B', 'A']); play(T, ms(T)[0], ['A', 'A', 'B']); const s = E.summary(T);
  eq([s[id(T, 'A')].game, s[id(T, 'B')].game, s[id(T, 'C')].game], [6, 0, 0], 'A 3 + 3, B and C 0');
});
test('Every team count 2–12 reaches a champion (random results)', () => {
  for (let n = 2; n <= 12; n++) for (let seed = 1; seed <= 30; seed++) {
    const rnd = seeded(seed * 31 + n), T = make(n); let guard = 0, played = 0;
    while (T.status !== 'done' && guard++ < 800) {
      const m = E.liveMatchup(T); if (!m) { ok(false, 'stuck n=' + n); break; }
      const b = E.startBattle(T, m.id, dict, null, rnd);
      if (rnd() < .15) E.timeout(T, m.id, dict, rnd);
      const w = b.part[Math.floor(rnd() * b.part.length)]; E.award(T, m.id, w, '', dict, { ms: 1000 }); played++;
    }
    if (T.status !== 'done') { ok(false, 'no champion n=' + n + ' seed=' + seed); continue; }
    const all = Object.values(T.matchups);
    ok(all.filter(m => m.kind !== 'tb').every(m => m.done && E.regular(m).length === 3), 'every matchup 3 battles n=' + n);
    const main = all.filter(m => m.kind !== 'tb').length; eq(main, E.matchCount(n), 'matches n=' + n);
    eq(T.stages[T.stages.length - 1].label, 'Grand Final', 'ends with the final n=' + n);
  }
});
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
