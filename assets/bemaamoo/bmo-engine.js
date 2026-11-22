/* Bemaamoo engine · BLACC Universal
   Pure game logic: no DOM. Works in the browser (window.BMO) and in Node (module.exports). */
(function (root) {
  'use strict';

  var MAX_LEN = 0;           // no letter limit: any correct word counts
  var MIN_LEN = 2;           // shortest entry
  var MAV_MIN = 3;           // shortest Maverick
  var MAV_FIRST_COL = 2;     // Mavericks are read from the 2nd letter column onwards
  var CON_MIN_LEN = 3;       // Concord words need 3+ letters
  var CON_STREAK = 3;        // Concord starts at 3 same-length words in a row
  var ACC_MIN_LEN = 3;       // Regen: a word with the same letters as the word above it (3+ letters)
  var CLAIM_BONUS = 3;       // ladder and lap: bonus on top of the word's score when someone claims a letter that was passed
  var KEYSTONE = 5;          // bonus when one word sets off a Maverick and a Concord

  var CATS = [
    { g: 'Words', c: [['words_en', 'Words (English)'], ['words_fr', 'Words (French)'], ['words_es', 'Words (Spanish)'], ['words_pt', 'Words (Portuguese)'], ['words_de', 'Words (German)'], ['words_it', 'Words (Italian)'], ['words_nl', 'Words (Dutch)'], ['words_sw', 'Words (Swahili)']] },
    { g: 'Names', c: [['names_all', 'Names (All)'], ['names_english', 'Names (English)'], ['names_african', 'Names (African)'], ['names_arabic', 'Names (Arabic)'], ['names_biblical', 'Names (Biblical)'], ['names_latin', 'Names (Latin)']] },
    { g: 'Places', c: [['countries', 'Countries'], ['capitals', 'Capitals'], ['cities', 'Cities'], ['rivers', 'Rivers'], ['mountains', 'Mountains'], ['oceans', 'Oceans & Seas'], ['islands', 'Islands'], ['deserts', 'Deserts'], ['continents', 'Continents']] },
    { g: 'Nature', c: [['animals', 'Animals'], ['birds', 'Birds'], ['fish', 'Fish & Sea Life'], ['insects', 'Insects'], ['reptiles', 'Reptiles'], ['trees', 'Trees'], ['flowers', 'Flowers'], ['fruits', 'Fruits'], ['vegetables', 'Vegetables'], ['gems', 'Gems & Minerals'], ['weather', 'Weather'], ['planets', 'Planets & Stars']] },
    { g: 'Food & Drink', c: [['foods', 'Foods'], ['drinks', 'Drinks'], ['cuisines', 'Cuisines'], ['spices', 'Spices & Herbs'], ['desserts', 'Desserts']] },
    { g: 'People & Culture', c: [['professions', 'Professions'], ['sports', 'Sports'], ['languages', 'Languages'], ['religions', 'Religions'], ['currencies', 'Currencies'], ['dances', 'Dances'], ['instruments', 'Instruments'], ['art_styles', 'Art Styles']] },
    { g: 'Science', c: [['elements', 'Elements'], ['diseases', 'Diseases'], ['anatomy', 'Anatomy'], ['chemicals', 'Chemicals'], ['physics', 'Physics Terms'], ['maths', 'Maths Terms']] },
    { g: 'Brands & Media', c: [['brands', 'Brands'], ['cars', 'Car Brands'], ['movies', 'Movie Genres'], ['genres', 'Music Genres'], ['sports_teams', 'Sports Teams']] },
    { g: 'Franchises & Fandoms', c: [['fr_marvel', 'Marvel Comics'], ['fr_dc', 'DC Comics'], ['fr_starwars', 'Star Wars'], ['fr_startrek', 'Star Trek'], ['fr_harrypotter', 'Harry Potter'], ['fr_lotr', 'Lord of the Rings'], ['fr_got', 'Game of Thrones'], ['fr_pokemon', 'Pokémon'], ['fr_disney', 'Disney & Pixar'], ['fr_dragonball', 'Dragon Ball'], ['fr_naruto', 'Naruto'], ['fr_doctorwho', 'Doctor Who'], ['fr_transformers', 'Transformers'], ['fr_nintendo', 'Mario & Zelda (Nintendo)'], ['fr_avatar', 'Avatar: The Last Airbender']] },
    { g: 'Objects', c: [['clothing', 'Clothing'], ['furniture', 'Furniture'], ['tools', 'Tools'], ['weapons', 'Weapons'], ['transport', 'Transport'], ['fabrics', 'Fabrics'], ['shapes', 'Shapes'], ['colours', 'Colours']] }
  ];
  var CAT_NAME = {};
  CATS.forEach(function (g) { g.c.forEach(function (c) { CAT_NAME[c[0]] = c[1]; }); });
  // Names and cities lists are big, so Mavericks use a shorter list of well-known ones.
  var MAV_LIST = { words_en: 1, words_fr: 1, words_es: 1, words_pt: 1, words_de: 1, words_it: 1, words_nl: 1, words_sw: 1, names_all: 1, names_english: 1, names_african: 1, names_arabic: 1, cities: 1 };

  function tri(n) { return n * (n + 1) / 2; }

  function norm(s) {
    s = String(s || '');
    if (s.normalize) s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    return s.toUpperCase().replace(/ß/g, 'SS').replace(/Æ/g, 'AE').replace(/Œ/g, 'OE').replace(/Ø/g, 'O').replace(/[^A-Z]/g, '');
  }

  function sorted(w) { return w.split('').sort().join(''); }
  function accordPts(w, prev) {
    if (!prev || w.length < ACC_MIN_LEN || prev.w === w || prev.w.length !== w.length) return 0;
    return sorted(prev.w) === sorted(w) ? w.length + 1 : 0;   // an anagram of the word above earns its length + 1 (3 letters = 4, 4 = 5, 5 = 6 ...)
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
        limit: opts.limit || 0,         // words per round, 0 = off
        alpha: +opts.alpha || 0,        // letter rule: 0 off, 1 sorted (each word after the one above), 2 ladder (next letter each word), 3 lap (everyone on a letter, then the next)
        fixed: !!opts.fixed,            // online rooms: every round starts with the room's creator
        shuffle: !!opts.shuffle         // online rooms: random first player and a fresh order each round
      }
    };
    newRound(G, opts.category || 'names_all');
    return G;
  }

  function round(G) { return G.rounds[G.rounds.length - 1]; }
  function nextTurn(G) {
    var R = round(G), n = G.players.length;
    var t = G.turn;
    for (var tries = 0; tries < n + 1; tries++) {
      if (R && R.order && R.order.length) { var k = R.order.indexOf(t); t = R.order[(k + 1) % R.order.length]; }
      else t = (t + 1) % n;
      if (!G.players[t] || !G.players[t].out) return t;
    }
    return t;
  }

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
    var R = round(G), n = G.players.length;
    R.order = null;
    // phone-and-pass games: the next round starts with the player after whoever started the last one.
    // Online rooms: the creator starts every round, or the order is shuffled when the creator chose that.
    G.turn = prev && !G.settings.fixed ? (G.rounds.length - 1) % n : 0;
    if (G.settings.fixed) {
      var act = []; for (var i = 0; i < n; i++) if (!G.players[i].out) act.push(i);
      if (!act.length) act = [0];
      if (G.settings.shuffle && act.length > 1) {
        for (var k = act.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)), t = act[k]; act[k] = act[j]; act[j] = t; }
        R.order = act;
      }
      G.turn = act[0];
    }
    return R;
  }

  function nextLetter(c) { return c === 'Z' ? 'A' : String.fromCharCode(c.charCodeAt(0) + 1); }
  // The letters played so far, in order. A passed turn ("no word") in ladder or lap play still uses up its letter.
  function letterSeq(R) {
    var e = R.entries, g = R.gaps || [], out = [], gi = 0;
    for (var i = 0; i <= e.length; i++) {
      while (gi < g.length && g[gi].a <= i) { if (g[gi].l) out.push(g[gi].l); gi++; }
      if (i < e.length) out.push(e[i].w.charAt(0));
    }
    return out;
  }
  // What the letter rule asks of the next word: { mode, after } for sorted play, { mode, letter } for ladder and lap (empty on the first word, which is free).
  function alphaHint(G) {
    var mode = (G.settings && G.settings.alpha) | 0, R = round(G), e = R.entries, h = { mode: mode, after: '', letter: '' };
    if (!mode) return h;
    if (mode === 1) { if (e.length) h.after = e[e.length - 1].w; return h; }
    var seq = letterSeq(R); if (!seq.length) return h;
    var c = seq[seq.length - 1];
    if (mode === 2) { h.letter = nextLetter(c); return h; }
    var n = 0; G.players.forEach(function (p) { if (!p.out) n++; });
    var run = 0; for (var i = seq.length - 1; i >= 0 && seq[i] === c; i--) run++;
    h.letter = run >= Math.max(1, n) ? nextLetter(c) : c;   // a lap: every player plays this letter, then the room moves on
    return h;
  }
  function check(G, raw, dict) {
    var w = norm(raw), R = round(G), repeated = false;
    if (!w) return { ok: false, why: 'empty', w: w };
    if (R.done) return { ok: false, why: 'done', w: w };
    if (w.length < MIN_LEN) return { ok: false, why: 'short', w: w };
    if (MAX_LEN && w.length > MAX_LEN) return { ok: false, why: 'long', w: w };
    for (var i = 0; i < R.entries.length; i++) if (R.entries[i].w === w) return { ok: false, why: 'repeat', w: w };
    (R.gaps || []).forEach(function (g) { if (g.claim && g.claim.w === w) repeated = true; });
    if (repeated) return { ok: false, why: 'repeat', w: w };
    var ah = alphaHint(G);
    if (ah.mode === 1 && ah.after && w < ah.after) return { ok: false, why: 'order', w: w };
    if ((ah.mode === 2 || ah.mode === 3) && ah.letter && w.charAt(0) !== ah.letter) return { ok: false, why: 'letter', w: w };
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
    var acc = accordPts(w, prev);
    var e = {
      w: w,
      p: G.turn,
      forced: !!opts.forced,          // not in the list, counted because the table allowed it
      base: tri(w.length),
      streak: streak,
      con: con,
      acc: acc,
      mavs: mavs,
      key: (mavs.length && con) ? KEYSTONE : 0
    };
    e.mav = mavs.reduce(function (s, m) { return s + m.pts; }, 0);
    e.total = e.base + e.mav + e.con + e.acc + e.key;
    R.entries.push(e);
    R.started = true;
    G.turn = nextTurn(G);
    if (G.settings.limit && R.entries.length >= G.settings.limit) R.done = true;
    else if (R.fin && balanced(G)) R.done = true;
    return e;
  }

  /* when the clock hits zero, the round runs on until every player has had the same number of turns */
  function balanced(G) {
    var R = round(G), cnt = {}, ids = [];
    G.players.forEach(function (p, i) { if (!p.out) { cnt[i] = 0; ids.push(i); } });
    if (ids.length < 2) return true;
    R.entries.forEach(function (e) { if (cnt[e.p] != null) cnt[e.p]++; });
    (R.gaps || []).forEach(function (g) { if (cnt[g.p] != null) cnt[g.p]++; });
    var first = cnt[ids[0]];
    return ids.every(function (i) { return cnt[i] === first; });
  }
  function timeUp(G) {
    var R = round(G); if (R.done) return true;
    R.fin = true;
    if (balanced(G)) R.done = true;
    return R.done;
  }

  function skip(G, quiet) {
    var R = round(G);
    if (R.done) return;
    if (!quiet) {
      R.skips = (R.skips || 0) + 1;
      var g = { a: R.entries.length, p: G.turn }, h = alphaHint(G);
      if (h.letter) g.l = h.letter;                       // ladder and lap: a pass is a "null" on this letter, worth 0, and play moves on
      (R.gaps = R.gaps || []).push(g);                    // a skipped turn shows as empty boxes
    }
    G.turn = nextTurn(G);
    if (R.fin && balanced(G)) R.done = true;
  }

  function undo(G) {
    var R = round(G);
    var gl = R.gaps && R.gaps[R.gaps.length - 1];
    if (gl && gl.a === R.entries.length) { R.gaps.pop(); G.turn = gl.p; R.done = false; return { w: '', p: gl.p, gap: true }; }
    var e = R.entries.pop();
    if (!e) return null;
    if (R.gaps) R.gaps = R.gaps.filter(function (g) { return g.a <= R.entries.length; });
    G.turn = e.p;
    R.done = false;
    return e;
  }

  /* ladder and lap: someone else says they do have a word for a letter that was passed. A valid word scores as normal plus a bonus. */
  function claim(G, gi, raw, pid, dict) {
    var R = round(G), g = (R.gaps || [])[gi], w = norm(raw);
    if (!g || !g.l || g.claim) return { ok: false, why: 'gone', w: w };
    if (R.done) return { ok: false, why: 'done', w: w };
    if (w.length < MIN_LEN) return { ok: false, why: 'short', w: w };
    if (w.charAt(0) !== g.l) return { ok: false, why: 'letter', w: w, letter: g.l };
    var n = 0; G.players.forEach(function (p) { if (!p.out) n++; });
    if (pid === g.p && n > 1) return { ok: false, why: 'self', w: w };
    var dup = R.entries.some(function (e) { return e.w === w; }) || R.gaps.some(function (x) { return x.claim && x.claim.w === w; });
    if (dup) return { ok: false, why: 'repeat', w: w };
    if (dict && !dict.has(w)) return { ok: false, why: 'unknown', w: w };
    g.claim = { w: w, p: pid, pts: tri(w.length) + CLAIM_BONUS };
    return { ok: true, w: w, pts: g.claim.pts };
  }

  function endRound(G) { round(G).done = true; }

  function tally(G, onlyRound) {
    var t = G.players.map(function (p) { return { id: p.id, name: p.name, base: 0, mav: 0, con: 0, acc: 0, key: 0, total: 0, words: 0, mavs: 0, cons: 0, keys: 0 }; });
    var rounds = onlyRound ? [onlyRound] : G.rounds;
    rounds.forEach(function (R) {
      (R.gaps || []).forEach(function (g) { var s = g.claim && t[g.claim.p]; if (!s) return; s.base += g.claim.pts; s.total += g.claim.pts; s.words++; s.claims = (s.claims || 0) + 1; });
      R.entries.forEach(function (e) {
        var s = t[e.p]; if (!s) return;
        s.base += e.base; s.mav += e.mav; s.con += e.con; s.acc += e.acc || 0; s.key += e.key; s.total += e.total; s.words++;
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
    CATS: CATS, tri: tri, norm: norm, concordPts: concordPts, accordPts: accordPts,
    create: create, newRound: newRound, round: round, check: check, alphaHint: alphaHint, add: add, skip: skip, claim: claim, undo: undo, endRound: endRound, timeUp: timeUp, balanced: balanced,
    tally: tally, ranking: ranking, concords: concords, live: live, findMavericks: findMavericks,
    catName: catName, listFile: listFile, hasMavList: hasMavList,
    RULES: { CLAIM_BONUS: CLAIM_BONUS, MAX_LEN: MAX_LEN, MIN_LEN: MIN_LEN, MAV_MIN: MAV_MIN, MAV_FIRST_COL: MAV_FIRST_COL, CON_MIN_LEN: CON_MIN_LEN, CON_STREAK: CON_STREAK, ACC_MIN_LEN: ACC_MIN_LEN, KEYSTONE: KEYSTONE }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BMO = api;
})(this);
