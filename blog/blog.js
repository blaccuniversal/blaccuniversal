/* BLACC Universal · Blog: reading progress + copy link */
(function () {
  var bar = document.querySelector('[data-progress]'), body = document.querySelector('[data-body]');
  if (bar && body) {
    var raf = 0;
    var upd = function () {
      raf = 0;
      var r = body.getBoundingClientRect(), total = r.height - innerHeight * .6;
      var p = Math.max(0, Math.min(1, (innerHeight * .4 - r.top) / Math.max(1, total)));
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    };
    addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    addEventListener('resize', upd); upd();
  }
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var ok = b.parentNode.querySelector('.bl-share__ok'), url = b.getAttribute('data-copy');
      var done = function () { if (!ok) return; ok.hidden = false; clearTimeout(b._t); b._t = setTimeout(function () { ok.hidden = true; }, 1800); };
      if (navigator.share && matchMedia('(hover:none)').matches) { navigator.share({ title: document.title, url: url }).catch(function () {}); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else { prompt('Copy this link', url); }
    });
  });
})();
