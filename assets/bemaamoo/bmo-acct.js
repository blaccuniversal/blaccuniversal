/* Bemaamoo accounts: sign in (email code or Google), profile with a cropped picture, saved scores and a leaderboard.
   Everything is skipped when bmo-config.js has no Supabase URL, so the game plays as before. */
(function () {
  'use strict';
  var cfg = window.BMO_CFG || {}, on = !!(cfg.url && cfg.key);
  var A = { enabled: on, user: null, profile: null, ready: !on }, sb = null, subs = [], step = 'email', mail = '', busy = false, note = '', info = null, board = null;
  window.BMA = A;
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function emit() { paintChip(); subs.forEach(function (f) { try { f(A); } catch (e) {} }); }
  A.onChange = function (f) { subs.push(f); };
  var AVP = on ? cfg.url.replace(/\/+$/, '') + '/storage/v1/object/public/avatars/' : '';
  /* only pictures from our own storage are ever shown, so nobody can point other players at a tracking link */
  A.okAv = function (u) { return on && typeof u === 'string' && u.length < 400 && u.indexOf(AVP) === 0 && !/["'<>\s]/.test(u) ? u : ''; };
  A.myAv = function () { return A.profile && A.profile.avatar_url ? A.okAv(A.profile.avatar_url) : ''; };
  A.initial = function (n) { return esc(String(n || '?').trim().charAt(0).toUpperCase() || '?'); };

  function init() {
    if (!on) return;
    var s = document.createElement('script'); s.src = '/assets/bemaamoo/supabase.min.js?v=1';
    s.onload = function () {
      try {
        sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });
      } catch (e) { A.ready = true; emit(); return; }
      sb.auth.onAuthStateChange(function (ev, ses) { setUser(ses && ses.user || null); });
      sb.auth.getSession().then(function (r) { setUser(r && r.data && r.data.session ? r.data.session.user : null); }, function () { A.ready = true; emit(); });
    };
    s.onerror = function () { A.ready = true; emit(); };
    document.head.appendChild(s);
  }
  function setUser(u) {
    var same = (A.user && u && A.user.id === u.id);
    A.user = u;
    if (!u) { A.profile = null; info = null; A.ready = true; emit(); paintSheet(); return; }
    if (same && A.profile) { A.ready = true; return; }
    sb.from('profiles').select('*').eq('id', u.id).maybeSingle().then(function (r) {
      A.profile = r && r.data ? r.data : null; A.ready = true; emit(); paintSheet(); if (A.profile) loadInfo();
    }, function () { A.ready = true; emit(); paintSheet(); });
  }
  function loadInfo() {
    if (!A.user || !sb) return;
    var uid = A.user.id;
    sb.from('game_results').select('place,points,players,game_id').eq('user_id', uid).then(function (r) {
      var rows = (r && r.data) || [], g = rows.length, w = 0, p = 0, best = 0;
      rows.forEach(function (x) { p += x.points; if (x.place === 1 && x.players > 1) w++; if (x.points > best) best = x.points; });
      info = { games: g, wins: w, points: p, best: best }; paintSheet();
    }, function () {});
    sb.from('bmo_leaderboard').select('id,name,avatar_url,games,wins,points').order('points', { ascending: false }).limit(10).then(function (r) { board = (r && r.data) || []; paintSheet(); }, function () {});
  }

  /* ---------- actions ---------- */
  function wrap(fn) { busy = true; note = ''; paintSheet(); return fn().then(function () { busy = false; paintSheet(); }, function (e) { busy = false; note = nice(e); paintSheet(); }); }
  function nice(e) {
    var m = String((e && e.message) || e || '');
    if (/rate limit|too many|seconds/i.test(m)) return 'Too many tries. Wait a minute and try again.';
    if (/invalid|expired|token/i.test(m)) return 'That code isn’t right or has expired. Check it, or ask for a new one.';
    if (/network|fetch|failed/i.test(m)) return 'No connection. Check your internet and try again.';
    return m || 'Something went wrong. Try again.';
  }
  A.sendCode = function (email) {
    email = String(email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { note = 'Type a valid email address.'; paintSheet(); return Promise.resolve(); }
    return wrap(function () { return sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true } }).then(function (r) { if (r.error) throw r.error; mail = email; step = 'code'; }); });
  };
  A.verify = function (code) {
    code = String(code || '').replace(/\D/g, '');
    if (code.length < 6) { note = 'Type the 6-digit code from your email.'; paintSheet(); return Promise.resolve(); }
    return wrap(function () { return sb.auth.verifyOtp({ email: mail, token: code, type: 'email' }).then(function (r) { if (r.error) throw r.error; step = 'email'; }); });
  };
  A.google = function () {
    if (!sb) return;
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/bemaamoo/' } });
  };
  A.signOut = function () { if (!sb) return; sb.auth.signOut().then(function () { step = 'email'; mail = ''; note = ''; board = null; paintSheet(); }); };
  A.saveName = function (name) {
    name = String(name || '').replace(/\s+/g, ' ').trim();
    if (name.length < 2 || name.length > 18) { note = 'Use 2 to 18 characters for your name.'; paintSheet(); return Promise.resolve(); }
    return wrap(function () {
      var row = { id: A.user.id, name: name };
      if (A.profile && A.profile.avatar_url) row.avatar_url = A.profile.avatar_url;
      return sb.from('profiles').upsert(row).select().single().then(function (r) { if (r.error) throw r.error; A.profile = r.data; emit(); loadInfo(); });
    });
  };
  A.saveAvatar = function (blob) {
    if (!A.user || !A.profile) return Promise.reject(new Error('Choose a name first.'));
    var path = A.user.id + '/avatar.jpg';
    return sb.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' }).then(function (r) {
      if (r.error) throw r.error;
      var url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
      return sb.from('profiles').update({ avatar_url: url }).eq('id', A.user.id).select().single();
    }).then(function (r) { if (r.error) throw r.error; A.profile = r.data; emit(); paintSheet(); });
  };
  /* one row per player per finished game (the same game can't be saved twice) */
  A.record = function (g) {
    if (!A.user || !A.profile || !sb) return Promise.resolve(false);
    var row = { user_id: A.user.id, game_id: String(g.id).slice(0, 40), players: g.players, place: g.place, points: g.points, rounds: g.rounds, category: String(g.category || '').slice(0, 59), rule: g.rule | 0 };
    return sb.from('game_results').insert(row).then(function (r) { if (!r.error) loadInfo(); return !r.error || r.error.code === '23505'; }, function () { return false; });
  };

  /* ---------- the account sheet ---------- */
  var openMsg = '';
  A.open = function (why) {
    openMsg = why || ''; var sh = $('[data-sheet="acct"]'); if (!sh) return;
    note = ''; sh.hidden = false; paintSheet(); if (A.user) loadInfo();
  };
  function avatar(url, name, cls) {
    return url ? '<img class="av ' + (cls || '') + '" src="' + esc(url) + '" alt="" loading="lazy" decoding="async">' : '<span class="av av--i ' + (cls || '') + '">' + A.initial(name) + '</span>';
  }
  A.avatarHtml = function (url, name, cls) { return avatar(A.okAv(url), name, cls); };
  function paintChip() {
    var b = $('[data-acct-chip]'); if (!b) return;
    b.hidden = !on;
    if (!on) return;
    var h = A.profile ? avatar(A.myAv(), A.profile.name, 'av--s') + '<span>' + esc(A.profile.name) + '</span>' : '<span>Sign in</span>';
    if (b._h !== h) { b._h = h; b.innerHTML = h; }
  }
  function paintSheet() {
    var sh = $('[data-sheet="acct"]'); if (!sh || sh.hidden) return;
    var el = $('[data-acct]', sh), h = '', dis = busy ? ' disabled' : '';
    $('[data-acct-title]', sh).textContent = A.user ? 'Your profile' : 'Sign in';
    var msg = note ? '<p class="acct__err" role="alert">' + esc(note) + '</p>' : '';
    if (!A.ready) h = '<p class="acct__p">Loading…</p>';
    else if (!A.user) {
      if (step === 'code') {
        h = '<p class="acct__p">We sent a 6-digit code to <b>' + esc(mail) + '</b>. It can take a minute.</p>' +
          '<form data-acct-f="verify"><input class="acct__in acct__in--code" data-acct-code inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456" aria-label="6-digit code"' + dis + '>' +
          '<button class="btn btn--big btn--full" type="submit"' + dis + '>' + (busy ? 'Checking…' : 'Sign in') + '</button></form>' + msg +
          '<p class="acct__sm"><button class="lnk" type="button" data-acct-a="back">Use a different email</button> · <button class="lnk" type="button" data-acct-a="resend">Send a new code</button></p>';
      } else {
        h = (openMsg ? '<p class="acct__why">' + esc(openMsg) + '</p>' : '<p class="acct__p">Keep your scores, add a picture and climb the leaderboard.</p>') +
          '<form data-acct-f="send"><input class="acct__in" type="email" data-acct-mail autocomplete="email" inputmode="email" placeholder="you@email.com" aria-label="Email address" value="' + esc(mail) + '"' + dis + '>' +
          '<button class="btn btn--big btn--full" type="submit"' + dis + '>' + (busy ? 'Sending…' : 'Email me a code') + '</button></form>' +
          (cfg.google ? '<div class="acct__or"><span>or</span></div><button class="btn btn--big btn--full btn--ghost" type="button" data-acct-a="google">Continue with Google</button>' : '') + msg +
          '<p class="acct__sm">No password to remember. New here? An account is created automatically.</p>';
      }
    } else if (!A.profile) {
      h = '<p class="acct__p">Welcome. Choose the name other players will see.</p>' +
        '<form data-acct-f="name"><input class="acct__in" data-acct-name maxlength="18" autocomplete="nickname" placeholder="Your name" aria-label="Your name"' + dis + '>' +
        '<button class="btn btn--big btn--full" type="submit"' + dis + '>' + (busy ? 'Saving…' : 'Save and continue') + '</button></form>' + msg +
        '<p class="acct__sm"><button class="lnk" type="button" data-acct-a="out">Sign out</button></p>';
    } else {
      var p = A.profile, i = info;
      h = '<div class="acct__me"><button class="acct__pic" type="button" data-acct-a="pic" aria-label="Change picture">' + avatar(A.myAv(), p.name, 'av--l') + '<small>Change</small></button>' +
        '<form class="acct__nm" data-acct-f="name"><input class="acct__in" data-acct-name maxlength="18" value="' + esc(p.name) + '" aria-label="Your name"' + dis + '><button class="btn" type="submit"' + dis + '>Save name</button></form></div>' + msg +
        '<div class="acct__stats">' + [['Games', i ? i.games : '–'], ['Wins', i ? i.wins : '–'], ['Points', i ? i.points : '–'], ['Best game', i ? i.best : '–']].map(function (x) { return '<div><b>' + x[1] + '</b><span>' + x[0] + '</span></div>'; }).join('') + '</div>' +
        '<h3 class="eyebrow">Leaderboard</h3>' + (board && board.length ? '<ol class="acct__lb">' + board.map(function (x, n) { return '<li' + (x.id === A.user.id ? ' class="is-me"' : '') + '><em>' + (n + 1) + '</em>' + avatar(A.okAv(x.avatar_url), x.name, 'av--s') + '<b>' + esc(x.name) + '</b><small>' + x.wins + (x.wins === 1 ? ' win' : ' wins') + '</small><span>' + x.points + '</span></li>'; }).join('') + '</ol>' : '<p class="acct__sm">' + (board ? 'No scores yet. Finish a game to appear here.' : 'Loading…') + '</p>') +
        '<p class="acct__sm"><button class="lnk" type="button" data-acct-a="out">Sign out</button></p>';
    }
    var ae = document.activeElement, keep = ae && el.contains(ae) ? { a: ae.getAttribute('data-acct-code') !== null ? 'code' : ae.getAttribute('data-acct-mail') !== null ? 'mail' : ae.getAttribute('data-acct-name') !== null ? 'name' : '', v: ae.value, s: ae.selectionStart } : null;
    if (el._h === h) return; el._h = h; el.innerHTML = h;
    if (keep && keep.a) { var n = $('[data-acct-' + keep.a + ']', el); if (n && !busy) { n.value = keep.v || ''; try { n.focus({ preventScroll: true }); n.setSelectionRange(keep.s, keep.s); } catch (e) {} } }
  }
  document.addEventListener('submit', function (ev) {
    var f = ev.target && ev.target.closest && ev.target.closest('[data-acct-f]'); if (!f) return;
    ev.preventDefault(); if (busy) return;
    var k = f.getAttribute('data-acct-f');
    if (k === 'send') A.sendCode($('[data-acct-mail]', f).value);
    else if (k === 'verify') A.verify($('[data-acct-code]', f).value);
    else if (k === 'name') A.saveName($('[data-acct-name]', f).value);
  });
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-acct-a],[data-acct-open]'); if (!t) return;
    if (t.hasAttribute('data-acct-open')) { A.open(''); return; }
    var a = t.getAttribute('data-acct-a');
    if (a === 'back') { step = 'email'; note = ''; paintSheet(); }
    else if (a === 'resend') { A.sendCode(mail); }
    else if (a === 'google') A.google();
    else if (a === 'out') A.signOut();
    else if (a === 'pic') pickPic();
  });

  /* ---------- picture: choose, crop to a square, shrink, upload ---------- */
  var CS = 280, cr = null;
  function pickPic() {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () { var f = inp.files && inp.files[0]; if (f) openCrop(f); };
    inp.click();
  }
  function openCrop(file) {
    if (!/^image\//.test(file.type)) { note = 'Choose a picture file.'; paintSheet(); return; }
    if (file.size > 12 * 1024 * 1024) { note = 'That picture is too big. Choose one under 12 MB.'; paintSheet(); return; }
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      var w = img.naturalWidth, h = img.naturalHeight;
      if (Math.min(w, h) < 128) { note = 'Choose a bigger picture. At least 128 × 128 pixels.'; paintSheet(); return; }
      cr = { img: img, w: w, h: h, min: CS / Math.min(w, h), zoom: 1, cx: w / 2, cy: h / 2 };
      var sh = $('[data-sheet="crop"]'); sh.hidden = false; paintCrop();
    };
    img.onerror = function () { URL.revokeObjectURL(url); note = 'That picture couldn’t be opened. Try a JPG or PNG.'; paintSheet(); };
    img.src = url;
  }
  function clampCrop() { var s = cr.min * cr.zoom, half = CS / (2 * s); cr.cx = Math.max(half, Math.min(cr.w - half, cr.cx)); cr.cy = Math.max(half, Math.min(cr.h - half, cr.cy)); }
  function drawCrop() {
    var c = $('[data-crop-c]'); if (!c || !cr) return; clampCrop();
    var g = c.getContext('2d'), s = cr.min * cr.zoom, half = CS / (2 * s);
    g.clearRect(0, 0, CS, CS); g.fillStyle = '#000'; g.fillRect(0, 0, CS, CS);
    g.drawImage(cr.img, cr.cx - half, cr.cy - half, half * 2, half * 2, 0, 0, CS, CS);
    g.fillStyle = 'rgba(0,0,0,.62)'; g.beginPath(); g.rect(0, 0, CS, CS); g.arc(CS / 2, CS / 2, CS / 2 - 3, 0, Math.PI * 2, true); g.fill('evenodd');
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(CS / 2, CS / 2, CS / 2 - 3, 0, Math.PI * 2); g.stroke();
  }
  function paintCrop() {
    var el = $('[data-crop]');
    el.innerHTML = '<p class="acct__p">Drag to move. Use the slider to zoom.</p><canvas class="crop__c" data-crop-c width="' + CS + '" height="' + CS + '"></canvas>' +
      '<input class="crop__z" type="range" min="1" max="4" step="0.01" value="1" data-crop-z aria-label="Zoom">' +
      '<p class="acct__err" data-crop-err hidden></p><div class="ov__btns"><button class="btn btn--big" type="button" data-crop-a="ok">Use this picture</button><button class="btn btn--big btn--ghost" type="button" data-crop-a="no">Cancel</button></div>';
    var c = $('[data-crop-c]', el), z = $('[data-crop-z]', el), d = null;
    drawCrop();
    z.addEventListener('input', function () { cr.zoom = +z.value; drawCrop(); });
    c.addEventListener('pointerdown', function (e) { d = { x: e.clientX, y: e.clientY }; try { c.setPointerCapture(e.pointerId); } catch (x) {} });
    c.addEventListener('pointermove', function (e) { if (!d) return; var k = CS / c.getBoundingClientRect().width, s = cr.min * cr.zoom; cr.cx -= (e.clientX - d.x) * k / s; cr.cy -= (e.clientY - d.y) * k / s; d = { x: e.clientX, y: e.clientY }; drawCrop(); });
    ['pointerup', 'pointercancel'].forEach(function (n) { c.addEventListener(n, function () { d = null; }); });
  }
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-crop-a]'); if (!t) return;
    var sh = $('[data-sheet="crop"]');
    if (t.getAttribute('data-crop-a') === 'no') { sh.hidden = true; cr = null; return; }
    if (!cr || t.disabled) return; t.disabled = true; t.textContent = 'Saving…';
    var s = cr.min * cr.zoom, half = CS / (2 * s), out = document.createElement('canvas'); out.width = out.height = 256;
    out.getContext('2d').drawImage(cr.img, cr.cx - half, cr.cy - half, half * 2, half * 2, 0, 0, 256, 256);
    out.toBlob(function (blob) {
      if (!blob) { t.disabled = false; t.textContent = 'Use this picture'; return; }
      A.saveAvatar(blob).then(function () { sh.hidden = true; cr = null; }, function (e) {
        var er = $('[data-crop-err]'); if (er) { er.hidden = false; er.textContent = nice(e); } t.disabled = false; t.textContent = 'Use this picture';
      });
    }, 'image/jpeg', 0.86);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { paintChip(); init(); });
  else { paintChip(); init(); }
})();
