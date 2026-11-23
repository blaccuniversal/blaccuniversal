/* BLACC Universal in numbers: counts each figure up once when it scrolls into view.
   The final numbers live in index.html (data-count / data-suffix). Without JS, the plain text shows. */
(function () {
  var els = [].slice.call(document.querySelectorAll('.stat__num[data-count]'));
  if (!els.length) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fmt(n) { return n.toLocaleString('en-US'); }
  function run(el) {
    var end = parseInt(el.getAttribute('data-count'), 10) || 0, suf = el.getAttribute('data-suffix') || '';
    if (reduce || !window.requestAnimationFrame) { el.textContent = fmt(end) + suf; return; }
    var t0 = null, dur = 1600;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(end * e)) + (p === 1 ? suf : '');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.textContent = fmt(parseInt(e.getAttribute('data-count'), 10) || 0) + (e.getAttribute('data-suffix') || ''); }); return; }
  var io = new IntersectionObserver(function (list) {
    list.forEach(function (x) { if (x.isIntersecting) { io.unobserve(x.target); run(x.target); } });
  }, { threshold: .4 });
  els.forEach(function (e) { io.observe(e); });
})();
