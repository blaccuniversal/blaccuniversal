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
/* index: list / grid / swipe */
(function () {
  var feed = document.querySelector('[data-feed]'); if (!feed) return;
  var track = feed.querySelector('[data-track]'), btns = document.querySelectorAll('[data-view]');
  var KEY = 'bl_view';
  function set(v) {
    feed.setAttribute('data-view', v);
    btns.forEach(function (b) { if (b !== feed) b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
    try { localStorage.setItem(KEY, v); } catch (e) {}
    track.scrollLeft = 0; nav();
  }
  var saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
  set(/^(list|grid|swipe)$/.test(saved || '') ? saved : 'grid');
  btns.forEach(function (b) { if (b !== feed) b.addEventListener('click', function () { set(b.getAttribute('data-view')); }); });
  var prev = feed.querySelector('[data-swipe="-1"]'), next = feed.querySelector('[data-swipe="1"]');
  function nav() {
    if (!prev) return;
    var max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2; next.disabled = track.scrollLeft >= max;
  }
  [prev, next].forEach(function (b) {
    b && b.addEventListener('click', function () {
      var item = track.querySelector('.bl-item'); var step = item ? item.getBoundingClientRect().width + 20 : track.clientWidth * .8;
      track.scrollBy({ left: step * +b.getAttribute('data-swipe'), behavior: 'smooth' });
    });
  });
  track.addEventListener('scroll', function () { requestAnimationFrame(nav); }, { passive: true });
  addEventListener('resize', nav);
})();
