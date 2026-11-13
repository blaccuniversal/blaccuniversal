/* Block Mayhem · levels. Grid 60 × 58 cells. Values: 0 empty, 1–3 block strength, 9 steel. */
(function () {
  'use strict';
  var COLS = 60, ROWS = 58;
  function g() { return new Uint8Array(COLS * ROWS); }
  function set(a, c, r, v) { if (c >= 0 && c < COLS && r >= 0 && r < ROWS) a[r * COLS + c] = v; }
  function rect(a, c0, r0, c1, r1, v) { for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) set(a, c, r, v); }
  function each(a, f) { for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var v = f(c, r); if (v != null) set(a, c, r, v); } }
  function d(c, r, cx, cy) { var x = c + .5 - cx, y = r + .5 - cy; return Math.sqrt(x * x + y * y); }
  function art(a, rows, c0, r0, s, map) {
    rows.forEach(function (line, y) { for (var x = 0; x < line.length; x++) { var v = map[line[x]]; if (v) rect(a, c0 + x * s, r0 + y * s, c0 + x * s + s - 1, r0 + y * s + s - 1, v); } });
  }

  var L = [
    { name: 'Warm Up', orbs: [{ t: 'x3', c: 18, r: 30 }, { t: 'x3', c: 42, r: 30 }, { t: 'p3', c: 30, r: 34 }, { t: 'star', c: 30, r: 9 }], build: function (a) { rect(a, 6, 14, 53, 26, 1); } },
    { name: 'Pyramid', orbs: { x3: 1, p3: 1, star: 1 }, build: function (a) { for (var i = 0; i < 26; i++) rect(a, 30 - i - 1, 8 + i, 30 + i, 8 + i, i > 18 ? 1 : i > 8 ? 1 : 2); } },
    { name: 'Pillars', orbs: { x3: 1, p3: 1, star: 1 }, build: function (a) {
      [3, 15, 27, 39, 51].forEach(function (c, i) { rect(a, c, 4, c + 5, 40, 1); if (i % 2 === 0) rect(a, c, 41, c + 5, 41, 9); });
    } },
    { name: 'Islands', orbs: { x3: 2, star: 1 }, build: function (a) {
      [[12, 10], [30, 10], [48, 10], [12, 27], [30, 27], [48, 27], [12, 44], [30, 44], [48, 44]].forEach(function (p, i) {
        if (i % 2 === 0) rect(a, p[0] - 4, p[1] - 4, p[0] + 3, p[1] + 3, 9);
        else each(a, function (c, r) { return d(c, r, p[0], p[1]) < 7.5 ? (d(c, r, p[0], p[1]) < 3 ? 2 : 1) : null; });
      });
    } },
    { name: 'Not So Fast', orbs: [{ t: 'x3', c: 30, r: 44 }, { t: 'star', c: 30, r: 10 }], build: function (a) {
      each(a, function (c, r) { var k = d(c, r, 30, 28); return k < 24.5 ? 1 : null; });
      each(a, function (c, r) { var k = d(c, r, 30, 28); return k >= 26 && k < 27.2 && !(r > 40 && c >= 27 && c <= 32) ? 9 : null; });
      each(a, function (c, r) { return r >= 45 && d(c, r, 30, 28) < 26 ? 0 : null; });
      rect(a, 23, 47, 36, 47, 9);
    } },
    { name: 'Invader', orbs: { x3: 1, p3: 1, star: 1 }, build: function (a) {
      art(a, ['..1.....1..', '...1...1...', '..1111111..', '.11.111.11.', '11111111111', '1.1111111.1', '1.1.....1.1', '...11.11...'], 2, 6, 5, { '1': 1 });
    } },
    { name: 'Diamond', orbs: { x3: 1, p3: 1, star: 1 }, build: function (a) {
      each(a, function (c, r) { var k = Math.abs(c + .5 - 30) + Math.abs(r + .5 - 26); return k < 24 ? (k < 8 ? 3 : k < 15 ? 2 : 1) : null; });
    } },
    { name: 'BLACC', orbs: { x3: 2, star: 1 }, build: function (a) {
      [[0, 0], [0, 1], [1, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2]].forEach(function (p) { rect(a, 3 + p[0] * 14, 6 + p[1] * 14, 3 + p[0] * 14 + 11, 6 + p[1] * 14 + 11, p[1] === 0 ? 2 : 1); });
    } },
    { name: 'Checkers', orbs: { x3: 1, p3: 2, star: 1 }, build: function (a) {
      each(a, function (c, r) { if (r < 4 || r > 45) return null; return ((Math.floor(c / 6) + Math.floor((r - 4) / 6)) % 2) ? 2 : 1; });
    } },
    { name: 'Heart', orbs: { x3: 1, p3: 1, star: 1 }, build: function (a) {
      each(a, function (c, r) { var x = (c + .5 - 30) / 22, y = -(r + .5 - 24) / 22, t = x * x + y * y - 1; return t * t * t - x * x * y * y * y <= 0 ? 1 : null; });
    } },
    { name: 'Waves', orbs: { x3: 2, star: 1 }, build: function (a) {
      each(a, function (c, r) { if (r < 3 || r > 48) return null; var m = ((r - 6 * Math.sin(c / 6)) % 10 + 10) % 10; return m < 5 ? (m < 1 ? 2 : 1) : null; });
    } },
    { name: 'Rings', orbs: { x3: 1, p3: 1, star: 2 }, build: function (a) {
      each(a, function (c, r) { var k = d(c, r, 30, 27); return k < 3 ? 3 : (k > 6 && k < 9) ? 2 : (k > 12 && k < 15) ? 1 : (k > 18 && k < 21) ? 2 : (k > 24 && k < 27) ? 1 : null; });
    } },
    { name: 'Dense', orbs: { x3: 2, p3: 2, star: 1 }, build: function (a) {
      rect(a, 0, 0, 59, 50, 1);
      [[12, 10, 5], [46, 9, 5], [18, 30, 6], [42, 32, 6], [10, 45, 4], [50, 46, 4]].forEach(function (p) { each(a, function (c, r) { return d(c, r, p[0], p[1]) < p[2] ? 0 : null; }); });
      rect(a, 29, 0, 30, 50, 9);
    } },
    { name: 'Fortress', orbs: [{ t: 'x3', c: 30, r: 22 }, { t: 'p3', c: 20, r: 30 }, { t: 'star', c: 40, r: 14 }], build: function (a) {
      rect(a, 14, 8, 45, 38, 2); rect(a, 20, 14, 39, 32, 3);
      rect(a, 11, 6, 12, 41, 9); rect(a, 47, 6, 48, 41, 9); rect(a, 11, 41, 48, 41, 9);
    } },
    { name: 'Hourglass', orbs: { x3: 2, star: 1 }, build: function (a) {
      each(a, function (c, r) { if (r < 2 || r > 50) return null; var hw = 4 + Math.abs(r - 26) * 1.0; return Math.abs(c + .5 - 30) < hw ? (Math.abs(r - 26) < 4 ? 3 : 1) : null; });
    } },
    { name: 'Not So Fast II', orbs: [{ t: 'x3', c: 30, r: 46 }, { t: 'x3', c: 30, r: 5 }, { t: 'star', c: 18, r: 20 }], build: function (a) {
      each(a, function (c, r) { var k = d(c, r, 30, 27); return k < 25.5 ? (k < 10 ? 3 : k < 17 ? 2 : 1) : null; });
      each(a, function (c, r) { var k = d(c, r, 30, 27); return k >= 27 && k < 28.2 && !(r > 40 && c >= 29 && c <= 30) ? 9 : null; });
      each(a, function (c, r) { return r >= 44 && d(c, r, 30, 27) < 27 ? 0 : null; });
      rect(a, 24, 46, 35, 46, 9);
    } },
    { name: 'Crossfire', orbs: { x3: 2, p3: 1, star: 1 }, build: function (a) {
      each(a, function (c, r) { if (r > 50) return null; var x = c - 30, y = r - 25; return (Math.abs(x - y) < 4 || Math.abs(x + y) < 4) ? 2 : (Math.abs(x) < 26 && Math.abs(y) < 24 && (Math.abs(x) + Math.abs(y)) % 9 < 2) ? 1 : null; });
      rect(a, 27, 22, 32, 27, 9);
    } },
    { name: 'Maze', orbs: { x3: 2, p3: 1, star: 1 }, build: function (a) {
      rect(a, 0, 0, 59, 47, 1);
      [11, 23, 35, 47].forEach(function (r, i) { rect(a, 0, r, 59, r, 9); if (i % 2) rect(a, 2, r, 9, r, 0); else rect(a, 50, r, 57, r, 0); });
    } },
    { name: 'Galaxy', orbs: { x3: 2, p3: 1, star: 2 }, build: function (a) {
      each(a, function (c, r) { var x = c + .5 - 30, y = r + .5 - 26, p = Math.sqrt(x * x + y * y); if (p > 26) return null; if (p < 4) return 3; var t = Math.atan2(y, x) + p / 5, m = ((t % (Math.PI * 2 / 3)) + Math.PI * 2) % (Math.PI * 2 / 3); return m < .9 ? (p < 12 ? 2 : 1) : null; });
    } },
    { name: 'Mayhem', orbs: { x3: 4, p3: 2, star: 2 }, build: function (a, rnd) {
      each(a, function (c, r) { if (r > 52) return null; var v = Math.sin(c / 4.5) + Math.sin(r / 3.6); return v > 1.35 ? 3 : v > .7 ? 2 : 1; });
      rect(a, 9, 18, 14, 19, 9); rect(a, 45, 18, 50, 19, 9); rect(a, 27, 34, 32, 35, 9);
    } }
  ];
  window.BMLevels = { COLS: COLS, ROWS: ROWS, list: L, make: function (i, rnd) { var a = g(); L[i].build(a, rnd); return a; } };
})();
