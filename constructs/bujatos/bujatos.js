/* Bujatos Kitchen · construct by BLACC Universal */
(function () {
  'use strict';
  var WA = '2348060421977', IMG = '/constructs/bujatos/img/', KEY = 'bujatos_order_v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var naira = function (n) { return '₦' + n.toLocaleString('en-NG'); };

  /* Prices come from Bujatos' own posts. null = price on request. */
  var DISHES = [
    { id: 'jollof', cat: 'plates', name: 'Jollof Small Plate', desc: 'Smoky jollof, peppered chicken and a skewer of fried plantain. Generous portions, honest prices.', price: 3000, img: 'jollof-plate.webp' },
    { id: 'spagh', cat: 'plates', name: 'Stir-fried Spaghetti', desc: 'Stir-fried spagh with vegetables, grilled chicken and plantain. Worth the walk over.', price: 3000, img: 'stirfry-plate.webp' },
    { id: 'exec', cat: 'grills', name: 'Executive Plate', desc: 'Chicken and chips with plantain, under a heap of fresh pepper sauce.', price: 5000, img: 'chips-plate.webp', tag: 'Chicken & chips' },
    { id: 'bbqfish', cat: 'grills', name: 'Barbecue Fish', desc: 'Whole fish grilled in foil with pepper sauce, chips, plantain and coleslaw.', price: null, img: 'fish.webp' },
    { id: 'shaw1', cat: 'wraps', name: 'Exotic Shawarma', desc: 'Grill-marked wrap with creamy chicken and one hot dog.', price: null, img: 'shaw-1dog.webp', tag: '1 hot dog' },
    { id: 'shaw2', cat: 'wraps', name: 'Exotic Shawarma, Loaded', desc: 'Extra chicken and two hot dogs. For when one is not enough.', price: null, img: 'shaw-2dog.webp', tag: 'Extra chicken · 2 hot dogs' },
    { id: 'combo', cat: 'wraps', name: 'Shawarma Combo', desc: 'We didn’t invent the shawarma combo. We perfected it.', price: null, img: 'shawarma.webp' },
    { id: 'yogurt', cat: 'drinks', name: 'Strawberry Yogurt', desc: 'Strawberry, milk and sugar, bottled cold. The drink your group chat keeps asking about.', price: 2500, img: 'yogurt.webp' }
  ];
  var MORE = [
    { id: 'guinea', cat: 'grills', name: 'Guinea fowl' },
    { id: 'club', cat: 'wraps', name: 'Club sandwich' },
    { id: 'gizdodo', cat: 'sides', name: 'Gizdodo' },
    { id: 'assorted', cat: 'sides', name: 'Peppered assorted meat' },
    { id: 'moimoi', cat: 'sides', name: 'Moi moi' },
    { id: 'parfait', cat: 'sides', name: 'Fruit parfait' },
    { id: 'zobo', cat: 'drinks', name: 'Zobo' },
    { id: 'tiger', cat: 'drinks', name: 'Tiger nut drink' }
  ];
  /* Weekly specials (Mon–Sat, pre-order) and opening hours, from Bujatos' WhatsApp Business profile */
  var SPECIALS = [null,
    { id: 'sp1', name: 'White rice with beans and stew' },
    { id: 'sp2', name: 'Ofada rice with ayamase sauce' },
    { id: 'sp3', name: 'Ewa agoyin with agoyin sauce' },
    { id: 'sp4', name: 'Porridge with vegetable sauce' },
    { id: 'sp5', name: 'Pounded yam with efo riro or egusi' },
    { id: 'sp6', name: 'Yam and egg sauce, or amala dudu and ewedu' }];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var HOURS = [[17, 0, 21, 0], [13, 0, 21, 35], [13, 0, 21, 35], [13, 0, 21, 0], [13, 0, 21, 35], [13, 0, 21, 35], [13, 0, 21, 35]];
  var ALL = {}; DISHES.concat(MORE).forEach(function (d) { ALL[d.id] = d; });
  SPECIALS.forEach(function (d, i) { if (d) { d.cat = 'special'; d.price = null; d.day = DAYS[i]; ALL[d.id] = d; } });

  var cart = {}, mode = 'pickup', filter = 'all';
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && saved.items) { cart = saved.items; mode = saved.mode || 'pickup'; } } catch (e) {}
  Object.keys(cart).forEach(function (k) { if (!ALL[k] || !(cart[k] > 0)) delete cart[k]; });
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ items: cart, mode: mode })); } catch (e) {} }

  function ctrl(id) {
    var q = cart[id] || 0;
    if (!q) return '<button class="add" type="button" data-add="' + id + '" aria-label="Add ' + ALL[id].name + '"><svg><use href="#i-plus"/></svg>' + (ALL[id].day ? 'Pre-order' : 'Add') + '</button>';
    return '<span class="step"><button type="button" data-dec="' + id + '" aria-label="Remove one"><svg><use href="#i-minus"/></svg></button><b>' + q + '</b><button type="button" data-add="' + id + '" aria-label="Add one"><svg><use href="#i-plus"/></svg></button></span>';
  }
  function priceHTML(d) { return d.price ? '<span class="price">' + naira(d.price) + '</span>' : '<span class="price price--ask">Ask</span>'; }

  var dishesEl = $('[data-dishes]'), moreEl = $('[data-more]'), moreWrap = $('[data-more-wrap]');
  function renderMenu() {
    dishesEl.innerHTML = DISHES.filter(function (d) { return filter !== 'more' && (filter === 'all' || d.cat === filter); }).map(function (d) {
      return '<article class="dish"><div class="dish__img"><img src="' + IMG + d.img + '" alt="' + d.name + '" loading="lazy">' + (d.tag ? '<span class="dish__tag">' + d.tag + '</span>' : '') + '</div>' +
        '<div class="dish__b"><h3 class="dish__n">' + d.name + '</h3><p class="dish__d">' + d.desc + '</p><div class="dish__f">' + priceHTML(d) + '<span data-ctrl="' + d.id + '">' + ctrl(d.id) + '</span></div></div></article>';
    }).join('');
    var more = filter === 'more' ? MORE : [];
    dishesEl.hidden = filter === 'more';
    moreWrap.hidden = !more.length;
    moreEl.innerHTML = more.map(function (d) { return '<li><span>' + d.name + '</span><span data-ctrl="' + d.id + '">' + ctrl(d.id) + '</span></li>'; }).join('');
  }
  function refreshCtrls() { $$('[data-ctrl]').forEach(function (el) { el.innerHTML = ctrl(el.getAttribute('data-ctrl')); }); }

  /* cart */
  var cartEl = $('[data-cart]'), linesEl = $('[data-lines]'), obar = $('[data-obar]'), sendBtn = $('[data-send]');
  function totals() {
    var n = 0, sum = 0, ask = false;
    Object.keys(cart).forEach(function (k) { n += cart[k]; if (ALL[k].price) sum += ALL[k].price * cart[k]; else ask = true; });
    return { n: n, sum: sum, ask: ask };
  }
  function renderCart() {
    var t = totals(), ids = Object.keys(cart);
    $$('[data-count]').forEach(function (el) { el.textContent = t.n; el.hidden = !t.n; });
    $$('[data-total]').forEach(function (el) { el.textContent = naira(t.sum) + (t.ask ? ' + ask' : ''); });
    obar.hidden = !t.n || !cartEl.hidden;
    $('[data-empty]').hidden = !!ids.length;
    $('[data-form]').hidden = !ids.length;
    $('[data-hint]').hidden = !t.ask;
    sendBtn.disabled = !ids.length;
    linesEl.innerHTML = ids.map(function (k) {
      var d = ALL[k];
      var pic = d.img ? '<img src="' + IMG + d.img + '" alt="">' : '<span class="ph"><svg><use href="#i-spark"/></svg></span>';
      return '<li>' + pic + '<div><b>' + d.name + '</b><small>' + (d.day ? 'Pre-order · ' + d.day + ' special' : d.price ? naira(d.price * cart[k]) : 'Price on request') + '</small></div><span data-ctrl="' + k + '">' + ctrl(k) + '</span></li>';
    }).join('');
    $$('.seg button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === mode); });
    $('[data-addr]').hidden = mode !== 'delivery';
  }
  function change(id, dlt) {
    cart[id] = Math.max(0, (cart[id] || 0) + dlt); if (!cart[id]) delete cart[id];
    save(); refreshCtrls(); renderCart();
    if (dlt > 0) { var b = $('.cartbtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-add]'), d = e.target.closest('[data-dec]');
    if (a) { change(a.getAttribute('data-add'), 1); return; }
    if (d) { change(d.getAttribute('data-dec'), -1); return; }
    if (e.target.closest('[data-cart-open]')) { openCart(); return; }
    if (e.target.closest('[data-cart-close]')) { closeCart(); return; }
  });
  function openCart() { cartEl.hidden = false; document.body.style.overflow = 'hidden'; document.body.classList.add('is-lock'); renderCart(); setTimeout(function () { $('.cart__x').focus(); }, 50); }
  function closeCart() { cartEl.hidden = true; document.body.style.overflow = ''; document.body.classList.remove('is-lock'); renderCart(); }
  $$('.seg button').forEach(function (b) { b.addEventListener('click', function () { mode = b.getAttribute('data-mode'); save(); renderCart(); }); });

  sendBtn.addEventListener('click', function () {
    var name = $('[data-in="name"]').value.trim(), addr = $('[data-in="addr"]').value.trim(), note = $('[data-in="note"]').value.trim();
    if (mode === 'delivery' && !addr) { toast('Add a delivery address'); $('[data-in="addr"]').focus(); return; }
    var t = totals(), L = ['Hi Bujatos! I’d like to order:', ''];
    Object.keys(cart).forEach(function (k) { var d = ALL[k]; L.push('• ' + cart[k] + ' × ' + d.name + (d.day ? ' (' + d.day + ' special, pre-order)' : '') + ' — ' + (d.price ? naira(d.price * cart[k]) : 'price to confirm')); });
    L.push('', 'Subtotal: ' + naira(t.sum) + (t.ask ? ' (plus items to confirm)' : ''));
    L.push(mode === 'delivery' ? 'Delivery to: ' + addr : 'Pickup at Preboye’s Complex');
    if (name) L.push('Name: ' + name);
    if (note) L.push('Note: ' + note);
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(L.join('\n')), '_blank', 'noopener');
  });

  /* filters */
  $$('[data-filters] button').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-f');
      $$('[data-filters] button').forEach(function (x) { x.classList.toggle('on', x === b); });
      renderMenu();
    });
  });

  /* feed */
  var POSTS = [['p-respect', 'Respect yourself. Eat good jollof!'], ['p-jollof', 'Bujatos Jollof small plate, ₦3k'], ['p-combo', 'We didn’t invent the shawarma combo, but we perfected it'], ['p-chicken', 'Executive plate: chicken and chips, ₦5k'], ['p-spagh', 'Stir-fried spagh, worth the walk over, ₦3k'], ['p-yogurt', 'Strawberry yogurt drink, ₦2,500'], ['p-ontime', 'Food that actually shows up on time'], ['p-barqly-jollof', 'Jollof, done right, on Barqly'], ['p-barqly-stirfry', 'Your stir-fry combo, for less, on Barqly'], ['p-barqly-free', 'Free delivery on your first Barqly order']];
  var rail = $('[data-rail]');
  rail.innerHTML = POSTS.map(function (p) { return '<button class="post" type="button" data-zoom="' + IMG + p[0] + '.webp"><img src="' + IMG + p[0] + '.webp" alt="' + p[1] + '" loading="lazy"></button>'; }).join('');
  var prev = $('[data-go="-1"]'), next = $('[data-go="1"]');
  function railBtns() { prev.disabled = rail.scrollLeft < 8; next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8; }
  $$('[data-go]').forEach(function (b) { b.addEventListener('click', function () { rail.scrollBy({ left: +b.getAttribute('data-go') * Math.max(260, rail.clientWidth * .75), behavior: 'smooth' }); }); });
  rail.addEventListener('scroll', railBtns, { passive: true }); window.addEventListener('resize', railBtns); railBtns();

  /* lightbox */
  var lbx = $('[data-lbx]'), lbImg = $('[data-lbx-img]');
  rail.addEventListener('click', function (e) { var p = e.target.closest('[data-zoom]'); if (!p) return; lbImg.src = p.getAttribute('data-zoom'); lbImg.alt = p.querySelector('img').alt; lbx.hidden = false; document.body.style.overflow = 'hidden'; document.body.classList.add('is-lock'); });
  function closeLbx() { lbx.hidden = true; document.body.style.overflow = ''; document.body.classList.remove('is-lock'); }
  lbx.addEventListener('click', function (e) { if (e.target === lbx || e.target.closest('[data-lbx-close]')) closeLbx(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!lbx.hidden) closeLbx(); else if (!cartEl.hidden) closeCart(); } });

  /* copy code */
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy'), done = function () {
        if (t === 'BUJATO2026') { toast('Code copied: ' + t); var s = $('[data-copied]'); if (s) s.textContent = 'Copied. Paste it at checkout on Barqly.'; }
        else if (/^\d+$/.test(t)) toast('Account number copied');
        else toast('Address copied');
      };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () {});
      else { var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); done(); } catch (e) {} a.remove(); }
    });
  });

  /* toast */
  var tt; function toast(t) { var el = $('[data-toast]'); el.textContent = t; el.hidden = false; clearTimeout(tt); tt = setTimeout(function () { el.hidden = true; }, 2200); }

  /* nav */
  var nav = $('[data-nav]');
  function onScroll() { nav.classList.toggle('is-s', scrollY > 30); }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* reveal */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });

  /* time in Lagos */
  function lagosNow() { var d = new Date(); return new Date(d.getTime() + d.getTimezoneOffset() * 60000 + 3600000); }
  function hm(h, m) { var ap = h >= 12 ? 'PM' : 'AM', hh = h % 12 || 12; return hh + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + ap; }

  /* specials */
  var daysEl = $('[data-days]');
  var spDay = null, spDir = 1;
  function renderDays() {
    var today = lagosNow().getDay();
    if (spDay === null) spDay = SPECIALS[today] ? today : 1;
    var d = SPECIALS[spDay];
    daysEl.innerHTML = '<div class="sp__tabs" role="tablist">' + [1, 2, 3, 4, 5, 6].map(function (i) {
      return '<button type="button" role="tab" data-sd="' + i + '" class="' + (i === spDay ? 'on' : '') + (i === today ? ' is-today' : '') + '" aria-selected="' + (i === spDay) + '"><span>' + DAYS[i].slice(0, 3) + '</span></button>';
    }).join('') + '</div>' +
      '<div class="sp__card ' + (spDir > 0 ? 'from-r' : 'from-l') + '"><span class="sp__d">' + DAYS[spDay] + (spDay === today ? '<em>Today</em>' : '') + '</span><p class="sp__n">' + d.name + '</p><span data-ctrl="' + d.id + '">' + ctrl(d.id) + '</span></div>';
  }
  function setSpDay(n) { n = Math.max(1, Math.min(6, n)); if (n === spDay) return; spDir = n > spDay ? 1 : -1; spDay = n; renderDays(); }
  daysEl.addEventListener('click', function (e) { var b = e.target.closest('[data-sd]'); if (b) setSpDay(+b.getAttribute('data-sd')); });
  (function () { var x0 = null, y0 = 0;
    daysEl.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    daysEl.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) setSpDay(spDay + (dx < 0 ? 1 : -1)); }, { passive: true });
  })();

  /* hours + open status */
  function renderHours() {
    var now = lagosNow(), d = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
    var order = [1, 2, 3, 4, 5, 6, 0];
    var ab = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    $('[data-week]').innerHTML = order.map(function (i) { return '<span' + (i === d ? ' class="on"' : '') + '>' + ab[i] + '</span>'; }).join('');
    var groups = [];
    order.forEach(function (i) {
      var h = HOURS[i], t = hm(h[0], h[1]) + ' – ' + hm(h[2], h[3]), g = groups.filter(function (x) { return x.t === t; })[0];
      if (!g) { g = { t: t, days: [] }; groups.push(g); } g.days.push(i);
    });
    $('[data-hours]').innerHTML = groups.map(function (g) {
      var sh = g.days.map(function (i) { return DAYS[i].slice(0, 3); });
      var lbl = g.days.length === 7 ? 'Every day' : sh.join(' · ');
      return '<li' + (g.days.indexOf(d) > -1 ? ' class="on"' : '') + '><span>' + lbl + '</span><b>' + g.t + '</b></li>';
    }).join('');
    var h = HOURS[d], o = h[0] * 60 + h[1], c = h[2] * 60 + h[3], st = $('[data-status]'), t;
    if (mins >= o && mins < c) { t = 'Open now · until ' + hm(h[2], h[3]); st.classList.add('is-open'); }
    else if (mins < o) { t = 'Opens today at ' + hm(h[0], h[1]); st.classList.remove('is-open'); }
    else { var nx = (d + 1) % 7, n = HOURS[nx]; t = 'Closed now · opens ' + DAYS[nx] + ' at ' + hm(n[0], n[1]); st.classList.remove('is-open'); }
    $('[data-status-t]').textContent = t; st.hidden = false;
  }

  var ev = $('[data-event]');
  if (ev) ev.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Hi Bujatos! I’d like to plan catering for an event.\n\nDate:\nNumber of guests:\nLocation:\nMeals:');


  /* sliders */
  $$('[data-slider]').forEach(function (s) {
    var track = $('[data-track]', s), slides = $$(':scope > *', track), dotsEl = $('[data-dots]', s), cur = 0, hold = 0, vis = false, dir = 1;
    dotsEl.innerHTML = slides.map(function (_, i) { return '<button type="button" role="tab" aria-label="Slide ' + (i + 1) + '"></button>'; }).join('');
    var dots = $$('button', dotsEl);
    function mark(i) { cur = i; dots.forEach(function (d, k) { d.classList.toggle('on', k === i); d.setAttribute('aria-selected', k === i); }); }
    function go(i) { track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: 'smooth' }); mark(i); }
    dots.forEach(function (d, i) { d.addEventListener('click', function () { hold = Date.now() + 9000; go(i); }); });
    track.addEventListener('scroll', function () { var i = Math.round(track.scrollLeft / (slides[0].offsetWidth + 14)); if (i !== cur && i >= 0 && i < slides.length) mark(i); }, { passive: true });
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (e) { track.addEventListener(e, function () { hold = Date.now() + 9000; }, { passive: true }); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }, { threshold: .4 }).observe(s); else vis = true;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) setInterval(function () { if (!vis || document.hidden || Date.now() < hold) return; var n = cur + dir; if (n >= slides.length || n < 0) { dir = -dir; n = cur + dir; } go(n); }, 4500);
    mark(0);
  });
  renderMenu(); renderDays(); renderHours(); renderCart();
  setInterval(renderHours, 60000);
})();
