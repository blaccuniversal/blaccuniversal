/* Projects page: switch between list, grid and slide views */
(function () {
  var list = document.querySelector('[data-plist]'); if (!list) return;
  var btns = [].slice.call(document.querySelectorAll('[data-pview]'));
  var bar = document.querySelector('[data-pslide]'), dots = document.querySelector('[data-pslide-dots]');
  var cards = [].slice.call(list.children);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timer = null, idx = 0, paused = false, view = 'list';
  try { view = localStorage.getItem('bu_proj_view') || 'list'; } catch (e) {}

  dots.innerHTML = cards.map(function (c, i) { return '<button type="button" aria-label="Project ' + (i + 1) + '"></button>'; }).join('');
  var dotEls = [].slice.call(dots.children);

  function go(i, smooth) {
    idx = (i + cards.length) % cards.length;
    var c = cards[idx];
    list.scrollTo({ left: c.offsetLeft - (list.clientWidth - c.offsetWidth) / 2, behavior: smooth === false ? 'auto' : 'smooth' });
    mark();
  }
  function mark() { dotEls.forEach(function (d, i) { d.setAttribute('aria-current', i === idx ? 'true' : 'false'); }); }
  function nearest() {
    var mid = list.scrollLeft + list.clientWidth / 2, best = 0, bd = Infinity;
    cards.forEach(function (c, i) { var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function auto() {
    stop();
    if (view !== 'slide' || reduce) return;
    timer = setInterval(function () { if (!paused && !document.hidden) go(idx + 1); }, 4500);
  }
  function stop() { if (timer) clearInterval(timer); timer = null; }

  function set(v) {
    view = v;
    list.classList.toggle('proj-list--grid', v === 'grid');
    list.classList.toggle('proj-list--slide', v === 'slide');
    bar.hidden = v !== 'slide';
    btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-pview') === v ? 'true' : 'false'); });
    try { localStorage.setItem('bu_proj_view', v); } catch (e) {}
    if (v === 'slide') { idx = 0; requestAnimationFrame(function () { go(0, false); }); auto(); } else { stop(); list.scrollLeft = 0; }
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-pview')); }); });
  document.querySelector('[data-pslide-prev]').addEventListener('click', function () { go(idx - 1); auto(); });
  document.querySelector('[data-pslide-next]').addEventListener('click', function () { go(idx + 1); auto(); });
  dotEls.forEach(function (d, i) { d.addEventListener('click', function () { go(i); auto(); }); });
  var st;
  list.addEventListener('scroll', function () { if (view !== 'slide') return; clearTimeout(st); st = setTimeout(function () { idx = nearest(); mark(); }, 80); }, { passive: true });
  ['pointerenter', 'focusin', 'touchstart'].forEach(function (ev) { list.addEventListener(ev, function () { paused = true; }, { passive: true }); });
  ['pointerleave', 'focusout'].forEach(function (ev) { list.addEventListener(ev, function () { paused = false; }); });
  list.addEventListener('touchend', function () { setTimeout(function () { paused = false; auto(); }, 3000); }, { passive: true });
  list.addEventListener('keydown', function (e) { if (view !== 'slide') return; if (e.key === 'ArrowRight') { go(idx + 1); auto(); } if (e.key === 'ArrowLeft') { go(idx - 1); auto(); } });
  window.addEventListener('resize', function () { if (view === 'slide') go(idx, false); });
  set(view);
})();
