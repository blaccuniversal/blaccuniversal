/* PQT · WORD RACE host console.
   This device holds the tournament. Every action goes through WREngine, is saved straight away
   (so a refresh or a crash loses nothing) and is sent to the screen and team phones. */
(function () {
  'use strict';
  var E = window.WREngine, V = window.WRView, esc = V.esc;
  var app = document.querySelector('[data-app]'), toastEl = document.querySelector('[data-toast]'), netEl = document.querySelector('[data-net]');
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwlYm7KzVBhDFraAMpyDYUcqV1EhbY1HUNlimdzXe9yyUNtZS169ok9eeKW73Kv7gFO7g/exec';
  var T = null, dict = null, dictErr = false, link = null, tab = 'play', scene = 'battle', evs = [], evId = Date.now(), auditSeen = 0;
  var pend = [], seenN = {}, lastAns = {}, fb = {}, joined = {}, armed = null, timeUp = false, pubBusy = false;
  var curMid = null, wordDraft = '';

  /* ---------- storage ---------- */
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function index() { return ls('wr_index') || []; }
  function save() {
    if (!T) return;
    T.updated = Date.now();
    ls('wr_t_' + T.id, T);
    var ix = index().filter(function (x) { return x.id !== T.id; });
    ix.unshift({ id: T.id, name: T.name, created: T.created, status: T.status, champion: T.champion ? E.tname(T, T.champion) : null, teams: T.teams.length });
    ls('wr_index', ix.slice(0, 40)); ls('wr_cur', T.id);
  }
  function load(id) { var t = ls('wr_t_' + id); if (t) { T = t; auditSeen = T.audit.length; curMid = null; ls('wr_cur', id); startLink(); } }

  /* ---------- toast ---------- */
  var tt; function toast(msg, bad) { toastEl.textContent = msg; toastEl.hidden = false; toastEl.classList.toggle('is-bad', !!bad); clearTimeout(tt); tt = setTimeout(function () { toastEl.hidden = true; }, 2600); }

  /* ---------- engine actions ---------- */
  function act(fn, msg) {
    try { var r = fn(); save(); events(); broadcast(); render(); if (msg) toast(msg); maybeAutoPublish(); return r; }
    catch (e) { if (e && e.code) toast(e.message, true); else { toast('Something went wrong. Nothing was changed.', true); console.error(e); } save(); render(); return null; }
  }

  /* ---------- screen events from the audit log ---------- */
  function events() {
    if (!T) return;
    for (; auditSeen < T.audit.length; auditSeen++) {
      var a = T.audit[auditSeen], k = null, d = {};
      if (a.act === 'battle-start') { k = 'letters'; d = { s: a.s, e: a.e, n: a.battle }; timeUp = false; }
      else if (a.act === 'timeout') { k = 'reroll'; d = { next: a.next }; timeUp = false; }
      else if (a.act === 'answer') { k = a.ok ? 'correct' : 'wrong'; d = { team: E.tname(T, a.team), word: a.word, reason: a.reason, pts: a.pts }; fb[a.team] = { n: lastAns[a.team] || 0, ok: a.ok, reason: a.reason, word: a.word }; }
      else if (a.act === 'matchup-won') { k = 'matchup'; d = { team: E.tname(T, a.team), score: a.score }; }
      else if (a.act === 'revival-open') { k = 'revival'; d = { pairs: a.pairs.map(function (p) { return p.map(function (x) { return E.tname(T, x); }); }), tied: !!a.twoStage, best: a.bestLoser ? E.tname(T, a.bestLoser) : null }; }
      else if (a.act === 'revival-qualified') { k = 'revived'; d = { team: E.tname(T, a.team) }; }
      else if (a.act === 'round-open') { k = 'round'; d = { label: a.label }; }
      else if (a.act === 'champion') { k = 'champion'; d = { team: E.tname(T, a.team) }; scene = 'battle'; }
      if (k) push(k, d);
    }
  }

  function push(k, d) { evs.push({ id: ++evId, k: k, d: d, at: Date.now() }); if (evs.length > 12) evs.shift(); }

  /* ---------- link to screen and phones ---------- */
  function startLink() {
    if (link) { try { link.end(); } catch (e) {} link = null; }
    if (!T) return;
    if (!T.room) { T.room = WRLink.code(); save(); }
    link = WRLink.host(T.room, onIn, function (on) { netEl.textContent = on ? 'Live · ' + T.room : 'Connecting…'; netEl.classList.toggle('is-on', on); });
    broadcast();
  }
  function curMatchup() {
    if (!T) return null;
    var open = E.openMatchups(T);
    if (curMid && T.matchups[curMid] && open.indexOf(T.matchups[curMid]) > -1) return T.matchups[curMid];
    var running = open.filter(function (m) { return E.curBattle(m); })[0];
    var m = running || open.filter(function (m) { return m.battles.length; })[0] || open[0] || null;
    curMid = m ? m.id : null; return m;
  }
  function lastFinished() { var best = null; Object.keys(T.matchups).forEach(function (id) { var m = T.matchups[id]; if (m.done) { var t = m.battles.length ? m.battles[m.battles.length - 1].endedAt || 0 : 0; if (!best || t > best.t) best = { m: m, t: t }; } }); return best && best.m; }
  function left(b) { if (!b) return 0; if (T.paused && T.pausedLeft != null) return T.pausedLeft; return Math.max(0, b.secs * 1000 - (Date.now() - (b.rollAt || b.startedAt))); }
  function sideView(m, k) { var t = E.team(T, m[k]), i = T.teams.indexOf(t); return { id: t.id, name: t.name, c: V.color(i), wins: m.wins[k], pts: m.pts[k] }; }
  function broadcast() {
    if (!link || !T) return;
    var m = curMatchup(), b = m ? E.curBattle(m) : null, done = lastFinished(), r = E.lastRound(T);
    var lastB = m && m.battles.length ? m.battles[m.battles.length - 1] : null;
    var lastA = lastB && lastB.attempts.length ? lastB.attempts[lastB.attempts.length - 1] : null;
    var st = {
      at: Date.now(), code: T.room, name: T.name, status: T.status, paused: !!T.paused, scene: scene, mode: T.config.answerMode,
      round: r ? r.label : '', evs: evs,
      m: m ? { id: m.id, label: m.label, a: sideView(m, 'a'), b: sideView(m, 'b'), n: m.battles.length } : null,
      battle: lastB ? { n: lastB.n, s: lastB.s, e: lastB.e, tier: lastB.tier, running: !!b, left: left(b), secs: lastB.secs, winner: lastB.winner ? E.tname(T, lastB.winner) : null,
        last: lastA ? { team: E.tname(T, lastA.team), word: lastA.word, ok: lastA.ok, reason: lastA.reason } : null } : null,
      prev: done ? { a: E.tname(T, done.a), b: E.tname(T, done.b), wa: done.wins.a, wb: done.wins.b, w: E.tname(T, done.winner), label: done.label } : null,
      next: E.openMatchups(T).filter(function (x) { return !m || x.id !== m.id; }).slice(0, 3).map(function (x) { return (x.label ? x.label + ': ' : '') + E.tname(T, x.a) + ' v ' + E.tname(T, x.b); }),
      bracket: V.model(T), standings: standings(),
      champion: T.champion ? E.tname(T, T.champion) : null,
      teams: T.teams.map(function (t, i) { return { id: t.id, name: t.name, c: V.color(i) }; }), joined: joined, fb: fb,
      decision: T.decision ? T.decision.type : null
    };
    link.publish(st);
  }
  function standings() { var s = E.summary(T); return T.teams.map(function (t, i) { var x = s[t.id]; return { name: t.name, c: V.color(i), won: x.won, pts: x.pts, status: x.status, revival: x.revival }; }); }

  /* Messages from team phones. They can only join and answer; the host engine decides everything. */
  function onIn(msg) {
    if (!T || !msg || typeof msg !== 'object') return;
    if (msg.n && seenN[msg.n]) return; if (msg.n) seenN[msg.n] = 1;
    var pins = T.pins || {};
    if (msg.t === 'join') {
      var ok = pins[msg.team] && String(msg.pin) === pins[msg.team];
      fb['j_' + msg.dev] = { ok: !!ok, team: msg.team, n: msg.n };
      if (ok) joined[msg.team] = (joined[msg.team] || 0) + 1;
      broadcast(); render(); return;
    }
    if (msg.t !== 'ans' || T.config.answerMode !== 'phones') return;
    if (!pins[msg.team] || String(msg.pin) !== pins[msg.team]) return;
    var m = curMatchup(); if (!m || (m.a !== msg.team && m.b !== msg.team)) return;
    var b = E.curBattle(m); if (!b || T.paused || T.status !== 'live') return;
    var nowT = Date.now(); if (lastAns['t_' + msg.team] && nowT - lastAns['t_' + msg.team] < 1200) return; // one answer per 1.2s per team
    lastAns['t_' + msg.team] = nowT; lastAns[msg.team] = msg.n;
    var word = String(msg.word || '').slice(0, 40), ms = nowT - (b.rollAt || b.startedAt);
    if (!T.config.autoValidate || !dict) { pend.push({ team: msg.team, word: word, ms: ms, mid: m.id, bn: b.n, n: msg.n }); render(); toast(E.tname(T, msg.team) + ' answered: ' + word); return; }
    act(function () { E.submit(T, m.id, msg.team, word, dict, { ms: ms }); });
  }

  /* ---------- auto publish to the Sheet (round ends, champion) ---------- */
  var pubTimer = null;
  function maybeAutoPublish() { if (!T || T.status === 'setup' || !ls('wr_pubkey')) return; clearTimeout(pubTimer); pubTimer = setTimeout(function () { publish(true); }, 4000); }
  function publish(quiet) {
    var key = ls('wr_pubkey'); if (!key) { if (!quiet) toast('Add your publish key first (Log tab).', true); return; }
    if (pubBusy) return; pubBusy = true;
    var since = T.pubAudit || 0, body = { action: 'wr-save', key: key, t: Object.assign({}, T, { audit: [], pins: undefined, room: undefined }), audit: T.audit.slice(since), from: since };
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (j) { pubBusy = false; if (j && j.ok) { T.pubAudit = since + body.audit.length; T.published = Date.now(); save(); if (!quiet) toast('Published.'); render(); } else { if (!quiet || (j && j.error === 'key')) toast(j && j.error === 'key' ? 'The publish key was not accepted.' : 'Could not publish. Try again.', true); } })
      .catch(function () { pubBusy = false; if (!quiet) toast('Could not reach the results sheet. Results are safe on this device.', true); });
  }

  /* ---------- rendering ---------- */
  function fmt(ms) { return String(Math.ceil(ms / 1000)); }
  function tLink(id) { var t = E.team(T, id), i = T.teams.indexOf(t); return V.badge({ name: t.name, c: V.color(i) }); }
  function render() {
    var ae = document.activeElement, keep = ae && ae.hasAttribute && ae.hasAttribute('data-word');
    if (!T) return renderHome();
    if (T.status === 'setup') return renderSetup();
    renderLive();
    if (keep) { var w = app.querySelector('[data-word]'); if (w) w.focus(); }
  }
  function renderHome() {
    var ix = index();
    app.innerHTML =
      '<section class="card hc-sec"><h2>New tournament</h2>' +
      '<input class="hc-input" data-nname maxlength="60" placeholder="Tournament name" value="Word Race · ' + esc(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) + '">' +
      '<p class="wr-k">How do teams answer?</p><div class="wr-seg" data-nmode><button class="pbtn is-on" data-v="voice" type="button">Out loud</button><button class="pbtn" data-v="phones" type="button">On team phones</button></div>' +
      '<p class="hc-note">Out loud: the host awards the battle to the team that said a correct word first. Team phones: each team joins with the room code and a team PIN.</p>' +
      '<button class="pbtn pbtn--white pbtn--lg pbtn--block wr-mt" data-new type="button">Create tournament</button></section>' +
      (ix.length ? '<section class="card hc-sec"><h2>On this device</h2>' + ix.map(function (x) {
        return '<div class="wr-li"><div><b>' + esc(x.name) + '</b><span>' + new Date(x.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + x.teams + ' teams · ' + (x.status === 'done' ? 'Champion: ' + esc(x.champion || '') : x.status === 'setup' ? 'Not started' : 'In progress') + '</span></div>' +
          '<button class="pbtn pbtn--sm" data-open="' + x.id + '" type="button">Open</button><button class="pbtn pbtn--sm pbtn--ghost" data-del="' + x.id + '" type="button" aria-label="Remove">×</button></div>';
      }).join('') + '</section>' : '') + pubCard();
  }
  function pubCard() {
    var k = ls('wr_pubkey');
    return '<section class="card hc-sec"><h2>Publishing</h2><p class="hc-note" style="margin-top:0">Results go to the PQT results sheet so anyone can see them on the Word Race page. ' + (k ? 'This device has a publish key.' : 'Add the publish key once on this device.') + '</p>' +
      '<div class="hc-row wr-mt"><input class="hc-input hc-grow" data-pkey type="password" autocomplete="off" placeholder="' + (k ? '••••••••' : 'Publish key') + '" style="flex:1">' + '<button class="pbtn" data-pkeysave type="button">' + (k ? 'Change' : 'Save') + '</button>' + (k ? '<button class="pbtn pbtn--ghost" data-pkeyclear type="button">Remove</button>' : '') + '</div></section>';
  }
  function cfgForm() {
    var c = T.config;
    function num(k, label, min, max, suf) { return '<label class="wr-f"><span>' + label + '</span><span class="wr-f__in"><input class="hc-input" type="number" inputmode="numeric" data-cfg="' + k + '" min="' + min + '" max="' + max + '" value="' + c[k] + '">' + (suf ? '<em>' + suf + '</em>' : '') + '</span></label>'; }
    function tb(k, label) { return '<label class="wr-f"><span>' + label + '</span><span class="wr-f__in"><input class="hc-input" type="number" inputmode="numeric" data-tb="' + k + '" min="0" max="50" value="' + c.tierBonus[k] + '"><em>pts</em></span></label>'; }
    function seg(k, opts) { return '<div class="wr-seg wr-seg--' + opts.length + '" data-cfgseg="' + k + '">' + opts.map(function (o) { return '<button class="pbtn' + (String(c[k]) === String(o[0]) ? ' is-on' : '') + '" data-v="' + o[0] + '" type="button">' + o[1] + '</button>'; }).join('') + '</div>'; }
    return '<div class="wr-cfg">' +
      num('battleSecs', 'Battle countdown', 5, 300, 'sec') + num('minLength', 'Minimum word length', 2, 10, 'letters') +
      num('validPoints', 'Correct word', 0, 100, 'pts') + num('invalidPenalty', 'Wrong word penalty', 0, 50, 'pts') +
      num('speedBonus', 'Speed bonus', 0, 50, 'pts') + num('speedSecs', 'Speed window', 1, 120, 'sec') +
      tb('easy', 'Bonus · easy letters') + tb('medium', 'Bonus · medium letters') + tb('hard', 'Bonus · hard letters') + '</div>' +
      '<p class="wr-k">Letter difficulty</p>' + seg('difficulty', [['mixed', 'Mixed'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]) +
      '<p class="wr-k">Answers</p>' + seg('answerMode', [['voice', 'Out loud'], ['phones', 'Team phones']]) +
      '<p class="wr-k">Checking words</p>' + seg('autoValidate', [['true', 'Dictionary + host'], ['false', 'Host only']]) +
      '<p class="wr-k">Repeated words</p>' + seg('noRepeats', [['true', 'Once per tournament'], ['false', 'Allowed']]) +
      '<button class="pbtn pbtn--block wr-mt" data-cfgsave type="button">Save settings</button><p class="hc-note">Changes apply from the next battle. Proper nouns are not in the dictionary; the host can still accept one.</p>';
  }
  function renderSetup() {
    var p = E.preview(T);
    app.innerHTML =
      '<section class="card hc-sec"><h2>Tournament<button class="pbtn pbtn--sm pbtn--ghost" data-close type="button">Close</button></h2><input class="hc-input" data-rename maxlength="60" value="' + esc(T.name) + '"></section>' +
      '<section class="card hc-sec"><h2>Teams <span class="wr-count">' + T.teams.length + ' / 12</span></h2>' +
      '<form class="hc-row" data-addteam><input class="hc-input hc-grow" data-tname maxlength="40" placeholder="Team name" style="flex:1" autocomplete="off"><button class="pbtn pbtn--white" type="submit">Add</button></form>' +
      '<div class="wr-teams">' + T.teams.map(function (t, i) { return '<div class="wr-team">' + tLink(t.id) + '<b>' + esc(t.name) + '</b><button class="pbtn pbtn--sm pbtn--ghost" data-mv="' + t.id + '" data-d="-1" type="button" aria-label="Move up"' + (i ? '' : ' disabled') + '>↑</button><button class="pbtn pbtn--sm pbtn--ghost" data-mv="' + t.id + '" data-d="1" type="button" aria-label="Move down"' + (i < T.teams.length - 1 ? '' : ' disabled') + '>↓</button><button class="pbtn pbtn--sm pbtn--ghost" data-rm="' + t.id + '" type="button" aria-label="Remove">×</button></div>'; }).join('') + '</div>' +
      (T.teams.length > 2 ? '<button class="pbtn pbtn--sm wr-mt" data-shuffle type="button">Shuffle the draw</button>' : '') + '</section>' +
      (T.teams.length >= 2 ? '<section class="card hc-sec"><h2>First round</h2>' + p.pairs.map(function (x) { return '<div class="wr-pair">' + tLink(x[0]) + '<b>' + esc(E.tname(T, x[0])) + '</b><span>v</span><b>' + esc(E.tname(T, x[1])) + '</b>' + tLink(x[1]) + '</div>'; }).join('') +
        (p.unmatched ? '<div class="wr-pair wr-pair--solo">' + tLink(p.unmatched) + '<b>' + esc(E.tname(T, p.unmatched)) + '</b><span>unmatched · plays the Best Loser</span></div>' : '') + '<p class="hc-note">Teams are paired in the order above. Use the arrows or shuffle to change the draw.</p></section>' : '') +
      '<details class="card hc-sec wr-det"><summary><h2>Scoring &amp; rules</h2></summary>' + cfgForm() + '</details>' +
      '<button class="pbtn pbtn--o pbtn--lg pbtn--block" data-start type="button"' + (T.teams.length < 2 || !dict ? ' disabled' : '') + '>' + (dict ? 'Start tournament' : dictErr ? 'Dictionary failed to load' : 'Loading dictionary…') + '</button>';
    var inp = app.querySelector('[data-tname]'); if (inp && document.activeElement === document.body) inp.focus();
  }
  function screenCard() {
    return '<section class="card hc-sec"><h2>Big screen<span class="wr-code">' + esc(T.room || '') + '</span></h2>' +
      '<div class="wr-seg wr-seg--3" data-scene>' + [['battle', 'Battle'], ['bracket', 'Bracket'], ['standings', 'Standings']].map(function (o) { return '<button class="pbtn' + (scene === o[0] ? ' is-on' : '') + '" data-v="' + o[0] + '" type="button">' + o[1] + '</button>'; }).join('') + '</div>' +
      '<p class="hc-note">On the TV open <b>blaccuniversal.com/pqt/wordrace/screen</b> and type <b>' + esc(T.room) + '</b>. ' + (T.config.answerMode === 'phones' ? 'Teams join at <b>blaccuniversal.com/pqt/wordrace/join</b>.' : '') + '</p>' +
      '<div class="hc-row wr-mt"><button class="pbtn pbtn--sm" data-opensc type="button">Open screen here</button><button class="pbtn pbtn--sm pbtn--ghost" data-newroom type="button">New code</button></div></section>';
  }
  function renderLive() {
    var tabs = [['play', 'Play'], ['bracket', 'Bracket'], ['log', 'Log'], ['settings', 'Settings']];
    var h = '<div class="hc-now card wr-now"><span class="hc-now__txt"><b>' + esc(T.name) + '</b><span>' + esc(E.lastRound(T) ? E.lastRound(T).label : '') + (T.paused ? ' · Paused' : '') + (T.status === 'done' ? ' · Finished' : '') + '</span></span>' +
      (T.status !== 'done' ? '<button class="pbtn pbtn--sm" data-pause type="button">' + (T.paused ? 'Resume' : 'Pause') + '</button>' : '') + '<button class="pbtn pbtn--sm pbtn--ghost" data-close type="button">Close</button></div>' +
      '<div class="hc-tabs" role="tablist">' + tabs.map(function (x) { return '<button class="hc-tab' + (tab === x[0] ? ' is-on' : '') + '" data-tab="' + x[0] + '" type="button">' + x[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'play') h += playPane() + screenCard();
    else if (tab === 'bracket') h += '<section class="card hc-sec"><h2>Bracket</h2>' + V.bracket(V.model(T)) + '</section>';
    else if (tab === 'log') h += logPane();
    else h += '<section class="card hc-sec"><h2>Scoring &amp; rules</h2>' + cfgForm() + '</section>' + pubCard();
    app.innerHTML = h;
    var wi = app.querySelector('[data-word]'); if (wi) { wi.value = wordDraft; checkDraft(); }
  }
  function playPane() {
    if (T.status === 'done') {
      return '<section class="card hc-sec wr-champcard"><p class="eyebrow">Champion</p><div class="wr-champ">' + tLink(T.champion) + '<b>' + esc(E.tname(T, T.champion)) + '</b></div>' +
        '<div class="hc-row wr-mt"><button class="pbtn pbtn--white" data-publish type="button">' + (T.published ? 'Publish again' : 'Publish results') + '</button><button class="pbtn" data-newt type="button">New tournament</button></div>' +
        (T.published ? '<p class="hc-note">Published ' + new Date(T.published).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '.</p>' : '') + '</section>';
    }
    if (T.decision) return decisionPane();
    var m = curMatchup(); if (!m) return '<section class="card hc-sec"><p class="hc-note">Waiting…</p></section>';
    var b = E.curBattle(m), open = E.openMatchups(T), A = E.tname(T, m.a), B = E.tname(T, m.b);
    var h = '<section class="card hc-sec wr-play">' +
      (open.length > 1 ? '<div class="wr-pick">' + open.map(function (x) { return '<button class="pbtn pbtn--sm' + (x.id === m.id ? ' is-on' : '') + '" data-pickm="' + x.id + '" type="button"' + (b && x.id !== m.id ? ' disabled' : '') + '>' + (x.label ? esc(x.label) + ' · ' : '') + esc(E.tname(T, x.a)) + ' v ' + esc(E.tname(T, x.b)) + '</button>'; }).join('') + '</div>' : '') +
      '<p class="eyebrow">' + esc(m.label || E.lastRound(T).label) + ' · Battle ' + (b ? b.n : m.battles.length + 1) + ' of 3</p>' +
      '<div class="wr-vs">' + vsSide(m, 'a') + '<span class="wr-vs__x">v</span>' + vsSide(m, 'b') + '</div>';
    if (!b) {
      h += '<button class="pbtn pbtn--white pbtn--lg pbtn--block wr-mt" data-battle type="button"' + (T.paused ? ' disabled' : '') + '>Start battle ' + (m.battles.length + 1) + '</button>' +
        '<details class="wr-det wr-mt"><summary class="hc-note">Choose the letters yourself</summary><form class="hc-row wr-mt" data-letters><input class="hc-input wr-l" maxlength="1" data-ls placeholder="S" aria-label="First letter"><span>→</span><input class="hc-input wr-l" maxlength="1" data-le placeholder="T" aria-label="Last letter"><button class="pbtn" type="submit">Start with these</button></form></details>';
    } else {
      var lt = left(b);
      h += '<div class="wr-letters"><span class="wr-letter">' + b.s.toUpperCase() + '</span><span class="wr-arrow">→</span><span class="wr-letter">' + b.e.toUpperCase() + '</span></div>' +
        '<p class="wr-tier">' + V.tierLabel(b.tier) + (b.rolls.length ? ' · new letters ×' + b.rolls.length : '') + '</p>' +
        '<div class="wr-clock' + (lt <= 0 ? ' is-up' : lt < 6000 ? ' is-low' : '') + '" data-clock>' + (lt <= 0 ? 'Time' : fmt(lt)) + '</div>' +
        '<input class="hc-input wr-word" data-word maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Word (optional for out-loud)">' +
        '<p class="wr-check" data-check></p>' +
        '<div class="wr-award"><button class="pbtn pbtn--good pbtn--lg" data-award="' + m.a + '" type="button">' + esc(A) + ' got it</button><button class="pbtn pbtn--good pbtn--lg" data-award="' + m.b + '" type="button">' + esc(B) + ' got it</button>' +
        '<button class="pbtn pbtn--bad pbtn--sm" data-wrong="' + m.a + '" type="button">' + esc(A) + ': wrong word</button><button class="pbtn pbtn--bad pbtn--sm" data-wrong="' + m.b + '" type="button">' + esc(B) + ': wrong word</button></div>' +
        '<button class="pbtn pbtn--block wr-mt' + (lt <= 0 ? ' pbtn--o' : '') + '" data-timeout type="button">Time’s up · new letters</button>';
      if (pend.length) h += '<div class="wr-pend"><p class="wr-k">Waiting for your check</p>' + pend.map(function (p, i) { return '<div class="wr-li"><div><b>' + esc(p.word) + '</b><span>' + esc(E.tname(T, p.team)) + ' · ' + (p.ms / 1000).toFixed(1) + 's</span></div><button class="pbtn pbtn--sm pbtn--good" data-pacc="' + i + '" type="button">Accept</button><button class="pbtn pbtn--sm pbtn--bad" data-prej="' + i + '" type="button">Reject</button></div>'; }).join('') + '</div>';
    }
    h += battleLog(m) + '</section>';
    var done = lastFinished();
    if (done && !b && !m.battles.length) h = '<div class="wr-banner">' + esc(E.tname(T, done.winner)) + ' beat ' + esc(E.tname(T, done.loser)) + ' ' + Math.max(done.wins.a, done.wins.b) + '–' + Math.min(done.wins.a, done.wins.b) + '</div>' + h;
    if (T.config.answerMode === 'phones') h += pinsCard();
    return h;
  }
  function vsSide(m, k) { return '<div class="wr-vs__t">' + tLink(m[k]) + '<b>' + esc(E.tname(T, m[k])) + '</b><span class="wr-dots">' + [0, 1].map(function (i) { return '<i' + (i < m.wins[k] ? ' class="on"' : '') + '></i>'; }).join('') + '</span><span class="wr-pts">' + m.pts[k] + ' pts</span></div>'; }
  function battleLog(m) {
    if (!m.battles.length) return '';
    return '<div class="wr-log">' + m.battles.slice().reverse().map(function (b) {
      return '<div class="wr-logb"><p class="wr-k">Battle ' + b.n + ' · ' + b.s.toUpperCase() + ' → ' + b.e.toUpperCase() + (b.winner ? ' · won by ' + esc(E.tname(T, b.winner)) : '') + '</p>' +
        (b.attempts.length ? b.attempts.map(function (a, i) {
          return '<div class="wr-att' + (a.ok ? ' is-ok' : ' is-no') + (a.counted === false ? ' is-void' : '') + '"><b>' + esc(a.word || '(no word)') + '</b><span>' + esc(E.tname(T, a.team)) + ' · ' + (a.ok ? '✓' : '✗ ' + (E.REASONS[a.reason] || '')) + (a.by === 'host' ? ' · host' : '') + ' · ' + (a.ms / 1000).toFixed(1) + 's</span><em>' + (a.counted === false ? '—' : (a.pts > 0 ? '+' : '') + a.pts) + '</em>' +
            '<button class="pbtn pbtn--sm pbtn--ghost" data-ovr="' + m.id + ':' + b.n + ':' + i + ':' + (a.ok ? 0 : 1) + '" type="button">' + (a.ok ? 'Reject' : 'Accept') + '</button>' + (a.ok ? '' : '<button class="pbtn pbtn--sm pbtn--ghost" data-addw="' + esc(a.word) + '" type="button" title="Add to custom dictionary">+ dict</button>') + '</div>';
        }).join('') : '<p class="hc-note">No answers yet.</p>') + '</div>';
    }).join('') + '</div>';
  }
  function pinsCard() {
    return '<section class="card hc-sec"><h2>Team PINs</h2><p class="hc-note" style="margin-top:0">Give each team its PIN privately. They join at blaccuniversal.com/pqt/wordrace/join with code <b>' + esc(T.room) + '</b>.</p><div class="wr-pins">' +
      T.teams.map(function (t) { return '<div class="wr-pin">' + tLink(t.id) + '<b>' + esc(t.name) + '</b><code>' + esc((T.pins || {})[t.id] || '') + '</code><span>' + (joined[t.id] ? joined[t.id] + ' joined' : '') + '</span></div>'; }).join('') + '</div></section>';
  }
  function decisionPane() {
    var d = T.decision, r = E.lastRound(T), s = E.summary(T);
    if (d.type === 'best-loser-tie') {
      return '<section class="card hc-sec wr-dec"><p class="eyebrow">Your call</p><h3>Best Losers are tied on ' + d.pts + ' points</h3><p class="hc-note">The rules only settle a tie when all three losers of a seven-team draw are level. Choose which tied team plays ' + esc(E.tname(T, r.unmatched)) + ' in the revival.</p>' +
        d.teams.map(function (x) { return '<div class="wr-li">' + tLink(x) + '<div><b>' + esc(E.tname(T, x)) + '</b><span>' + s[x].pts + ' pts · ' + s[x].won + ' battles won</span></div><button class="pbtn pbtn--sm pbtn--white" data-dec-team="' + x + '" type="button">Revive</button></div>'; }).join('') + '</section>';
    }
    return '<section class="card hc-sec wr-dec"><p class="eyebrow">Your call</p><h3>' + d.pool.length + ' teams qualified</h3><p class="hc-note">An odd number can’t be paired. The rules don’t say what happens here, so you decide. <b>Revival</b>: one team sits out, the others play, and the Best Loser of that round plays the team that sat out. <b>Bye</b>: one team goes straight through.</p>' +
      d.pool.map(function (x) { return '<div class="wr-li">' + tLink(x) + '<div><b>' + esc(E.tname(T, x)) + '</b><span>' + s[x].pts + ' pts · ' + s[x].won + ' battles won</span></div><button class="pbtn pbtn--sm" data-dec-mode="revival" data-dec-t="' + x + '" type="button">Sits out</button><button class="pbtn pbtn--sm" data-dec-mode="bye" data-dec-t="' + x + '" type="button">Bye</button></div>'; }).join('') + '</section>';
  }
  function logPane() {
    var ms = Object.keys(T.matchups).map(function (id) { return T.matchups[id]; }).filter(function (m) { return m.battles.length; });
    var h = '<section class="card hc-sec"><h2>Correct points</h2>' + (ms.length ? '<form data-corr class="wr-corr">' +
      '<select class="hc-input" data-cm>' + ms.map(function (m) { return '<option value="' + m.id + '">' + esc((m.label ? m.label + ': ' : '') + E.tname(T, m.a) + ' v ' + E.tname(T, m.b)) + '</option>'; }).join('') + '</select>' +
      '<div class="hc-row"><select class="hc-input" data-cb style="flex:1 1 110px">' + [1, 2, 3].map(function (n) { return '<option value="' + n + '">Battle ' + n + '</option>'; }).join('') + '</select><select class="hc-input" data-ct style="flex:2 1 140px"></select><input class="hc-input" data-cd type="number" inputmode="numeric" placeholder="+/- pts" style="flex:1 1 90px"></div>' +
      '<input class="hc-input" data-cr maxlength="200" placeholder="Reason (required)"><button class="pbtn pbtn--white" type="submit">Apply correction</button></form><p class="hc-note">Corrections change points (and so the Best Loser), not who won a battle. To change a winner, use Accept/Reject on the answer in Play.</p>' : '<p class="hc-note">No battles played yet.</p>') + '</section>' +
      '<section class="card hc-sec"><h2>Custom dictionary</h2><form class="hc-row" data-cw><input class="hc-input hc-grow" data-cwi maxlength="40" placeholder="Word to accept" style="flex:1" autocomplete="off"><button class="pbtn" type="submit">Add</button></form><p class="hc-note">' + (Object.keys(T.custom).length ? esc(Object.keys(T.custom).join(', ')) : 'Words added here count as valid for this tournament.') + '</p></section>' +
      '<section class="card hc-sec"><h2>Results<button class="pbtn pbtn--sm" data-publish type="button">Publish now</button></h2><p class="hc-note" style="margin-top:0">' + (T.published ? 'Last published ' + new Date(T.published).toLocaleString() + '.' : 'Not published yet.') + ' Results also publish on their own after each matchup when this device has a publish key.</p></section>' +
      '<section class="card hc-sec"><h2>Audit log</h2><div class="wr-audit">' + T.audit.slice().reverse().map(auditLine).join('') + '</div></section>';
    return h;
  }
  function auditLine(a) {
    var t = new Date(a.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), n = function (x) { return esc(E.tname(T, x)); }, s = '';
    switch (a.act) {
      case 'create': s = 'Created “' + esc(a.name) + '”'; break;
      case 'team-add': s = 'Added ' + esc(a.name); break;
      case 'start': s = 'Started with ' + a.teams.length + ' teams'; break;
      case 'round-open': s = esc(a.label) + ' drawn' + (a.unmatched ? ' · ' + n(a.unmatched) + ' unmatched' : '') + (a.bye ? ' · ' + n(a.bye) + ' bye' : ''); break;
      case 'battle-start': s = 'Battle ' + a.battle + ': ' + a.s.toUpperCase() + ' → ' + a.e.toUpperCase(); break;
      case 'answer': s = n(a.team) + ' ' + (a.word ? '“' + esc(a.word) + '”' : '(called out)') + ' ' + (a.ok ? '✓' : '✗ ' + (E.REASONS[a.reason] || '')) + ' ' + (a.pts > 0 ? '+' : '') + a.pts + (a.by === 'host' ? ' (host)' : ''); break;
      case 'timeout': s = 'Time up · new letters ' + a.next.toUpperCase().split('').join(' → '); break;
      case 'matchup-won': s = n(a.team) + ' won ' + a.score; break;
      case 'revival-open': s = 'Revival: ' + a.pairs.map(function (p) { return n(p[0]) + ' v ' + n(p[1]); }).join(', ') + (a.twoStage ? ' (three-way tie)' : ''); break;
      case 'revival-final-open': s = 'Revival Final drawn'; break;
      case 'revival-qualified': s = n(a.team) + ' qualified through the revival'; break;
      case 'round-done': s = 'Qualified: ' + a.qualified.map(n).join(', '); break;
      case 'decision-needed': s = 'Waiting for host decision (' + (a.type === 'odd-pool' ? 'odd number of teams' : 'tied Best Losers') + ')'; break;
      case 'decision': s = 'Host chose ' + n(a.team) + (a.mode ? ' · ' + a.mode : ''); break;
      case 'override': s = 'Host ' + (a.ok ? 'accepted' : 'rejected') + ' “' + esc(a.word) + '”' + (a.note ? ' · ' + esc(a.note) : ''); break;
      case 'correction': s = 'Correction ' + (a.delta > 0 ? '+' : '') + a.delta + ' to ' + n(a.team) + ', battle ' + a.battle + ' · “' + esc(a.reason) + '”'; break;
      case 'custom-word': s = 'Added “' + esc(a.word) + '” to the custom dictionary'; break;
      case 'config': s = 'Settings changed'; break;
      case 'champion': s = n(a.team) + ' are champions'; break;
      case 'pause': s = 'Paused'; break; case 'resume': s = 'Resumed'; break;
      default: s = esc(a.act);
    }
    return '<div class="wr-aud"><time>' + t + '</time><span>' + s + '</span></div>';
  }

  /* live word check in the host input */
  function checkDraft() {
    var el = app.querySelector('[data-check]'), m = curMatchup(), b = m && E.curBattle(m); if (!el || !b) return;
    if (!wordDraft.trim()) { el.textContent = ''; el.className = 'wr-check'; armed = null; return; }
    var c = E.check(T, b, wordDraft, dict);
    el.textContent = c.ok ? '✓ ' + c.w + ' · ' + E.REASONS[c.reason] : c.ok === null ? 'Check it yourself' : '✗ ' + (E.REASONS[c.reason] || '');
    el.className = 'wr-check ' + (c.ok ? 'is-ok' : 'is-no');
  }

  /* ---------- clicks ---------- */
  app.addEventListener('click', function (e) {
    var x = e.target.closest('button'); if (!x || x.disabled) return;
    var d = x.dataset;
    if ('new' in d) { var nm = app.querySelector('[data-nname]').value, md = app.querySelector('[data-nmode] .is-on').getAttribute('data-v'); T = E.create(nm, { answerMode: md }); auditSeen = 0; save(); startLink(); render(); return; }
    if (d.v && x.parentNode.hasAttribute('data-nmode')) { [].forEach.call(x.parentNode.children, function (c) { c.classList.toggle('is-on', c === x); }); return; }
    if (d.open) { load(d.open); tab = 'play'; render(); return; }
    if (d.del) { if (!confirmTwice(x)) return; ls('wr_t_' + d.del, null); ls('wr_index', index().filter(function (i) { return i.id !== d.del; })); render(); return; }
    if ('pkeysave' in d) { var k = app.querySelector('[data-pkey]').value.trim(); if (!k) return toast('Type the key first.', true); ls('wr_pubkey', k); toast('Publish key saved on this device.'); render(); return; }
    if ('pkeyclear' in d) { ls('wr_pubkey', null); render(); return; }
    if ('close' in d) { if (link) link.end(); link = null; T = null; ls('wr_cur', null); netEl.textContent = 'Offline'; netEl.classList.remove('is-on'); render(); return; }
    if (!T) return;
    if (d.mv) return act(function () { E.moveTeam(T, d.mv, +d.d); });
    if (d.rm) return act(function () { E.removeTeam(T, d.rm); });
    if ('shuffle' in d) return act(function () { E.shuffleTeams(T); }, 'Draw shuffled.');
    if (d.v && x.parentNode.dataset.cfgseg) { [].forEach.call(x.parentNode.children, function (c) { c.classList.toggle('is-on', c === x); }); return; }
    if ('cfgsave' in d) return act(function () { E.setConfig(T, readCfg()); }, 'Settings saved.');
    if ('start' in d) return act(function () { E.setConfig(T, readCfg()); T.pins = {}; T.teams.forEach(function (t) { T.pins[t.id] = String(100 + Math.floor(Math.random() * 900)); }); E.start(T); tab = 'play'; }, 'Tournament started.');
    if (d.tab) { tab = d.tab; render(); return; }
    if (d.v && x.parentNode.hasAttribute('data-scene')) { scene = d.v; broadcast(); render(); return; }
    if ('opensc' in d) { window.open('/pqt/wordrace/screen/?c=' + encodeURIComponent(T.room), 'wrscreen', 'width=1280,height=720'); return; }
    if ('newroom' in d) { T.room = WRLink.code(); save(); joined = {}; startLink(); render(); return; }
    if ('pause' in d) return act(function () { var m = curMatchup(), b = m && E.curBattle(m); if (!T.paused) { T.pausedLeft = b ? left(b) : null; E.pause(T, true); } else { if (b && T.pausedLeft != null) b.rollAt = Date.now() - (b.secs * 1000 - T.pausedLeft); T.pausedLeft = null; E.pause(T, false); } });
    if (d.pickm) { curMid = d.pickm; render(); broadcast(); return; }
    if ('battle' in d) { if (!dict) return toast('The dictionary is not loaded. Choose the letters yourself below.', true); var m = curMatchup(); wordDraft = ''; pend = []; return act(function () { E.startBattle(T, m.id, dict); }); }
    if (d.award) {
      var m2 = curMatchup(), b2 = m2 && E.curBattle(m2), w = wordDraft.trim();
      if (w && dict) { var c = E.check(T, b2, w, dict); if (!c.ok && armed !== 'a' + d.award) { armed = 'a' + d.award; x.textContent = 'Award anyway?'; toast(E.REASONS[c.reason] + '. Tap again to award anyway.', true); return; } }
      armed = null; wordDraft = ''; pend = [];
      return act(function () { E.award(T, m2.id, d.award, w, dict); });
    }
    if (d.wrong) { var m3 = curMatchup(); var w3 = wordDraft.trim(); wordDraft = ''; return act(function () { E.submit(T, m3.id, d.wrong, w3, dict, { verdict: false }); }); }
    if ('timeout' in d) { if (!dict) return toast('The dictionary is not loaded, so new letters can’t be drawn. Reload the page.', true); var m4 = curMatchup(); pend = []; return act(function () { E.timeout(T, m4.id, dict); }); }
    if (d.pacc || d.prej) { var i = +(d.pacc || d.prej), p = pend[i]; pend.splice(i, 1); return act(function () { E.submit(T, p.mid, p.team, p.word, dict, { ms: p.ms, verdict: !!d.pacc }); }); }
    if (d.ovr) { var o = d.ovr.split(':'); return act(function () { E.override(T, o[0], +o[1], +o[2], o[3] === '1', 'host'); }, 'Updated.'); }
    if (d.addw) return act(function () { E.addCustomWord(T, d.addw); }, 'Added to the custom dictionary. Accept the answer to count it.');
    if (d.decTeam) return act(function () { E.decide(T, { team: d.decTeam }); });
    if (d.decMode) return act(function () { E.decide(T, { mode: d.decMode, team: d.decT }); });
    if ('publish' in d) { publish(false); return; }
    if ('newt' in d) { if (link) link.end(); link = null; T = null; ls('wr_cur', null); render(); return; }
  });
  function confirmTwice(x) { if (x.dataset.armed) return true; x.dataset.armed = '1'; x.textContent = 'Sure?'; setTimeout(function () { if (x.isConnected) { delete x.dataset.armed; x.textContent = '×'; } }, 2500); return false; }
  function readCfg() {
    var c = {};
    app.querySelectorAll('[data-cfg]').forEach(function (i) { c[i.dataset.cfg] = +i.value; });
    var tb = {}; app.querySelectorAll('[data-tb]').forEach(function (i) { tb[i.dataset.tb] = +i.value; }); if (Object.keys(tb).length) c.tierBonus = tb;
    app.querySelectorAll('[data-cfgseg]').forEach(function (s) { var on = s.querySelector('.is-on'); if (!on) return; var v = on.dataset.v; c[s.dataset.cfgseg] = v === 'true' ? true : v === 'false' ? false : v; });
    return c;
  }
  app.addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target;
    if (f.hasAttribute('data-addteam')) { var n = f.querySelector('[data-tname]').value; act(function () { E.addTeam(T, n); }); var i = app.querySelector('[data-tname]'); if (i) i.focus(); return; }
    if (f.hasAttribute('data-letters')) { var s = f.querySelector('[data-ls]').value.toLowerCase(), en = f.querySelector('[data-le]').value.toLowerCase(); if (!/^[a-z]$/.test(s) || !/^[a-z]$/.test(en)) return toast('Type one letter in each box.', true); var m = curMatchup(); wordDraft = ''; return act(function () { E.startBattle(T, m.id, dict, { s: s, e: en, tier: dict ? dict.tierOf(s, en, T.config.minLength) : 'medium' }); }); }
    if (f.hasAttribute('data-corr')) { var mid = f.querySelector('[data-cm]').value, bn = +f.querySelector('[data-cb]').value, tm = f.querySelector('[data-ct]').value, dl = f.querySelector('[data-cd]').value, rs = f.querySelector('[data-cr]').value; return act(function () { E.correct(T, mid, bn, tm, dl, rs); }, 'Correction applied and logged.'); }
    if (f.hasAttribute('data-cw')) { var w = f.querySelector('[data-cwi]').value; return act(function () { E.addCustomWord(T, w); }, 'Added.'); }
  });
  app.addEventListener('input', function (e) {
    if (e.target.hasAttribute('data-word')) { wordDraft = e.target.value; armed = null; app.querySelectorAll('[data-award]').forEach(function (b) { b.textContent = E.tname(T, b.dataset.award) + ' got it'; }); checkDraft(); }
  });
  app.addEventListener('change', function (e) {
    if (e.target.hasAttribute('data-rename')) act(function () { E.rename(T, e.target.value); });
    if (e.target.hasAttribute('data-cm')) fillCorrTeams();
  });
  function fillCorrTeams() { var sel = app.querySelector('[data-cm]'), ct = app.querySelector('[data-ct]'); if (!sel || !ct) return; var m = T.matchups[sel.value]; ct.innerHTML = [m.a, m.b].map(function (x) { return '<option value="' + x + '">' + esc(E.tname(T, x)) + '</option>'; }).join(''); var cb = app.querySelector('[data-cb]'); cb.innerHTML = m.battles.map(function (b) { return '<option value="' + b.n + '">Battle ' + b.n + '</option>'; }).join(''); }
  new MutationObserver(function () { if (app.querySelector('[data-ct]') && !app.querySelector('[data-ct]').options.length) fillCorrTeams(); }).observe(app, { childList: true });

  /* ---------- countdown ---------- */
  setInterval(function () {
    if (!T || T.status !== 'live') return;
    var m = curMatchup(), b = m && E.curBattle(m), el = app.querySelector('[data-clock]'); if (!b || !el) return;
    var lt = left(b); el.textContent = lt <= 0 ? 'Time' : fmt(lt); el.classList.toggle('is-low', lt > 0 && lt < 6000); el.classList.toggle('is-up', lt <= 0);
    if (lt <= 0 && !timeUp && !T.paused) { timeUp = true; push('time', {}); broadcast(); var tb = app.querySelector('[data-timeout]'); if (tb) tb.classList.add('pbtn--o'); }
  }, 200);
  setInterval(function () { if (T && T.status === 'live') broadcast(); }, 5000); // keeps late joiners and clocks in step

  /* ---------- boot ---------- */
  var cur = ls('wr_cur'); if (cur) load(cur);
  render();
  if (window.WRDict) WRDict.load().then(function (d) { dict = d; render(); }).catch(function () { dictErr = true; render(); toast('The dictionary did not load. You can still judge words yourself.', true); });
  window.addEventListener('beforeunload', save);
})();
