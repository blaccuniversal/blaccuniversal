// node tests/bemaamoo.test.js
var B = require('../assets/bemaamoo/bmo-engine.js');
var fs = require('fs'), path = require('path');
var pass = 0, fail = 0;
function eq(a, b, m) { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('FAIL', m, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); } }
function set(a) { return new Set(a); }

// triangular scale
eq([1, 2, 3, 4, 5, 6, 7, 8, 9].map(B.tri), [1, 3, 6, 10, 15, 21, 28, 36, 45], 'tri');
eq(B.norm(' Côte d’Ivoire '), 'COTEDIVOIRE', 'norm accents');
eq(B.norm('new york'), 'NEWYORK', 'norm spaces');

// concord formula
eq(B.concordPts(6, 4), 0, 'no concord under 5');
eq(B.concordPts(6, 5), 5, 'concord 6x5');
eq(B.concordPts(6, 6), 6, 'concord 6x6');
eq(B.concordPts(2, 9), 0, '2-letter words never concord');

// check()
var names = set(['ANNA', 'ARI', 'BEN', 'ADA', 'TOM', 'ELI', 'IDA', 'AMY', 'NED', 'ABE', 'ANN']);
var G = B.create({ players: [{ name: 'A' }, { name: 'B' }], category: 'names_english' });
eq(B.check(G, 'x', names).why, 'short', 'short');
eq(B.check(G, 'zzzz', names).why, 'unknown', 'unknown');
eq(B.check(G, 'anna', names).ok, true, 'ok');
B.add(G, 'anna', { mav: names });
eq(B.check(G, 'Anna', names).why, 'repeat', 'repeat');
eq(G.turn, 1, 'turn moves on');
eq(B.check(G, 'abcdefghijklmnopqrstu', null).why, 'long', 'too long');

// Maverick: column 2 reads A,D,A -> ADA
var G2 = B.create({ players: [{ name: 'Solo' }] });
var mav = set(['ADA', 'ARI', 'BEN']);
B.add(G2, 'MAX', { mav: mav });
B.add(G2, 'EDDY', { mav: mav });
var e = B.add(G2, 'SAM', { mav: mav });
eq(e.mavs.map(function (m) { return [m.w, m.col, m.from, m.to, m.pts]; }), [['ADA', 2, 0, 2, 6]], 'maverick ADA col 2');
eq(e.total, 6 + 6, 'SAM 6 base + 6 maverick');

// column 1 never counts
var G3 = B.create({ players: [{ name: 'S' }] });
['ADA', 'DOT', 'AMY'].forEach(function (w) { B.add(G3, w, { mav: set(['ADA']) }); });
eq(B.round(G3).entries[2].mavs.length, 0, 'first column is not read');

// a short row breaks the column
var G4 = B.create({ players: [{ name: 'S' }] });
['XA', 'Q', 'XD', 'XA'].forEach(function (w) { B.add(G4, w, { mav: set(['ADA']) }); });
eq(B.round(G4).entries[3].mavs.length, 0, 'gap breaks maverick');

// longer maverick and the shorter one inside it both count
var G5 = B.create({ players: [{ name: 'S' }] });
['XA', 'XN', 'XN', 'XA'].forEach(function (w) { B.add(G5, w, { mav: set(['ANNA', 'NNA']) }); });
eq(B.round(G5).entries[3].mavs.map(function (m) { return m.w; }).sort(), ['ANNA', 'NNA'], 'nested mavericks');

// Concord + Keystone
var G6 = B.create({ players: [{ name: 'S' }] });
var five = ['CATS', 'DOGS', 'OWLS', 'EELS', 'ANTS', 'BEES', 'YAKS'];
var mv = set(['AWN', 'WNT']);
var out = five.map(function (w) { return B.add(G6, w, { mav: set(['XXX']) }); });
eq(out.map(function (x) { return x.streak; }), [1, 2, 3, 4, 5, 6, 7], 'streak counts');
eq(out.map(function (x) { return x.con; }), [0, 0, 0, 0, 3, 4, 5], 'concord points per word');
eq(B.concords(B.round(G6)), [{ from: 0, to: 6, len: 4, streak: 7 }], 'concord run');
// keystone when the same word also sets off a maverick
var G7 = B.create({ players: [{ name: 'S' }] });
['XAXX', 'XDXX', 'XXXX', 'XXXX'].forEach(function (w) { B.add(G7, w, {}); });
var k = B.add(G7, 'XAXX', { mav: set(['ADXXA', 'XXA']) });
eq([k.streak, k.con > 0, k.mavs.length > 0, k.key], [5, true, true, 5], 'keystone');

