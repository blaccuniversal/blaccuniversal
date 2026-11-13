/* PQT · Quests Feud survey editor (private). Saves straight into the Google Sheet. */
(function () {
  'use strict';
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwlYm7KzVBhDFraAMpyDYUcqV1EhbY1HUNlimdzXe9yyUNtZS169ok9eeKW73Kv7gFO7g/exec';
  var $ = function (s) { return document.querySelector(s); }, $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var KK = 'pqt_survey_key', key = '', open = true;
  function call(o) { o.key = key; return fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(o) }).then(function (r) { return r.json(); }); }
  function setOpen(v) { open = v; $$('[data-open]').forEach(function (b) { b.setAttribute('aria-pressed', (b.getAttribute('data-open') === '1') === v ? 'true' : 'false'); }); }
  function fill(c) {
    $('#ed-week').value = c.week || ''; setOpen(!!c.open);
    var qs = c.questions || [], h = '';
    for (var i = 0; i < 5; i++) h += '<div class="field"><label for="ed-q' + i + '">Question ' + (i + 1) + '</label><textarea id="ed-q' + i + '" rows="2" maxlength="200">' + String(qs[i] || '').replace(/</g, '&lt;') + '</textarea></div>';
    $('[data-ed-qs]').innerHTML = h;
    $('[data-ed-stat]').innerHTML = '<b>' + (c.responses || 0) + '</b> ' + ((c.responses === 1) ? 'response' : 'responses') + ' so far for ' + (c.week || 'this week') + ' · survey is ' + (c.open ? '<em class="is-on">open</em>' : '<em>closed</em>');
  }
  function login(k, quiet) {
    key = k; var err = $('[data-ed-lerr]'); err.hidden = true;
    return call({ action: 'load' }).then(function (c) {
      if (!c.ok) throw new Error(c.error);
      try { localStorage.setItem(KK, k); } catch (e) {}
      $('[data-ed-login]').hidden = true; $('[data-ed-form]').hidden = false; fill(c);
    }).catch(function (e) { if (quiet) return; err.textContent = e && e.message === 'key' ? 'Wrong password.' : 'Couldn’t reach the Sheet. Check your connection.'; err.hidden = false; });
  }
  $('[data-ed-login]').addEventListener('submit', function (e) { e.preventDefault(); login($('#ed-key').value.trim()); });
  $$('[data-open]').forEach(function (b) { b.addEventListener('click', function () { setOpen(b.getAttribute('data-open') === '1'); }); });
  $('[data-ed-form]').addEventListener('submit', function (e) {
    e.preventDefault(); var err = $('[data-ed-err]'), ok = $('[data-ed-saved]'), btn = e.target.querySelector('button[type=submit]'); err.hidden = true; ok.hidden = true;
    var qs = []; for (var i = 0; i < 5; i++) qs.push($('#ed-q' + i).value.trim());
    if (!$('#ed-week').value.trim() || qs.filter(Boolean).length === 0) { err.textContent = 'Add a week name and at least one question.'; err.hidden = false; return; }
    btn.disabled = true; btn.textContent = 'Saving…';
    call({ action: 'save', week: $('#ed-week').value.trim(), open: open, questions: qs.filter(Boolean) }).then(function (c) {
      if (!c.ok) throw new Error(c.error); fill(c); ok.hidden = false;
    }).catch(function () { err.textContent = 'Couldn’t save. Try again.'; err.hidden = false; }).then(function () { btn.disabled = false; btn.textContent = 'Save'; });
  });
  try { var k = localStorage.getItem(KK); if (k) login(k, true); } catch (e) {}
})();
