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
          return '<div class="card sc-score" style="--c:' + t.color + '"><div class="sc-score__name">' + esc(t.name) + '</div><div class="sc-score__pts">' + t.score + '</div></div>';
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
          '<div><div class="sc-words__team" style="--c:' + t.color + '"><i></i>' + esc(t.name) + '</div><div class="sc-words__title">Don’t Say It</div>' +
          '<div class="sc-tally"><div class="card card--o"><b>' + w.correct + '</b><span>Correct</span></div><div class="card"><b>' + w.skipped + '</b><span>Skipped</span></div><div class="card"><b>' + w.buzzed + '</b><span>Buzzed</span></div></div>' +
          '<div class="sc-stream">' + (w.stream || []).map(function (s) { return '<span class="' + s[1] + '">' + esc(s[0]) + '</span>'; }).join('') + '</div></div></div>';
      },
      intro: function () {
        var isW = S.roundType === 'words';
        var rules = isW ? ['One clue giver per team, against the clock.', 'Describe the word. Don’t say it, or any banned word.', 'Every word guessed is a point. A buzz costs one.']
                        : ['We asked people a question. Find their top answers.', 'Each answer you find adds its points to the board.', 'Three strikes and the other team can steal it all.'];
        return '<div class="sc-intro"><p class="sc-intro__r">Round ' + (S.round || 1) + (S.rounds ? ' of ' + S.rounds : '') + '</p><h1 class="sc-intro__t">' + (isW ? 'Don’t Say It' : 'Top Answers') + '</h1>' +
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
      var d = document.createElement('div'); d.className = 'sc-bigx'; d.innerHTML = '<span>✕</span>';
      document.body.appendChild(d); setTimeout(function () { d.remove(); }, 950);
    }
    var lastSec = null;
    function tickClock(force) {
      var left = timerRun ? Math.max(0, timerEnd - Date.now()) : timerLeft;
      var show = S && timerTotal > 0 && ['words', 'join', 'intro', 'turn', 'turnend', 'winner', 'lobby'].indexOf(S.view) < 0 && (timerRun || left < timerTotal);
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
    round: 0, roundType: '', paused: false, ledger: [], plan: ['words', 'answers', 'words']
  };
  var H = store('pqt_host') || JSON.parse(JSON.stringify(DEF));
  Object.keys(DEF).forEach(function (k) { if (H[k] == null) H[k] = JSON.parse(JSON.stringify(DEF[k])); });
  // Hosts still on the first 40 sample words get the bigger sample list automatically
  if (window.PQT_SAMPLE_WORDS && H.wordsTxt === window.PQT_SAMPLE_WORDS.split('\n').slice(0, 40).join('\n')) H.wordsTxt = window.PQT_SAMPLE_WORDS;
  var WORDS = parseWords(H.wordsTxt), BOARDS = parseBoards(H.boardsTxt);
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
      teams: H.teams.map(function (x) { return { name: x.name, color: x.color, score: x.score }; }),
      timer: { total: t.total, remaining: left, running: t.running },
      words: { team: w.team, correct: w.correct, skipped: w.skipped, buzzed: w.buzzed, stream: w.stream.slice(-14), pts: w.correct - (w.buzzCost ? w.buzzed : 0) },
      feud: b ? { key: H.feud.qi + ':' + b.q, q: b.q, n: b.a.length, out: out, strikes: f.strikes, bank: f.awardedTo != null ? 0 : bank, awardedTo: f.awardedTo, awardedPts: f.awardedPts } : null
    };
  }
  var hmq = null, mqScreen = false, seqN = 0;
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
    var n = $('[data-tnum]'); if (!n) return;
    var left = timerLeft();
    n.textContent = fmtT(left); n.classList.toggle('is-low', left <= 10000);
    var tf = $('[data-tflow]'); if (tf) tf.textContent = fmtT(left);
    var b = $('[data-tgo]'); if (b) b.textContent = H.timer.running ? 'Pause' : 'Start';
    $$('[data-tset]').forEach(function (x) { x.classList.toggle('is-on', +x.getAttribute('data-tset') === H.timer.total); });
  }
  setInterval(function () {
    var t = H.timer;
    if (t.running && Date.now() >= t.endsAt) { t.running = false; t.remaining = 0; if (H.view === 'words') { H.view = 'turnend'; renderViews(); renderTab(); paintNow(); toast('Time’s up for ' + (team(H.words.team) || {}).name); } push(); fx('end'); }
    paintTimer();
  }, 200);

  /* actions */
  function team(i) { return H.teams[i]; }
  function pts(i, d) { var t = team(i); if (!t || !d) return; t.score += d; H.ledger.push([i, d]); }
  function addScore(i, d) { snap(); pts(i, d); push(); renderTeams(); }
  var toastT = null;
  function toast(msg) { var el = $('[data-toast]'); if (!el) return; el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, 2200); }
  function splash(text, sub) { fx('splash', { text: text, sub: sub || '' }); }
  function resetTally() { var w = H.words; w.correct = w.skipped = w.buzzed = 0; w.stream = []; }
  function startRound(type) {
    snap(); H.round++; H.roundType = type; H.ledger = []; H.paused = false;
    resetTally(); H.timer.running = false; H.timer.remaining = H.timer.total;
    if (type === 'answers') H.feud = { qi: H.feud.qi || 0, out: {}, strikes: 0, awardedTo: null, awardedPts: 0 };
    if (H.round > H.plan.length) H.plan.push(type); else H.plan[H.round - 1] = type;
    H.view = 'intro'; H.tab = type; push(); renderAll(); toast('Round ' + H.round + ' of ' + H.plan.length + ' · ' + GNAME[type]);
  }
  var GNAME = { words: 'Don’t Say It', answers: 'Top Answers' };
  function nextPlanned() { return H.round < H.plan.length ? H.plan[H.round] : null; }
  function goNext() { var n = nextPlanned(); if (n) startRound(n); else endGame(); }
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
    var ps0 = $('.hc-plansec'); if (ps0) ps0.hidden = H.round > 0;
    var n = nextPlanned(), b = $('[data-m-next]'), sb = $('[data-m-next-sub]');
    if (b) b.textContent = n ? 'Start round ' + (H.round + 1) + ' of ' + H.plan.length : 'All rounds played · show winner';
    if (sb) sb.textContent = n ? GNAME[n] + ' · from your game plan' : 'End the game with the podium.';
    var ps = $('[data-m-plan-sub]'); if (ps) ps.textContent = H.plan.length + ' rounds · ' + H.plan.map(function (g) { return g === 'words' ? 'DSI' : 'TA'; }).join(' → ');
  }
  function restartRound() {
    if (!H.roundType) { toast('No round to restart yet'); return; }
    snap(); H.ledger.forEach(function (l) { var t = team(l[0]); if (t) t.score -= l[1]; }); H.ledger = [];
    resetTally(); H.timer.running = false; H.timer.remaining = H.timer.total;
    if (H.roundType === 'answers') H.feud = { qi: H.feud.qi, out: {}, strikes: 0, awardedTo: null, awardedPts: 0 };
    H.view = 'intro'; push(); renderAll(); splash('Round ' + H.round, 'Restarted'); toast('Round ' + H.round + ' restarted');
  }
  function newGame() {
    snap(); H.teams.forEach(function (t) { t.score = 0; }); H.round = 0; H.roundType = ''; H.ledger = []; H.paused = false;
    resetTally(); H.words.team = 0; H.timer.running = false; H.timer.remaining = H.timer.total;
    H.feud = { qi: 0, out: {}, strikes: 0, awardedTo: null, awardedPts: 0 };
    H.view = 'lobby'; push(); renderAll(); splash('New game', H.title); toast('New game started');
  }
  function endGame() { snap(); H.timer.running = false; H.timer.remaining = timerLeft(); H.view = 'winner'; push(); renderAll(); fx('win'); toast('Winner on screen'); }
  function togglePause() { H.paused = !H.paused; push(); paintNow(); toast(H.paused ? 'Screen paused' : 'Screen resumed'); }
  function turnReady() { snap(); resetTally(); H.timer.running = false; H.timer.remaining = H.timer.total; H.view = 'turn'; push(); renderAll(); }
  function turnStart() { snap(); if (H.view !== 'words') resetTally(); H.view = 'words'; H.timer.running = false; H.timer.remaining = H.timer.total; push(); timerStart(); renderAll(); }
  function nextTeam() { snap(); H.words.team = (H.words.team + 1) % H.teams.length; resetTally(); H.timer.running = false; H.timer.remaining = H.timer.total; H.view = 'turn'; push(); renderAll(); }
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
  var VIEWNAME = { lobby: 'Lobby', scores: 'Scores', ranking: 'Ranking', winner: 'Winner', words: 'Don’t Say It · playing', answers: 'Top Answers board', intro: 'Round intro', turn: 'Up next', turnend: 'Time’s up' };
  function paintNow() {
    var v = $('[data-now-view]'); if (!v) return;
    v.textContent = (H.paused ? 'Paused · ' : '') + (VIEWNAME[H.view] || H.view);
    $('[data-now-round]').textContent = H.round ? 'Round ' + H.round + ' of ' + H.plan.length + ' · ' + GNAME[H.roundType] : H.plan.length + ' rounds planned · not started';
    var pb = $('[data-pause]'); pb.textContent = H.paused ? 'Resume screen' : 'Pause screen'; pb.classList.toggle('is-on', H.paused);
    var mp = $('[data-m-pause]'); if (mp) mp.textContent = H.paused ? 'Resume screen' : 'Pause screen';
    $('[data-now]').classList.toggle('is-paused', H.paused);
  }

  /* ---------- render host ---------- */
  var root = $('[data-host]');
  function renderAll() { renderViews(); renderTabs(); renderTab(); renderTeams(); paintTimer(); paintLink(); paintNow(); paintMenu(); renderPlan(); }
  function renderViews() { $$('[data-view]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-view') === H.view); }); }
  function renderTabs() { $$('[data-tab]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-tab') === H.tab); }); $$('[data-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== H.tab; }); }
  function teamOpts(sel) { return H.teams.map(function (t, i) { return '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join(''); }
  function renderTeams() {
    var box = $('[data-teams]'); if (!box) return;
    if (box.contains(document.activeElement) && document.activeElement.classList.contains('team__name')) { // keep typing focus
      $$('.team__score', box).forEach(function (s, i) { if (H.teams[i]) s.textContent = H.teams[i].score; }); return;
    }
    box.innerHTML = H.teams.map(function (t, i) {
      return '<div class="team"><span class="team__sw" style="background:' + t.color + '"></span><input class="team__name" data-tname="' + i + '" value="' + esc(t.name) + '" aria-label="Team name">' +
        '<div class="team__ctl"><button class="pbtn" data-sc="' + i + ':-1" aria-label="Minus 1">−</button><span class="team__score">' + t.score + '</span><button class="pbtn" data-sc="' + i + ':1" aria-label="Plus 1">+</button><button class="pbtn pbtn--ghost" data-sc="' + i + ':5">+5</button></div></div>';
    }).join('');
  }
  function renderTab() {
    var tab = H.tab;
    if (tab === 'words') {
      var c = curCard(), w = H.words, t = team(w.team);
      var nx = nextPlanned(), nextBtn = '<button class="pbtn pbtn--sm" data-gonext>' + (nx ? 'Round ' + (H.round + 1) + ' →' : 'Show winner →') + '</button>';
      var flow = H.roundType !== 'words' ? '<button class="pbtn pbtn--o pbtn--lg pbtn--block" data-round="words">Start round ' + (H.round + 1) + ' · Don’t Say It</button>' :
        H.view === 'words' ? '<div class="hc-flow"><span>' + esc(t ? t.name : '') + ' · <b data-tflow>' + fmtT(timerLeft()) + '</b></span><button class="pbtn pbtn--sm" data-nextteam>End turn · next team</button></div>' :
        H.view === 'turn' ? '<button class="pbtn pbtn--o pbtn--lg pbtn--block" data-turnstart>Start ' + esc(t ? t.name : '') + '’s turn · ' + fmtT(H.timer.total) + '</button>' :
        H.view === 'turnend' ? '<div class="hc-flow hc-flow--end"><span>Time’s up · ' + esc(t ? t.name : '') + ' got ' + w.correct + '</span><span class="hc-row"><button class="pbtn pbtn--o pbtn--sm" data-nextteam>Next team →</button>' + nextBtn + '</span></div>' :
        '<button class="pbtn pbtn--o pbtn--lg pbtn--block" data-turnready>Show “' + esc(t ? t.name : '') + ' up next”</button>';
      $('[data-wpane]').innerHTML = '<div class="hc-flowbox">' + flow + '</div>' +
        '<div class="hc-row" style="margin:12px 0"><select class="hc-sel" data-wteam>' + teamOpts(w.team) + '</select><button class="pbtn pbtn--sm pbtn--ghost" data-turnready>Up next</button><label class="mute" style="font-size:13px;display:flex;gap:6px;align-items:center;margin-left:auto"><input type="checkbox" data-buzzcost' + (w.buzzCost ? ' checked' : '') + '> Buzz costs 1</label></div>' +
        (c ? '<div class="card card--white wcard"><p class="eyebrow" style="color:#666">Only the clue giver sees this</p><div class="wcard__word">' + esc(c.w) + '</div><ul class="wcard__x">' + c.x.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '<p class="mute">Add words in the Cards tab.</p>') +
        '<div class="w-actions"><button class="pbtn pbtn--good pbtn--lg" data-w="ok">✓ Got it</button><button class="pbtn pbtn--lg" data-w="skip">Skip</button><button class="pbtn pbtn--bad pbtn--lg" data-w="buzz">✕ Buzz</button></div>' +
        '<div class="w-stats"><span>' + esc(t ? t.name : '') + '</span><span>✓ ' + w.correct + ' · Skip ' + w.skipped + ' · ✕ ' + w.buzzed + '</span></div>';
    } else if (tab === 'answers') {
      var b = BOARDS[H.feud.qi], f = H.feud, bank = feudBank();
      $('[data-fpane]').innerHTML = !b ? '<p class="mute">Add questions in the Cards tab.</p>' :
        (H.roundType !== 'answers' ? '<div class="hc-flowbox"><button class="pbtn pbtn--o pbtn--lg pbtn--block" data-round="answers">Start round ' + (H.round + 1) + ' · Top Answers</button></div>' : H.view !== 'answers' ? '<div class="hc-flowbox"><button class="pbtn pbtn--o pbtn--lg pbtn--block" data-view="answers">Show the board</button></div>' : '') +
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
    } else if (tab === 'cards') {
      var wa = $('[data-wtxt]'), ba = $('[data-btxt]');
      if (document.activeElement !== wa) wa.value = H.wordsTxt;
      if (document.activeElement !== ba) ba.value = H.boardsTxt;
      $('[data-ccount]').textContent = WORDS.length + ' words · ' + BOARDS.length + ' questions';
    }
  }

  /* events */
  root.addEventListener('click', function (e) {
    var b = e.target.closest('button,[data-tab],[data-menu-close],[data-pick-close]'); if (!b) return;
    var d = b.dataset;
    if (d.tab) { H.tab = d.tab; save(); renderTabs(); renderTab(); }
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
    else if (d.m) menuAct(d.m, b);
    else if (d.planN) { var n = Math.max(Math.max(1, H.round), Math.min(12, H.plan.length + +d.planN)); while (H.plan.length < n) H.plan.push(H.plan.length % 2 ? 'answers' : 'words'); H.plan.length = n; push(); renderPlan(); paintMenu(); paintNow(); }
    else if (d.planI != null) { var k = +d.planI; if (k >= H.round) { H.plan[k] = H.plan[k] === 'words' ? 'answers' : 'words'; push(); renderPlan(); paintMenu(); } }
    else if (b.hasAttribute('data-gonext')) goNext();
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
    else if (b.hasAttribute('data-change')) { var cs = $('[data-connect-sec]'); cs.dataset.force = '1'; cs.hidden = false; $('[data-codein]').focus(); }
    else if (b.hasAttribute('data-opensc')) { var w = window.open('/pqt/screen/', 'pqtscreen'); if (!w) location.href = '/pqt/screen/'; }
    else if (b.hasAttribute('data-savecards')) { H.wordsTxt = $('[data-wtxt]').value; H.boardsTxt = $('[data-btxt]').value; reloadBanks(); b.textContent = 'Saved'; setTimeout(function () { b.textContent = 'Save cards'; }, 1500); }
    else if (b.hasAttribute('data-samples')) { if (confirmTwice(b)) { H.wordsTxt = window.PQT_SAMPLE_WORDS; H.boardsTxt = window.PQT_SAMPLE_BOARDS; reloadBanks(); renderTab(); } }
  });
  function closeSheets() { $$('.hc-sheet').forEach(function (s) { s.hidden = true; }); }
  function menuAct(m, b) {
    if (m === 'newgame') { if (!confirmTwice(b.querySelector('b'))) return; closeSheets(); newGame(); }
    else if (m === 'restart') { if (!confirmTwice(b.querySelector('b'))) return; closeSheets(); restartRound(); }
    else if (m === 'next') { closeSheets(); goNext(); }
    else if (m === 'pick') { closeSheets(); $('[data-pick-title]').textContent = 'Round ' + (H.round + 1); $('[data-pick]').hidden = false; }
    else if (m === 'plan') { closeSheets(); renderPlan(); $('[data-plan]').hidden = false; }
    else if (m === 'end') { closeSheets(); endGame(); }
    else if (m === 'pause') { closeSheets(); togglePause(); }
    else if (m === 'screen') { closeSheets(); var cs = $('[data-connect-sec]'); cs.dataset.force = '1'; cs.hidden = false; $('[data-codein]').focus(); window.scrollTo(0, 0); }
    else if (m === 'open') { closeSheets(); var w = window.open('/pqt/screen/', 'pqtscreen'); if (!w) location.href = '/pqt/screen/'; }
    else if (m === 'teams' || m === 'cards') { closeSheets(); H.tab = m; save(); renderTabs(); renderTab(); var pn = $('[data-pane="' + m + '"]'); if (pn) pn.scrollIntoView({ block: 'start' }); }
    else if (m === 'lock') { try { localStorage.removeItem('pqt_pass'); } catch (e) {} location.reload(); }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheets(); });
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
    var el = e.target;
    if (el.dataset.tname != null) { H.teams[+el.dataset.tname].name = el.value.slice(0, 28) || 'Team'; push(); }
    if (el.hasAttribute('data-codein')) el.value = cleanCode(el.value);
    if (el.hasAttribute('data-title')) { H.title = el.value.slice(0, 60); push(); }
  });
  root.addEventListener('change', function (e) {
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