// streak resets on a different length and on short words
var G8 = B.create({ players: [{ name: 'S' }] });
eq(['ABCD', 'ABCE', 'AB', 'ABCF', 'ABC', 'ABD'].map(function (w) { return B.add(G8, w, {}).streak; }), [1, 2, 0, 1, 1, 2], 'streak resets');

// undo gives the turn back
var G9 = B.create({ players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] });
B.add(G9, 'ONE', {}); B.add(G9, 'TWO', {});
eq(G9.turn, 2, 'turn 2');
B.undo(G9);
eq([G9.turn, B.round(G9).entries.length], [1, 1], 'undo');
B.skip(G9);
eq(G9.turn, 2, 'skip');

// word limit ends the round
var G10 = B.create({ players: [{ name: 'A' }], limit: 2 });
B.add(G10, 'ONE', {}); B.add(G10, 'TWO', {});
eq(B.round(G10).done, true, 'limit ends round');
eq(B.check(G10, 'six', null).why, 'done', 'no entries after round ends');

// tally and ranking with ties
var G11 = B.create({ players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] });
B.add(G11, 'ABC', {}); B.add(G11, 'DEF', {}); B.add(G11, 'GH', {});
var r = B.ranking(G11);
eq(r.map(function (s) { return [s.name, s.total, s.place]; }), [['A', 6, 1], ['B', 6, 1], ['C', 3, 3]], 'ranking ties');
B.endRound(G11); B.newRound(G11, 'animals');
eq([G11.rounds.length, B.round(G11).cat, G11.turn], [2, 'animals', 1], 'new round rotates starter');
B.add(G11, 'GNU', {});
eq(B.ranking(G11)[0].name, 'B', 'scores carry over');
eq(B.ranking(G11, B.round(G11))[0].total, 6, 'round-only ranking');

// word lists exist and are readable for every category
var dir = path.join(__dirname, '..', 'assets', 'bemaamoo', 'words');
B.CATS.forEach(function (g) {
  g.c.forEach(function (c) {
    var f = path.join(dir, B.listFile(c[0]));
    var ok = fs.existsSync(f) && fs.readFileSync(f, 'utf8').split('\n').length > 10;
    eq(ok, true, 'list ' + c[0]);
    if (B.hasMavList(c[0])) eq(fs.existsSync(path.join(dir, B.listFile(c[0], true))), true, 'mav list ' + c[0]);
  });
});
// spot checks
function has(k, w) { return fs.readFileSync(path.join(dir, k + '.txt'), 'utf8').split('\n').indexOf(w) >= 0; }
[['names_african', 'BEMSHIMA'], ['names_african', 'CHIAMAKA'], ['names_english', 'OLIVIA'], ['countries', 'NIGERIA'], ['cities', 'IBADAN'], ['capitals', 'ABUJA'],
 ['animals', 'ZEBRA'], ['foods', 'JOLLOF'], ['drinks', 'ZOBO'], ['rivers', 'NILE'], ['mountains', 'EVEREST'], ['elements', 'GOLD'], ['colours', 'TEAL'], ['genres', 'AMAPIANO'],
 ['fabrics', 'ANKARA'], ['clothing', 'AGBADA'], ['instruments', 'KORA'], ['currencies', 'NAIRA'], ['languages', 'YORUBA'], ['sports', 'FOOTBALL'], ['planets', 'MARS']
].forEach(function (p) { eq(has(p[0], p[1]), true, p[0] + ' has ' + p[1]); });

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
