/* PQT · Quests Feud weekly survey. Questions and answers live in a Google Sheet via an Apps Script web app. */
(function () {
  'use strict';
  var ENDPOINT = ''; // paste the Apps Script web app URL here (ends in /exec)
  var $ = function (s) { return document.querySelector(s); };
  var form = $('[data-sv-form]'), err = $('[data-sv-err]'), week = '', LK = 'pqt_survey';
  function show(sel) { ['[data-sv-loading]', '[data-sv-closed]', '[data-sv-error]', '[data-sv-form]', '[data-sv-done]'].forEach(function (s) { $(s).hidden = s !== sel; }); }
  function store() { try { return JSON.parse(localStorage.getItem(LK)) || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(LK, JSON.stringify(o)); } catch (e) {} }
  function device() { var s = store(); if (!s.id) { s.id = Math.random().toString(36).slice(2) + Date.now().toString(36); save(s); } return s.id; }
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
    var body = JSON.stringify({ week: week, name: name, contact: contact, answers: answers, device: device() });
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body })
      .then(function (r) { return r.json().catch(function () { return { ok: true }; }); })
      .then(function (j) {
        if (j && j.dup) { var s = store(); s['w:' + week] = 1; save(s); return done(true); }
        if (j && j.ok === false) throw new Error(j.error || 'fail');
        var s2 = store(); s2['w:' + week] = 1; save(s2); done(false);
      })
      .catch(function () { err.textContent = 'Couldn’t send right now. Please try again.'; err.hidden = false; btn.disabled = false; btn.textContent = 'Submit answers'; });
  });
})();
