/* Pasta Xpress by Chef Kabs · construct by BLACC Universal (built on the Bujatos construct) */
(function () {
  'use strict';
  var WA = '2347063873047', IMG = '/constructs/pastaxpress/img/', KEY = 'pastaxpress_order_v2';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var naira = function (n) { return '₦' + n.toLocaleString('en-NG'); };

  /* Prices come from Pasta Xpress' own menu posts. */
  function o(a) { var r = []; for (var i = 0; i < a.length; i += 2) r.push({ n: a[i], p: a[i + 1] }); return r; }
  var EVERY = [0, 1, 2, 3, 4, 5, 6];
  var DISHES = [
    { id: 'sfp', cat: 'pasta', name: 'Stir-Fry Pasta', desc: 'Our signature, tossed to order. Pick a protein, a wing box or a tray.', days: EVERY, img: 'jolly-l.webp', pos: '50% 45%', opts: o(['Egg pasta', 2900, 'Single wing box', 3200, 'Fish (hake) pasta', 3500, 'Beef pasta', 4100, 'Mini Smiley box', 4200, 'Double wing box', 4200, 'Asun pasta', 4500, 'Fish (croaker) pasta', 4500, 'Jolly box, mini', 4500, 'Smiley box', 5700, 'Jolly box, big', 7500, 'Boujee tray, chicken', 24500, 'Boujee tray, turkey', 28600, 'Boujee tray, mixed protein', 29800]) },
    { id: 'nap', cat: 'pasta', name: 'Native Pasta', desc: 'Pasta in rich native sauce, with your choice of protein.', days: [3, 5], img: 'spag.webp', pos: '40% 50%', opts: o(['Chicken wing', 4400, 'Fish (hake)', 4500, 'Meal chicken', 4600, 'Beef', 4800, 'Mini turkey', 5100, 'Asun', 5500, 'Fish (croaker)', 5900, 'Chicken laps', 6300, 'Turkey', 7800, 'Tray, chicken', 28800, 'Tray, mixed', 34000, 'Tray, turkey', 34000]) },
    { id: 'jpp', cat: 'pasta', name: 'Jollof Penne Pasta', desc: 'Penne cooked in smoky party jollof.', days: [2, 5], price: 2700 },
    { id: 'mep', cat: 'pasta', name: 'Meaty Pasta', desc: 'Loaded with meat, from the new menu.', days: [1, 4], price: 3600 },
    { id: 'suyp', cat: 'pasta', name: 'Suya Pasta', desc: 'Pasta with 2 sticks of suya.', days: [4, 0], price: 4100 },
    { id: 'nad', cat: 'pasta', name: 'Naija Duo', desc: 'Our every-day new-menu favourite.', days: EVERY, price: 4600 },
    { id: 'ofr', cat: 'rice', name: 'Ofada Rice', desc: 'Ofada with sauce, 1 egg and plantain. Add a protein for more.', days: [3, 6], img: 'ofada-l.webp', pos: '50% 50%', opts: o(['Sauce, egg & plantain', 3200, 'Fish (hake)', 4500, 'Chicken wing', 4700, 'Meal chicken', 5500, 'Beef', 5800, 'Fish (croaker)', 5800, 'Asun', 6000, 'Mini turkey', 6100, 'Chicken laps', 7000, 'Turkey', 8700, 'Tray, chicken', 35000, 'Tray, mixed', 35000, 'Tray, turkey', 37000]) },
    { id: 'asr', cat: 'rice', name: 'Asun Rice', desc: 'Peppery asun on rice, with your choice of protein.', days: [1, 5], opts: o(['Rice only', 3500, 'Chicken wing', 4900, 'Fish (hake)', 5300, 'Beef', 5800, 'Meal chicken', 5800, 'Fish (croaker)', 6200, 'Asun', 6500, 'Mini turkey', 6500, 'Chicken laps', 7300, 'Turkey', 8700, 'Tray, chicken', 35300, 'Tray, mixed', 37600, 'Tray, turkey', 40700]) },
    { id: 'jol', cat: 'rice', name: 'Jollof Rice', desc: 'Party jollof, smoky and bold.', days: [2, 4], opts: o(['Fish (hake)', 3500, 'Meal chicken', 3500, 'Beef', 3800, 'Mini turkey', 4200, 'Asun', 4500, 'Fish (croaker)', 4500, 'Chicken laps', 5300, 'Turkey', 7000, 'Tray, chicken laps', 25900, 'Tray, turkey', 30600, 'Tray, mixed', 32500]) },
    { id: 'bas', cat: 'rice', name: 'Basmati Fried Rice', desc: 'Fragrant fried basmati with your choice of protein.', days: [1, 3, 6], opts: o(['Chicken wing', 3900, 'Fish (hake)', 4100, 'Meal chicken', 4500, 'Beef', 4600, 'Mini turkey', 4700, 'Fish (croaker)', 4900, 'Asun', 5000, 'Chicken laps', 6200, 'Turkey', 7800, 'Tray, chicken laps', 30000, 'Tray, mixed', 32500, 'Tray, turkey', 35500]) },
    { id: 'nar', cat: 'rice', name: 'Native Rice', desc: 'Palm-oil native rice with your choice of protein.', days: [2, 4, 0], opts: o(['Chicken wing', 4500, 'Fish (hake)', 4500, 'Meal chicken', 4600, 'Beef', 4800, 'Mini turkey', 5100, 'Asun', 5500, 'Fish (croaker)', 5900, 'Chicken laps', 6300, 'Turkey', 7800, 'Tray, chicken', 28800, 'Tray, mixed', 34000, 'Tray, turkey', 34000]) },
    { id: 'suyr', cat: 'rice', name: 'Suya Rice', desc: 'Rice with 2 sticks of suya.', days: [3, 6], price: 4000 },
    { id: 'prot', cat: 'sides', name: 'Proteins', desc: 'Add a protein to any plate.', days: EVERY, pic: 'wings-l.webp', pos: '50% 55%', opts: o(['Egg', 500, 'Sausage', 500, 'Chicken wings', 1200, 'Suya', 1200, 'Hake fish', 1500, 'Beef', 2200, 'Meal chicken', 2500, 'Asun', 2800, 'Small turkey', 3000, 'Croaker fish', 3200, 'Chicken', 3700, 'Big turkey', 5500]) },
    { id: 'ext', cat: 'sides', name: 'Extras', desc: 'Plantain, extra rice, extra pasta.', days: EVERY, pic: 'hotdog-l.webp', pos: '50% 50%', opts: o(['Plantain', 500, 'Extra jollof rice', 600, 'Extra pasta', 700, 'Extra rice', 800]) },
    { id: 'soft', cat: 'drinks', name: 'Soft drinks', desc: 'Cold drinks from Kabs Bar.', days: EVERY, img: 'bar-l.webp', pos: '50% 45%', opts: o(['Water', 500, 'Capri Sun', 500, 'Coke', 800, 'Fanta', 800, 'Fayrouz', 1000, 'Zobo', 1200, 'Vitamilk', 2000, 'Chivita', 3000]) },
    { id: 'mock', cat: 'drinks', name: 'Mocktails', desc: 'Kabs Bar mocktails, shaken cold.', days: EVERY, img: 'bar-l.webp', pos: '30% 70%', opts: o(['Chapman', 4000, 'Zobo Berry', 4000, 'Brown Roof', 4000, 'Blue Me Away', 4500, 'Bubble Gum', 4500, 'Bodija Hibron', 4500]) },
    { id: 'cock', cat: 'drinks', name: 'Cocktails', desc: 'Kabs Bar cocktails.', days: EVERY, img: 'bar-l.webp', pos: '70% 30%', opts: o(['Pink Berry', 5000, 'Detty Sip', 5000, 'Bodija Baddie', 5500, 'Jugular', 5500, 'Pina Colada', 5500, 'Wrong Island', 6000]) }
  ];
  var COMBO = { id: 'combo', name: 'Weekend combo', price: 12500, sub: 'Pasta, chicken, sausages, gizdodo, 2 Fayrouz', day: 'Fri – Sun' };
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var HOURS = [[9, 0, 20, 0], [9, 0, 20, 0], [9, 0, 20, 0], [9, 0, 20, 0], [9, 0, 20, 0], [9, 0, 20, 0], [9, 0, 20, 0]];
  var BYID = {}; DISHES.forEach(function (d) { BYID[d.id] = d; });
  /* a cart key is "id" or "id~optionIndex" */
  function item(key) {
    if (key === 'combo') return { name: COMBO.name, sub: COMBO.sub, price: COMBO.price, img: null };
    var p = key.split('~'), d = BYID[p[0]]; if (!d) return null;
    if (d.opts) { var op = d.opts[+p[1]]; if (!op) return null; return { name: d.name, sub: op.n, price: op.p, img: d.img || d.pic || null }; }
    return { name: d.name, sub: '', price: d.price, img: d.img || d.pic || null };
  }
  function dayText(d) { return d.days.length === 7 ? 'Daily' : d.days.slice().sort(function (a, b) { return (a || 7) - (b || 7); }).map(function (i) { return DAYS[i].slice(0, 3); }).join(' · '); }

  var cart = {}, mode = 'pickup', filter = 'all', fDay = null;
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && saved.items) { cart = saved.items; mode = saved.mode || 'pickup'; } } catch (e) {}
  Object.keys(cart).forEach(function (k) { if (!item(k) || !(cart[k] > 0)) delete cart[k]; });
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ items: cart, mode: mode })); } catch (e) {} }

  function ctrl(key) {
    var q = cart[key] || 0, nm = item(key) ? item(key).name : '';
    if (!q) return '<button class="add" type="button" data-add="' + key + '" aria-label="Add ' + nm + '"><svg><use href="#i-plus"/></svg>Add</button>';
    return '<span class="step"><button type="button" data-dec="' + key + '" aria-label="Remove one"><svg><use href="#i-minus"/></svg></button><b>' + q + '</b><button type="button" data-add="' + key + '" aria-label="Add one"><svg><use href="#i-plus"/></svg></button></span>';
  }
  function lagosNow() { var d = new Date(); return new Date(d.getTime() + d.getTimezoneOffset() * 60000 + 3600000); }
  var dishesEl = $('[data-dishes]');
  function keyOf(d, sel) { return d.opts ? d.id + '~' + sel : d.id; }
  function renderMenu() {
    var today = lagosNow().getDay(), fd = $('[data-fday]');
    fd.textContent = fDay === null || fDay === today ? 'Today' : DAYS[fDay].slice(0, 3);
    var list = DISHES.filter(function (d) {
      if (filter === 'all') return true;
      if (filter === 'day') return d.days.indexOf(fDay === null ? today : fDay) > -1;
      return d.cat === filter;
    });
    dishesEl.innerHTML = list.map(function (d) {
      var tagOn = d.days.length < 7 && d.days.indexOf(today) > -1;
      var tag = d.days.length < 7 ? '<span class="dish__tag' + (tagOn ? ' is-on' : '') + '">' + dayText(d) + '</span>' : '';
      var img = d.img || d.pic;
      var pic = img ? '<div class="dish__img"><img src="' + IMG + img + '" alt="' + d.name + '" style="object-position:' + (d.pos || '50% 50%') + '" loading="lazy">' + tag + '</div>' : '<div class="dish__img dish__img--ph"><img src="' + IMG + 'logo.png" alt="" loading="lazy">' + tag + '</div>';
      var sel = d.opts ? '<select class="dopt" data-opt="' + d.id + '" aria-label="Choose ' + d.name + '">' + d.opts.map(function (x, i) { return '<option value="' + i + '">' + x.n + ' · ' + naira(x.p) + '</option>'; }).join('') + '</select>' : '';
      var k = keyOf(d, 0), price = d.opts ? d.opts[0].p : d.price;
      return '<article class="dish"' + (d.opts ? ' data-dish="' + d.id + '"' : '') + '>' + pic + '<div class="dish__b"><h3 class="dish__n">' + d.name + '</h3><p class="dish__d">' + d.desc + '</p>' + sel +
        '<div class="dish__f"><span class="price" data-price>' + naira(price) + '</span><span data-ctrl="' + k + '">' + ctrl(k) + '</span></div></div></article>';
    }).join('') || '<p class="cart__empty" style="grid-column:1/-1">Nothing on that day in this group.</p>';
  }
  dishesEl.addEventListener('change', function (e) {
    var s = e.target.closest('[data-opt]'); if (!s) return;
    var d = BYID[s.getAttribute('data-opt')], card = s.closest('.dish'), k = keyOf(d, s.value);
    $('[data-price]', card).textContent = naira(d.opts[+s.value].p);
    var c = $('[data-ctrl]', card); c.setAttribute('data-ctrl', k); c.innerHTML = ctrl(k);
  });
  function refreshCtrls() { $$('[data-ctrl]').forEach(function (el) { el.innerHTML = ctrl(el.getAttribute('data-ctrl')); }); }

  /* cart */
  var cartEl = $('[data-cart]'), linesEl = $('[data-lines]'), obar = $('[data-obar]'), sendBtn = $('[data-send]');
  function totals() {
    var n = 0, sum = 0;
    Object.keys(cart).forEach(function (k) { n += cart[k]; sum += item(k).price * cart[k]; });
    return { n: n, sum: sum };
  }
  function renderCart() {
    var t = totals(), ids = Object.keys(cart);
    $$('[data-count]').forEach(function (el) { el.textContent = t.n; el.hidden = !t.n; });
    $$('[data-total]').forEach(function (el) { el.textContent = naira(t.sum); });
    obar.hidden = !t.n || !cartEl.hidden;
    $('[data-empty]').hidden = !!ids.length;
    $('[data-form]').hidden = !ids.length;
    sendBtn.disabled = !ids.length;
    linesEl.innerHTML = ids.map(function (k) {
      var d = item(k);
      var pic = d.img ? '<img src="' + IMG + d.img + '" alt="">' : '<span class="ph"><svg><use href="#i-spark"/></svg></span>';
      return '<li>' + pic + '<div><b>' + d.name + '</b><small>' + (d.sub ? d.sub + ' · ' : '') + naira(d.price * cart[k]) + '</small></div><span data-ctrl="' + k + '">' + ctrl(k) + '</span></li>';
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
    var t = totals(), L = ['Hi Pasta Xpress! I’d like to order:', ''];
    Object.keys(cart).forEach(function (k) { var d = item(k); L.push('• ' + cart[k] + ' × ' + d.name + (d.sub ? ' (' + d.sub + ')' : '') + ' — ' + naira(d.price * cart[k])); });
    L.push('', 'Subtotal: ' + naira(t.sum));
    L.push(mode === 'delivery' ? 'Delivery to: ' + addr : mode === 'sitin' ? 'Sit-in at 10 Osuntokun Avenue, Bodija' : 'Pickup at 10 Osuntokun Avenue, Bodija');
    if (name) L.push('Name: ' + name);
    if (note) L.push('Note: ' + note);
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(L.join('\n')), '_blank', 'noopener');
  });

  /* filters */
  function setFilter(f) { filter = f; $$('[data-filters] button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-f') === f); }); renderMenu(); }
  $$('[data-filters] button').forEach(function (b) {
    b.addEventListener('click', function () { if (b.getAttribute('data-f') === 'day') fDay = null; setFilter(b.getAttribute('data-f')); });
  });

  /* feed */
  var POSTS = [['pasta-l', 'Lagos Girls, creamy pasta from Kabs Diner'], ['hotdog-l', 'Suya mayo hot dog'], ['wings-l', 'Yaaji spiced wings'], ['tacos-l', 'Pulled beef tacos'], ['ofada-l', 'Ofada asun trays'], ['jolly-l', 'Jolly box stir-fry pasta'], ['bar-l', 'Kabs Bar drinks'], ['bowl', 'Stir-fry spaghetti']];
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

  /* copy address */
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy'), done = function () { toast('Address copied'); };
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

  function hm(h, m) { var ap = h >= 12 ? 'PM' : 'AM', hh = h % 12 || 12; return hh + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + ap; }

  /* this week */
  var daysEl = $('[data-days]');
  var spDay = null, spDir = 1, ORDER = [1, 2, 3, 4, 5, 6, 0];
  function dishesOn(d) { return DISHES.filter(function (x) { return x.days.length < 7 && x.days.indexOf(d) > -1; }); }
  function renderDays() {
    var today = lagosNow().getDay();
    if (spDay === null) spDay = today;
    var names = dishesOn(spDay).map(function (x) { return x.name; });
    daysEl.innerHTML = '<div class="sp__tabs" role="tablist">' + ORDER.map(function (i) {
      return '<button type="button" role="tab" data-sd="' + i + '" class="' + (i === spDay ? 'on' : '') + (i === today ? ' is-today' : '') + '" aria-selected="' + (i === spDay) + '"><span>' + DAYS[i].slice(0, 3) + '</span></button>';
    }).join('') + '</div>' +
      '<div class="sp__card ' + (spDir > 0 ? 'from-r' : 'from-l') + '"><span class="sp__d">' + DAYS[spDay] + (spDay === today ? '<em>Today</em>' : '') + '</span><ul class="sp__list">' + names.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '<li>Stir-Fry Pasta</li></ul><button class="add" type="button" data-sp-go>See ' + (spDay === today ? 'today’s' : DAYS[spDay] + '’s') + ' menu<svg><use href="#i-arrow"/></svg></button></div>';
  }
  function setSpDay(n) { if (n === spDay) return; spDir = ORDER.indexOf(n) > ORDER.indexOf(spDay) ? 1 : -1; spDay = n; renderDays(); }
  daysEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sd]'); if (b) { setSpDay(+b.getAttribute('data-sd')); return; }
    if (e.target.closest('[data-sp-go]')) { fDay = spDay; setFilter('day'); document.getElementById('menu').scrollIntoView({ behavior: 'smooth' }); }
  });
  (function () { var x0 = null, y0 = 0;
    daysEl.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    daysEl.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) { var k = ORDER.indexOf(spDay) + (dx < 0 ? 1 : -1); if (k >= 0 && k < 7) setSpDay(ORDER[k]); } }, { passive: true });
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
  var cn = $('[data-combo-note]'); if (cn && [5, 6, 0].indexOf(lagosNow().getDay()) > -1) cn.textContent = 'On today · Friday to Sunday · for all';
})();
