/* Malimbe Lodge · a BLACC Universal construct */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* The six rooms shown so far. Malimbe has 11 culture-themed rooms; images are design renders. */
  var NAMES = ['Terracotta', 'Woven', 'Carved', 'Canopy', 'Clay', 'Weaver'];
  var ROOMS = [1, 2, 3, 4, 5, 6].map(function (n) {
    return { id: 'room-' + n, kind: 'Culture-themed suite', name: 'Room ' + (n < 10 ? '0' + n : n), photo: '/constructs/malimbe/img/bedroom-' + n + '.webp',
      desc: 'A culture-themed room with hand-finished walls, warm light and the forest outside.',
      feats: [['i-bed', 'Culture-themed design'], ['i-pin', '6,000 sqm forest setting'], ['i-bell', 'Opening December 2026']] };
  });
  function byId(id) { for (var i = 0; i < ROOMS.length; i++) if (ROOMS[i].id === id) return ROOMS[i]; return ROOMS[0]; }
  function ic(id) { return '<svg><use href="#' + id + '"/></svg>'; }
  function art(r) { return '<div class="art art--photo"><img src="' + r.photo + '" alt="' + r.name + ' at Malimbe Lodge (design render)" loading="lazy"></div>'; }

  /* ---------- rooms ---------- */
  $('[data-rooms]').innerHTML = ROOMS.map(function (r, i) {
    return '<button class="room reveal" type="button" data-open="' + r.id + '" style="transition-delay:' + ((i % 3) * 0.08) + 's">' +
      '<div class="room__art">' + art(r) + '</div>' +
      '<div class="room__b"><span class="room__k">' + r.kind + '</span><h3 class="room__t">' + r.name + '</h3><p class="room__d">' + r.desc + '</p>' +
      '<ul class="room__f">' + r.feats.map(function (f) { return '<li>' + ic(f[0]) + f[1] + '</li>'; }).join('') + '</ul>' +
      '<div class="room__foot"><span class="room__p"><small>Rates at opening</small></span><span class="room__go">Details' + ic('i-arrow') + '</span></div></div></button>';
  }).join('');

  (function () {
    var tr = $('[data-rooms]'), dots = $('[data-rdots]'), cards = $$('.room', tr), n = cards.length, dir = 1, hold = 0, vis = false;
    dots.innerHTML = cards.map(function (c, i) { return '<button type="button" aria-label="Room ' + (i + 1) + '"></button>'; }).join('');
    var ds = $$('button', dots);
    function step() { return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : tr.clientWidth; }
    function max() { return tr.scrollWidth - tr.clientWidth; }
    function cur() { var m = max(); if (tr.scrollLeft >= m - 4) return n - 1; return Math.min(n - 1, Math.round(tr.scrollLeft / step())); }
    function paint() { var c = cur(); ds.forEach(function (d, i) { d.classList.toggle('on', i === c); }); }
    function go(i) { tr.scrollTo({ left: Math.max(0, Math.min(max(), i * step())), behavior: 'smooth' }); }
    ds.forEach(function (d, i) { d.addEventListener('click', function () { hold = Date.now() + 9000; go(i); }); });
    tr.addEventListener('scroll', paint, { passive: true });
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (ev) { tr.addEventListener(ev, function () { hold = Date.now() + 9000; }, { passive: true }); });
    window.addEventListener('resize', paint); paint();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }, { threshold: .35 }).observe(tr); else vis = true;
    if (!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) setInterval(function () {
      if (!vis || document.hidden || Date.now() < hold) return;
      var m = max(), s = tr.scrollLeft;
      if (dir > 0 && s >= m - 4) dir = -1; else if (dir < 0 && s <= 4) dir = 1;
      go(Math.round(s / step()) + dir);
    }, 4500);
  })();

  var sheet = $('[data-sheet]'), sheetRoom = null, lastFocus = null;
  function openRoom(id) {
    var r = byId(id); sheetRoom = r; lastFocus = document.activeElement;
    $('[data-sart]').innerHTML = art(r);
    $('[data-skind]').textContent = r.kind;
    $('[data-st]').textContent = r.name;
    $('[data-sprice]').innerHTML = '<small>Rates announced at opening</small>';
    $('[data-sdesc]').textContent = r.desc;
    $('[data-sfeats]').innerHTML = r.feats.map(function (f) { return '<li>' + ic(f[0]) + f[1] + '</li>'; }).join('');
    sheet.hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(function () { $('[data-close]').focus(); }, 50);
  }
  function closeSheet() { sheet.hidden = true; document.body.style.overflow = ''; if (lastFocus) try { lastFocus.focus(); } catch (e) {} }

  /* ---------- request bar + join form ---------- */
  var fIn = $('[data-in]'), fInt = $('[data-room]'), guests = 2;
  var today = new Date(), open = new Date(2026, 11, 1), start = today > open ? today : open;
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  fIn.min = iso(start); fIn.value = iso(start);
  function nice(v) { var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
  var mdl = $('[data-mdl]'), WA = '233599718830';
  function openMdl(interest, note) {
    closeSheet(); closeDrawer();
    var sel = $('#f-int'); if (interest) { for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text === interest) sel.selectedIndex = i; }
    var msg = $('#f-msg'); if (note && !msg.value) msg.value = note;
    fm.className = 'jf__msg'; fm.textContent = 'We’ll only contact you about Malimbe Lodge.';
    mdl.hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(function () { try { $('#f-name').focus(); } catch (e) {} }, 60);
  }
  function closeMdl() { mdl.hidden = true; document.body.style.overflow = ''; }
  var toJoin = openMdl;
  $('[data-bk]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-g]'); if (!b) return;
    guests = Math.max(1, Math.min(12, guests + +b.getAttribute('data-g')));
    $('[data-guests]').textContent = guests;
  });
  $('[data-bk]').addEventListener('submit', function (e) {
    e.preventDefault();
    openMdl(fInt.value, (fIn.value ? 'Preferred arrival: ' + nice(fIn.value) + '. ' : '') + 'Guests: ' + guests + '.');
  });
  mdl.addEventListener('click', function (e) { if (e.target === mdl || e.target.closest('[data-mclose]')) closeMdl(); });

  var joinForm = $('#joinForm'), fm = $('#formMsg');
  joinForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#f-name').value.trim(), email = $('#f-email').value.trim(), phone = $('#f-phone').value.trim();
    var okMail = /^\S+@\S+\.\S+$/.test(email);
    if (!name || !(okMail || phone.replace(/\D/g, '').length >= 7)) { fm.className = 'jf__msg err'; fm.textContent = 'Please add your name and a phone number or email.'; return; }
    var msg = 'Hello Malimbe Lodge, I’d like to join the wait list.\nName: ' + name + (phone ? '\nPhone: ' + phone : '') + (email ? '\nEmail: ' + email : '') +
      '\nInterested in: ' + $('#f-int').value + ($('#f-msg').value.trim() ? '\nNote: ' + $('#f-msg').value.trim() : '');
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    fm.className = 'jf__msg ok'; fm.textContent = 'Almost done. Press send in the message that opens to complete your enquiry.';
  });

  /* ---------- nav ---------- */
  var nav = $('[data-nav]'), drawer = $('[data-drawer]'), burger = $('[data-burger]');
  function closeDrawer() { drawer.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu'); document.body.style.overflow = sheet.hidden ? '' : 'hidden'; }
  burger.addEventListener('click', function () {
    var o = drawer.hidden;
    drawer.hidden = !o; burger.setAttribute('aria-expanded', String(o)); burger.setAttribute('aria-label', o ? 'Close menu' : 'Open menu');
    document.body.style.overflow = o ? 'hidden' : '';
  });
  $$('a', drawer).forEach(function (a) { a.addEventListener('click', closeDrawer); });

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-book],[data-open],[data-close],[data-sbook]');
    if (!t) { if (e.target === sheet) closeSheet(); return; }
    if (t.hasAttribute('data-book')) toJoin(t.getAttribute('data-interest') || 'A stay');
    else if (t.hasAttribute('data-open')) openRoom(t.getAttribute('data-open'));
    else if (t.hasAttribute('data-close')) closeSheet();
    else if (t.hasAttribute('data-sbook')) { if (sheetRoom) toJoin('A stay', 'I’d like to hear about ' + sheetRoom.name + '.'); }
  });

  // photo viewer
  var lbx = $('[data-lbx]');
  function openLbx(src, alt) { $('[data-lbx-img]').src = src; $('[data-lbx-img]').alt = alt || ''; lbx.hidden = false; document.body.style.overflow = 'hidden'; }
  function closeLbx() { lbx.hidden = true; document.body.style.overflow = ''; }
  document.addEventListener('click', function (e) {
    var f = e.target.closest('.gal__i, .mo, .venue__art--photo');
    if (f && !e.target.closest('[data-lbx]')) { var im = $('img', f); if (im) openLbx(im.getAttribute('src'), im.alt); return; }
    if (e.target.closest('[data-lbx-close]') || e.target === lbx || e.target.closest('[data-lbx-img]')) closeLbx();
    var g = e.target.closest('[data-rail-go]');
    if (g) { var rail = $('[data-rail]'); rail.scrollBy({ left: +g.getAttribute('data-rail-go') * rail.clientWidth * 0.8, behavior: 'smooth' }); }
  });
  var railEl = $('[data-rail]');
  function railBtns() { var a = $$('[data-rail-go]'); if (!railEl || a.length < 2) return; a[0].disabled = railEl.scrollLeft < 8; a[1].disabled = railEl.scrollLeft + railEl.clientWidth > railEl.scrollWidth - 8; }
  if (railEl) { railEl.addEventListener('scroll', railBtns, { passive: true }); window.addEventListener('resize', railBtns); railBtns(); }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!lbx.hidden) closeLbx(); else if (!mdl.hidden) closeMdl(); else if (!sheet.hidden) closeSheet(); else if (!drawer.hidden) closeDrawer();
  });

  // nav state + active section
  var secs = ['rooms', 'eat', 'grounds', 'visit'].map(function (id) { return document.getElementById(id); });
  var links = $$('.nav__links a');
  function onScroll() {
    var y = window.pageYOffset;
    nav.classList.toggle('is-scrolled', y > 40);
    var on = '';
    secs.forEach(function (s) { if (s && s.getBoundingClientRect().top < window.innerHeight * .4) on = s.id; });
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

  $('[data-year]').textContent = new Date().getFullYear();
})();
