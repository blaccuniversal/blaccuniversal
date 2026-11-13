/* PQT · Quests Feud weekly survey. Questions and answers live in a Google Sheet via an Apps Script web app. */
(function () {
  'use strict';
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwlYm7KzVBhDFraAMpyDYUcqV1EhbY1HUNlimdzXe9yyUNtZS169ok9eeKW73Kv7gFO7g/exec';
  var $ = function (s) { return document.querySelector(s); };
  var form = $('[data-sv-form]'), err = $('[data-sv-err]'), week = '', LK = 'pqt_survey';
  function show(sel) { ['[data-sv-loading]', '[data-sv-closed]', '[data-sv-error]', '[data-sv-form]', '[data-sv-done]'].forEach(function (s) { $(s).hidden = s !== sel; }); }
  function store() { try { return JSON.parse(localStorage.getItem(LK)) || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(LK, JSON.stringify(o)); } catch (e) {} }
  function device() { var s = store(); if (!s.id) { s.id = Math.random().toString(36).slice(2) + Date.now().toString(36); save(s); } return s.id; }
  function fingerprint() {
    var n = navigator, sc = window.screen || {}, parts = [n.userAgent, n.platform, n.language, (n.languages || []).join(','), sc.width + 'x' + sc.height, window.devicePixelRatio, sc.colorDepth, n.hardwareConcurrency, n.deviceMemory, n.maxTouchPoints];
    try { parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch (e) {}
    try { var c = document.createElement('canvas'), x = c.getContext('2d'); c.width = 220; c.height = 40; x.textBaseline = 'top'; x.font = '16px Arial'; x.fillStyle = '#f60'; x.fillRect(100, 1, 60, 20); x.fillStyle = '#069'; x.fillText('PQT feud ✓ 2026', 2, 15); x.fillStyle = 'rgba(102,204,0,.7)'; x.fillText('PQT feud ✓ 2026', 4, 17); parts.push(c.toDataURL()); } catch (e) {}
    var str = parts.join('|');
    if (!(window.crypto && crypto.subtle)) return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (d) { return Array.prototype.map.call(new Uint8Array(d), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('').slice(0, 32); }).catch(function () { return ''; });
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function done(again) {
    show('[data-sv-done]');
    if (again) { $('[data-sv-done-h]').textContent = 'You’ve already answered this week.'; $('[data-sv-done-p]').textContent = 'Thanks! A new set of questions comes out every week.'; }
  }

  if (!ENDPOINT) { show('[data-sv-closed]'); return; }
  fetch(ENDPOINT + '?t=' + Date.now()).then(function (r) { return r.json(); }).then(function (c) {
    if (!c || !c.ok || !c.open || !c.questions || !c.questions.length) { show('[data-sv-closed]'); return; }
    week = c.week || '';
    $('[data-sv-week]').textContent = 'Quests Feud survey' + (week ? ' · ' + week : '');
    if (store()['w:' + week]) return done(true);
    $('[data-sv-qs]').innerHTML = c.questions.map(function (q, i) {
      return '<div class="sv-q field"><label for="sv-q' + i + '"><b>' + (i + 1) + '</b><span>' + esc(q) + '</span></label><input id="sv-q' + i + '" name="q' + i + '" type="text" maxlength="80" autocomplete="off" required></div>';
    }).join('');
    show('[data-sv-form]');
  }).catch(function () { show('[data-sv-error]'); });

  form.addEventListener('submit', function (e) {
    e.preventDefault(); err.hidden = true;
    if (form.website.value) return;
    var answers = [], n = form.querySelectorAll('[name^=q]').length;
    for (var i = 0; i < n; i++) answers.push(form['q' + i].value.trim());
    var name = form.name.value.trim(), contact = form.contact.value.trim();
    var okContact = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || contact.replace(/\D/g, '').length >= 10;
    if (answers.some(function (a) { return !a; }) || !name || !okContact) { err.textContent = !okContact && name && answers.every(Boolean) ? 'Enter a valid phone number or email.' : 'Please answer all 5 questions and add your name and phone or email.'; err.hidden = false; return; }
    var btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
    fingerprint().then(function (fp) {
      var body = JSON.stringify({ week: week, name: name, contact: contact, answers: answers, device: device(), fp: fp });
      return fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body });
    })
      .then(function (r) { return r.json().catch(function () { return { ok: true }; }); })
      .then(function (j) {
        if (j && j.dup) { var s = store(); s['w:' + week] = 1; save(s); return done(true); }
        if (j && j.ok === false) throw new Error(j.error || 'fail');
        var s2 = store(); s2['w:' + week] = 1; save(s2); done(false);
      })
      .catch(function () { err.textContent = 'Couldn’t send right now. Please try again.'; err.hidden = false; btn.disabled = false; btn.textContent = 'Submit answers'; });
  });
})();
