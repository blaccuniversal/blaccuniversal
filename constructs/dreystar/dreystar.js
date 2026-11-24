(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  var year = $('[data-year]'); if (year) year.textContent = new Date().getFullYear();

  var sheets = {};
  $$('[data-sheet]').forEach(function (s) { sheets[s.getAttribute('data-sheet')] = s; });
  var lastFocus = null;

  function open(id) {
    var s = sheets[id]; if (!s) return;
    lastFocus = document.activeElement;
    s.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(function () { var x = $('[data-close]', s); if (x) x.focus(); }, 40);
  }
  function closeAll() {
    Object.keys(sheets).forEach(function (k) { sheets[k].hidden = true; });
    document.body.style.overflow = '';
    if (lastFocus) try { lastFocus.focus(); } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]');
    if (o) { open(o.getAttribute('data-open')); return; }
    var c = e.target.closest('[data-close]');
    if (c) { closeAll(); return; }
    if (e.target.classList && e.target.classList.contains('sheet')) closeAll();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
  });
})();
