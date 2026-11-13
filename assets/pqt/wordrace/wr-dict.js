/* PQT · WORD RACE dictionary. Loads the word list once, answers has(word),
   and sorts every start/end letter pair into easy, medium or hard by how many words fit it. */
(function (root) {
  'use strict';
  var TIERS = { easy: 250, medium: 50, hard: 10 }; // at least this many words for the pair (hard: 10–49, medium: 50–249, easy: 250+)
  var A = 'abcdefghijklmnopqrstuvwxyz';
  function Dict(text) {
    var words = String(text).split(/\r?\n/), set = new Set();
    for (var i = 0; i < words.length; i++) { var w = words[i].trim(); if (w) set.add(w); }
    this.set = set; this.cache = {};
  }
  Dict.prototype.has = function (w) { return this.set.has(w); };
  Dict.prototype.counts = function (minLen) {
    if (this.cache[minLen]) return this.cache[minLen];
    var c = {};
    this.set.forEach(function (w) { if (w.length >= minLen) { var k = w[0] + w[w.length - 1]; c[k] = (c[k] || 0) + 1; } });
    return (this.cache[minLen] = c);
  };
  Dict.prototype.tierOf = function (s, e, minLen) { var n = this.counts(minLen || 3)[(s + e).toLowerCase()] || 0; return n >= TIERS.easy ? 'easy' : n >= TIERS.medium ? 'medium' : n >= TIERS.hard ? 'hard' : 'none'; };
  Dict.prototype.pairs = function (tier, minLen) { var c = this.counts(minLen || 3), out = []; for (var i = 0; i < 26; i++) for (var j = 0; j < 26; j++) { var k = A[i] + A[j]; if (this.tierOf(A[i], A[j], minLen) === tier) out.push(k); } return out; };
  Dict.prototype.pick = function (tier, minLen, used, rnd) {
    rnd = rnd || Math.random; used = used || {};
    var list = this.pairs(tier, minLen).filter(function (k) { return !used[k]; });
    if (!list.length) list = this.pairs(tier, minLen);
    if (!list.length) list = this.pairs('easy', minLen);
    var k = list[Math.floor(rnd() * list.length)];
    return { s: k[0], e: k[1], tier: this.tierOf(k[0], k[1], minLen) };
  };
  Dict.prototype.examples = function (s, e, minLen, n) { var out = []; this.set.forEach(function (w) { if (out.length < (n || 5) && w.length >= (minLen || 3) && w[0] === s && w[w.length - 1] === e) out.push(w); }); return out; };
  Dict.TIERS = TIERS;
  function load(url) { return fetch(url || '/assets/pqt/wordrace/words.txt').then(function (r) { if (!r.ok) throw new Error('words'); return r.text(); }).then(function (t) { return new Dict(t); }); }
  var API = { Dict: Dict, load: load, TIERS: TIERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.WRDict = API;
})(this);
