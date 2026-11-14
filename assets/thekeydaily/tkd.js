/* The Key Daily · BLACC Universal */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  // today's date in the utility bar
  var t = $('[data-today]');
  if (t) {
    try { t.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^(\w+) /, '$1, '); } catch (e) {}
  }

  // mobile menu
  var mb = $('[data-menu]'), dr = $('[data-drawer]');
  if (mb && dr) {
    mb.addEventListener('click', function () {
      var open = dr.hidden;
      dr.hidden = !open;
      mb.setAttribute('aria-expanded', open);
      mb.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    dr.addEventListener('click', function (e) { if (e.target.closest('a')) { dr.hidden = true; mb.setAttribute('aria-expanded', 'false'); } });
  }

  // hero slider
  var sl = $('[data-slider]');
  if (sl) {
    var slides = $$('[data-slide]', sl), dots = $$('[data-dot]', sl), i = 0, timer = null;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); s.setAttribute('aria-hidden', k !== i); });
      dots.forEach(function (d, k) { if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
    }
    function play() { stop(); if (!reduce && slides.length > 1) timer = setInterval(function () { go(i + 1); }, 6500); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    dots.forEach(function (d) { d.addEventListener('click', function () { go(+d.getAttribute('data-dot')); play(); }); });
    sl.addEventListener('mouseenter', stop); sl.addEventListener('mouseleave', play);
    var x0 = null;
    sl.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
    sl.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
      play();
    });
    go(0); play();
  }

  // playlist tabs
  $$('[data-svc]').forEach(function (b) {
    b.addEventListener('click', function () {
      var svc = b.getAttribute('data-svc');
      $$('[data-svc]').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      $$('[data-player]').forEach(function (p) {
        var on = p.getAttribute('data-player') === svc;
        p.hidden = !on;
        var f = p.querySelector('iframe[data-src]');
        if (on && f) { f.src = f.getAttribute('data-src'); f.removeAttribute('data-src'); }
      });
    });
  });
})();
