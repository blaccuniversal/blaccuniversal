/* PQT · WORD RACE team phone. Join with the room code and team PIN, then type answers.
   The phone only sends words; the host console checks them and keeps the score. */
(function () {
  'use strict';
  var V = window.WRView, esc = V.esc, root = document.querySelector('[data-join]');
  var S = null, link = null, me = null, step = 'code', pendJoin = null, myN = null, endAt = 0, draft = '';
  function ss(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  var dev = ss('wr_dev') || Math.random().toString(36).slice(2, 10); ss('wr_dev', dev);
  function nonce() { return dev + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  var head = '<p class="eyebrow">PQT · Word Race</p>';

  function codeStep(err) {
    step = 'code';
    root.innerHTML = '<form class="card" data-code>' + head + '<h1>Join your team</h1><p class="wrj-wait">Type the room code from the host.</p><input class="hc-input wr-mt" data-c maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="CODE" style="text-align:center;font-family:var(--dot);font-weight:900;font-size:30px;letter-spacing:.3em;min-height:64px;text-transform:uppercase">' +
      (err ? '<p class="wrj-fb is-no">' + esc(err) + '</p>' : '') + '<button class="pbtn pbtn--white pbtn--lg pbtn--block wr-mt" type="submit">Continue</button></form>';
  }
  function connect(c) {
    if (link) link.end();
    link = WRLink.view(c, function (s) { if (s.gone) return; S = s; S.rx = Date.now(); onState(); });
    step = 'wait'; root.innerHTML = '<div class="card">' + head + '<h1>Connecting…</h1><p class="wrj-wait">Looking for room ' + esc(c) + '. Make sure the host has started the tournament.</p></div>';
    setTimeout(function () { if (!S) codeStep('No game found with that code yet. Check it and try again.'); }, 12000);
  }
  function onState() {
    if (pendJoin) { var f = S.fb && S.fb['j_' + dev]; if (f && f.n === pendJoin.n) { if (f.ok) { me = pendJoin.team; ss('wr_me', { code: S.code, team: me, pin: pendJoin.pin }); pendJoin = null; step = 'play'; } else { pendJoin = null; step = 'team'; teamStep('That PIN didn’t match. Ask the host.'); return; } } }
    if (S.mode !== 'phones') { root.innerHTML = '<div class="card">' + head + '<h1>Answers are out loud</h1><p class="wrj-wait">This tournament is played by calling out words. Keep your eyes on the big screen.</p></div>'; return; }
    if (step === 'wait' || step === 'code') { var saved = ss('wr_me'); if (saved && saved.code === S.code && S.teams.some(function (t) { return t.id === saved.team; })) { me = saved.team; step = 'play'; } else { step = 'team'; teamStep(); return; } }
    if (step === 'team') return; // keep the form while they type
    if (step === 'play') play();
  }
  function teamStep(err) {
    root.innerHTML = '<div class="card">' + head + '<h1>Which team?</h1><div class="wrj-teams">' + S.teams.map(function (t) { return '<button class="pbtn" data-team="' + t.id + '" type="button">' + V.badge(t) + esc(t.name) + '</button>'; }).join('') + '</div></div>' +
      '<form class="card" data-pinf hidden><p class="eyebrow" data-pt></p><h1>Team PIN</h1><input class="hc-input wr-mt" data-pin inputmode="numeric" maxlength="6" autocomplete="off" placeholder="PIN" style="text-align:center;font-size:26px;letter-spacing:.3em;min-height:60px">' + (err ? '<p class="wrj-fb is-no">' + esc(err) + '</p>' : '') + '<button class="pbtn pbtn--white pbtn--lg pbtn--block wr-mt" type="submit">Join</button></form>';
  }
  function team(id) { return (S.teams || []).filter(function (t) { return t.id === id; })[0]; }
  function play() {
    var t = team(me), m = S.m, b = S.battle, mine = m && (m.a.id === me || m.b.id === me);
    var running = b && b.running && mine && !S.paused;
    endAt = running ? S.rx + b.left : 0;
    var h = '<div class="card wrj-me">' + head + '<div class="hc-row" style="margin-top:8px">' + V.badge(t) + '<b style="font-size:18px">' + esc(t ? t.name : '') + '</b></div></div>';
    if (S.status === 'done') h += '<div class="card"><h1>' + (S.champion === (t && t.name) ? 'Champions!' : 'Tournament over') + '</h1><p class="wrj-wait">' + esc(S.champion) + ' won ' + esc(S.name) + '.</p></div>';
    else if (running) {
      var f = S.fb && S.fb[me], fbh = '';
      if (f && myN && f.n === myN) fbh = '<p class="wrj-fb ' + (f.ok ? 'is-ok' : 'is-no') + '">' + (f.ok ? '✓ ' + esc(f.word) + ' · You win the battle' : '✗ ' + esc(f.word || '') + ' · ' + esc(reason(f.reason))) + '</p>';
      h += '<form class="card wrj-pad" data-ans><p class="eyebrow">' + esc(m.label || S.round) + ' · Battle ' + b.n + '</p><div class="wr-letters"><span class="wr-letter">' + b.s.toUpperCase() + '</span><span class="wr-arrow">→</span><span class="wr-letter">' + b.e.toUpperCase() + '</span></div>' +
        '<div class="wr-clock" data-clock></div><input class="hc-input" data-w maxlength="40" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Your word"><button class="pbtn pbtn--white pbtn--lg pbtn--block wr-mt" type="submit">Send</button>' + fbh + '</form>';
    } else {
      var msg;
      if (S.paused) msg = 'The host has paused the game.';
      else if (mine && b && b.winner) msg = b.winner === (t && t.name) ? 'You took battle ' + b.n + '. Get ready for the next one.' : b.winner + ' took battle ' + b.n + '. Next one coming.';
      else if (mine) msg = 'You’re up: ' + esc(m.a.name) + ' v ' + esc(m.b.name) + '. The letters appear here when the host starts the battle.';
      else if (m) msg = 'Now playing: ' + esc(m.a.name) + ' v ' + esc(m.b.name) + '. Your phone wakes up when it’s your turn.';
      else msg = 'Waiting for the host.';
      h += '<div class="card"><p class="wrj-wait">' + msg + '</p></div>';
    }
    var focused = document.activeElement && document.activeElement.hasAttribute && document.activeElement.hasAttribute('data-w');
    root.innerHTML = h;
    var w = root.querySelector('[data-w]'); if (w) { w.value = draft; if (focused) w.focus(); }
    tick();
  }
  function reason(r) { return { start: 'Wrong first letter', end: 'Wrong last letter', short: 'Too short', repeat: 'Already used', unknown: 'Not in the dictionary', empty: 'Not accepted' }[r] || 'Not accepted'; }
  function tick() { var c = root.querySelector('[data-clock]'); if (!c || !endAt) return; var ms = Math.max(0, endAt - Date.now()); c.textContent = ms ? Math.ceil(ms / 1000) : 'Time'; c.classList.toggle('is-low', ms > 0 && ms < 6000); c.classList.toggle('is-up', !ms); }
  setInterval(tick, 200);

  root.addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target;
    if (f.hasAttribute('data-code')) { var c = WRLink.clean(f.querySelector('[data-c]').value); if (c.length !== 4) return codeStep('The code has 4 characters.'); history.replaceState(null, '', '?c=' + c); connect(c); }
    if (f.hasAttribute('data-pinf')) { var pin = f.querySelector('[data-pin]').value.trim(); if (!pin) return; pendJoin = { team: f.dataset.team, pin: pin, n: nonce() }; link.send({ t: 'join', team: pendJoin.team, pin: pin, dev: dev, n: pendJoin.n }); f.querySelector('button').textContent = 'Checking…'; setTimeout(function () { if (pendJoin) { pendJoin = null; teamStep('No reply from the host. Try again.'); } }, 8000); }
    if (f.hasAttribute('data-ans')) { var w = f.querySelector('[data-w]').value.trim(); if (!w) return; var saved = ss('wr_me'); myN = nonce(); link.send({ t: 'ans', team: me, pin: saved && saved.pin, word: w, dev: dev, n: myN }); draft = ''; f.querySelector('[data-w]').value = ''; var bt = f.querySelector('button'); bt.textContent = 'Sent'; bt.disabled = true; setTimeout(function () { if (bt.isConnected) { bt.textContent = 'Send'; bt.disabled = false; } }, 1200); }
  });
  root.addEventListener('click', function (e) { var b = e.target.closest('[data-team]'); if (!b) return; var f = root.querySelector('[data-pinf]'); f.hidden = false; f.dataset.team = b.dataset.team; f.querySelector('[data-pt]').textContent = team(b.dataset.team).name; [].forEach.call(root.querySelectorAll('[data-team]'), function (x) { x.classList.toggle('is-on', x === b); }); f.querySelector('[data-pin]').focus(); });
  root.addEventListener('input', function (e) { if (e.target.hasAttribute('data-w')) draft = e.target.value; });

  var qc = WRLink.clean(new URLSearchParams(location.search).get('c') || ''); if (qc.length === 4) connect(qc); else codeStep();
})();
