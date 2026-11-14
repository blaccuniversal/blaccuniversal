/* Constructs · BLACC Universal */
(function () {
  'use strict';
  /* Login code is stored only as SHA-256 of "blacccx:" + CODE (upper case). */
  var PASS = 'e1d2c5390a18a8ee75489947a1fdf18d6dd718ffad67fb204519edbecfc8e3a6';
  var KEY = 'cx_pass', DAYS = 30;
  /* Constructs shown after login: { name: 'Name', path: '/constructs/folder/' } */
  var CONSTRUCTS = [];

  // tool rotation
  var box = document.querySelector('[data-cx-icon]');
  if (box) {
    var svgs = Array.prototype.slice.call(box.querySelectorAll('svg')), i = 0;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && svgs.length > 1) setInterval(function () {
      var cur = svgs[i]; i = (i + 1) % svgs.length; var nxt = svgs[i];
      cur.classList.remove('is-on'); cur.classList.add('is-off');
      setTimeout(function () { cur.classList.remove('is-off'); }, 600);
      nxt.classList.add('is-on');
    }, 2600);
  }

  var f = document.querySelector('[data-cx-form]'), inp = document.querySelector('[data-cx-in]'), list = document.querySelector('[data-cx-list]');
  if (!f) return;
  function saved() { try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.h === PASS && v.until > Date.now(); } catch (e) { return false; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function open(anim) {
    f.hidden = true;
    list.innerHTML = CONSTRUCTS.length
      ? CONSTRUCTS.map(function (c) { return '<a class="cx-item" href="' + esc(c.path) + '"><span>' + esc(c.name) + '</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>'; }).join('')
      : '<p class="cx-empty">Nothing under construction yet.</p>';
    list.hidden = false;
    if (anim) list.classList.add('is-in');
  }
  if (saved()) open(false);

  function hex(b) { return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function no() { f.classList.remove('is-no'); void f.offsetWidth; f.classList.add('is-no'); try { navigator.vibrate && navigator.vibrate(40); } catch (e) {} inp.select(); }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = inp.value.replace(/\s+/g, '').toUpperCase();
    if (!v || !window.crypto || !crypto.subtle) return no();
    crypto.subtle.digest('SHA-256', new TextEncoder().encode('blacccx:' + v)).then(function (b) {
      if (hex(b) !== PASS) return no();
      try { localStorage.setItem(KEY, JSON.stringify({ h: PASS, until: Date.now() + DAYS * 864e5 })); } catch (x) {}
      f.classList.add('is-ok');
      setTimeout(function () { open(true); }, 350);
    });
  });
  inp.addEventListener('input', function () { f.classList.remove('is-no'); });
})();
