/* PQT — host console and audience screen.
   The host phone/laptop holds the game; the screen only shows what the host sends.
   Link: PeerJS (WebRTC, works across devices) + BroadcastChannel (same device, two tabs). */
function pqtMain() {
  'use strict';
  var PREFIX = 'blaccpqt-';
  var ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var COLORS = ['#ff6a2b', '#f3f3f3', '#5aa8ff', '#5ad18f', '#f2b23a', '#c58cff', '#ff6fa3', '#4fd6d6'];
  var mode = document.body.getAttribute('data-mode');
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function sstore(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function newCode() { var c = ''; for (var i = 0; i < 4; i++) c += ALPHA[Math.floor(Math.random() * ALPHA.length)]; return c; }
  function cleanCode(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); }
  function fmtT(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); var m = Math.floor(s / 60); return m ? m + ':' + ('0' + s % 60).slice(-2) : String(s); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- MQTT relay (works across phones, laptops and networks) ---------- */
  var BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];
  var qbk = new URLSearchParams(location.search).get('broker');
  if (qbk && /^wss?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(qbk)) BROKERS = [qbk];
  var TOPIC = 'blaccuniversal/pqt/v1/';
  function mqLink(o) {
    var bi = 0, cl = null, dead = false, everOk = false, failT = null;
    function go() {
      if (dead || !window.mqtt) return;
      var url = BROKERS[bi % BROKERS.length]; everOk = false;
      var opts = { clientId: 'pqt_' + Math.random().toString(16).slice(2, 10), clean: true, connectTimeout: 8000, reconnectPeriod: 2500, keepalive: 20 };
      if (o.will) opts.will = { topic: o.will.topic, payload: JSON.stringify(o.will.payload), retain: true, qos: 0 };
      try { cl = window.mqtt.connect(url, opts); } catch (e) { bi++; setTimeout(go, 1000); return; }
      clearTimeout(failT);
      failT = setTimeout(function () { if (!everOk) { try { cl.end(true); } catch (e) {} bi++; go(); } }, 10000);
      cl.on('connect', function () { everOk = true; o.onState && o.onState(true, url); o.onConnect && o.onConnect(cl); });
      cl.on('close', function () { o.onState && o.onState(false, url); });
      cl.on('offline', function () { o.onState && o.onState(false, url); });
      cl.on('message', function (t, p) { var m; try { m = JSON.parse(p.toString()); } catch (e) { return; } o.onMessage && o.onMessage(t, m); });
      cl.on('error', function () {});
    }
    go();
    return {
      pub: function (t, obj, retain) { if (cl && cl.connected) try { cl.publish(t, JSON.stringify(obj), { qos: 0, retain: !!retain }); } catch (e) {} },
      on: function () { return !!(cl && cl.connected); },
      end: function () { dead = true; clearTimeout(failT); if (cl) try { cl.end(true); } catch (e) {} }
    };
  }

  /* ---------- content parsing ---------- */
  function parseWords(txt) {
    return String(txt || '').split(/\n+/).map(function (l) {
      var m = l.split(':'); if (!m[0].trim()) return null;
      return { w: m[0].trim().toUpperCase(), x: (m.slice(1).join(':') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 6) };
    }).filter(Boolean);
  }
  function parseBoards(txt) {
    return String(txt || '').split(/\n\s*\n/).map(function (b) {
      var lines = b.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (lines.length < 2) return null;
      var ans = lines.slice(1).map(function (l) {
        var m = l.match(/^(.*?)[\s,;:\-–—]+(\d+)\s*$/);
        return m ? { a: m[1].trim(), p: parseInt(m[2], 10) } : { a: l, p: 0 };
      }).slice(0, 8);
      return { q: lines[0], a: ans };
    }).filter(Boolean);
  }

  function blocks(txt) { return String(txt || '').split(/\n\s*\n/).map(function (b) { return b.split('\n').map(function (l) { return l.trim(); }).filter(Boolean); }).filter(function (b) { return b.length; }); }
  function parseNames(txt) { return blocks(txt).map(function (b) { return { a: b[0], clues: b.slice(1) }; }).filter(function (x) { return x.clues.length; }); }
  function parseSpell(txt) { return String(txt || '').split('\n').map(function (l) { var p = l.split('|').map(function (s) { return s.trim(); }); return p[0] ? { w: p[0].toUpperCase(), d: p[1] || '', e: p[2] || '' } : null; }).filter(Boolean); }
  function parseQA(txt) { return blocks(txt).map(function (b) { var img = ''; b = b.filter(function (l) { var m = l.match(/^image:\s*(\S+)/i); if (m) { img = m[1]; return false; } return true; }); var qs = [b[0]], r = 1; while (r < b.length - 1 && (/^\[[A-H]\]/.test(b[r]) || /^true or false\??$/i.test(b[r]))) qs.push(b[r++]); return b.length ? { q: qs.join(' '), a: b[r] || '', img: img } : null; }).filter(Boolean); }
  function parseTalk(txt) { return String(txt || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean); }
  function qSplit(s) {
    s = String(s || ''); var o = { stem: s, opts: [], tf: false };
    var m = s.match(/\s*True or false\??\s*$/i); if (m) { o.tf = true; s = s.slice(0, m.index); o.stem = s; }
    var k = s.search(/\[[A-H]\]/);
    if (k > -1) { o.stem = s.slice(0, k).trim(); o.opts = s.slice(k).split(/(?=\[[A-H]\])/).map(function (x) { var mm = x.match(/^\[([A-H])\]\s*([\s\S]*)$/); return mm ? [mm[1], mm[2].trim()] : null; }).filter(Boolean); }
    return o;
  }
  function qHtml(s, cls, ans) {
    var o = qSplit(s), h = '<p class="' + cls + '">' + esc(o.stem) + '</p>', A = String(ans || '').trim();
    var letter = (A.match(/^\[?([A-H])\]/) || [])[1], tf = /^true\b/i.test(A) ? 'True' : /^false\b/i.test(A) ? 'False' : '';
    function mark(on) { return A ? (on ? ' class="is-right"' : ' class="is-wrong"') : ''; }
    if (o.opts.length) h += '<ul class="q-opts' + (A ? ' is-marked' : '') + '">' + o.opts.map(function (x) { var right = letter ? x[0] === letter : A.toLowerCase() === x[1].toLowerCase(); return '<li' + mark(right) + '><b>' + x[0] + '</b><span>' + esc(x[1]) + '</span></li>'; }).join('') + '</ul>';
    if (o.tf) h += '<ul class="q-opts q-opts--tf' + (A ? ' is-marked' : '') + '"><li' + mark(tf === 'True') + '><span>True</span></li><li' + mark(tf === 'False') + '><span>False</span></li></ul>';
    return h;
  }

  var QA_TYPES = { names: 1, spell: 1, written: 1, rapid: 1, talk: 1 };
  var QA_TIME = { names: 10000, written: 10000, rapid: 5000, spell: 30000 };
  var QA_BOARD = { spell: 1, rapid: 1 };

  /* =====================================================================
     SCREEN
     ===================================================================== */
  if (mode === 'screen') {
    var code = cleanCode(new URLSearchParams(location.search).get('code')) || sstore('pqt_screen_code') || newCode();
    if (code.length !== 4) code = newCode();
    sstore('pqt_screen_code', code);
    var S = null, lastSig = {}, lastView = null, prevScores = [], tileKey = null;
    var timerEnd = 0, timerRun = false, timerLeft = 0, timerTotal = 0;
    var main = $('[data-main]'), clock = $('[data-clock]');
    var audio = null;

    function beep(freq, dur, type, vol, when) {
      if (!audio) return;
      var t = audio.currentTime + (when || 0), o = audio.createOscillator(), g = audio.createGain();
      o.type = type || 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + dur + 0.05);
    }
    var FX = {
      ding: function () { beep(880, 0.25, 'sine', 0.3); beep(1320, 0.4, 'sine', 0.22, 0.12); },
      ok: function () { beep(660, 0.15, 'triangle', 0.3); beep(990, 0.25, 'triangle', 0.25, 0.1); },
      buzz: function () { beep(110, 0.7, 'sawtooth', 0.35); beep(116, 0.7, 'square', 0.12); },
      skip: function () { beep(300, 0.12, 'triangle', 0.2); },
      end: function () { beep(523, 0.18, 'square', 0.25); beep(392, 0.18, 'square', 0.25, 0.2); beep(262, 0.6, 'square', 0.25, 0.4); },
      tick: function () { beep(1000, 0.05, 'square', 0.12); },
      win: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.3, 'triangle', 0.25, i * 0.12); }); }
    };

    function codeTxt() { $$('[data-code]').forEach(function (el) { el.textContent = code; }); }
    codeTxt();

    /* tap to start: unlocks sound and goes full screen */
    var tap = $('[data-tap]');
    if (tap) tap.querySelector('button').addEventListener('click', function () {
      try { audio = new (window.AudioContext || window.webkitAudioContext)(); FX.ok(); } catch (e) {}
      try { var d = document.documentElement; (d.requestFullscreen || d.webkitRequestFullscreen || function () {}).call(d); } catch (e) {}
      tap.hidden = true;
    });
    document.addEventListener('dblclick', function () {
      try { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } catch (e) {}
    });

    /* link */
    var bc = null, peer = null, idTries = 0, sinks = [], mq = null, mqOn = false, lastSeq = 0, seenFx = [];
    function reply(m) {
      if (bc) try { bc.postMessage(m); } catch (e) {}
      sinks.forEach(function (c) { try { if (c.open) c.send(m); } catch (e) {} });
    }
    function onMsg(m) {
      if (!m || typeof m !== 'object') return;
      if (m.t === 'state') { if (m.seq && m.seq < lastSeq) return; if (m.seq) lastSeq = m.seq; apply(m.s); reply({ t: 'ack' }); }
      else if (m.t === 'fx') {
        if (m.id) { if (seenFx.indexOf(m.id) > -1) return; seenFx.push(m.id); if (seenFx.length > 60) seenFx.shift(); } if (m.fx === 'splash') { showSplash(m.text, m.sub); FX.ding(); return; } if (FX[m.fx]) FX[m.fx](); if (m.fx === 'buzz' && m.bigX) bigX(); }
      else if (m.t === 'ping') reply({ t: 'ack' });
    }
    function startMQ() {
      if (mq) mq.end();
      var base = TOPIC + code + '/';
      mq = mqLink({
        will: { topic: base + 'screen', payload: { on: false } },
        onConnect: function (cl) { cl.subscribe([base + 'state', base + 'fx']); cl.publish(base + 'screen', JSON.stringify({ on: true, at: Date.now() }), { retain: true }); },
        onMessage: function (t, m) { onMsg(m); },
        onState: function (on) { mqOn = on; setNet(); }
      });
    }
    function startBC() {
      if (!('BroadcastChannel' in window)) return;
      if (bc) bc.close();
      bc = new BroadcastChannel(PREFIX + code);
      bc.onmessage = function (e) { onMsg(e.data); };
      bc.postMessage({ t: 'hello' });
    }
    function startPeer() {
      if (!window.Peer) return;
      if (peer) try { peer.destroy(); } catch (e) {}
      peer = new window.Peer(PREFIX + code, { debug: 0 });
      peer.on('open', function () { idTries = 0; setNet('ready'); });
      peer.on('connection', function (c) {
        sinks.push(c);
        c.on('data', onMsg);
        c.on('open', function () { c.send({ t: 'hello' }); });
        c.on('close', function () { sinks = sinks.filter(function (x) { return x !== c; }); });
      });
      peer.on('disconnected', function () { setNet('retry'); setTimeout(function () { try { peer.reconnect(); } catch (e) { startPeer(); } }, 1500); });
      peer.on('error', function (err) {
        if (err && err.type === 'unavailable-id') {
          idTries++;
          if (idTries > 3) { code = newCode(); sstore('pqt_screen_code', code); codeTxt(); startBC(); startMQ(); lastSig = {}; render(); idTries = 0; }
          setTimeout(startPeer, 2500);
        } else if (err && /network|server-error|socket/.test(err.type)) { setNet('retry'); setTimeout(startPeer, 4000); }
      });
    }
    var peerOn = false;
    function setNet(s) { if (s === 'ready') peerOn = true; else if (s) peerOn = false; var el = $('[data-net]'); if (el) el.textContent = (mqOn || peerOn) ? 'Online' : 'Connecting…'; }
    startBC(); startMQ(); startPeer();
    if (!window.Peer) setNet('local');

    /* render */
    function sig(o) { return JSON.stringify(o); }
    function apply(s) {
      S = s;
      paintPause();
      var t = s.timer || {};
      timerTotal = t.total || 0; timerRun = !!t.running; timerLeft = t.remaining || 0;
      timerEnd = Date.now() + timerLeft;
      render();
    }
    function teamsSorted() { return S.teams.map(function (t, i) { return { t: t, i: i }; }).sort(function (a, b) { return b.t.score - a.t.score; }); }
    function render() {
      var v = S ? S.view : 'join';
      var data;
      if (v === 'lobby') data = { teams: S.teams.map(function (t) { return [t.name, t.color]; }), title: S.title, n: S.rounds };
      else if (v === 'scores') data = { teams: S.teams };
      else if (v === 'ranking') data = { teams: S.teams };
      else if (v === 'words') data = { w: S.words, team: S.teams[S.words.team] || null };
      else if (v === 'answers') data = { f: S.feud, teams: S.teams.map(function (t) { return t.name; }) };
      else if (v === 'intro') data = { r: S.round, n: S.rounds, rt: S.roundType, teams: S.teams.map(function (t) { return [t.name, t.color]; }), w: S.words.team };
      else if (v === 'turn' || v === 'turnend') data = { w: S.words, team: S.teams[S.words.team] || null };
      else if (v === 'winner') data = { teams: S.teams };
      else if (v === 'fm') data = { fm: S.fm };
      else if (v === 'qa') data = { qa: S.qa, teams: S.teams.map(function (t) { return t.name; }) };
      else data = {};
      var sg = v + sig(data);
      if (sg === lastSig.v) return;
      lastSig.v = sg;
      var changed = v !== lastView;
      if (v === 'answers' && !changed && S.feud && S.feud.key === tileKey) { updateFeud(); return; }
      var html = VIEWS[v] ? VIEWS[v]() : VIEWS.join();
      main.innerHTML = '<div class="sc-view' + (changed ? '' : ' sc-view--same') + '">' + html + '</div>';
      if (!changed) main.firstChild.style.animation = 'none';
      if (v === 'answers') { tileKey = S.feud && S.feud.key; updateFeud(true); }
      if (v === 'scores') {
        $$('.sc-score', main).forEach(function (el, i) { if (prevScores[i] != null && S.teams[i] && S.teams[i].score > prevScores[i]) el.classList.add('is-bump'); });
      }
      if (S) prevScores = S.teams.map(function (t) { return t.score; });
      lastView = v;
      tickClock(true);
    }
    var VIEWS = {
      join: function () {
        return '<div class="sc-join"><div class="card card--white sc-join__card"><p class="eyebrow" style="color:#555">Screen code</p><div class="sc-join__code" data-code>' + esc(code) + '</div></div>' +
          '<div><p class="sc-join__lead">On your phone or laptop, open</p><p class="sc-join__url">blaccuniversal.com/pqt/host</p>' +
          '<ul class="sc-join__steps"><li><b>1.</b> Type the code you see here.</li><li><b>2.</b> Tap Connect. This screen follows the host.</li><li><b>3.</b> Double-click or tap the screen for full screen.</li></ul></div></div>';
      },
      lobby: function () {
        return '<div class="sc-lobby__logo"><img class="pq-logo" src="/assets/pqt/pqt-logo.png" alt="PQT · People, Quests &amp; Triumphs · MMXXIV" width="1400" height="298"></div>' + (S.title && S.title !== 'People, Quests & Triumphs' ? '<p class="sc-lobby__name">' + esc(S.title) + '</p>' : '') + (S.rounds ? '<p class="sc-lobby__rounds">' + S.rounds + ' rounds tonight</p>' : '') +
          '<div class="sc-chips">' + S.teams.map(function (t) { return '<span class="sc-chip"><i style="background:' + t.color + '"></i>' + esc(t.name) + '</span>'; }).join('') + '</div>';
      },
      scores: function () {
        return '<div class="sc-scores">' + S.teams.map(function (t) {
          return '<div class="card sc-score" style="--c:' + t.color + '"><div class="sc-score__name">' + esc(t.name) + '</div><div class="sc-score__pts">' + t.score + '</div>' + (t.rounds && t.rounds.length ? '<div class="sc-score__bd">' + t.rounds.map(function (v, r) { return '<span><em>R' + (r + 1) + '</em>' + (v == null ? '–' : v) + '</span>'; }).join('') + (t.pen ? '<span class="is-pen"><em>Pen</em>' + t.pen + '</span>' : '') + '</div>' : '') + (t.strikes ? '<div class="sc-score__x">' + new Array(t.strikes + 1).join('✕') + '</div>' : '') + '</div>';
        }).join('') + '</div>';
      },
      ranking: function () {
        var rows = teamsSorted(), rank = 0, last = null;
        return '<div class="sc-lb"><div class="sc-lb__head"><span>Rank</span><span>Team</span><span>Points</span></div>' +
          rows.map(function (r, k) {
            if (r.t.score !== last) { rank = k + 1; last = r.t.score; }
            return '<div class="sc-lb__row" style="--c:' + r.t.color + ';animation-delay:' + (k * 0.08) + 's"><span class="sc-lb__rank">#' + rank + '</span><span class="sc-lb__team"><i></i><span>' + esc(r.t.name) + '</span></span><span class="sc-lb__pts">' + r.t.score + '</span></div>';
          }).join('') + '</div>';
      },
      words: function () {
        var w = S.words, t = S.teams[w.team] || { name: 'Team', color: '#fff' };
        var C = 2 * Math.PI * 46;
        return '<div class="sc-words"><div class="sc-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="5"/><circle data-ring cx="50" cy="50" r="46" fill="none" stroke="' + '#ff6a2b' + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="0"/></svg><div class="sc-ring__num" data-ringnum>' + fmtT(timerRun ? timerEnd - Date.now() : timerLeft) + '</div></div>' +
          '<div><div class="sc-words__team" style="--c:' + t.color + '"><i></i>' + esc(t.name) + '</div><div class="sc-words__title">All Except These Ones</div>' +
          '<div class="sc-tally"><div class="card card--o"><b>' + w.correct + '</b><span>Correct</span></div><div class="card"><b>' + w.skipped + '</b><span>Skipped</span></div><div class="card"><b>' + w.buzzed + '</b><span>Buzzed</span></div></div>' +
          '<div class="sc-stream">' + (w.stream || []).map(function (s) { return '<span class="' + s[1] + '">' + esc(s[0]) + '</span>'; }).join('') + '</div></div></div>';
      },
      intro: function () {
        var QR = {
          names: ['A vague description of a famous person or thing appears.', 'Respond with “Hi, my name is…” and the answer.', 'Give as many answers as you can within 10 seconds.'],
          spell: ['Pick a number. Delegate a player to spell.', 'You’ll hear the word, its meaning and an example.', 'You get only one shot at spelling.'],
          written: ['Ten questions: science, art, business, tech, geography and more.', 'Each question gets 10 seconds. Write your answers down.', 'Answers are revealed at the end of the round.'],
          rapid: ['Pick a number. The question behind it is read to you.', 'Answer within 5 seconds.', 'Try as many times as you can within your time.'],
          talk: ['A topic goes up on the screen.', 'Share your thoughts. Hear each other out.', 'No points, just good conversation.']
        };
        if (QR[S.roundType]) {
          var NM = { names: 'Hi, My Name Is…', spell: 'Spelling Bee', written: 'Written Round', rapid: 'Rapid Fire', talk: 'Discussion' };
          return '<div class="sc-intro"><p class="sc-intro__r">Round ' + (S.round || 1) + (S.rounds ? ' of ' + S.rounds : '') + '</p><h1 class="sc-intro__t">' + NM[S.roundType] + '</h1>' +
            '<ol class="sc-intro__rules">' + QR[S.roundType].map(function (r, i) { return '<li style="animation-delay:' + (0.35 + i * 0.15) + 's"><b>0' + (i + 1) + '</b>' + esc(r) + '</li>'; }).join('') + '</ol></div>';
        }
        var isW = S.roundType === 'words';
        var rules = isW ? ['One clue giver per team, against the clock.', 'Describe the word. Don’t say it, or any banned word.', 'Every word guessed is a point. A buzz costs one.']
                        : ['One team at a time answers the same questions against the clock.', 'Right answers show on the board with their points. An answer another team already gave scores nothing.', 'Each team’s answers are recapped after their turn. At the end, every answer is revealed.'];
        return '<div class="sc-intro"><p class="sc-intro__r">Round ' + (S.round || 1) + (S.rounds ? ' of ' + S.rounds : '') + '</p><h1 class="sc-intro__t">' + (isW ? 'All Except These Ones' : 'Quests Feud') + '</h1>' +
          '<ol class="sc-intro__rules">' + rules.map(function (r, i) { return '<li style="animation-delay:' + (0.35 + i * 0.15) + 's"><b>0' + (i + 1) + '</b>' + esc(r) + '</li>'; }).join('') + '</ol>' +
          '<div class="sc-chips">' + S.teams.map(function (t) { return '<span class="sc-chip"><i style="background:' + t.color + '"></i>' + esc(t.name) + '</span>'; }).join('') + '</div></div>';
      },
      turn: function () {
        var t = S.teams[S.words.team] || { name: 'Team', color: '#fff' };
        return '<div class="sc-turn" style="--c:' + t.color + '"><p class="sc-intro__r">Up next</p><h1 class="sc-turn__team"><i></i>' + esc(t.name) + '</h1><p class="sc-turn__sub">Clue giver, take the host phone. Everyone else: get ready.</p><p class="sc-turn__time">' + fmtT(timerTotal) + '</p></div>';
      },
      turnend: function () {
        var w = S.words, t = S.teams[w.team] || { name: 'Team', color: '#fff' };
        return '<div class="sc-turn" style="--c:' + t.color + '"><p class="sc-intro__r">Time’s up</p><h1 class="sc-turn__team"><i></i>' + esc(t.name) + '</h1>' +
          '<div class="sc-tally sc-tally--big"><div class="card card--o"><b>' + (w.pts >= 0 ? '+' : '') + w.pts + '</b><span>Points this turn</span></div><div class="card"><b>' + w.correct + '</b><span>Correct</span></div><div class="card"><b>' + w.skipped + '</b><span>Skipped</span></div><div class="card"><b>' + w.buzzed + '</b><span>Buzzed</span></div></div>' +
          '<div class="sc-stream">' + (w.stream || []).map(function (s) { return '<span class="' + s[1] + '">' + esc(s[0]) + '</span>'; }).join('') + '</div></div>';
      },
      winner: function () {
        var r = teamsSorted(), top = r[0] ? r[0].t : null;
        var order = [r[1], r[0], r[2]];
        var pod = order.map(function (x, k) {
          if (!x) return '<div class="sc-pod sc-pod--empty"></div>';
          var place = k === 1 ? 1 : k === 0 ? 2 : 3;
          return '<div class="sc-pod sc-pod--' + place + '" style="--c:' + x.t.color + '"><span class="sc-pod__name">' + esc(x.t.name) + '</span><span class="sc-pod__pts">' + x.t.score + '</span><div class="sc-pod__block"><b>' + place + '</b></div></div>';
        }).join('');
        var conf = ''; for (var i = 0; i < 70; i++) conf += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;animation-delay:' + (Math.random() * 3).toFixed(2) + 's;animation-duration:' + (3 + Math.random() * 3).toFixed(2) + 's;background:' + ['#ff6a2b', '#f3f3f3', '#f2b23a', '#e2461c'][i % 4] + '"></i>';
        return '<div class="sc-win"><div class="sc-confetti" aria-hidden="true">' + conf + '</div><p class="sc-intro__r">Champions</p><h1 class="sc-win__t">' + esc(top ? top.name : '') + '</h1><div class="sc-podium">' + pod + '</div></div>';
      },
      fm: function () {
        var f = S.fm; if (!f) return '';
        function tiles(n, show, cls) { var h = '<div class="sc-fmb' + (cls || '') + '">'; for (var i = 0; i < n; i++) { var s = show[i]; h += '<div class="sc-fmb__t' + (s ? ' is-on' + (s.hl ? ' is-hl' : '') : '') + '"><span class="sc-fmb__n">' + (i + 1) + '</span>' + (s ? '<b>' + esc(s.a) + '</b><em>' + s.p + '</em>' + (s.by ? '<small>' + esc(s.by) + '</small>' : '') : '') + '</div>'; } return h + '</div>'; }
        if (f.phase === 'ready') return '<div class="sc-qa"><p class="sc-intro__r">Quests Feud</p><h2 class="sc-qa__h">' + esc(f.team) + ', you’re up</h2><p class="sc-fm__sub">' + f.n + ' questions against the clock</p></div>';
        if (f.phase === 'answer') {
          var show = {}; if (f.hit) show[f.hit.i] = { a: f.hit.a, p: f.hit.p, hl: 1 };
          var msg = f.msg === 'taken' ? '<div class="sc-fm__msg is-warn">Already given by ' + esc(f.takenBy) + ' · no points</div>' : f.msg === 'miss' ? '<div class="sc-fm__msg is-miss">Not on the board</div>' : f.msg === 'pass' ? '<div class="sc-fm__msg is-miss">Pass</div>' : '';
          return '<div class="sc-qa"><div class="sc-qa__top"><p class="sc-intro__r">Quests Feud · ' + esc(f.team) + ' · ' + (f.qi + 1) + ' of ' + f.n + '</p><span class="sc-qa__timer" data-ringnum></span></div><p class="sc-qa__q" style="margin-top:2vh">' + esc(f.q) + '</p>' + tiles(f.na, show) + msg + '</div>';
        }
        if (f.phase === 'recap') return '<div class="sc-qa"><p class="sc-intro__r">' + esc(f.team) + '’s answers</p><div class="sc-fmr">' + f.items.map(function (it, i) { return '<div class="sc-fmr__r' + (it ? ' is-on' + (it.miss ? ' is-miss' : '') : '') + '"><span class="sc-fmr__q">' + esc(it ? it.q : f.qs[i]) + '</span><b>' + (it ? (it.taken ? 'Already taken' : it.miss ? '✕' : esc(it.a)) : '') + '</b><em>' + (it ? it.p : '') + '</em></div>'; }).join('') + '</div><p class="sc-fmr__tot">Total <b>' + f.total + '</b></p></div>';
        if (f.phase === 'final') return '<div class="sc-qa"><p class="sc-intro__r">All the answers · ' + (f.rq + 1) + ' of ' + f.n + '</p><p class="sc-qa__q" style="margin-top:2vh">' + esc(f.q) + '</p>' + tiles(f.all.length, f.all, ' sc-fmb--all') + '</div>';
        return '<div class="sc-qa"><p class="sc-intro__r">Quests Feud · round totals</p><div class="sc-fm sc-fm--tot" style="margin-top:5vh">' + (f.totals || []).map(function (r, i) { return '<div class="sc-fm__r' + (i === 0 ? ' is-top' : '') + '"><b>' + (i + 1) + '</b><span>' + esc(r.team) + '</span><em>' + r.p + '</em></div>'; }).join('') + '</div></div>';
      },
      qa: function () {
        var q = S.qa; if (!q) return '';
        var NM = { names: 'Hi, My Name Is…', spell: 'Spelling Bee', written: 'Written Round', rapid: 'Rapid Fire', talk: 'Discussion' };
        if (q.mode === 'board') {
          return '<div class="sc-qa"><p class="sc-intro__r">' + NM[q.type] + '</p><h2 class="sc-qa__h">' + (q.picker ? esc(q.picker) + ', pick a number' : 'Pick a number') + '</h2><div class="sc-numboard">' +
            Array.apply(null, Array(q.n)).map(function (_, i) { return '<span class="' + (q.used.indexOf(i) > -1 ? 'is-used' : '') + '">' + (i + 1) + '</span>'; }).join('') + '</div></div>';
        }
        var head = '<div class="sc-qa__top"><p class="sc-intro__r">' + NM[q.type] + ' · ' + (q.type === 'spell' ? 'Word ' : q.type === 'talk' ? 'Topic ' : 'Question ') + (q.idx + 1) + (QA_BOARD[q.type] ? '' : ' of ' + q.n) + (q.type === 'written' && q.phase === 'reveal' ? ' · Answer reveal' : '') + '</p>' + (QA_TIME[q.type] && !(q.type === 'written' && q.phase === 'reveal') ? '<span class="sc-qa__timer" data-ringnum></span>' : '') + '</div>';
        if (q.bd) head += '<p class="sc-qa__who' + (q.bd.bonus ? ' is-bonus' : '') + '">' + (q.bd.res != null ? (q.bd.res ? (q.bd.bonus ? 'Bonus point · ' : 'Point · ') + esc(q.bd.res) : 'Nobody got it') : (q.bd.bonus ? 'Bonus · ' + esc(q.bd.cur) : esc(q.bd.cur))) + '</p>';
        var mark = q.mark === 'ok' ? '<span class="sc-mark-ok">✓</span>' : q.mark === 'no' ? '<span class="sc-mark-no">✕</span>' : '';
        if (q.type === 'names') return '<div class="sc-qa">' + head + '<div class="sc-qa__clues">' + (q.clues || []).map(function (c) { return '<p>' + esc(c) + '</p>'; }).join('') + '</div><div class="sc-qa__ans' + (q.a ? ' is-on' : '') + '"><span>Hi, my name is…</span><b>' + esc(q.a || '') + '</b>' + mark + '</div></div>';
        if (q.type === 'spell') return '<div class="sc-qa">' + head + '<div class="sc-qa__word' + (q.w ? ' is-on' : '') + '">' + (q.w ? esc(q.w) : '<i>???</i>') + mark + '</div><p class="sc-qa__def">' + esc(q.d || '') + '</p>' + (q.e ? '<p class="sc-qa__ex">' + (/^[“"]/.test(q.e) ? esc(q.e) : '“' + esc(q.e) + '”') + '</p>' : '') + '</div>';
        if (q.type === 'talk') return '<div class="sc-qa sc-qa--talk">' + head + '<p class="sc-qa__q sc-qa__q--big">' + esc(q.q || '') + '</p></div>';
        return '<div class="sc-qa">' + head + '<div class="sc-qa__body' + (q.img ? ' has-img' : '') + '"><div class="sc-qa__qw">' + qHtml(q.q, 'sc-qa__q', q.a) + '</div>' + (q.img ? '<img class="sc-qa__img" src="' + esc(q.img) + '" alt="">' : '') + '</div><div class="sc-qa__ans' + (q.a ? ' is-on' : '') + '"><span>Answer</span><b>' + esc(q.a || '') + '</b>' + mark + '</div></div>';
      },
      answers: function () {
        var f = S.feud;
        if (!f || !f.q) return '<p class="sc-feud__q">No question yet</p>';
        var n = Math.max(f.n, 4), tiles = '';
        for (var i = 0; i < 8 && i < (n <= 4 ? 4 : n <= 6 ? 6 : 8); i++) {
          tiles += '<div class="sc-tile' + (i >= f.n ? ' sc-tile--empty' : '') + '" data-tile="' + i + '"><div class="sc-tile__in"><div class="sc-tile__f">' + (i < f.n ? i + 1 : '') + '</div><div class="sc-tile__b"><span data-ta></span><b data-tp></b></div></div></div>';
        }
        var rows = Math.ceil((n <= 4 ? 4 : n <= 6 ? 6 : 8) / 2);
        return '<div class="sc-feud"><p class="sc-feud__q">' + esc(f.q) + '</p><div class="sc-board" style="grid-template-rows:repeat(' + rows + ',auto)">' + tiles + '</div>' +
          '<div class="sc-feud__foot"><div class="sc-bank"><b data-bank>0</b><span>Points on the board</span></div><p class="sc-award" data-award></p><p class="sc-steal" data-steal hidden>Steal!</p><div class="sc-x" data-x><i>✕</i><i>✕</i><i>✕</i></div></div></div>';
      }
    };
    function updateFeud() {
      var f = S.feud; if (!f) return;
      $$('[data-tile]', main).forEach(function (el) {
        var i = +el.getAttribute('data-tile'), r = f.out[i];
        if (r) { el.querySelector('[data-ta]').textContent = r.a; el.querySelector('[data-tp]').textContent = r.p; }
        el.classList.toggle('is-out', !!r);
      });
      var b = $('[data-bank]', main); if (b) b.textContent = f.bank;
      var a = $('[data-award]', main); if (a) a.textContent = f.awardedTo != null && S.teams[f.awardedTo] ? f.awardedPts + ' points to ' + S.teams[f.awardedTo].name : '';
      $$('[data-x] i', main).forEach(function (x, i) { x.classList.toggle('is-on', i < f.strikes); });
      var st = $('[data-steal]', main); if (st) st.hidden = !(f.strikes >= 3 && f.awardedTo == null);
    }
    function showSplash(text, sub) {
      var d = document.createElement('div'); d.className = 'sc-splash';
      d.innerHTML = '<div><p class="sc-splash__t">' + esc(text) + '</p>' + (sub ? '<p class="sc-splash__s">' + esc(sub) + '</p>' : '') + '</div>';
      document.body.appendChild(d); setTimeout(function () { d.classList.add('is-out'); }, 2000); setTimeout(function () { d.remove(); }, 2600);
    }
    var pauseEl = null;
    function paintPause() {
      var on = S && S.paused;
      if (on && !pauseEl) { pauseEl = document.createElement('div'); pauseEl.className = 'sc-pause'; pauseEl.innerHTML = '<div><div class="sc-pause__logo"><img class="pq-logo" src="/assets/pqt/pqt-logo.png" alt="PQT · People, Quests &amp; Triumphs · MMXXIV" width="1400" height="298"></div><p class="sc-pause__t">Be right back</p>' + (S.title && S.title !== 'People, Quests & Triumphs' ? '<p class="sc-pause__s">' + esc(S.title) + '</p>' : '') + '</div>'; document.body.appendChild(pauseEl); }
      else if (!on && pauseEl) { pauseEl.remove(); pauseEl = null; }
    }
    function bigX() {
      var d = document.createElement('div'); d.className = 'sc-bigx'; d.innerHTML = '<span>X</span>';
      document.body.appendChild(d); setTimeout(function () { d.remove(); }, 950);
    }
    var lastSec = null;
    function tickClock(force) {
      var left = timerRun ? Math.max(0, timerEnd - Date.now()) : timerLeft;
      var show = S && timerTotal > 0 && ['words', 'join', 'intro', 'turn', 'turnend', 'winner', 'lobby', 'qa', 'fm'].indexOf(S.view) < 0 && (timerRun || left < timerTotal);
      clock.hidden = !show;
      clock.querySelector('span').textContent = fmtT(left);
      clock.classList.toggle('is-low', timerRun && left <= 10000);
      var rn = $('[data-ringnum]', main), ring = $('[data-ring]', main);
      if (rn) { rn.textContent = fmtT(left); rn.classList.toggle('is-low', left <= 10000 && timerTotal > 0); }
      if (ring) { var C = 2 * Math.PI * 46; ring.setAttribute('stroke-dashoffset', (timerTotal ? C * (1 - left / timerTotal) : 0).toFixed(1)); }
      var sec = Math.ceil(left / 1000);
      if (timerRun && sec !== lastSec && sec <= 5 && sec > 0 && !force) FX.tick();
      lastSec = sec;
    }
    setInterval(tickClock, 200);
    render();
    return;
  }

  /* =====================================================================
     HOST
     ===================================================================== */
  if (mode !== 'host') return;
  var DEF = {
    code: '', title: 'People, Quests & Triumphs', view: 'lobby', tab: 'teams',
    teams: [{ name: 'Team A', color: COLORS[0], score: 0 }, { name: 'Team B', color: COLORS[1], score: 0 }, { name: 'Team C', color: COLORS[2], score: 0 }],
    timer: { total: 60000, remaining: 60000, running: false, endsAt: 0 },
    words: { team: 0, deck: [], pos: 0, correct: 0, skipped: 0, buzzed: 0, stream: [], buzzCost: 1 },
    feud: { qi: 0, out: {}, strikes: 0, awardedTo: null, awardedPts: 0 },
    wordsTxt: window.PQT_SAMPLE_WORDS || '', boardsTxt: window.PQT_SAMPLE_BOARDS || '',
    round: 0, roundType: '', paused: false, ledger: [], plan: ['words', 'answers', 'words'],
    namesTxt: window.PQT_SAMPLE_NAMES || '', spellTxt: window.PQT_SAMPLE_SPELL || '', writtenTxt: window.PQT_SAMPLE_WRITTEN || '', rapidTxt: window.PQT_SAMPLE_RAPID || '', talkTxt: window.PQT_SAMPLE_TALK || '',
    qa: { type: '', mode: 'board', idx: 0, clue: 1, revealed: false, mark: '', phase: 'ask' }, qaUsed: {}, qaPos: {}
  };
  var H = store('pqt_host') || JSON.parse(JSON.stringify(DEF));
  Object.keys(DEF).forEach(function (k) { if (H[k] == null) H[k] = JSON.parse(JSON.stringify(DEF[k])); });
  // Hosts still on the first 40 sample words get the bigger sample list automatically
  if (window.PQT_SAMPLE_WORDS && H.wordsTxt === window.PQT_SAMPLE_WORDS.split('\n').slice(0, 40).join('\n')) H.wordsTxt = window.PQT_SAMPLE_WORDS;
  if (H.tab === 'words' || H.tab === 'answers') H.tab = 'quiz';
  var WORDS = parseWords(H.wordsTxt), BOARDS = parseBoards(H.boardsTxt);
  var QA = {};
  function loadQA() { QA = { names: parseNames(H.namesTxt), spell: parseSpell(H.spellTxt), written: parseQA(H.writtenTxt), rapid: parseQA(H.rapidTxt), talk: parseTalk(H.talkTxt) }; }
  loadQA();
  if (!H.words.deck.length || H.words.deck.length !== WORDS.length) { H.words.deck = shuffle(WORDS.map(function (_, i) { return i; })); H.words.pos = 0; }
  if (H.timer.running && H.timer.endsAt) { H.timer.remaining = Math.max(0, H.timer.endsAt - Date.now()); if (!H.timer.remaining) H.timer.running = false; }
  var hist = [];
  function snap() { hist.push(JSON.stringify(H)); if (hist.length > 40) hist.shift(); }
  function save() { store('pqt_host', H); }

  /* link */
  var hbc = null, hpeer = null, conn = null, bcSeen = 0, retryT = null, linkState = 'off';
  function pub() {
    var t = H.timer, left = t.running ? Math.max(0, t.endsAt - Date.now()) : t.remaining;
    var w = H.words, b = BOARDS[H.feud.qi], f = H.feud, out = {}, bank = 0;
    if (b) Object.keys(f.out).forEach(function (i) { var a = b.a[i]; if (a) { out[i] = { a: a.a, p: a.p }; if (f.out[i] === 'p') bank += a.p; } });
    return {
      view: H.view, title: H.title, round: H.round, rounds: H.plan.length, roundType: H.roundType, paused: H.paused,
      teams: H.teams.map(function (x, i) { var rp = roundPts(i); return { name: x.name, color: x.color, score: x.score, rounds: rp.rounds, pen: rp.pen, strikes: x.strikes || 0 }; }),
      timer: { total: t.total, remaining: left, running: t.running },
      words: { team: w.team, correct: w.correct, skipped: w.skipped, buzzed: w.buzzed, stream: w.stream.slice(-14), pts: w.correct - (w.buzzCost ? w.buzzed : 0) },
      qa: qaPub(),
      fm: fmPub(),
      feud: b ? { key: H.feud.qi + ':' + b.q, q: b.q, n: b.a.length, out: out, strikes: f.strikes, bank: f.awardedTo != null ? 0 : bank, awardedTo: f.awardedTo, awardedPts: f.awardedPts } : null
    };
  }
  var hmq = null, mqScreen = false, seqN = 0;
  function qaItem() { var q = H.qa, list = QA[q.type] || []; return list[q.idx]; }
  function qaPub() {
    var q = H.qa; if (!q.type) return null;
    var list = QA[q.type] || [], it = list[q.idx], o = { picker: QA_BOARD[q.type] ? tn(turnTeam()) : '', bd: QA_BOARD[q.type] && q.bd && q.mode === 'q' ? { owner: tn(q.bd.owner), cur: tn(q.bd.cur), bonus: q.bd.cur !== q.bd.owner, res: q.bd.res == null ? null : q.bd.res < 0 ? '' : tn(q.bd.res) } : null, type: q.type, mode: q.mode, n: list.length, idx: q.idx, used: H.qaUsed[q.type] || [], revealed: q.revealed, mark: q.mark, phase: q.phase };
    if (q.mode === 'q' && it) {
      if (q.type === 'names') { o.clues = it.clues.slice(0, q.clue); o.total = it.clues.length; if (q.revealed) o.a = it.a; }
      else if (q.type === 'spell') { o.d = it.d; o.e = q.revealed ? it.e : it.e.replace(new RegExp(it.w.replace(/[^A-Za-z]/g, ''), 'gi'), '______'); if (q.revealed) o.w = it.w; }
      else if (q.type === 'talk') { o.q = it; }
      else { o.q = it.q; o.img = it.img; if (q.revealed) o.a = it.a; }
    }
    return o;
  }
  function send(m) {
    if (m.t === 'state') m.seq = Date.now() * 100 + (seqN = (seqN + 1) % 100);
    if (m.t === 'fx') m.id = Math.random().toString(36).slice(2, 10);
    if (hbc) try { hbc.postMessage(m); } catch (e) {}
    if (conn && conn.open) try { conn.send(m); } catch (e) {}
    if (hmq && H.code && (m.t === 'state' || m.t === 'fx')) hmq.pub(TOPIC + H.code + '/' + (m.t === 'state' ? 'state' : 'fx'), m, m.t === 'state');
  }
  function startHostMQ(code) {
    if (hmq) hmq.end(); mqScreen = false;
    var base = TOPIC + code + '/';
    hmq = mqLink({
      onConnect: function (cl) { cl.subscribe(base + 'screen'); push(); },
      onMessage: function (t, m) { if (t === base + 'screen') { var was = mqScreen; mqScreen = !!(m && m.on); if (mqScreen && !was) push(); paintLink(); } },
      onState: function () { paintLink(); }
    });
  }
  function push() { save(); send({ t: 'state', s: pub() }); if (typeof renderTeams === 'function' && root) renderTeams(); }
  function fx(name, extra) { var m = { t: 'fx', fx: name }; if (extra) for (var k in extra) m[k] = extra[k]; send(m); }
  function onHostMsg(m, via) {
    if (!m) return;
    if (via === 'bc') bcSeen = Date.now();
    if (m.t === 'hello') push();
    paintLink();
  }
  function connect(code) {
    code = cleanCode(code); if (code.length !== 4) return false;
    H.code = code; save();
    if (hbc) hbc.close();
    if ('BroadcastChannel' in window) { hbc = new BroadcastChannel(PREFIX + code); hbc.onmessage = function (e) { onHostMsg(e.data, 'bc'); }; hbc.postMessage({ t: 'ping' }); }
    linkState = 'wait'; startHostMQ(code); paintLink();
    clearTimeout(retryT);
    if (window.Peer) {
      if (!hpeer || hpeer.destroyed) {
        hpeer = new window.Peer({ debug: 0 });
        hpeer.on('open', dial);
        hpeer.on('error', function (err) {
          if (err && err.type === 'peer-unavailable') { linkState = 'missing'; paintLink(); retryT = setTimeout(dial, 3000); }
          else { linkState = 'wait'; paintLink(); retryT = setTimeout(function () { if (hpeer) try { hpeer.destroy(); } catch (e) {} hpeer = null; connect(H.code); }, 4000); }
        });
        hpeer.on('disconnected', function () { try { hpeer.reconnect(); } catch (e) {} });
      } else dial();
    }
    push();
    return true;
  }
  function dial() {
    if (!hpeer || hpeer.destroyed || !hpeer.open || !H.code) return;
    if (conn) try { conn.close(); } catch (e) {}
    conn = hpeer.connect(PREFIX + H.code, { reliable: true });
    conn.on('open', function () { linkState = 'on'; paintLink(); push(); });
    conn.on('data', function (m) { onHostMsg(m, 'peer'); });
    conn.on('close', function () { linkState = 'wait'; paintLink(); clearTimeout(retryT); retryT = setTimeout(dial, 2000); });
  }
  function linked() { return (conn && conn.open) || Date.now() - bcSeen < 7000 || (hmq && hmq.on() && mqScreen); }
  function paintLink() {
    var el = $('[data-status]'); if (!el) return;
    var on = linked();
    el.className = 'hc-status ' + (on ? 'is-on' : H.code ? 'is-wait' : '');
    el.querySelector('span').textContent = on ? 'Screen ' + H.code : H.code ? (linkState === 'missing' ? 'Looking for ' + H.code + '…' : 'Connecting ' + H.code + '…') : 'No screen';
    var cs = $('[data-connect-sec]'); if (cs) cs.hidden = on && !$('[data-connect-sec]').dataset.force;
  }
  setInterval(function () { send({ t: 'ping' }); paintLink(); }, 2500);
  setInterval(function () { if (H.code) send({ t: 'state', s: pub() }); }, 5000);

  /* timer */
  function timerLeft() { var t = H.timer; return t.running ? Math.max(0, t.endsAt - Date.now()) : t.remaining; }
  function timerStart() { var t = H.timer; if (t.running) return; if (t.remaining <= 0) t.remaining = t.total; t.running = true; t.endsAt = Date.now() + t.remaining; push(); paintTimer(); }
  function timerPause() { var t = H.timer; if (!t.running) return; t.remaining = timerLeft(); t.running = false; push(); paintTimer(); }
  function timerReset(total) { var t = H.timer; if (total) t.total = total; t.running = false; t.remaining = t.total; push(); paintTimer(); }
  function timerAdd(ms) { var t = H.timer; if (t.running) t.endsAt += ms; else t.remaining = Math.max(0, t.remaining + ms); if (timerLeft() > t.total) t.total = timerLeft(); push(); paintTimer(); }
  function paintTimer() {
    var n = $('[data-tnum]'), left = timerLeft();
    if (n) { n.textContent = fmtT(left); n.classList.toggle('is-low', left <= 10000); }
    var tf = $('[data-tflow]'); if (tf) tf.textContent = fmtT(left);
    var b = $('[data-tgo]'); if (b) b.textContent = H.timer.running ? 'Pause' : 'Start';
    $$('[data-tset]').forEach(function (x) { x.classList.toggle('is-on', +x.getAttribute('data-tset') === H.timer.total); });
  }
  setInterval(function () {
    var t = H.timer;
    if (t.running && Date.now() >= t.endsAt) { t.running = false; t.remaining = 0; if (H.view === 'fm' && H.fm && H.fm.phase === 'answer') { H.fm.phase = 'recap'; H.fm.rc = 0; H.fm.last = null; renderAll(); toast('Time’s up for ' + ((H.teams[fmTeam()] || {}).name || '')); } else if (H.view === 'words') { H.view = 'turnend'; renderViews(); renderTab(); paintNow(); toast('Time’s up for ' + (team(H.words.team) || {}).name); } push(); fx('end'); }
    paintTimer();
  }, 200);

  /* actions */
  function team(i) { return H.teams[i]; }
  function pts(i, d, kind) { var t = team(i); if (!t || !d) return; t.score += d; H.ledger.push([i, d]); var r = kind === 'pen' ? 'pen' : String(H.round || 0); H.byRound = H.byRound || {}; var br = H.byRound[r] = H.byRound[r] || {}; br[i] = (br[i] || 0) + d; }
  function roundPts(i) { var br = H.byRound || {}, out = [], jn = (H.teams[i] || {}).joined || 0; for (var r = 1; r <= Math.max(H.round, 0); r++) out.push(r < jn ? null : (br[r] || {})[i] || 0); return { rounds: out, extra: (br['0'] || {})[i] || 0, pen: (br.pen || {})[i] || 0 }; }
  function addScore(i, d) { snap(); pts(i, d); push(); renderTeams(); if (H.tab === 'quiz') renderTab(); }
  var toastT = null;
  function toast(msg) { var el = $('[data-toast]'); if (!el) return; el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, 2200); }
  function splash(text, sub) { fx('splash', { text: text, sub: sub || '' }); }
  function resetTally() { var w = H.words; w.correct = w.skipped = w.buzzed = 0; w.stream = []; }
  function startRound(type) {
    snap(); H.round++; H.roundType = type; H.ledger = []; H.paused = false;
    resetTally(); H.timer.running = false; H.timer.remaining = H.timer.total;
    if (type === 'answers') { H.feud = { qi: H.feud.qi || 0, out: {}, strikes: 0, awardedTo: null, awardedPts: 0 }; fmNew(); }
    H.picks = {}; H.words.done = [];
    if (QA_TYPES[type]) H.qa = { wr: {}, type: type, mode: QA_BOARD[type] ? 'board' : 'q', idx: (H.qaPos[type] || 0) % Math.max(1, (QA[type] || []).length), clue: 1, revealed: false, mark: '', phase: 'ask' };
    if (H.round > H.plan.length) H.plan.push(type); else H.plan[H.round - 1] = type;
    H.view = 'intro'; H.tab = 'quiz'; push(); renderAll(); toast('Round ' + H.round + ' of ' + H.plan.length + ' · ' + GNAME[type]);
  }
  var GNAME = { words: 'All Except These Ones', answers: 'Quests Feud', names: 'Hi, My Name Is…', spell: 'Spelling Bee', written: 'Written Round', rapid: 'Rapid Fire', talk: 'Discussion' };
  function nextPlanned() { return H.round < H.plan.length ? H.plan[H.round] : null; }
  function goNext() { var n = nextPlanned(); if (n) startRound(n); else openEnd(); }
  function renderPlan() {
    var lists = $$('[data-plan-list]'); if (!lists.length) return;
    $$('[data-plan-count]').forEach(function (c) { c.textContent = H.plan.length; });
    var html = H.plan.map(function (g, i) {
      var done = i < H.round, cur = i === H.round - 1;
      return '<li><button class="hc-plan__r' + (done ? ' is-done' : '') + (cur ? ' is-cur' : '') + '" type="button" data-plan-i="' + i + '"' + (done ? ' disabled' : '') + '><span>Round ' + (i + 1) + (cur ? ' · now' : done ? ' · played' : '') + '</span><b>' + GNAME[g] + '</b></button></li>';
    }).join('');
    lists.forEach(function (l) { l.innerHTML = html; });
  }
  function paintMenu() {
    var ps0 = $('.hc-plansec'); if (ps0) ps0.hidden = H.round > 0 && !H.ended;
    var gs = $('[data-gsum]'); if (gs) gs.innerHTML = H.ended ? '<b>' + esc(H.title || 'PQT') + '</b><span>Game over · the winner is on the screen.</span>' : '<b>' + esc(H.title || 'PQT') + '</b><span>' + H.teams.length + ' teams · ' + H.plan.length + (H.plan.length === 1 ? ' round' : ' rounds') + ' · ' + H.plan.map(function (g) { return GNAME[g]; }).join(', ') + '</span>';
    var gb = $('[data-gstart]'); if (gb) gb.hidden = !!H.ended;
    var so = $('[data-setup-open]'); if (so) { so.textContent = H.ended ? 'Set up the next game' : 'Set up'; so.classList.toggle('pbtn--white', !!H.ended); }
    var gt = $('[data-m-gtitle]'); if (gt) gt.textContent = H.title || 'This game';
    var n = nextPlanned(), b = $('[data-m-next]'), sb = $('[data-m-next-sub]');
    if (b) b.textContent = H.ended ? 'Game over · set up a new one' : n ? 'Start round ' + (H.round + 1) + ' of ' + H.plan.length : 'All rounds played · end game';
    if (sb) sb.textContent = H.ended ? 'Name, teams and rounds for the next game.' : n ? GNAME[n] + ' · from your game plan' : 'Final scores and the winner on screen.';
    var ps = $('[data-m-plan-sub]'); if (ps) ps.textContent = H.plan.length + ' rounds · ' + H.plan.map(function (g) { return GNAME[g]; }).join(' → ');
  }
  function restartRound() {
    if (!H.roundType) { toast('No round to restart yet'); return; }
    snap(); H.ledger.forEach(function (l) { var t = team(l[0]); if (t) t.score -= l[1]; }); H.ledger = []; if (H.byRound) delete H.byRound[String(H.round)]; H.words.done = [];
    resetTally(); H.timer.running = false; H.timer.remaining = H.timer.total;
    if (H.roundType === 'answers') { H.feud = { qi: H.feud.qi, out: {}, strikes: 0, awardedTo: null, awardedPts: 0 }; var keepQs = H.fm ? H.fm.qs : null; fmNew(); if (keepQs) H.fm.qs = keepQs; }
    if (QA_TYPES[H.roundType]) { H.qaUsed[H.roundType] = []; H.qa = { type: H.roundType, mode: QA_BOARD[H.roundType] ? 'board' : 'q', idx: 0, clue: 1, revealed: false, mark: '', phase: 'ask' }; }
    H.view = 'intro'; push(); renderAll(); splash('Round ' + H.round, 'Restarted'); toast('Round ' + H.round + ' restarted');
  }
  function newGame() {
    H.gameId = Date.now().toString(36); H.ended = false;
    snap(); H.teams.forEach(function (t) { t.score = 0; t.strikes = 0; }); H.byRound = {}; H.round = 0; H.roundType = ''; H.ledger = []; H.paused = false;
    resetTally(); H.words.team = 0; H.timer.running = false; H.timer.remaining = H.timer.total;
    H.feud = { qi: 0, out: {}, strikes: 0, awardedTo: null, awardedPts: 0 };
    H.qa = { type: '', mode: 'board', idx: 0, clue: 1, revealed: false, mark: '', phase: 'ask' }; H.qaUsed = {}; H.qaPos = {}; H.bq = null; H.picks = {};
    H.view = 'lobby'; push(); renderAll(); splash('New game', H.title); toast('New game started');
  }
  function qaTimer() { var t = QA_TIME[H.qa.type]; if (!t) return; H.timer.total = t; H.timer.running = false; H.timer.remaining = t; }
  /* turns + bonus for number-board rounds */
  function tn(i) { return H.teams[i] ? H.teams[i].name : ''; }
  function bq() { var n = H.teams.length; if (!H.bq || H.bq.length !== n || H.bq.some(function (x) { return x >= n; })) H.bq = H.teams.map(function (_, i) { return i; }); return H.bq; }
  function turnTeam() { var n = H.teams.length; if (H.qa.turn == null || H.qa.turn >= n) H.qa.turn = 0; return H.qa.turn; }
  function bdAnswer(ok) {
    var q = H.qa, b = q.bd; if (!b || b.res != null) return; snap();
    if (ok) { var pv = b.cur === b.owner ? 2 : 1; pts(b.cur, pv); b.res = b.cur; b.pv = pv; q.revealed = true; q.mark = 'ok'; fx('ok'); toast('+' + pv + ' to ' + tn(b.cur) + (b.cur !== b.owner ? ' (bonus)' : '')); H.timer.running = false; H.timer.remaining = timerLeft(); push(); renderAll(); return; }
    var queue = bq(), nx = -1;
    for (var k = 0; k < queue.length; k++) if (b.tried.indexOf(queue[k]) < 0) { nx = queue[k]; break; }
    fx('buzz');
    if (nx < 0) { b.res = -1; q.revealed = true; q.mark = 'no'; H.timer.running = false; H.timer.remaining = timerLeft(); toast('No one got it'); push(); renderAll(); return; }
    queue.splice(queue.indexOf(nx), 1); queue.push(nx);   // this team has had its bonus turn
    b.cur = nx; b.tried.push(nx); q.mark = '';
    qaTimer(); push(); if (QA_TIME[q.type] && q.type !== 'spell') timerStart(); renderAll(); toast('Bonus to ' + tn(nx));
  }
  function qaShow(i, autoStart) {
    snap(); var q = H.qa; q.idx = i; q.mode = 'q'; q.clue = 1; q.revealed = false; q.mark = '';
    if (QA_BOARD[q.type]) { var u = H.qaUsed[q.type] = H.qaUsed[q.type] || [], ow = turnTeam(); if (u.indexOf(i) < 0) { u.push(i); H.picks = H.picks || {}; H.picks[ow] = (H.picks[ow] || 0) + 1; } q.bd = { owner: ow, cur: ow, tried: [ow], res: null, adv: false }; }
    H.qaPos[q.type] = i; H.view = 'qa'; qaTimer(); push(); if (autoStart && QA_TIME[q.type] && q.type !== 'spell') timerStart(); renderAll();
  }
  function qaNext(d) {
    var q = H.qa, n = (QA[q.type] || []).length; if (!n) return;
    var i = q.idx + d; if (i < 0) i = 0;
    if (i >= n) { if (q.type === 'written' && q.phase === 'ask') { qaPhase('reveal'); return; } goNext(); return; }
    if (q.type === 'written' && q.phase === 'reveal') { snap(); q.idx = i; q.revealed = true; q.mode = 'q'; H.view = 'qa'; push(); renderAll(); return; }
    qaShow(i, true);
  }
  function qaPhase(ph) { snap(); var q = H.qa; q.phase = ph; q.idx = 0; q.mode = 'q'; q.revealed = ph === 'reveal'; H.timer.running = false; H.view = 'qa'; push(); renderAll(); if (ph === 'reveal') splash('Answer reveal', GNAME.written); }
  function qaReveal() { snap(); H.qa.revealed = !H.qa.revealed; if (H.qa.revealed) { H.timer.running = false; H.timer.remaining = timerLeft(); fx('ding'); } push(); renderAll(); }
  function qaClue(d) { var it = qaItem(); if (!it) return; snap(); H.qa.clue = Math.max(1, Math.min(it.clues.length, H.qa.clue + d)); push(); renderAll(); }
  function qaMark(kind, ti) {
    snap(); var q = H.qa;
    if (kind === 'ok') { var p = 1; if (q.type === 'names') { var it = qaItem(); if (it && it.clues.length > 1) p = Math.max(1, it.clues.length + 1 - q.clue); } if (ti != null) pts(ti, p); q.mark = 'ok'; q.revealed = true; fx('ok'); if (ti != null) toast('+' + p + ' to ' + H.teams[ti].name); }
    else { q.mark = 'no'; q.revealed = q.type !== 'rapid' ? true : q.revealed; fx('buzz'); }
    H.timer.running = false; H.timer.remaining = timerLeft(); push(); renderAll();
  }
  function qaBoard() { snap(); var bb = H.qa.bd; if (bb && !bb.adv) { bb.adv = true; H.qa.turn = (bb.owner + 1) % H.teams.length; } H.qa.mode = 'board'; H.timer.running = false; H.view = 'qa'; push(); renderAll(); }
  function saveResult() {
    if (!H.gameId) H.gameId = Date.now().toString(36);
    var hist = store('pqt_history') || [], rec = { id: H.gameId, at: Date.now(), title: H.title || 'PQT', rounds: H.round, games: H.plan.slice(0, H.round).map(function (g) { return GNAME[g]; }), teams: H.teams.map(function (t, i) { var rp = roundPts(i); return { name: t.name, color: t.color, score: t.score, rounds: rp.rounds, pen: rp.pen }; }).sort(function (a, b) { return b.score - a.score; }) };
    hist = hist.filter(function (r) { return r.id !== rec.id; }); hist.unshift(rec); store('pqt_history', hist.slice(0, 40));
  }
  /* ---- Quests Feud: team by team (hits show live), recap per team, then every answer ---- */
  var FM_N = 5, FM_TIME = [20000, 25000];
  function fmNew() {
    var n = Math.min(FM_N, BOARDS.length), start = H.feud.qi || 0, qs = [];
    for (var k = 0; k < n; k++) qs.push((start + k) % BOARDS.length);
    H.feud.qi = (start + n) % Math.max(1, BOARDS.length);
    H.fm = { qs: qs, order: H.teams.map(function (_, i) { return i; }), ti: 0, qi: 0, phase: 'ready', picks: {}, last: null, rc: 0, rq: 0 };
  }
  function fmTeam() { var f = H.fm; return f.order[f.ti]; }
  function fmB(qi) { return BOARDS[H.fm.qs[qi]]; }
  function fmTakenBy(qi, a, except) { var f = H.fm, who = null; f.order.forEach(function (t) { if (t !== except && (f.picks[t] || {})[qi] === a) who = t; }); return who; }
  function fmScore(t) { var f = H.fm, s = 0; f.qs.forEach(function (_, qi) { var a = (f.picks[t] || {})[qi], b = fmB(qi); if (a != null && a >= 0 && b && b.a[a]) s += b.a[a].p; }); return s; }
  var fmAutoT = null;
  function fmAuto() { clearTimeout(fmAutoT); var f = H.fm, key = f.ti + ':' + f.qi; fmAutoT = setTimeout(function () { var g = H.fm; if (g && g.phase === 'answer' && g.ti + ':' + g.qi === key) fmNextQ(); }, 1200); }
  function fmPick(a) {
    var f = H.fm, t = fmTeam(); snap(); fmAuto();
    var by = a >= 0 ? fmTakenBy(f.qi, a, t) : null;
    var pk = f.picks[t] = f.picks[t] || {}, old = pk[f.qi], b = fmB(f.qi);
    if (old != null && old >= 0 && b && b.a[old]) pts(t, -b.a[old].p);
    if (by != null) { pk[f.qi] = -3; f.last = { qi: f.qi, msg: 'taken', by: by }; fx('buzz', { bigX: true }); toast('Already given by ' + ((H.teams[by] || {}).name || '') + ' · no points'); clearTimeout(fmAutoT); fmNextQ(); return; }
    pk[f.qi] = a;
    if (a >= 0 && b && b.a[a]) { pts(t, b.a[a].p); f.last = { qi: f.qi, msg: 'hit', a: a }; fx('ok'); }
    else { f.last = { qi: f.qi, msg: a === -2 ? 'pass' : 'miss' }; fx('buzz', a === -2 ? null : { bigX: true }); clearTimeout(fmAutoT); fmNextQ(); return; }
    push(); renderAll();
  }
  function fmNextQ() { var f = H.fm; snap(); f.last = null; if (f.qi + 1 < f.qs.length) f.qi++; else { f.phase = 'recap'; f.rc = 0; H.timer.running = false; H.timer.remaining = timerLeft(); } push(); renderAll(); }
  function fmStartTeam() { var f = H.fm; snap(); f.phase = 'answer'; f.qi = 0; f.last = null; H.view = 'fm'; H.timer.total = FM_TIME[Math.min(f.ti, 1)]; H.timer.remaining = H.timer.total; H.timer.running = false; push(); timerStart(); renderAll(); }
  function fmRecapNext() { var f = H.fm; snap(); if (f.rc < f.qs.length) { f.rc++; var a = (f.picks[fmTeam()] || {})[f.rc - 1]; fx(a != null && a >= 0 ? 'ok' : 'buzz'); } push(); renderAll(); }
  function fmAfterRecap() { var f = H.fm; snap(); if (f.ti + 1 < f.order.length) { f.ti++; f.phase = 'ready'; f.qi = 0; } else { f.phase = 'final'; f.rq = 0; splash('All the answers', GNAME.answers); } push(); renderAll(); }
  function fmFinalNext() { var f = H.fm; snap(); if (f.rq + 1 < f.qs.length) f.rq++; else f.phase = 'done'; push(); renderAll(); }
  function fmPub() {
    var f = H.fm; if (!f || H.roundType !== 'answers') return null;
    var t = fmTeam(), o = { phase: f.phase, n: f.qs.length, team: H.teams[t] ? H.teams[t].name : '' };
    if (f.phase === 'answer') {
      var b = fmB(f.qi); o.qi = f.qi; o.q = b ? b.q : ''; o.na = b ? b.a.length : 0;
      if (f.last && f.last.qi === f.qi) { o.msg = f.last.msg; if (f.last.msg === 'hit' && b) o.hit = { i: f.last.a, a: b.a[f.last.a].a, p: b.a[f.last.a].p }; if (f.last.msg === 'taken') o.takenBy = H.teams[f.last.by] ? H.teams[f.last.by].name : ''; }
    }
    if (f.phase === 'recap') {
      o.qs = f.qs.map(function (qq) { var b = BOARDS[qq]; return b ? b.q : ''; });
      o.items = f.qs.map(function (qq, qi) { if (qi >= f.rc) return null; var b = BOARDS[qq], a = (f.picks[t] || {})[qi], ans = a != null && a >= 0 && b ? b.a[a] : null; return { q: b ? b.q : '', a: ans ? ans.a : '', p: ans ? ans.p : 0, miss: !ans, taken: a === -3 }; });
      o.total = o.items.reduce(function (s, x) { return s + (x ? x.p : 0); }, 0);
    }
    if (f.phase === 'final') {
      var rb = fmB(f.rq); o.rq = f.rq; o.q = rb ? rb.q : '';
      o.all = (rb ? rb.a : []).map(function (x, i) { var by = fmTakenBy(f.rq, i, -1); return { a: x.a, p: x.p, by: by != null && H.teams[by] ? H.teams[by].name : '', hl: by != null }; });
    }
    if (f.phase === 'done') o.totals = f.order.map(function (x) { return { team: H.teams[x] ? H.teams[x].name : '', p: fmScore(x) }; }).sort(function (x, y) { return y.p - x.p; });
    return o;
  }
  function endGame() { snap(); saveResult(); H.ended = true; H.timer.running = false; H.timer.remaining = timerLeft(); H.view = 'winner'; push(); renderAll(); fx('win'); toast('Winner on screen'); }
  function togglePause() { H.paused = !H.paused; push(); paintNow(); toast(H.paused ? 'Screen paused' : 'Screen resumed'); }
  function turnReady() { snap(); resetTally(); H.timer.running = false; H.timer.remaining = H.timer.total; H.view = 'turn'; push(); renderAll(); }
  function wDone() { var d = H.words.done = H.words.done || []; return d; }
  function allPlayed() { var d = wDone(); return H.teams.every(function (_, i) { return d.indexOf(i) > -1; }); }
  function turnStart() { snap(); var dn = wDone(); if (dn.indexOf(H.words.team) < 0) dn.push(H.words.team); if (H.view !== 'words') resetTally(); H.view = 'words'; H.timer.running = false; H.timer.remaining = H.timer.total; push(); timerStart(); renderAll(); }
  function nextTeam() { if (H.view === 'words') { snap(); H.timer.running = false; H.timer.remaining = 0; H.view = 'turnend'; push(); renderAll(); if (allPlayed()) return; } if (allPlayed()) { renderAll(); return; } snap(); var dn2 = wDone(), n = H.teams.length, nt = H.words.team; for (var s = 1; s <= n; s++) { var c2 = (H.words.team + s) % n; if (dn2.indexOf(c2) < 0) { nt = c2; break; } } H.words.team = nt; resetTally(); H.timer.running = false; H.timer.remaining = H.timer.total; H.view = 'turn'; push(); renderAll(); }
  function curCard() { var w = H.words; return WORDS[w.deck[w.pos % Math.max(1, w.deck.length)]]; }
  function nextCard() { var w = H.words; w.pos++; if (w.pos >= w.deck.length) { w.deck = shuffle(w.deck); w.pos = 0; } }
  function wordAct(kind) {
    var c = curCard(); if (!c) return;
    snap();
    var w = H.words, t = team(w.team);
    if (kind === 'ok') { w.correct++; pts(w.team, 1); w.stream.push([c.w, 'ok']); fx('ok'); }
    else if (kind === 'skip') { w.skipped++; w.stream.push([c.w, 'sk']); fx('skip'); }
    else if (kind === 'buzz') { w.buzzed++; if (w.buzzCost) pts(w.team, -w.buzzCost); w.stream.push([c.w, 'no']); fx('buzz'); }
    nextCard(); push(); renderTab();
  }
  function newTurn(ti) {
    snap(); var w = H.words; w.team = ti; w.correct = w.skipped = w.buzzed = 0; w.stream = [];
    H.timer.running = false; H.timer.remaining = H.timer.total; H.view = 'words';
    push(); renderAll();
  }
  function feudToggle(i) {
    snap(); var f = H.feud;
    if (f.out[i]) delete f.out[i]; else { f.out[i] = f.awardedTo != null ? 's' : 'p'; fx('ding'); }
    push(); renderTab();
  }
  function feudStrike() { snap(); var f = H.feud; f.strikes = Math.min(3, f.strikes + 1); fx('buzz', { bigX: true }); push(); renderTab(); }
  function feudBank() { var b = BOARDS[H.feud.qi], s = 0; if (b) Object.keys(H.feud.out).forEach(function (i) { if (H.feud.out[i] === 'p' && b.a[i]) s += b.a[i].p; }); return s; }
  function feudAward(ti) { var p = feudBank(); if (!p) return; snap(); pts(ti, p); H.feud.awardedTo = ti; H.feud.awardedPts = p; fx('win'); push(); renderTab(); toast(p + ' points to ' + H.teams[ti].name); }
  function feudRevealAll() { snap(); var b = BOARDS[H.feud.qi]; if (!b) return; b.a.forEach(function (_, i) { if (!H.feud.out[i]) H.feud.out[i] = 's'; }); fx('ding'); push(); renderTab(); }
  function feudGo(qi) { snap(); H.feud = { qi: (qi + BOARDS.length) % Math.max(1, BOARDS.length), out: {}, strikes: 0, awardedTo: null, awardedPts: 0 }; H.view = 'answers'; push(); renderAll(); }
  function setView(v) { H.view = v; push(); renderViews(); paintNow(); }
  var VIEWNAME = { fm: 'Quests Feud', qa: 'Question on screen', lobby: 'Lobby', scores: 'Scores', ranking: 'Ranking', winner: 'Winner', words: 'All Except These Ones · playing', answers: 'Quests Feud board', intro: 'Round intro', turn: 'Up next', turnend: 'Time’s up' };
  function paintNow() {
    var v = $('[data-now-view]'); if (!v) return;
    v.textContent = (H.paused ? 'Paused · ' : '') + (VIEWNAME[H.view] || H.view);
    if (H.view === 'qa') v.textContent = (H.paused ? 'Paused · ' : '') + (H.qa.mode === 'board' ? 'Number board' : GNAME[H.qa.type] + ' · ' + (H.qa.idx + 1) + ' of ' + ((QA[H.qa.type] || []).length));
    if (H.ended) { v.textContent = 'Game over'; $('[data-now-round]').textContent = (H.title || 'PQT') + ' · winner on screen'; } else
    $('[data-now-round]').textContent = H.round ? 'Round ' + H.round + ' of ' + H.plan.length + ' · ' + GNAME[H.roundType] : H.plan.length + ' rounds planned · not started';
    var pb = $('[data-pause]'); pb.textContent = H.paused ? 'Resume screen' : 'Pause screen'; pb.classList.toggle('is-on', H.paused);
    var mp = $('[data-m-pause]'); if (mp) mp.textContent = H.paused ? 'Resume screen' : 'Pause screen';
    $('[data-now]').classList.toggle('is-paused', H.paused);
  }

  /* ---------- render host ---------- */
  var root = $('[data-host]');
  function renderAll() { renderViews(); renderTabs(); renderTab(); renderTeams(); paintTimer(); paintLink(); paintNow(); paintMenu(); renderPlan(); }
  function renderViews() { var gameV = ['words', 'answers', 'qa', 'intro', 'turn', 'turnend'].indexOf(H.view) > -1; $$('[data-view]').forEach(function (b) { var v = b.getAttribute('data-view'); b.classList.toggle('is-on', v === 'game' ? gameV : v === H.view); }); var gb = $('[data-view-game]'); if (gb) gb.textContent = H.roundType ? 'Game · ' + GNAME[H.roundType] : 'Game'; }
  function paneOf() { if (H.ended && H.tab === 'quiz') return 'quiz'; return H.tab === 'quiz' && (H.roundType === 'words' || H.roundType === 'answers') ? H.roundType : H.tab; }
  function renderTabs() { var pn = paneOf(); $$('[data-tab]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-tab') === H.tab); }); $$('[data-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== pn; }); }
  function teamOpts(sel) { return H.teams.map(function (t, i) { return '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join(''); }
  function renderTeams() {
    var box = $('[data-teams]'); if (!box) return;
    if (box.contains(document.activeElement) && document.activeElement.classList.contains('team__name')) { // keep typing focus
      $$('.team__score', box).forEach(function (s, i) { if (H.teams[i]) s.textContent = H.teams[i].score; }); return;
    }
    var bd = '';
    if (H.round > 0) {
      var hasPen = H.teams.some(function (_, i) { return roundPts(i).pen; });
      bd = '<div class="hc-bd"><p class="hc-sub">Points by round</p><div class="hc-bd__w"><table><thead><tr><th></th>' + Array.apply(null, Array(H.round)).map(function (_, r) { return '<th title="' + esc(GNAME[H.plan[r]] || '') + '">R' + (r + 1) + '</th>'; }).join('') + (hasPen ? '<th>Pen</th>' : '') + '<th>Total</th></tr></thead><tbody>' +
        H.teams.map(function (t, i) { var rp = roundPts(i); return '<tr><td><i style="background:' + t.color + '"></i>' + esc(t.name) + '</td>' + rp.rounds.map(function (v) { return '<td' + (v == null ? ' class="is-na"' : '') + '>' + (v == null ? '–' : v) + '</td>'; }).join('') + (hasPen ? '<td class="is-pen">' + (rp.pen || '') + '</td>' : '') + '<td><b>' + t.score + '</b></td></tr>'; }).join('') + '</tbody></table></div></div>';
    }
    var strikes = '<div class="hc-strk"><p class="hc-sub">Strikes <span>3 strikes = −' + (H.penalty || 3) + '<button class="pbtn pbtn--sm pbtn--ghost" data-pen="-1" type="button" aria-label="Smaller penalty">−</button><button class="pbtn pbtn--sm pbtn--ghost" data-pen="1" type="button" aria-label="Bigger penalty">+</button></span></p>' +
      H.teams.map(function (t, i) { var s = t.strikes || 0; return '<div class="hc-strk__r"><i style="background:' + t.color + '"></i><span>' + esc(t.name) + '</span><b class="hc-strk__x">' + [0, 1, 2].map(function (k) { return '<em class="' + (k < s ? 'is-on' : '') + '">✕</em>'; }).join('') + '</b><button class="pbtn pbtn--sm pbtn--ghost" data-unstrike="' + i + '" type="button"' + (s ? '' : ' disabled') + ' aria-label="Remove a strike">Undo</button><button class="pbtn pbtn--sm pbtn--bad" data-strike="' + i + '" type="button">Strike</button></div>'; }).join('') + '</div>';
    box.innerHTML = H.teams.map(function (t, i) {
      return '<div class="team"><span class="team__sw" style="background:' + t.color + '"></span><input class="team__name" data-tname="' + i + '" value="' + esc(t.name) + '" aria-label="Team name">' +
        '<div class="team__ctl"><button class="pbtn" data-sc="' + i + ':-1" aria-label="Minus 1">−</button><span class="team__score">' + t.score + '</span><button class="pbtn" data-sc="' + i + ':1" aria-label="Plus 1">+</button><button class="pbtn pbtn--ghost" data-sc="' + i + ':5">+5</button></div></div>';
    }).join('') + bd + strikes;
  }
  function teamAward(lbl) { return '<div class="hc-row hc-award">' + H.teams.map(function (t, i) { return '<button class="pbtn pbtn--sm" data-qok="' + i + '"><i style="width:3px;height:14px;background:' + t.color + '"></i>' + esc(t.name) + '</button>'; }).join('') + '<button class="pbtn pbtn--sm pbtn--bad" data-qno>' + (lbl || 'Wrong') + '</button></div>'; }
  function renderFM() {
    var f = H.fm, t = fmTeam(), tm = H.teams[t] || { name: '' }, out = '';
    var prog = '<div class="fm-prog">' + f.order.map(function (x, k) { return '<span class="' + (k < f.ti || f.phase === 'final' || f.phase === 'done' ? 'is-done' : k === f.ti ? 'is-on' : '') + '">' + esc((H.teams[x] || {}).name || '') + '</span>'; }).join('') + '</div>';
    if (H.view === 'intro' || f.phase === 'ready') return prog + '<p class="hc-note hc-lead">Every team answers the same ' + f.qs.length + ' questions, one team at a time. Keep the other teams out of earshot.</p><button class="pbtn pbtn--o pbtn--lg pbtn--block" data-fm="start" type="button">Start ' + esc(tm.name) + ' · ' + fmtT(FM_TIME[Math.min(f.ti, 1)]) + 's</button>';
    if (f.phase === 'answer') {
      var b = fmB(f.qi), mine = (f.picks[t] || {})[f.qi], last = f.last && f.last.qi === f.qi ? f.last : null;
      out += prog + '<div class="fm-head"><span>' + esc(tm.name) + ' · question ' + (f.qi + 1) + ' of ' + f.qs.length + '</span><b data-tflow>' + fmtT(timerLeft()) + '</b></div><p class="fq">' + esc(b ? b.q : '') + '</p>';
      if (last && last.msg === 'taken') out += '<p class="fm-msg is-warn">Already given by ' + esc((H.teams[last.by] || {}).name || '') + '. No points for this one.</p>';
      out += '<div class="fans">' + (b ? b.a : []).map(function (a, i) { var by = fmTakenBy(f.qi, i, t); return '<button class="fan' + (by != null ? ' is-taken' : '') + (mine === i ? ' is-cur' : '') + '" data-fmp="' + i + '" type="button"><span class="fan__n">' + (i + 1) + '</span><span>' + esc(a.a) + (by != null ? '<em> · ' + esc((H.teams[by] || {}).name || '') + ' has it</em>' : '') + '</span><span class="fan__p">' + a.p + '</span></button>'; }).join('') + '</div>';
      out += '<div class="w-actions" style="grid-template-columns:1fr 1fr;margin-top:10px"><button class="pbtn pbtn--bad pbtn--lg" data-fmp="-1" type="button">Not on the board</button><button class="pbtn pbtn--lg" data-fmp="-2" type="button">Pass</button></div>';
      out += '<div class="fm-auto"><button class="pbtn pbtn--sm pbtn--ghost" data-fm="back" type="button"' + (f.qi ? '' : ' disabled') + '>← Back</button><span>' + (mine != null ? 'Next question in a moment…' : 'Tap their answer · it moves on by itself') + '</span></div>';
      return out;
    }
    if (f.phase === 'recap') {
      out += prog + '<div class="fm-head"><span>' + esc(tm.name) + '’s answers · recap</span></div><div class="fm-rev">' + f.qs.map(function (qq, qi) { var bb = BOARDS[qq], a = (f.picks[t] || {})[qi], ans = a != null && a >= 0 && bb ? bb.a[a] : null; return '<div class="' + (qi < f.rc ? 'is-on' : '') + '"><b>' + esc(bb ? bb.q : '') + '</b><span>' + (ans ? esc(ans.a) : a === -2 ? 'Passed' : a === -3 ? 'Already taken' : 'Not on the board') + '</span><em>' + (ans ? ans.p : 0) + '</em></div>'; }).join('') + '</div>';
      var lastT = f.ti + 1 >= f.order.length;
      out += f.rc < f.qs.length ? '<button class="pbtn pbtn--o pbtn--lg pbtn--block" data-fm="recap" type="button">Reveal answer ' + (f.rc + 1) + '</button>' : '<button class="pbtn pbtn--white pbtn--lg pbtn--block" data-fm="afterrecap" type="button">' + (lastT ? 'Show all the answers →' : 'Next: ' + esc((H.teams[f.order[f.ti + 1]] || {}).name || '') + ' →') + '</button>';
      return out;
    }
    if (f.phase === 'final') {
      var rb = fmB(f.rq);
      return prog + '<div class="fm-head"><span>All the answers · question ' + (f.rq + 1) + ' of ' + f.qs.length + '</span></div><p class="fq">' + esc(rb ? rb.q : '') + '</p><p class="hc-note hc-lead">The full board is on the screen, with the teams that found each answer.</p><button class="pbtn pbtn--white pbtn--lg pbtn--block" data-fm="finalnext" type="button">' + (f.rq + 1 < f.qs.length ? 'Next question →' : 'Show round totals →') + '</button>';
    }
    var nx = nextPlanned();
    return prog + '<p class="hc-note hc-lead">Quests Feud is done. The round totals are on the screen.</p><button class="pbtn pbtn--white pbtn--lg pbtn--block" data-gonext type="button">' + (nx ? 'Start round ' + (H.round + 1) + ' →' : 'Finish game · show winner') + '</button>';
  }
  function renderQuiz() {
    if (H.ended) return '<p class="hc-note hc-lead">This game is over. Set up the next one to keep playing.</p><button class="pbtn pbtn--white pbtn--lg pbtn--block" data-setup-open type="button">Set up the next game</button>';
    var q = H.qa, type = QA_TYPES[H.roundType] ? H.roundType : '';
    if (!type) return '<p class="hc-note hc-lead">Start one of these rounds:</p><div class="hc-qstart">' + ['words', 'answers', 'names', 'spell', 'written', 'rapid', 'talk'].map(function (t) { var n = t === 'words' ? WORDS.length : t === 'answers' ? BOARDS.length : (QA[t] || []).length; return '<button class="hc-mi" data-round="' + t + '" type="button"><b>' + GNAME[t] + '</b><span>' + n + ' in your cards</span></button>'; }).join('') + '</div>';
    var list = QA[type] || [], it = list[q.idx], out = '';
    var last = q.idx + 1 >= list.length, finLbl = nextPlanned() ? 'Start round ' + (H.round + 1) + ' →' : 'Finish game · show winner', fin = '<button class="pbtn pbtn--o pbtn--lg pbtn--block hc-fin" data-gonext type="button">' + finLbl + '</button>';
    if (!list.length) return '<p class="mute">No ' + GNAME[type] + ' content yet. Add some in the Cards tab.</p>';
    if (H.view === 'intro') out += '<div class="hc-flowbox"><button class="pbtn pbtn--o pbtn--lg pbtn--block" ' + (QA_BOARD[type] ? 'data-qboard' : 'data-qgo="' + q.idx + '"') + '>' + (QA_BOARD[type] ? 'Show the number board' : 'Show ' + (type === 'talk' ? 'the topic' : 'question ' + (q.idx + 1))) + '</button></div>';
    if (QA_BOARD[type] && !(q.mode === 'q' && H.view === 'qa')) {
      var used = H.qaUsed[type] || [];
      out += '<p class="hc-sub">Number board · <b class="hc-pick" style="color:' + (H.teams[turnTeam()] || {}).color + '">' + esc(tn(turnTeam())) + '</b> picks · <label class="hc-pickch">change <select data-qturn>' + teamOpts(turnTeam()) + '</select></label></p><div class="hc-board">' + list.map(function (_, i) { return '<button class="hc-num' + (used.indexOf(i) > -1 ? ' is-used' : '') + (q.mode === 'q' && q.idx === i ? ' is-cur' : '') + '" data-qgo="' + i + '">' + (i + 1) + '</button>'; }).join('') + '</div>';
      if (H.view === 'qa' && (q.mode === 'board' || used.length >= list.length)) out += (used.length >= list.length ? '<p class="hc-note" style="margin:0 0 8px">Every number has been played.</p>' : '') + fin;
    }
    if (q.mode === 'q' && it && H.view === 'qa') {
      if (type === 'names') {
        out += '<div class="card card--white wcard hc-qcard"><p class="eyebrow" style="color:#666">' + (q.idx + 1) + ' of ' + list.length + ' · answer</p><div class="wcard__word">' + esc(it.a) + '</div></div>';
        out += '<div class="hc-qtext">' + it.clues.map(function (c, k) { return '<p class="' + (k < q.clue ? '' : 'is-off') + '">' + esc(c) + '</p>'; }).join('') + '</div>';
        if (it.clues.length > 1) out += '<div class="hc-row"><button class="pbtn pbtn--sm" data-qclue="1">Next clue (' + q.clue + '/' + it.clues.length + ')</button><span class="hc-note" style="margin:0">Worth ' + Math.max(1, it.clues.length + 1 - q.clue) + ' now</span></div>';
      } else if (type === 'spell') {
        out += '<div class="card card--white wcard hc-qcard"><p class="eyebrow" style="color:#666">Word ' + (q.idx + 1) + ' · say it aloud</p><div class="wcard__word">' + esc(it.w) + '</div><p class="hc-qdef">' + esc(it.d) + '</p><p class="hc-qex">' + esc(it.e) + '</p></div>';
      } else if (type === 'talk') {
        out += '<div class="card card--white wcard hc-qcard"><p class="eyebrow" style="color:#666">Topic ' + (q.idx + 1) + ' of ' + list.length + '</p><div class="hc-qtopic">' + esc(it) + '</div></div>';
      } else {
        out += '<div class="hc-qtext"><p class="hc-qlabel">' + (type === 'written' && q.phase === 'reveal' ? 'Answer reveal · ' : '') + 'Question ' + (q.idx + 1) + ' of ' + list.length + '</p>' + qHtml(it.q, '', it.a) + (it.img ? '<img class="hc-qimg" src="' + esc(it.img) + '" alt="">' : '') + '</div><div class="card card--white wcard hc-qcard"><p class="eyebrow" style="color:#666">Answer</p><div class="wcard__word hc-qans">' + esc(it.a) + '</div></div>';
      }
      if (type === 'talk') out += '<div class="w-actions" style="grid-template-columns:1fr 1fr"><button class="pbtn pbtn--lg" data-qnext="-1">← Previous</button><button class="pbtn pbtn--lg pbtn--white" data-qnext="1">' + (last ? finLbl : 'Next topic →') + '</button></div>';
      else if (type === 'written' && q.phase === 'ask') out += '<div class="w-actions" style="grid-template-columns:1fr 2fr"><button class="pbtn pbtn--lg" data-qnext="-1">← Back</button><button class="pbtn pbtn--lg pbtn--white" data-qnext="1">' + (q.idx + 1 < list.length ? 'Next question →' : 'Start answer reveal →') + '</button></div><p class="hc-note">Each question gets ' + fmtT(QA_TIME.written) + ' seconds. The answer stays hidden until the reveal.</p>';
      else if (type === 'written') out += '<div class="w-actions" style="grid-template-columns:1fr 2fr"><button class="pbtn pbtn--lg" data-qnext="-1">← Back</button><button class="pbtn pbtn--lg pbtn--white" data-qnext="1">' + (last ? finLbl : 'Next answer →') + '</button></div><p class="hc-sub" style="margin-top:16px">Score the sheets</p><p class="hc-note" style="margin:0 0 8px">Count each team’s correct answers, set them here, then add them all at once.</p><div class="hc-wd">' + H.teams.map(function (t, i) { var v = (H.qa.wd || {})[i] || 0; return '<div class="hc-wd__r"><i style="background:' + t.color + '"></i><span class="hc-wd__n">' + esc(t.name) + '<em>' + t.score + ' now</em></span><button class="pbtn" data-wd="' + i + ':-1" type="button" aria-label="Less">−</button><b class="hc-wd__v' + (v ? ' is-set' : '') + '">' + (v > 0 ? '+' : '') + v + '</b><button class="pbtn" data-wd="' + i + ':1" type="button" aria-label="More">+</button></div>'; }).join('') + '</div><button class="pbtn pbtn--white pbtn--lg pbtn--block" data-wd-go type="button"' + (H.teams.some(function (_, i) { return (H.qa.wd || {})[i]; }) ? '' : ' disabled') + '>Add points to all teams</button>';
      else {
        out += '<div class="hc-row" style="margin:10px 0"><button class="pbtn" data-qreveal>' + (q.revealed ? 'Hide answer' : 'Reveal answer') + '</button>' + (QA_TIME[type] ? '<button class="pbtn" data-qtime>' + (H.timer.running ? 'Pause timer' : 'Start ' + fmtT(QA_TIME[type]) + 's timer') + '</button>' : '') + '</div>';
        if (QA_BOARD[type] && q.bd) {
          var bd = q.bd;
          out += bd.res == null ? '<div class="hc-turn' + (bd.cur !== bd.owner ? ' is-bonus' : '') + '"><span>' + (bd.cur !== bd.owner ? 'Bonus · ' + esc(tn(bd.owner)) + ' missed' : 'Answering') + '</span><b><i style="background:' + (H.teams[bd.cur] || {}).color + '"></i>' + esc(tn(bd.cur)) + '</b></div><div class="w-actions" style="grid-template-columns:1fr 1fr"><button class="pbtn pbtn--good pbtn--lg" data-bd="1" type="button">✓ Correct</button><button class="pbtn pbtn--bad pbtn--lg" data-bd="0" type="button">✕ ' + (type === 'spell' ? 'Misspelt' : 'Wrong') + '</button></div>'
            : '<div class="hc-turn is-done"><span>' + (bd.res < 0 ? 'Nobody got it' : (bd.res !== bd.owner ? 'Bonus point' : 'Point')) + '</span><b>' + (bd.res < 0 ? 'No points' : '+' + (bd.pv || 1) + ' · ' + esc(tn(bd.res))) + '</b></div>';
          out += '<div class="w-actions" style="grid-template-columns:1fr;margin-top:12px"><button class="pbtn pbtn--lg pbtn--white" data-qboard>Back to the board · ' + esc(tn(bd.adv ? H.qa.turn : (bd.owner + 1) % H.teams.length)) + ' picks next</button></div>';
        } else out += '<p class="hc-sub">Correct? Tap the team</p>' + teamAward(type === 'spell' ? 'Misspelt' : 'Wrong');
        if (!QA_BOARD[type]) out += '<div class="w-actions" style="grid-template-columns:1fr 1fr;margin-top:12px">' + '<button class="pbtn pbtn--lg" data-qnext="-1">← Back</button><button class="pbtn pbtn--lg pbtn--white" data-qnext="1">' + (last ? finLbl : 'Next →') + '</button>' + '</div>';
      }
    }
    return out;
  }
  function renderTab() {
    var tab = paneOf();
    if (tab === 'words') {
      var c = curCard(), w = H.words, t = team(w.team);
      var nx = nextPlanned(), nextBtn = '<button class="pbtn pbtn--sm" data-gonext>' + (nx ? 'Round ' + (H.round + 1) + ' →' : 'Show winner →') + '</button>';
      var flow = H.roundType !== 'words' ? '<button class="pbtn pbtn--o pbtn--lg pbtn--block" data-round="words">Start round ' + (H.round + 1) + ' · All Except These Ones</button>' :
        H.view === 'words' ? '<div class="hc-flow"><span>' + esc(t ? t.name : '') + ' · <b data-tflow>' + fmtT(timerLeft()) + '</b></span><button class="pbtn pbtn--sm" data-nextteam>End turn</button></div>' :
        H.view === 'turnend' && allPlayed() ? '<div class="hc-flow hc-flow--end"><span>Time’s up · ' + esc(t ? t.name : '') + ' got ' + w.correct + '. Every team has played.</span></div><button class="pbtn pbtn--white pbtn--lg pbtn--block" data-gonext type="button">' + (nx ? 'Start round ' + (H.round + 1) + ' →' : 'Finish game · show winner') + '</button>' :
        H.view === 'turn' ? '<button class="pbtn pbtn--o pbtn--lg pbtn--block" data-turnstart>Start ' + esc(t ? t.name : '') + '’s turn · ' + fmtT(H.timer.total) + '</button>' :
        H.view === 'turnend' ? '<div class="hc-flow hc-flow--end"><span>Time’s up · ' + esc(t ? t.name : '') + ' got ' + w.correct + '</span><span class="hc-row"><button class="pbtn pbtn--o pbtn--sm" data-nextteam>Next team →</button></span></div>' :
        '<button class="pbtn pbtn--o pbtn--lg pbtn--block" data-turnready>Show “' + esc(t ? t.name : '') + ' up next”</button>';
      $('[data-wpane]').innerHTML = '<div class="hc-flowbox">' + flow + '</div>' +
        '<div class="hc-wset"><label><span>Team</span><select class="hc-sel" data-wteam>' + teamOpts(w.team) + '</select></label><div class="hc-wset__t"><span>Turn</span>' + [30000, 60000, 90000, 120000].map(function (ms) { return '<button class="pbtn pbtn--sm' + (H.timer.total === ms ? ' is-on' : '') + '" data-tset="' + ms + '" type="button">' + (ms < 120000 ? ms / 1000 + 's' : '2m') + '</button>'; }).join('') + '</div><label class="hc-wset__b"><input type="checkbox" data-buzzcost' + (w.buzzCost ? ' checked' : '') + '> Buzz costs a point</label></div>' +
        (c ? '<div class="card card--white wcard"><p class="eyebrow" style="color:#666">Only the clue giver sees this</p><div class="wcard__word">' + esc(c.w) + '</div><ul class="wcard__x">' + c.x.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '<p class="mute">Add words in the Cards tab.</p>') +
        '<div class="w-actions"><button class="pbtn pbtn--good pbtn--lg" data-w="ok">✓ Got it</button><button class="pbtn pbtn--lg" data-w="skip">Skip</button><button class="pbtn pbtn--bad pbtn--lg" data-w="buzz">✕ Buzz</button></div>' +
        '<div class="w-stats"><span>' + esc(t ? t.name : '') + '</span><span>✓ ' + w.correct + ' · Skip ' + w.skipped + ' · ✕ ' + w.buzzed + '</span></div>';
    } else if (tab === 'answers' && H.fm && H.roundType === 'answers') {
      $('[data-fpane]').innerHTML = renderFM();
    } else if (tab === 'answers') {
      var b = BOARDS[H.feud.qi], f = H.feud, bank = feudBank();
      $('[data-fpane]').innerHTML = !b ? '<p class="mute">Add questions in the Cards tab.</p>' :
        (H.roundType !== 'answers' ? '<div class="hc-flowbox"><button class="pbtn pbtn--o pbtn--lg pbtn--block" data-round="answers">Start round ' + (H.round + 1) + ' · Quests Feud</button></div>' : H.view !== 'answers' ? '<div class="hc-flowbox"><button class="pbtn pbtn--o pbtn--lg pbtn--block" data-view="answers">Show the board</button></div>' : '') +
        (f.strikes >= 3 && f.awardedTo == null ? '<p class="hc-steal">Three strikes · the other team can steal</p>' : '') +
        (H.roundType === 'answers' && f.awardedTo != null ? '<div class="hc-flow hc-flow--end"><span>Board done · ' + f.awardedPts + ' to ' + esc(H.teams[f.awardedTo] ? H.teams[f.awardedTo].name : '') + '</span><span class="hc-row"><button class="pbtn pbtn--sm" data-fnext>Next question</button><button class="pbtn pbtn--o pbtn--sm" data-gonext>' + (nextPlanned() ? 'Round ' + (H.round + 1) + ' →' : 'Winner →') + '</button></span></div>' : '') +
        '<div class="hc-row" style="margin:12px 0"><select class="hc-sel hc-grow" data-fq>' + BOARDS.map(function (x, i) { return '<option value="' + i + '"' + (i === f.qi ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(x.q.slice(0, 48)) + '</option>'; }).join('') + '</select><button class="pbtn pbtn--sm" data-fnext>Next</button></div>' +
        '<p class="fq">' + esc(b.q) + '</p><div class="fans">' + b.a.map(function (a, i) {
          return '<button class="fan' + (f.out[i] ? ' is-out' : '') + '" data-fa="' + i + '"><span class="fan__n">' + (i + 1) + '</span><span>' + esc(a.a) + '</span><span class="fan__p">' + a.p + '</span></button>';
        }).join('') + '</div>' +
        '<div class="hc-row" style="margin-top:12px;justify-content:space-between"><div class="hc-row"><button class="pbtn pbtn--bad" data-fx>✕ Strike</button><div class="strikes">' + [0, 1, 2].map(function (i) { return '<i class="' + (i < f.strikes ? 'is-on' : '') + '">✕</i>'; }).join('') + '</div><button class="pbtn pbtn--sm pbtn--ghost" data-fxclear>Clear</button></div>' +
        '<button class="pbtn pbtn--sm" data-fall>Reveal rest</button></div>' +
        '<h2 style="margin:18px 0 8px">' + (f.awardedTo != null ? 'Awarded ' + f.awardedPts + ' to ' + esc(H.teams[f.awardedTo] ? H.teams[f.awardedTo].name : '') : 'Bank: ' + bank + ' — give to') + '</h2>' +
        (f.awardedTo != null ? '' : '<div class="hc-row">' + H.teams.map(function (t, i) { return '<button class="pbtn pbtn--sm" data-faw="' + i + '"' + (bank ? '' : ' disabled') + '><i style="width:8px;height:8px;border-radius:50%;background:' + t.color + '"></i>' + esc(t.name) + '</button>'; }).join('') + '</div>') +
        '<p class="hc-note">Tap an answer to reveal it on the screen (tap again to hide). Points count towards the bank until you award them. “Reveal rest” shows the remaining answers without adding points.</p>';
    } else if (tab === 'quiz') {
      $('[data-qpane]').innerHTML = renderQuiz(); var qh = $('[data-pane="quiz"] h2'); if (qh) qh.textContent = QA_TYPES[H.roundType] && !H.ended ? GNAME[H.roundType] : 'Games';
    } else if (tab === 'cards') {
      var wa = $('[data-wtxt]'), ba = $('[data-btxt]');
      if (document.activeElement !== wa) wa.value = H.wordsTxt;
      if (document.activeElement !== ba) ba.value = H.boardsTxt;
      ['names', 'spell', 'written', 'rapid', 'talk'].forEach(function (k) { var el = $('[data-qtxt="' + k + '"]'); if (el && document.activeElement !== el) el.value = H[k + 'Txt'] || ''; });
      var CC = { words: WORDS.length + ' words', boards: BOARDS.length + ' questions', names: QA.names.length + ' people', spell: QA.spell.length + ' words', written: QA.written.length + ' questions', rapid: QA.rapid.length + ' questions', talk: QA.talk.length + ' topics' }; $$('[data-cc]').forEach(function (el) { el.textContent = CC[el.getAttribute('data-cc')] || ''; });
    }
  }

  /* events */
  root.addEventListener('click', function (e) {
    var b = e.target.closest('button,[data-tab],[data-menu-close],[data-pick-close]'); if (!b) return;
    var d = b.dataset;
    if (d.tab) { H.tab = d.tab; save(); renderTabs(); renderTab(); }
    else if (d.view === 'game') { var gv = H.roundType === 'words' ? 'words' : H.roundType === 'answers' ? 'fm' : QA_TYPES[H.roundType] ? 'qa' : ''; if (!gv) toast('No round yet. Start one from the Game tab.'); else { setView(gv); H.tab = 'quiz'; save(); renderTabs(); renderTab(); } }
    else if (d.view) setView(d.view);
    else if (d.sc) { var p = d.sc.split(':'); addScore(+p[0], +p[1]); }
    else if (d.w) wordAct(d.w);
    else if (b.hasAttribute('data-newturn')) newTurn(H.words.team);
    else if (b.hasAttribute('data-turnready')) turnReady();
    else if (b.hasAttribute('data-turnstart')) turnStart();
    else if (b.hasAttribute('data-nextteam')) nextTeam();
    else if (d.round) { closeSheets(); startRound(d.round); }
    else if (b.hasAttribute('data-pause')) togglePause();
    else if (b.hasAttribute('data-menu-open')) { closeSheets(); $('[data-menu]').hidden = false; }
    else if (b.hasAttribute('data-menu-close') || b.hasAttribute('data-pick-close')) closeSheets();
    else if (b.hasAttribute('data-setup-open')) openSetup(H.ended || H.round === 0);
    else if (b.hasAttribute('data-su-add')) { if (SU.teams.length < 8) { var used = SU.teams.map(function (t) { return t.color; }); SU.teams.push({ name: 'Team ' + String.fromCharCode(65 + SU.teams.length), color: COLORS.filter(function (c) { return used.indexOf(c) < 0; })[0] || COLORS[0] }); paintSetup(); var ins = $$('[data-su-name]'); ins[ins.length - 1].select(); } }
    else if (d.suDel != null) { if (SU.teams.length > 2) { SU.teams.splice(+d.suDel, 1); paintSetup(); } }
    else if (d.suCol != null) { var tt = SU.teams[+d.suCol], usedC = SU.teams.map(function (x) { return x.color; }), ci = COLORS.indexOf(tt.color); for (var s2 = 1; s2 <= COLORS.length; s2++) { var nc = COLORS[(ci + s2) % COLORS.length]; if (usedC.indexOf(nc) < 0 || s2 === COLORS.length) { tt.color = nc; break; } } paintSetup(); }
    else if (d.suN) { var nn = Math.max(1, Math.min(12, SU.plan.length + +d.suN)); if (!SU.fresh) nn = Math.max(nn, H.round || 1); var cyc = ['words', 'answers', 'names', 'spell', 'written', 'rapid']; while (SU.plan.length < nn) SU.plan.push(cyc[SU.plan.length % cyc.length]); SU.plan.length = nn; paintSetup(); }
    else if (b.hasAttribute('data-su-go')) applySetup();
    else if (b.hasAttribute('data-end-go')) { closeSheets(); endGame(); }
    else if (b.hasAttribute('data-end-back')) { closeSheets(); var g2 = pickGap(); if (g2) { var bi = -1; H.teams.forEach(function (t, i) { if (bi < 0 && t.name === g2.behind[0].name) bi = i; }); if (H.qa.bd && !H.qa.bd.adv) H.qa.bd.adv = true; H.qa.turn = bi < 0 ? 0 : bi; } H.tab = 'quiz'; qaBoard(); }
    else if (d.m) menuAct(d.m, b);
    else if (d.planN) { var n = Math.max(Math.max(1, H.round), Math.min(12, H.plan.length + +d.planN)); var cyc = ['words', 'answers', 'names', 'spell', 'written', 'rapid']; while (H.plan.length < n) H.plan.push(cyc[H.plan.length % cyc.length]); H.plan.length = n; push(); renderPlan(); paintMenu(); paintNow(); }
    else if (d.planI != null) { var k = +d.planI; if (k >= H.round) { var order = ['words', 'answers', 'names', 'spell', 'written', 'rapid', 'talk']; H.plan[k] = order[(order.indexOf(H.plan[k]) + 1) % order.length]; push(); renderPlan(); paintMenu(); } }
    else if (b.hasAttribute('data-gonext')) goNext();
    else if (d.qgo != null) qaShow(+d.qgo, true);
    else if (b.hasAttribute('data-qboard')) qaBoard();
    else if (d.qnext) qaNext(+d.qnext);
    else if (b.hasAttribute('data-qreveal')) qaReveal();
    else if (d.qclue) qaClue(+d.qclue);
    else if (d.fm) { var fa = d.fm; if (fa === 'start') fmStartTeam(); else if (fa === 'nextq') fmNextQ(); else if (fa === 'recap') fmRecapNext(); else if (fa === 'afterrecap') fmAfterRecap(); else if (fa === 'finalnext') fmFinalNext(); else if (fa === 'back') { clearTimeout(fmAutoT); snap(); H.fm.last = null; if (H.fm.qi > 0) H.fm.qi--; push(); renderAll(); } }
    else if (d.fmp != null) fmPick(+d.fmp);
    else if (d.bd != null) bdAnswer(d.bd === '1');
    else if (d.qok != null) qaMark('ok', +d.qok);
    else if (b.hasAttribute('data-qno')) qaMark('no');
    else if (d.strike != null) { var si = +d.strike, stm = H.teams[si]; if (stm) { snap(); stm.strikes = (stm.strikes || 0) + 1; if (stm.strikes >= 3) { stm.strikes = 0; pts(si, -(H.penalty || 3), 'pen'); fx('buzz', { bigX: true }); toast('Third strike · −' + (H.penalty || 3) + ' to ' + stm.name); } else { fx('buzz'); toast('Strike ' + stm.strikes + ' of 3 · ' + stm.name); } push(); renderTeams(); } }
    else if (d.unstrike != null) { var ui = +d.unstrike, utm = H.teams[ui]; if (utm && utm.strikes) { snap(); utm.strikes--; push(); renderTeams(); } }
    else if (d.pen) { H.penalty = Math.max(1, Math.min(20, (H.penalty || 3) + +d.pen)); save(); renderTeams(); }
    else if (d.wd) { var pw = d.wd.split(':'), wd = H.qa.wd = H.qa.wd || {}; wd[pw[0]] = (wd[pw[0]] || 0) + +pw[1]; save(); renderTab(); }
    else if (b.hasAttribute('data-wd-go')) { var wd2 = H.qa.wd || {}, msg = []; snap(); H.teams.forEach(function (t, i) { var v = wd2[i] || 0; if (v) { pts(i, v); msg.push(t.name + ' ' + (v > 0 ? '+' : '') + v); } }); H.qa.wd = {}; push(); renderTab(); fx('ok'); toast(msg.join(' · ')); }
    else if (b.hasAttribute('data-qtime')) { H.timer.running ? timerPause() : timerStart(); renderTab(); }
    else if (d.fa != null) feudToggle(+d.fa);
    else if (b.hasAttribute('data-fx')) feudStrike();
    else if (b.hasAttribute('data-fxclear')) { snap(); H.feud.strikes = 0; push(); renderTab(); }
    else if (b.hasAttribute('data-fall')) feudRevealAll();
    else if (d.faw != null) feudAward(+d.faw);
    else if (b.hasAttribute('data-fnext')) feudGo(H.feud.qi + 1);
    else if (b.hasAttribute('data-tgo')) { H.timer.running ? timerPause() : timerStart(); }
    else if (b.hasAttribute('data-treset')) timerReset();
    else if (d.tset) timerReset(+d.tset);
    else if (d.tadd) timerAdd(+d.tadd);
    else if (b.hasAttribute('data-addteam')) { if (H.teams.length < 8) { snap(); H.teams.push({ name: 'Team ' + String.fromCharCode(65 + H.teams.length), color: COLORS[H.teams.length % COLORS.length], score: 0 }); push(); renderTeams(); } }
    else if (b.hasAttribute('data-rmteam')) { if (H.teams.length > 1) { snap(); H.teams.pop(); if (H.words.team >= H.teams.length) H.words.team = 0; push(); renderAll(); } }
    else if (b.hasAttribute('data-zero')) { if (confirmTwice(b)) { snap(); H.teams.forEach(function (t) { t.score = 0; }); push(); renderTeams(); } }
    else if (b.hasAttribute('data-undo')) { var s = hist.pop(); if (s) { H = JSON.parse(s); push(); renderAll(); } }
    else if (b.hasAttribute('data-connect')) { var ok = connect($('[data-codein]').value); $('[data-codein]').classList.toggle('is-bad', !ok); delete $('[data-connect-sec]').dataset.force; }
    else if (b.hasAttribute('data-change')) { var cs = $('[data-connect-sec]'); if (!cs.hidden && linked()) { delete cs.dataset.force; cs.hidden = true; } else { cs.dataset.force = '1'; cs.hidden = false; window.scrollTo(0, 0); $('[data-codein]').focus(); } }
    else if (b.hasAttribute('data-setup-edit')) openSetup(H.ended || H.round === 0);
    else if (b.hasAttribute('data-opensc')) { var w = window.open('/pqt/screen/', 'pqtscreen'); if (!w) location.href = '/pqt/screen/'; }
    else if (b.hasAttribute('data-savecards')) { H.wordsTxt = $('[data-wtxt]').value; H.boardsTxt = $('[data-btxt]').value; ['names', 'spell', 'written', 'rapid', 'talk'].forEach(function (k) { var el = $('[data-qtxt="' + k + '"]'); if (el) H[k + 'Txt'] = el.value; }); loadQA(); reloadBanks(); b.textContent = 'Saved'; setTimeout(function () { b.textContent = 'Save cards'; }, 1500); }
    else if (b.hasAttribute('data-samples')) { if (confirmTwice(b)) { H.wordsTxt = window.PQT_SAMPLE_WORDS; H.boardsTxt = window.PQT_SAMPLE_BOARDS; H.namesTxt = window.PQT_SAMPLE_NAMES; H.spellTxt = window.PQT_SAMPLE_SPELL; H.writtenTxt = window.PQT_SAMPLE_WRITTEN; H.rapidTxt = window.PQT_SAMPLE_RAPID; H.talkTxt = window.PQT_SAMPLE_TALK; loadQA(); reloadBanks(); renderTab(); } }
  });
  function closeSheets() { $$('.hc-sheet').forEach(function (s) { s.hidden = true; }); }
  function menuAct(m, b) {
    if (m === 'newgame') { closeSheets(); openSetup(true); }
    else if (m === 'restart') { if (!confirmTwice(b.querySelector('b'))) return; closeSheets(); restartRound(); }
    else if (m === 'next') { closeSheets(); if (H.ended) openSetup(true); else if (!nextPlanned()) openEnd(); else goNext(); }
    else if (m === 'pick') { closeSheets(); $('[data-pick-title]').textContent = 'Round ' + (H.round + 1); $('[data-pick]').hidden = false; }
    else if (m === 'plan') { closeSheets(); renderPlan(); $('[data-plan]').hidden = false; }
    else if (m === 'end') { closeSheets(); openEnd(); }
    else if (m === 'pause') { closeSheets(); togglePause(); }
    else if (m === 'screen') { closeSheets(); var cs = $('[data-connect-sec]'); cs.dataset.force = '1'; cs.hidden = false; $('[data-codein]').focus(); window.scrollTo(0, 0); }
    else if (m === 'open') { closeSheets(); var w = window.open('/pqt/screen/', 'pqtscreen'); if (!w) location.href = '/pqt/screen/'; }
    else if (m === 'teams' || m === 'cards') { closeSheets(); H.tab = m; save(); renderTabs(); renderTab(); var pn = $('[data-pane="' + m + '"]'); if (pn) pn.scrollIntoView({ block: 'start' }); }
    else if (m === 'lock') { try { localStorage.removeItem('pqt_pass'); } catch (e) {} location.reload(); }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheets(); });
  /* ---- setup + end sheets ---- */
  var SU = null;
  function inPlay() { return H.round > 0 && !H.ended && H.teams.some(function (t) { return t.score; }); }
  function openSetup(fresh) {
    SU = { fresh: !!fresh, title: H.title || '', teams: H.teams.map(function (t) { return { name: t.name, color: t.color }; }), plan: H.plan.slice() };
    if (fresh && H.ended) SU.title = '';
    var stEl = $('[data-su-title]'); if (stEl) stEl.value = SU.title;
    var sv = $('[data-su-savewrap]'); sv.hidden = !(fresh && inPlay()); $('[data-su-save]').checked = true;
    $('[data-su-go]').textContent = fresh || H.round === 0 ? 'Start new game' : 'Save setup';
    $('[data-su-note]').textContent = fresh || H.round === 0 ? 'Scores start at 0 and the lobby goes up on the screen. Your cards and questions stay.' : 'New teams start from this round. Teams already playing keep their points.';
    paintSetup(); $('[data-setup]').hidden = false;
  }
  function paintSetup() {
    $('[data-su-tn]').textContent = SU.teams.length + ' of 8';
    $('[data-su-teams]').innerHTML = SU.teams.map(function (t, i) { return '<div class="hc-su__team"><button class="hc-su__sw" type="button" data-su-col="' + i + '" style="background:' + t.color + '" aria-label="Change colour"></button><input class="hc-input" data-su-name="' + i + '" value="' + esc(t.name) + '" maxlength="24" aria-label="Team name"><button class="pbtn pbtn--sm pbtn--ghost" type="button" data-su-del="' + i + '" aria-label="Remove team"' + (SU.teams.length <= 2 || (!SU.fresh && H.round > 0 && i < H.teams.length) ? ' disabled' : '') + '>✕</button></div>'; }).join('');
    $('[data-su-add]').disabled = SU.teams.length >= 8;
    $('[data-su-count]').textContent = SU.plan.length;
    var opts = ['words', 'answers', 'names', 'spell', 'written', 'rapid', 'talk'];
    $('[data-su-rounds]').innerHTML = SU.plan.map(function (g, i) { var locked = !SU.fresh && i < H.round; return '<label class="hc-su__round"><span>Round ' + (i + 1) + '</span><select class="hc-sel" data-su-r="' + i + '"' + (locked ? ' disabled' : '') + '>' + opts.map(function (o) { return '<option value="' + o + '"' + (o === g ? ' selected' : '') + '>' + GNAME[o] + '</option>'; }).join('') + '</select></label>'; }).join('');
  }
  function applySetup() {
    var fresh = SU.fresh || H.round === 0;
    if (fresh && SU.fresh && inPlay() && $('[data-su-save]').checked) saveResult();
    snap();
    H.title = (SU.title || '').trim();
    var old = H.teams; H.teams = SU.teams.map(function (t, i) { var o = !fresh && old[i]; return { name: t.name.trim() || 'Team ' + String.fromCharCode(65 + i), color: t.color, score: o ? o.score : 0, strikes: o ? o.strikes || 0 : 0, joined: o ? o.joined || 0 : (fresh ? 0 : Math.max(1, H.round)) }; });
    H.plan = SU.plan.slice();
    var t0 = $('[data-title]'); if (t0) t0.value = H.title;
    closeSheets();
    if (fresh) newGame(); else { push(); renderAll(); toast('Setup saved'); }
  }
  function pickGap() {
    if (!QA_BOARD[H.roundType] || !H.picks) return null;
    var c = H.teams.map(function (_, i) { return H.picks[i] || 0; }), mx = Math.max.apply(null, c);
    if (!mx) return null;
    var behind = H.teams.map(function (t, i) { return { name: t.name, n: c[i] }; }).filter(function (x) { return x.n < mx; });
    return behind.length ? { max: mx, behind: behind } : null;
  }
  function openEnd() {
    var g = pickGap(), wb = $('[data-end-warn]');
    if (wb) { wb.hidden = !g; if (g) wb.innerHTML = '<b>Not everyone has had the same number of picks</b><span>' + g.behind.map(function (x) { return esc(x.name) + (x.n ? ' has picked ' + x.n : ' hasn’t picked yet'); }).join(' · ') + '. Others have picked ' + g.max + '.</span><button class="pbtn pbtn--white" data-end-back type="button">Back to the board · ' + esc(g.behind[0].name) + ' picks</button>'; }
    $('[data-end-go]').textContent = g ? 'End anyway' : 'End game · show winner';
    $('[data-end-go]').classList.toggle('pbtn--o', !g);
    var rows = H.teams.map(function (t) { return t; }).slice().sort(function (a, b) { return b.score - a.score; });
    $('[data-end-sub]').textContent = (H.title || 'PQT') + ' · ' + H.round + ' of ' + H.plan.length + ' rounds played';
    $('[data-end-list]').innerHTML = rows.map(function (t, i) { var rp = roundPts(H.teams.indexOf(t)); return '<li><span>' + (i + 1) + '</span><i style="background:' + t.color + '"></i><b>' + esc(t.name) + '<small>' + rp.rounds.map(function (v, r) { return 'R' + (r + 1) + ' ' + (v == null ? '–' : v); }).join(' · ') + (rp.pen ? ' · Penalty ' + rp.pen : '') + '</small></b><em>' + t.score + '</em></li>'; }).join('');
    $('[data-endsheet]').hidden = false;
  }
  function confirmTwice(b) {
    if (b.dataset.armed) { delete b.dataset.armed; b.textContent = b.dataset.label; return true; }
    b.dataset.label = b.textContent; b.dataset.armed = '1'; b.textContent = 'Tap again to confirm';
    setTimeout(function () { if (b.dataset.armed) { delete b.dataset.armed; b.textContent = b.dataset.label; } }, 3000);
    return false;
  }
  function reloadBanks() {
    WORDS = parseWords(H.wordsTxt); BOARDS = parseBoards(H.boardsTxt);
    H.words.deck = shuffle(WORDS.map(function (_, i) { return i; })); H.words.pos = 0;
    H.feud = { qi: 0, out: {}, strikes: 0, awardedTo: null, awardedPts: 0 };
    push(); renderTab();
  }
  root.addEventListener('input', function (e) {
    var el0 = e.target; if (SU && el0.hasAttribute('data-su-title')) SU.title = el0.value; if (SU && el0.dataset.suName != null) SU.teams[+el0.dataset.suName].name = el0.value;
    var el = e.target;
    if (el.dataset.tname != null) { H.teams[+el.dataset.tname].name = el.value.slice(0, 28) || 'Team'; push(); }
    if (el.hasAttribute('data-codein')) el.value = cleanCode(el.value);
    if (el.hasAttribute('data-title')) { H.title = el.value.slice(0, 60); push(); }
  });
  root.addEventListener('change', function (e) {
    if (SU && e.target.dataset.suR != null) SU.plan[+e.target.dataset.suR] = e.target.value;
    if (e.target.hasAttribute('data-qturn')) { H.qa.turn = +e.target.value; push(); renderTab(); }
    var el = e.target;
    if (el.hasAttribute('data-wteam')) { snap(); H.words.team = +el.value; push(); renderTab(); }
    if (el.hasAttribute('data-buzzcost')) { H.words.buzzCost = el.checked ? 1 : 0; save(); }
    if (el.hasAttribute('data-fq')) feudGo(+el.value);
    if (el.dataset.tname != null) renderAll();
  });
  root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.hasAttribute('data-codein')) $('[data-connect]').click(); });

  var t0 = $('[data-title]'); if (t0) t0.value = H.title;
  var qc = cleanCode(new URLSearchParams(location.search).get('code'));
  if (qc.length === 4) H.code = qc;
  if (H.code) { $('[data-codein]').value = H.code; connect(H.code); }
  renderAll();
}
if (document.body.hasAttribute('data-locked')) document.addEventListener('pqt:unlock', pqtMain, { once: true }); else pqtMain();
