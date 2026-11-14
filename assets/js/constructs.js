/* Constructs · BLACC Universal */
(function () {
  'use strict';
  /* Login code is stored only as SHA-256 of "blacccx:" + CODE (upper case). */
  var PASS = '9c0a61f29b5d6857b8356e871ffc52e90cd7fc122ef124b57df4739610759ef8';
  var KEY = 'cx_pass', DAYS = 30;
  /* Constructs shown after login: { name: 'Name', path: '/constructs/folder/' } */
  var CONSTRUCTS = [
    { name: 'ÀṢÀ Bar & Kitchen', tag: 'Restaurant · Ibadan', path: '/constructs/asa/', img: '/constructs/asa/img/bar-s.webp', logo: '/constructs/asa/img/logo.png' },
    { name: 'Cinema D Hybrid', tag: 'Cinema', path: '/constructs/cinema/', img: '/constructs/cinema/img/cover.webp' }
  ];

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

  var f = document.querySelector('[data-cx-form]'), inp = document.querySelector('[data-cx-in]'), hub = document.querySelector('[data-cx-hub]'), main = document.querySelector('.cx');
  if (!f) return;
  function saved() { try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.h === PASS && v.until > Date.now(); } catch (e) { return false; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var ICON = {
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    swipe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="6" y="5" width="12" height="14" rx="1"/><path d="M3 8v8M21 8v8"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'
  };
  var view = 'grid';
  try { view = localStorage.getItem('cx_view') || 'grid'; } catch (e) {}
  function thumb(c) {
    return '<span class="cx-thumb"><img src="' + esc(c.img) + '" alt="" loading="lazy">' + (c.logo ? '<i style="--logo:url(' + esc(c.logo) + ')"></i>' : '') + '</span>';
  }
  function render() {
    var n = CONSTRUCTS.length, body;
    if (!n) body = '<p class="cx-empty">Nothing under construction yet.</p>';
    else if (view === 'list') body = '<div class="cx-rows">' + CONSTRUCTS.map(function (c) { return '<a class="cx-row" href="' + esc(c.path) + '">' + thumb(c) + '<span><b>' + esc(c.name) + '</b><small>' + esc(c.tag || '') + '</small></span>' + ICON.arrow + '</a>'; }).join('') + '</div>';
    else if (view === 'swipe') body = '<div class="cx-swipe" data-cx-swipe>' + CONSTRUCTS.map(function (c) { return '<a class="cx-card" href="' + esc(c.path) + '">' + thumb(c) + '<b>' + esc(c.name) + '</b><small>' + esc(c.tag || '') + '</small></a>'; }).join('') + '</div>' +
      (n > 1 ? '<div class="cx-dots">' + CONSTRUCTS.map(function (_, i) { return '<i' + (i ? '' : ' class="is-on"') + '></i>'; }).join('') + '</div><p class="cx-hint" aria-hidden="true">' + ICON.left + '</p>' : '');
    else body = '<div class="cx-grid">' + CONSTRUCTS.map(function (c, i) { return '<a class="cx-tile" href="' + esc(c.path) + '" style="--d:' + i + '">' + thumb(c) + '<b>' + esc(c.name) + '</b><small>' + esc(c.tag || '') + '</small></a>'; }).join('') + '</div>';
    hub.innerHTML = '<div class="cx-bar"><span class="cx-count">' + n + (n === 1 ? ' construct' : ' constructs') + '</span><div class="cx-views" role="group" aria-label="View">' +
      ['grid', 'list', 'swipe'].map(function (v) { return '<button type="button" data-cx-view="' + v + '" aria-pressed="' + (v === view) + '" aria-label="' + v + ' view">' + ICON[v] + '</button>'; }).join('') + '</div></div>' + body;
    var sw = hub.querySelector('[data-cx-swipe]');
    if (sw) sw.addEventListener('scroll', function () {
      var cards = sw.children, mid = sw.scrollLeft + sw.clientWidth / 2, best = 0, bd = 1e9;
      for (var i = 0; i < cards.length; i++) { var d = Math.abs(cards[i].offsetLeft + cards[i].offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } }
      hub.querySelectorAll('.cx-dots i').forEach(function (d, i) { d.classList.toggle('is-on', i === best); });
    }, { passive: true });
  }
  hub.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cx-view]'); if (!b) return;
    view = b.getAttribute('data-cx-view'); try { localStorage.setItem('cx_view', view); } catch (x) {}
    render();
  });
  function open() { main.classList.add('is-open'); hub.hidden = false; render(); }
  if (saved()) open();

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
      setTimeout(open, 350);
    });
  });
  inp.addEventListener('input', function () { f.classList.remove('is-no'); });
})();
