/* Brava Hotel · a BLACC Universal construct */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var WA = '2347047000608';

  /* Rooms and rates as published by Brava Hotel. Put real photos in photo: '/constructs/brava/img/…' */
  var ROOMS = [
    { id: 'standard', kind: 'Room', name: 'Standard Room', price: 95000, photo: '/constructs/brava/img/room-standard-s.webp', more: ['/constructs/brava/img/room-standard-2-s.webp'],
      desc: 'A warm, inviting bedroom perfect for relaxing after a busy day.',
      feats: [['i-wifi', 'Free WiFi'], ['i-ac', 'Air conditioning'], ['i-tv', '65" flat screen']] },
    { id: 'deluxe', kind: 'Room', name: 'Deluxe Room', price: 115000, photo: '/constructs/brava/img/room-deluxe-s.webp', pos: '50% 62%', more: ['/constructs/brava/img/room-deluxe-2-s.webp', '/constructs/brava/img/room-deluxe-3-s.webp'],
      desc: 'Bright and spacious room designed for comfort and style.',
      feats: [['i-fridge', 'Mini fridge'], ['i-coffee', 'Coffee maker'], ['i-bell', 'Room service'], ['i-wifi', 'Free WiFi']] },
    { id: 'presidential', kind: 'Suite · 2 bedrooms', name: 'Presidential Suite', price: 300000, photo: '/constructs/brava/img/suite-lounge-s.webp', pos: '50% 55%',
      desc: 'A warm, inviting two-bedroom suite perfect for relaxing after a busy day.',
      feats: [['i-wifi', 'Free WiFi'], ['i-ac', 'Air conditioning'], ['i-tv', '65" flat screen'], ['i-bed', '2 bedrooms']] }
  ];
  function byId(id) { for (var i = 0; i < ROOMS.length; i++) if (ROOMS[i].id === id) return ROOMS[i]; return ROOMS[0]; }
  function naira(n) { return '₦' + n.toLocaleString('en-NG'); }
  function ic(id) { return '<svg><use href="#' + id + '"/></svg>'; }

  /* line drawings of each room, until the hotel's own photos are added */
  function art(r) {
    if (r.photo) return '<div class="art art--photo"><img src="' + r.photo + '" alt="' + r.name + ' at Brava Hotel" loading="lazy"' + (r.pos ? ' style="object-position:' + r.pos + '"' : '') + '></div>';
    var s = 'stroke="rgba(255,226,190,.55)" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"';
    var bed = '<path ' + s + ' d="M70 205 V160 h260 v45 M70 190 h260 M90 160 v-30 a10 10 0 0 1 10 -10 h200 a10 10 0 0 1 10 10 v30"/><rect ' + s + ' x="110" y="138" width="70" height="22" rx="8"/><rect ' + s + ' x="220" y="138" width="70" height="22" rx="8"/><path ' + s + ' d="M70 205 v10 M330 205 v10"/>';
    var lamp = '<g class="lamp"><circle cx="355" cy="112" r="30" fill="rgba(255,199,122,.16)"/></g><path ' + s + ' d="M345 120 h20 l-5 -18 h-10z M355 120 v50 M343 170 h24"/>';
    var tv = '<rect ' + s + ' x="150" y="48" width="100" height="58" rx="3"/><path ' + s + ' d="M180 112 h40"/>';
    var win = '<rect ' + s + ' x="40" y="50" width="70" height="80"/><path ' + s + ' d="M75 50 v80 M40 90 h70"/>';
    var extra = r.id === 'deluxe' ? '<rect ' + s + ' x="20" y="150" width="34" height="55" rx="3"/><path ' + s + ' d="M20 170 h34"/>' : r.id === 'presidential' ? '<path ' + s + ' d="M300 48 h70 v82 h-70z M335 48 v82"/><circle cx="360" cy="90" r="2" fill="rgba(255,226,190,.55)"/>' : '';
    return '<div class="art art--' + r.id + '"><svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">' + (r.id === 'presidential' ? '' : win) + tv + bed + lamp + extra + '</svg></div>';
  }

  /* ---------- rooms ---------- */
  $('[data-rooms]').innerHTML = ROOMS.map(function (r, i) {
    return '<button class="room reveal" type="button" data-open="' + r.id + '" style="transition-delay:' + (i * 0.08) + 's">' +
      '<div class="room__art">' + art(r) + '</div>' +
      '<div class="room__b"><span class="room__k">' + r.kind + '</span><h3 class="room__t">' + r.name + '</h3><p class="room__d">' + r.desc + '</p>' +
      '<ul class="room__f">' + r.feats.slice(0, 3).map(function (f) { return '<li>' + ic(f[0]) + f[1] + '</li>'; }).join('') + '</ul>' +
      '<div class="room__foot"><span class="room__p">' + naira(r.price) + ' <small>/ night</small></span><span class="room__go">Details' + ic('i-arrow') + '</span></div></div></button>';
  }).join('');

  var sheet = $('[data-sheet]'), sheetRoom = null, lastFocus = null;
  function openRoom(id) {
    var r = byId(id); sheetRoom = r; lastFocus = document.activeElement;
    $('[data-sart]').innerHTML = art(r);
    var pics = r.photo ? [r.photo].concat(r.more || []) : [], th = $('[data-sthumbs]');
    th.hidden = pics.length < 2;
    th.innerHTML = pics.map(function (src, i) { return '<button type="button" class="' + (i ? '' : 'is-on') + '" data-sp="' + src + '" aria-label="Photo ' + (i + 1) + ' of ' + pics.length + '"><img src="' + src + '" alt="" loading="lazy"></button>'; }).join('');
    $('[data-skind]').textContent = r.kind;
    $('[data-st]').textContent = r.name;
    $('[data-sprice]').innerHTML = naira(r.price) + ' <small>/ night</small>';
    $('[data-sdesc]').textContent = r.desc;
    $('[data-sstay]').textContent = stayLine();
    $('[data-sfeats]').innerHTML = r.feats.map(function (f) { return '<li>' + ic(f[0]) + f[1] + '</li>'; }).join('');
    sheet.hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(function () { $('[data-close]').focus(); }, 50);
  }
  function closeSheet() { sheet.hidden = true; document.body.style.overflow = ''; if (lastFocus) try { lastFocus.focus(); } catch (e) {} }

  /* ---------- booking ---------- */
  var fIn = $('[data-in]'), fOut = $('[data-out]'), fRoom = $('[data-room]'), guests = 2;
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parse(v) { var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function nice(v) { return parse(v).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
  var t0 = new Date(); t0.setHours(0, 0, 0, 0);
  var t1 = new Date(t0); t1.setDate(t1.getDate() + 1);
  fIn.min = iso(t0); fIn.value = iso(t0);
  fOut.min = iso(t1); fOut.value = iso(t1);
  function nights() { if (!fIn.value || !fOut.value) return 0; return Math.round((parse(fOut.value) - parse(fIn.value)) / 864e5); }
  function sum() {
    var n = nights(), r = byId(fRoom.value);
    $('[data-sum]').innerHTML = n > 0 ? '<b>' + r.name + '</b> · ' + n + ' night' + (n > 1 ? 's' : '') + ' · ' + guests + ' guest' + (guests > 1 ? 's' : '') + ' · about <b>' + naira(r.price * n) + '</b>' : 'Pick a check-out date after check-in.';
  }
  fIn.addEventListener('change', function () {
    if (!fIn.value) return;
    var next = parse(fIn.value); next.setDate(next.getDate() + 1);
    fOut.min = iso(next);
    if (!fOut.value || parse(fOut.value) <= parse(fIn.value)) fOut.value = iso(next);
    sum();
  });
  fOut.addEventListener('change', sum);
  fRoom.addEventListener('change', sum);
  $('[data-bk]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-g]'); if (!b) return;
    guests = Math.max(1, Math.min(8, guests + +b.getAttribute('data-g')));
    $('[data-guests]').textContent = guests; sum();
  });
  $('[data-bk]').addEventListener('submit', function (e) {
    e.preventDefault();
    var n = nights();
    if (n < 1) { toast('Check-out must be after check-in'); fOut.focus(); return; }
    waBook(byId(fRoom.value));
  });
  // every booking goes straight to Brava's reservations WhatsApp, with the room, dates and guests filled in
  function waBook(r) {
    var n = Math.max(1, nights());
    var msg = 'Hello Brava Hotel, I’d like to book the ' + r.name + ' (' + naira(r.price) + ' / night).\n' +
      'Check-in: ' + nice(fIn.value) + '\nCheck-out: ' + nice(fOut.value) + ' (' + n + ' night' + (n > 1 ? 's' : '') + ')\n' +
      'Guests: ' + guests + '\nIs it available?';
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  }
  function stayLine() { var n = nights(); return n > 0 ? nice(fIn.value) + ' → ' + nice(fOut.value) + ' · ' + n + ' night' + (n > 1 ? 's' : '') + ' · ' + guests + ' guest' + (guests > 1 ? 's' : '') : ''; }
  sum();

  function goBook(roomId) {
    closeSheet(); closeDrawer();
    if (roomId) { fRoom.value = roomId; sum(); }
    var bk = $('#book');
    window.scrollTo({ top: bk.getBoundingClientRect().top + window.pageYOffset - 90, behavior: 'smooth' });
    setTimeout(function () { try { fIn.focus({ preventScroll: true }); } catch (e) {} }, 650);
  }

  /* ---------- nav ---------- */
  var nav = $('[data-nav]'), drawer = $('[data-drawer]'), burger = $('[data-burger]');
  function closeDrawer() { drawer.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu'); document.body.style.overflow = sheet.hidden ? '' : 'hidden'; }
  burger.addEventListener('click', function () {
    var open = drawer.hidden;
    drawer.hidden = !open; burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('a', drawer).forEach(function (a) { a.addEventListener('click', closeDrawer); });

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-book],[data-open],[data-close],[data-sbook],[data-sdates]');
    if (!t) { if (e.target === sheet) closeSheet(); return; }
    if (t.hasAttribute('data-book')) goBook();
    else if (t.hasAttribute('data-open')) openRoom(t.getAttribute('data-open'));
    else if (t.hasAttribute('data-close')) closeSheet();
    else if (t.hasAttribute('data-sbook')) { if (sheetRoom) { fRoom.value = sheetRoom.id; sum(); waBook(sheetRoom); } }
    else if (t.hasAttribute('data-sdates')) goBook(sheetRoom && sheetRoom.id);
  });
  // room photo thumbnails
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sp]'); if (!b) return;
    var img = $('[data-sart] img'); if (img) { img.src = b.getAttribute('data-sp'); img.style.objectPosition = '50% 55%'; }
    $$('[data-sp]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
  });
  // photo viewer for the gallery and moments
  var lbx = $('[data-lbx]');
  function openLbx(src, alt) { $('[data-lbx-img]').src = src.replace('-s.webp', '.webp'); $('[data-lbx-img]').alt = alt || ''; lbx.hidden = false; document.body.style.overflow = 'hidden'; }
  function closeLbx() { lbx.hidden = true; document.body.style.overflow = ''; }
  document.addEventListener('click', function (e) {
    var f = e.target.closest('.gal__i, .mo, .plate');
    if (f && !e.target.closest('[data-lbx]')) { var im = $('img', f); openLbx(im.getAttribute('src'), im.alt); return; }
    if (e.target.closest('[data-lbx-close]') || e.target === lbx || e.target.closest('[data-lbx-img]')) closeLbx();
    var g = e.target.closest('[data-rail-go]');
    if (g) { var rail = $('[data-rail]'); rail.scrollBy({ left: +g.getAttribute('data-rail-go') * rail.clientWidth * 0.8, behavior: 'smooth' }); }
  });
  var railEl = $('[data-rail]');
  function railBtns() { var a = $$('[data-rail-go]'); if (!railEl || a.length < 2) return; a[0].disabled = railEl.scrollLeft < 8; a[1].disabled = railEl.scrollLeft + railEl.clientWidth > railEl.scrollWidth - 8; }
  if (railEl) { railEl.addEventListener('scroll', railBtns, { passive: true }); window.addEventListener('resize', railBtns); railBtns();
  }
  document.addEventListener('click', function () {
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lbx.hidden) { closeLbx(); return; } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!sheet.hidden) closeSheet(); else if (!drawer.hidden) closeDrawer(); } });

  // nav state + active section
  var secs = ['rooms', 'dining', 'orbit', 'cinema', 'visit'].map(function (id) { return document.getElementById(id); });
  var links = $$('.nav__links a');
  function onScroll() {
    var y = window.pageYOffset;
    nav.classList.toggle('is-scrolled', y > 40);
    var on = '';
    secs.forEach(function (s) { if (s && s.getBoundingClientRect().top < window.innerHeight * .4) on = s.id; });
    if (on === 'zuri') on = 'dining';
    links.forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + on); });
    parallax(y);
  }

  /* ---------- hero: stars, fireflies, parallax ---------- */
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  (function () {
    var st = $('[data-stars]'), h = '';
    for (var i = 0; i < 70; i++) h += '<i style="left:' + (Math.random() * 100).toFixed(2) + '%;top:' + (Math.random() * 100).toFixed(2) + '%;animation-delay:-' + (Math.random() * 4).toFixed(2) + 's;opacity:' + (0.2 + Math.random() * 0.6).toFixed(2) + '"></i>';
    st.innerHTML = h;
    var fl = $('[data-flies]'); h = '';
    for (var j = 0; j < 22; j++) h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (30 + Math.random() * 60).toFixed(1) + '%;--t:' + (7 + Math.random() * 7).toFixed(1) + 's;--dl:-' + (Math.random() * 10).toFixed(1) + 's;--x:' + (Math.random() * 80 - 40).toFixed(0) + 'px;--y:' + (-20 - Math.random() * 60).toFixed(0) + 'px"></i>';
    fl.innerHTML = h;
  })();
  var heroImg = $('[data-heroimg]'), mx = 0, hero = $('[data-hero]');
  function parallax(y) {
    if (reduce || y > window.innerHeight * 1.2) return;
    heroImg.style.transform = 'translate(' + (mx * -8).toFixed(1) + 'px,' + (y * 0.25).toFixed(1) + 'px) scale(' + (1.04 + y / window.innerHeight * 0.06).toFixed(3) + ')';
  }
  if (!reduce) hero.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; mx = (e.clientX / window.innerWidth - 0.5) * 2; parallax(window.pageYOffset); });

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- reveal on scroll ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });

  var tt;
  function toast(t) { var el = $('[data-toast]'); el.textContent = t; el.hidden = false; clearTimeout(tt); tt = setTimeout(function () { el.hidden = true; }, 2200); }
  $('[data-year]').textContent = new Date().getFullYear();
})();
