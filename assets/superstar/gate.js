/* Superstar · access gate. Passkeys are issued by BLACC Universal on request. */
(function () {
  'use strict';
  var KEYS = ["cdd373c5d5a65152b2cd8930", "ead07cb7f397675245462851", "63a5af86432b47fa615e74f3", "58ab887ee90c29f93520e13e", "4061224e45bdccb59a705de6", "2d226c5533ded5584db1b237", "31fafaf989cc83019d51257a", "15d5f83d34bb184511fb938e", "1a8bd54804718a1e476b3fc6", "3d327a95844e6bd2aa0799a1", "ab0e1e6ccacc1aa869fca6f1", "2cbb92795e47acb05a79d749", "8489074b76b946a1911e0a01", "3b343fcb2b574ed99c0e4dce", "6e833c0bc8ef451ff914519e", "7ee03048dd12c010d924dc8f", "8d6e0339a7796e8b0f5923b7", "2e67fc25f80cdcef0904d024", "f02ad3def1ce002dd528abc2", "850fdf9b65b5fdec232cca33", "ae47991e70eda96fca9896a7"];
  var SALT = 'bu-superstar-v1:', STORE = 'ss_unlock', FORM = 'https://api.web3forms.com/submit', W3K = 'c45f617c-f3f2-4caa-93cf-5d49e2cece46';
  var root = document.documentElement, gate = document.querySelector('[data-gate]');
  function get() { try { return localStorage.getItem(STORE); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(STORE, v); } catch (e) {} }
  function norm(s) { s = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (s.indexOf('STAR') !== 0) s = 'STAR' + s; return s; }
  function hash(s) {
    var b = new TextEncoder().encode(SALT + s);
    return crypto.subtle.digest('SHA-256', b).then(function (d) { return Array.prototype.map.call(new Uint8Array(d), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('').slice(0, 24); });
  }
  function lock() { root.classList.add('ss-locked'); if (gate) gate.hidden = false; }
  function unlock() { root.classList.remove('ss-locked'); if (gate) gate.hidden = true; }
  var saved = get();
  if (saved && KEYS.indexOf(saved) > -1) { unlock(); return; }
  lock();
  if (!gate) return;
  function view(name) { Array.prototype.forEach.call(gate.querySelectorAll('[data-gv]'), function (v) { v.hidden = v.getAttribute('data-gv') !== name; }); var f = gate.querySelector('[data-gv="' + name + '"] input'); if (f) setTimeout(function () { f.focus(); }, 30); }
  Array.prototype.forEach.call(gate.querySelectorAll('[data-gview]'), function (b) { b.addEventListener('click', function () { view(b.getAttribute('data-gview')); }); });
  var kf = gate.querySelector('[data-gkey]'), kmsg = gate.querySelector('[data-gkmsg]');
  kf.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = kf.querySelector('input').value; if (!v.trim()) return;
    kmsg.textContent = ''; kmsg.className = 'gate__msg';
    hash(norm(v)).then(function (h) {
      if (KEYS.indexOf(h) > -1) { set(h); unlock(); }
      else { kmsg.textContent = 'That passkey isn’t valid. Check it and try again.'; kmsg.className = 'gate__msg is-err'; }
    }).catch(function () { kmsg.textContent = 'Couldn’t check the passkey on this browser.'; kmsg.className = 'gate__msg is-err'; });
  });
  var rf = gate.querySelector('[data-greq]'), rmsg = gate.querySelector('[data-grmsg]'), rbtn = rf.querySelector('button[type=submit]');
  rf.addEventListener('submit', function (e) {
    e.preventDefault();
    if (rf.querySelector('[name=_honey]').value) return;
    var d = { access_key: W3K, subject: 'Superstar passkey request: ' + rf.name.value.trim(), from_name: 'BLACC Universal website', name: rf.name.value.trim(), email: rf.email.value.trim(), message: rf.note.value.trim() || '(none)', page: 'Superstar passkey' };
    if (!d.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { rmsg.textContent = 'Add your name and a valid email.'; rmsg.className = 'gate__msg is-err'; return; }
    rbtn.disabled = true; rmsg.textContent = 'Sending…'; rmsg.className = 'gate__msg';
    fetch(FORM, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.success) throw 0; }); })
      .then(function () { rf.reset(); view('sent'); })
      .catch(function () { rmsg.textContent = 'Couldn’t send right now. Please try again in a moment.'; rmsg.className = 'gate__msg is-err'; })
      .then(function () { rbtn.disabled = false; });
  });
})();
