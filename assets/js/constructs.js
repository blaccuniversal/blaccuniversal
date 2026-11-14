/* Constructs · BLACC Universal */
(function () {
  'use strict';
  /* Each construct: SHA-256 of "blacccx:" + code (lower case, no spaces) -> folder under /constructs/.
     python3 -c "import hashlib;print(hashlib.sha256(b'blacccx:code').hexdigest())" */
  var CONSTRUCTS = {};

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

  // code box
  var f = document.querySelector('[data-cx-form]'), inp = document.querySelector('[data-cx-in]');
  if (!f) return;
  function hex(b) { return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function no() { f.classList.remove('is-no'); void f.offsetWidth; f.classList.add('is-no'); try { navigator.vibrate && navigator.vibrate(40); } catch (e) {} inp.select(); }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = inp.value.trim().toLowerCase().replace(/\s+/g, '');
    if (!v || !window.crypto || !crypto.subtle) return no();
    crypto.subtle.digest('SHA-256', new TextEncoder().encode('blacccx:' + v)).then(function (b) {
      var to = CONSTRUCTS[hex(b)];
      if (to) location.href = '/constructs/' + to + '/'; else no();
    });
  });
  inp.addEventListener('input', function () { f.classList.remove('is-no'); });
})();
