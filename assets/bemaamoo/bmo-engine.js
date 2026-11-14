/* Bemaamoo engine · BLACC Universal
   Pure game logic: no DOM. Works in the browser (window.BMO) and in Node (module.exports). */
(function (root) {
  'use strict';

  var MAX_LEN = 20;          // longest entry (letters)
  var MIN_LEN = 2;           // shortest entry
  var MAV_MIN = 3;           // shortest Maverick
  var MAV_FIRST_COL = 2;     // Mavericks are read from the 2nd letter column onwards
  var CON_MIN_LEN = 3;       // Concord words need 3+ letters
  var CON_STREAK = 5;        // Concord starts at 5 same-length words in a row
  var KEYSTONE = 5;          // bonus when one word sets off a Maverick and a Concord

  var CATS = [
    { g: 'Names', c: [['names_all', 'Names (All)'], ['names_english', 'Names (English)'], ['names_african', 'Names (African)'], ['names_arabic', 'Names (Arabic)'], ['names_biblical', 'Names (Biblical)'], ['names_latin', 'Names (Latin)']] },
    { g: 'Places', c: [['countries', 'Countries'], ['capitals', 'Capitals'], ['cities', 'Cities'], ['rivers', 'Rivers'], ['mountains', 'Mountains'], ['oceans', 'Oceans & Seas'], ['islands', 'Islands'], ['deserts', 'Deserts'], ['continents', 'Continents']] },
    { g: 'Nature', c: [['animals', 'Animals'], ['birds', 'Birds'], ['fish', 'Fish & Sea Life'], ['insects', 'Insects'], ['reptiles', 'Reptiles'], ['trees', 'Trees'], ['flowers', 'Flowers'], ['fruits', 'Fruits'], ['vegetables', 'Vegetables'], ['gems', 'Gems & Minerals'], ['weather', 'Weather'], ['planets', 'Planets & Stars']] },
    { g: 'Food & Drink', c: [['foods', 'Foods'], ['drinks', 'Drinks'], ['cuisines', 'Cuisines'], ['spices', 'Spices & Herbs'], ['desserts', 'Desserts']] },
    { g: 'People & Culture', c: [['professions', 'Professions'], ['sports', 'Sports'], ['languages', 'Languages'], ['religions', 'Religions'], ['currencies', 'Currencies'], ['dances', 'Dances'], ['instruments', 'Instruments'], ['art_styles', 'Art Styles']] },
    { g: 'Science', c: [['elements', 'Elements'], ['diseases', 'Diseases'], ['anatomy', 'Anatomy'], ['chemicals', 'Chemicals'], ['physics', 'Physics Terms'], ['maths', 'Maths Terms']] },
    { g: 'Brands & Media', c: [['brands', 'Brands'], ['cars', 'Car Brands'], ['movies', 'Movie Genres'], ['genres', 'Music Genres'], ['sports_teams', 'Sports Teams']] },
    { g: 'Objects', c: [['clothing', 'Clothing'], ['furniture', 'Furniture'], ['tools', 'Tools'], ['weapons', 'Weapons'], ['transport', 'Transport'], ['fabrics', 'Fabrics'], ['shapes', 'Shapes'], ['colours', 'Colours']] }
  ];
  var CAT_NAME = {};
  CATS.forEach(function (g) { g.c.forEach(function (c) { CAT_NAME[c[0]] = c[1]; }); });
  // Names and cities lists are big, so Mavericks use a shorter list of well-known ones.
  var MAV_LIST = { names_all: 1, names_english: 1, names_african: 1, names_arabic: 1, cities: 1 };

  function tri(n) { return n * (n + 1) / 2; }

  function norm(s) {
    s = String(s || '');
    if (s.normalize) s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    return s.toUpperCase().replace(/ß/g, 'SS').replace(/Æ/g, 'AE').replace(/Œ/g, 'OE').replace(/Ø/g, 'O').replace(/[^A-Z]/g, '');
  }

  function concordPts(len, streak) {
    if (len < CON_MIN_LEN || streak < CON_STREAK) return 0;
    return (len - 1) + (streak - CON_STREAK);
  }

  /* ---------- game ---------- */
  function create(opts) {
    opts = opts || {};
    var players = (opts.players && opts.players.length ? opts.players : [{ name: 'You' }]).map(function (p, i) {
      return { id: i, name: String(p.name || ('Player ' + (i + 1))).slice(0, 18) };
    });
    var G = {
      v: 1,
      id: Date.now().toString(36),
      players: players,
      rounds: [],
      turn: 0,
      settings: {
        timer: opts.timer || 0,         // seconds per round, 0 = off
        limit: opts.limit || 0          // words per round, 0 = off
      }
    };
    newRound(G, opts.category || 'names_all');
    return G;
  }

  function round(G) { return G.rounds[G.rounds.length - 1]; }

  function newRound(G, category) {
    var prev = round(G);
    G.rounds.push({
      n: G.rounds.length + 1,
      cat: category || (prev && prev.cat) || 'names_all',
      entries: [],
      done: false,
      left: G.settings.timer || 0,   // seconds left on the clock
      started: false
    });
    // the next round starts with the player after whoever started the last one
    G.turn = prev ? (G.rounds.length - 1) % G.players.length : 0;
    return round(G);
  }

  function check(G, raw, dict) {
    var w = norm(raw), R = round(G);
    if (!w) return { ok: false, why: 'empty', w: w };
    if (R.done) return { ok: false, why: 'done', w: w };
    if (w.length < MIN_LEN) return { ok: false, why: 'short', w: w };
    if (w.length > MAX_LEN) return { ok: false, why: 'long', w: w };
    for (var i = 0; i < R.entries.length; i++) if (R.entries[i].w === w) return { ok: false, why: 'repeat', w: w };
    if (dict && !dict.has(w)) return { ok: false, why: 'unknown', w: w };
    return { ok: true, w: w };
  }

  // Mavericks that end on the newest row: read straight down one column across consecutive rows.
  function findMavericks(words, mav) {
    var out = [], last = words.length - 1, seen = {};
    if (last < MAV_MIN - 1 || !mav) return out;
    var bottom = words[last];
    for (var col = MAV_FIRST_COL; col <= bottom.length; col++) {
      var letters = '';
      for (var r = last; r >= 0; r--) {
        if (words[r].length < col) break;
        letters = words[r][col - 1] + letters;
        if (letters.length >= MAV_MIN && mav.has(letters)) {
          var k = col + ':' + letters;
          if (!seen[k]) { seen[k] = 1; out.push({ w: letters, col: col, from: r, to: last, pts: tri(letters.length) }); }
        }
      }
    }
    return out;
  }

  function add(G, raw, opts) {
    opts = opts || {};
    var R = round(G), w = norm(raw);
    var prev = R.entries[R.entries.length - 1];
    var streak = 0;
    if (w.length >= CON_MIN_LEN) streak = (prev && prev.w.length === w.length && prev.streak) ? prev.streak + 1 : 1;
    var words = R.entries.map(function (e) { return e.w; }).concat([w]);
    var mavs = findMavericks(words, opts.mav);
    var con = concordPts(w.length, streak);
    var e = {
      w: w,
      p: G.turn,
      forced: !!opts.forced,          // not in the list, counted because the table allowed it
      base: tri(w.length),
      streak: streak,
      con: con,
      mavs: mavs,
      key: (mavs.length && con) ? KEYSTONE : 0
    };
    e.mav = mavs.reduce(function (s, m) { return s + m.pts; }, 0);
    e.total = e.base + e.mav + e.con + e.key;
    R.entries.push(e);
    R.started = true;
    G.turn = (G.turn + 1) % G.players.length;
    if (G.settings.limit && R.entries.length >= G.settings.limit) R.done = true;
    return e;
  }

  function skip(G) {
    var R = round(G);
    if (R.done) return;
    R.skips = (R.skips || 0) + 1;
    G.turn = (G.turn + 1) % G.players.length;
  }

  function undo(G) {
    var R = round(G);
    var e = R.entries.pop();
    if (!e) return null;
    G.turn = e.p;
    R.done = false;
    return e;
  }

  function endRound(G) { round(G).done = true; }

  function tally(G, onlyRound) {
    var t = G.players.map(function (p) { return { id: p.id, name: p.name, base: 0, mav: 0, con: 0, key: 0, total: 0, words: 0, mavs: 0, cons: 0, keys: 0 }; });
    var rounds = onlyRound ? [onlyRound] : G.rounds;
    rounds.forEach(function (R) {
      R.entries.forEach(function (e) {
        var s = t[e.p]; if (!s) return;
        s.base += e.base; s.mav += e.mav; s.con += e.con; s.key += e.key; s.total += e.total; s.words++;
        s.mavs += e.mavs.length; if (e.con) s.cons++; if (e.key) s.keys++;
      });
    });
    return t;
  }

  function ranking(G, onlyRound) {
    var t = tally(G, onlyRound).slice().sort(function (a, b) { return b.total - a.total || a.id - b.id; });
    var place = 0, last = null;
    t.forEach(function (s, i) { if (s.total !== last) { place = i + 1; last = s.total; } s.place = place; });
    return t;
  }

  // Concord runs on the board (for drawing): [{from,to,len,streak}]
  function concords(R) {
    var out = [], cur = null;
    R.entries.forEach(function (e, i) {
      if (e.streak >= CON_STREAK) {
        if (cur && cur.to === i - 1 && cur.len === e.w.length) { cur.to = i; cur.streak = e.streak; }
        else { cur = { from: i - e.streak + 1, to: i, len: e.w.length, streak: e.streak }; out.push(cur); }
      }
    });
    return out;
  }

  // Live streak at the bottom of the board
  function live(R) {
    var e = R.entries[R.entries.length - 1];
    if (!e || !e.streak) return { len: 0, streak: 0 };
    return { len: e.w.length, streak: e.streak };
  }

  function catName(k) { return CAT_NAME[k] || k; }
  function listFile(k, forMav) { return k + (forMav && MAV_LIST[k] ? '.mav' : '') + '.txt'; }
  function hasMavList(k) { return !!MAV_LIST[k]; }

  var api = {
    CATS: CATS, tri: tri, norm: norm, concordPts: concordPts,
    create: create, newRound: newRound, round: round, check: check, add: add, skip: skip, undo: undo, endRound: endRound,
    tally: tally, ranking: ranking, concords: concords, live: live, findMavericks: findMavericks,
    catName: catName, listFile: listFile, hasMavList: hasMavList,
    RULES: { MAX_LEN: MAX_LEN, MIN_LEN: MIN_LEN, MAV_MIN: MAV_MIN, MAV_FIRST_COL: MAV_FIRST_COL, CON_MIN_LEN: CON_MIN_LEN, CON_STREAK: CON_STREAK, KEYSTONE: KEYSTONE }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BMO = api;
})(this);
