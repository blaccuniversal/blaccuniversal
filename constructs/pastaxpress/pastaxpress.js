/* Pasta Xpress by Chef Kabs · construct by BLACC Universal */
(function () {
  'use strict';
  var PHONE = '2347063873047';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var N = function (n) { return '₦' + n.toLocaleString('en-US'); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon first
  var ALL = [0, 1, 2, 3, 4, 5, 6];
  var WKL = { 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S', 0: 'S' };

  /* ---------- Lagos time ---------- */
  function lagos() {
    try {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date()), o = {};
      p.forEach(function (x) { o[x.type] = x.value; });
      return { d: DN.indexOf(o.weekday), m: (+o.hour % 24) * 60 + (+o.minute) };
    } catch (e) { var n = new Date(); return { d: n.getDay(), m: n.getHours() * 60 + n.getMinutes() }; }
  }
  var NOW = lagos(), TODAY = NOW.d;

  /* ---------- menu data ---------- */
  function o(a) { var r = []; for (var i = 0; i < a.length; i += 2) r.push({ n: a[i], p: a[i + 1] }); return r; }
  var DISH = {
    pasta: [
      { id: 'sfp', t: 'Stir-Fry Pasta', d: 'Our signature, tossed to order.', days: ALL, o: o(['Egg pasta', 2900, 'Single wing box', 3200, 'Fish (hake) pasta', 3500, 'Beef pasta', 4100, 'Mini Smiley box', 4200, 'Double wing box', 4200, 'Asun pasta', 4500, 'Fish (croaker) pasta', 4500, 'Jolly box, mini', 4500, 'Smiley box', 5700, 'Jolly box, big', 7500, 'Boujee tray, chicken', 24500, 'Boujee tray, turkey', 28600, 'Boujee tray, mixed protein', 29800]) },
      { id: 'nap', t: 'Native Pasta', d: 'Pasta in rich native sauce.', days: [3, 5], o: o(['Chicken wing', 4400, 'Fish (hake)', 4500, 'Beef', 4800, 'Meal chicken', 4600, 'Asun', 5500, 'Mini turkey', 5100, 'Fish (croaker)', 5900, 'Chicken laps', 6300, 'Turkey', 7800, 'Tray, chicken', 28800, 'Tray, mixed', 34000, 'Tray, turkey', 34000]) }
    ],
    rice: [
      { id: 'asr', t: 'Asun Rice', d: 'Peppery asun on rice.', days: [1, 5], o: o(['Rice only', 3500, 'Chicken wing', 4900, 'Fish (hake)', 5300, 'Beef', 5800, 'Meal chicken', 5800, 'Fish (croaker)', 6200, 'Asun', 6500, 'Mini turkey', 6500, 'Chicken laps', 7300, 'Turkey', 8700, 'Tray, chicken', 35300, 'Tray, mixed', 37600, 'Tray, turkey', 40700]) },
      { id: 'ofr', t: 'Ofada Rice', d: 'Sauce, 1 egg and plantain.', days: [3, 6], o: o(['Sauce, egg & plantain', 3200, 'Fish (hake)', 4500, 'Chicken wing', 4700, 'Meal chicken', 5500, 'Beef', 5800, 'Fish (croaker)', 5800, 'Asun', 6000, 'Mini turkey', 6100, 'Chicken laps', 7000, 'Turkey', 8700, 'Tray, chicken', 35000, 'Tray, mixed', 35000, 'Tray, turkey', 37000]) },
      { id: 'jol', t: 'Jollof Rice', d: 'Party jollof, smoky and bold.', days: [2, 4], o: o(['Fish (hake)', 3500, 'Meal chicken', 3500, 'Beef', 3800, 'Mini turkey', 4200, 'Asun', 4500, 'Fish (croaker)', 4500, 'Chicken laps', 5300, 'Turkey', 7000, 'Tray, chicken laps', 25900, 'Tray, turkey', 30600, 'Tray, mixed', 32500]) },
      { id: 'bas', t: 'Basmati Fried Rice', d: 'Fragrant fried basmati.', days: [1, 3, 6], o: o(['Chicken wing', 3900, 'Fish (hake)', 4100, 'Meal chicken', 4500, 'Beef', 4600, 'Mini turkey', 4700, 'Fish (croaker)', 4900, 'Asun', 5000, 'Chicken laps', 6200, 'Turkey', 7800, 'Tray, chicken laps', 30000, 'Tray, mixed', 32500, 'Tray, turkey', 35500]) },
      { id: 'nar', t: 'Native Rice', d: 'Palm-oil native rice.', days: [2, 4, 0], o: o(['Chicken wing', 4500, 'Fish (hake)', 4500, 'Meal chicken', 4600, 'Beef', 4800, 'Mini turkey', 5100, 'Asun', 5500, 'Fish (croaker)', 5900, 'Chicken laps', 6300, 'Turkey', 7800, 'Tray, chicken', 28800, 'Tray, mixed', 34000, 'Tray, turkey', 34000]) }
    ]
  };
  var NEWM = { g: 'New menu', items: [
    { id: 'jpp', n: 'Jollof Penne Pasta', p: 2700, days: [2, 5] },
    { id: 'mep', n: 'Meaty Pasta', p: 3600, days: [1, 4] },
    { id: 'suyr', n: 'Suya Rice', s: 'With 2 sticks of suya', p: 4000, days: [3, 6] },
    { id: 'suyp', n: 'Suya Pasta', s: 'With 2 sticks of suya', p: 4100, days: [4, 0] },
    { id: 'nad', n: 'Naija Duo', p: 4600, days: ALL }
  ] };
  var SIDES = [
    { g: 'Proteins', items: [['Egg', 500], ['Sausage', 500], ['Chicken wings', 1200], ['Suya', 1200], ['Hake fish', 1500], ['Beef', 2200], ['Meal chicken', 2500], ['Asun', 2800], ['Small turkey', 3000], ['Croaker fish', 3200], ['Chicken', 3700], ['Big turkey', 5500]] },
    { g: 'Extras', items: [['Plantain', 500], ['Extra jollof rice', 600], ['Extra pasta', 700], ['Extra rice', 800, 'From ₦800 to ₦1,200']] }
  ];
  var DRINKS = [
    { g: 'Soft drinks', items: [['Water', 500], ['Capri Sun', 500], ['Coke', 800], ['Fanta', 800], ['Fayrouz', 1000], ['Zobo', 1200], ['Vitamilk', 2000], ['Chivita', 3000]] },
    { g: 'Mocktails', items: [['Chapman', 4000], ['Zobo Berry', 4000], ['Brown Roof', 4000], ['Blue Me Away', 4500], ['Bubble Gum', 4500], ['Bodija Hibron', 4500]] },
    { g: 'Cocktails', items: [['Pink Berry', 5000], ['Detty Sip', 5000], ['Bodija Baddie', 5500], ['Jugular', 5500], ['Pina Colada', 5500], ['Wrong Island', 6000]] }
  ];

  /* ---------- basket ---------- */
  var cart = [], KEY = 'px_cart_v1';
  try { var sv = JSON.parse(sessionStorage.getItem(KEY) || '[]'); if (Array.isArray(sv)) cart = sv.filter(function (x) { return x && x.k && x.q > 0 && x.p > 0; }); } catch (e) {}
  var toastT;
  function toast(m) { var t = $('[data-toast]'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 1800); }
  function count() { return cart.reduce(function (a, x) { return a + x.q; }, 0); }
  function total() { return cart.reduce(function (a, x) { return a + x.q * x.p; }, 0); }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }
  function add(k, name, sub, p) {
    var f = cart.filter(function (x) { return x.k === k; })[0];
    if (f) f.q++; else cart.push({ k: k, n: name, s: sub || '', p: p, q: 1 });
    paint(true); toast('Added · ' + name);
  }
  function paint(pop) {
    var c = count(), tt = total();
    $$('[data-count]').forEach(function (e) { e.textContent = c; if (pop) { e.classList.add('pop'); setTimeout(function () { e.classList.remove('pop'); }, 260); } });
    var bar = $('[data-bar]'); bar.hidden = !c || !$('[data-sheet]').hidden;
    $('[data-bar-n]').textContent = c; $('[data-bar-t]').textContent = N(tt);
    $('[data-total]').textContent = N(tt);
    var L = $('[data-lines]');
    if (!cart.length) L.innerHTML = '<p class="nolines">Your basket is empty.</p>';
    else L.innerHTML = cart.map(function (x, i) {
      return '<div class="line"><b>' + esc(x.n) + '</b><span class="lp">' + N(x.q * x.p) + '</span><small>' + (x.s ? esc(x.s) + ' · ' : '') + N(x.p) + ' each</small>' +
        '<div class="qty"><button type="button" data-q="-1" data-i="' + i + '" aria-label="Less"><svg class="ic"><use href="#i-minus"/></svg></button><span>' + x.q + '</span><button type="button" data-q="1" data-i="' + i + '" aria-label="More"><svg class="ic"><use href="#i-plus"/></svg></button></div></div>';
    }).join('');
    save();
  }
  function sheet(open) {
    var s = $('[data-sheet]'); s.hidden = !open; document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open && !cart.length) { /* allow viewing empty */ }
    paint();
  }
  $$('[data-open-basket]').forEach(function (b) { b.addEventListener('click', function () { sheet(true); }); });
  $$('[data-sheet-x]').forEach(function (b) { b.addEventListener('click', function () { sheet(false); }); });
  $('[data-lines]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-q]'); if (!b) return;
    var i = +b.getAttribute('data-i'); cart[i].q += +b.getAttribute('data-q');
    if (cart[i].q <= 0) cart.splice(i, 1); paint();
  });
  var mode = 'Pickup';
  $$('[data-m]').forEach(function (b) { b.addEventListener('click', function () { mode = b.getAttribute('data-m'); $$('[data-m]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); }); });
  $('[data-send]').addEventListener('click', function () {
    if (!cart.length) { toast('Add something first'); return; }
    var nm = ($('[data-name]').value || '').trim();
    var msg = 'Hello Pasta Xpress, I would like to order:\n' + cart.map(function (x) { return x.q + ' x ' + x.n + (x.s ? ' (' + x.s + ')' : '') + ' - ' + N(x.q * x.p); }).join('\n') +
      '\n\nTotal: ' + N(total()) + '\n' + mode + (nm ? '\nName: ' + nm : '');
    window.open('https://wa.me/' + PHONE + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { sheet(false); drawer(false); } });

  /* ---------- menu render ---------- */
  var tab = 'plates', day = TODAY, dayAll = false;
  var menu = $('[data-menu]'), daysEl = $('[data-days]'), delay = 0;
  function wk(days) { return '<span class="wk" aria-label="Available ' + days.map(function (d) { return DN[d]; }).join(', ') + '">' + ORDER.map(function (d) { return '<i class="' + (days.indexOf(d) > -1 ? 'on' : '') + (d === TODAY && days.indexOf(d) > -1 ? ' now' : '') + '" title="' + DN[d] + '">' + WKL[d] + '</i>'; }).join('') + '</span>'; }
  function dishCard(x) {
    var opts = x.o.map(function (a, i) { return '<option value="' + i + '">' + esc(a.n) + ' · ' + N(a.p) + '</option>'; }).join('');
    return '<article class="dish" style="animation-delay:' + (delay++ * 50) + 'ms" data-dish="' + x.id + '"><div class="dish__top"><div><h3>' + esc(x.t) + '</h3><p>' + esc(x.d) + '</p></div>' + wk(x.days) + '</div>' +
      '<div class="pick"><div class="sel"><select aria-label="Choose ' + esc(x.t) + ' option">' + opts + '</select></div><button class="add" type="button" data-add-dish="' + x.id + '"><svg class="ic"><use href="#i-plus"/></svg>Add</button></div></article>';
  }
  function itemRow(id, n, p, s) {
    return '<div class="item" style="animation-delay:' + (delay++ * 30) + 'ms"><div><b>' + esc(n) + '</b>' + (s ? '<small>' + esc(s) + '</small>' : '') + '</div><span class="pr">' + N(p) + '</span><button class="add" type="button" data-add-item="' + esc(id) + '|' + esc(n) + '|' + p + '" aria-label="Add ' + esc(n) + '"><svg class="ic"><use href="#i-plus"/></svg></button></div>';
  }
  function dayOk(days) { return dayAll || days.indexOf(day) > -1; }
  function render() {
    delay = 0; var h = '';
    daysEl.hidden = tab !== 'plates';
    if (tab === 'plates') {
      [['Pasta', DISH.pasta], ['Rice', DISH.rice]].forEach(function (g) {
        var ds = g[1].filter(function (x) { return dayOk(x.days); });
        if (ds.length) { h += '<h4 class="group">' + g[0] + '</h4>'; ds.forEach(function (x) { h += dishCard(x); }); }
      });
      var it = NEWM.items.filter(function (x) { return dayOk(x.days); });
      if (it.length) { h += '<h4 class="group">' + NEWM.g + '</h4>'; it.forEach(function (x) { h += itemRow(x.id, x.n, x.p, (x.s ? x.s + ' · ' : '') + $$x(x.days)); }); }
      if (!h) h = '<p class="empty">Nothing on ' + DN[day] + '. Try another day.</p>';
    } else {
      (tab === 'sides' ? SIDES : DRINKS).forEach(function (g) { h += '<h4 class="group">' + g.g + '</h4>'; g.items.forEach(function (a) { h += itemRow(a[0], a[0], a[1], a[2]); }); });
    }
    menu.innerHTML = h;
  }
  function $$x(days) { return days.length === 7 ? 'Every day' : days.slice().sort(function (a, b) { return ORDER.indexOf(a) - ORDER.indexOf(b); }).map(function (d) { return DN[d]; }).join(', '); }
  function paintDays() {
    daysEl.innerHTML = '<button type="button" data-d="all" aria-pressed="' + dayAll + '"><small></small>All</button>' + ORDER.map(function (d) { return '<button type="button" data-d="' + d + '" aria-pressed="' + (!dayAll && day === d) + '"><small>' + (d === TODAY ? 'Today' : '') + '</small>' + DN[d] + '</button>'; }).join('');
  }
  daysEl.addEventListener('click', function (e) { var b = e.target.closest('[data-d]'); if (!b) return; var v = b.getAttribute('data-d'); if (v === 'all') dayAll = true; else { dayAll = false; day = +v; } paintDays(); render(); });
  $('[data-tabs]').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; setTab(b.getAttribute('data-tab')); });
  function setTab(t) { tab = t; $$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === t ? 'true' : 'false'); }); render(); }
  menu.addEventListener('click', function (e) {
    var b = e.target.closest('.add'); if (!b) return;
    var id = b.getAttribute('data-add-dish');
    if (id) {
      var all = DISH.pasta.concat(DISH.rice), x = all.filter(function (z) { return z.id === id; })[0];
      var sel = $('select', b.closest('.dish')), a = x.o[+sel.value];
      add(id + ':' + sel.value, x.t, a.n, a.p);
    } else {
      var p = b.getAttribute('data-add-item').split('|'); add(p[0] + ':' + p[1], p[1], '', +p[2]);
    }
    b.classList.add('ok'); setTimeout(function () { b.classList.remove('ok'); }, 700);
  });
  paintDays(); render(); paint();
  $('[data-goto-drinks]').addEventListener('click', function () { setTab('drinks'); document.getElementById('menu').scrollIntoView({ behavior: 'smooth' }); });

  /* combo */
  var weekend = [5, 6, 0].indexOf(TODAY) > -1;
  $('[data-combo-note]').textContent = weekend ? 'On today · Fri, Sat & Sun' : 'Available Fri, Sat & Sun';
  $('[data-add-combo]').addEventListener('click', function () { add('combo', 'Weekend combo', 'Pasta, chicken, sausages, gizdodo, 2 Fayrouz', 12500); });

  /* status chip + today facts */
  function status() {
    var open = NOW.m >= 540 && NOW.m < 1200, c = $('[data-status]');
    c.classList.toggle('is-open', open);
    $('span', c).textContent = open ? 'Open now · until 8pm' : (NOW.m < 540 ? 'Opens at 9am today' : 'Closed · opens 9am tomorrow');
    $('[data-today]').textContent = 'On ' + ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][TODAY];
    var names = DISH.rice.concat(DISH.pasta).filter(function (x) { return x.days.length < 7 && x.days.indexOf(TODAY) > -1; }).map(function (x) { return x.t.replace(' Rice', '').replace(' Fried', ''); });
    $('[data-today-note]').textContent = names.length ? names.slice(0, 3).join(' · ') : 'Stir-fry pasta';
  }
  status();

  /* nav + drawer */
  var nav = $('[data-nav]');
  var burger = $('[data-burger]'), dr = $('[data-drawer]');
  function drawer(open) { dr.hidden = !open; burger.setAttribute('aria-expanded', open); document.documentElement.style.overflow = open ? 'hidden' : ''; }
  burger.addEventListener('click', function () { drawer(true); });
  $('[data-drawer-x]').addEventListener('click', function () { drawer(false); });
  $$('.drawer__nav a').forEach(function (a) { a.addEventListener('click', function () { drawer(false); }); });
  var tk = false;
  window.addEventListener('scroll', function () { if (tk) return; tk = true; requestAnimationFrame(function () { nav.style.boxShadow = window.scrollY > 20 ? '0 12px 34px rgba(46,13,13,.14)' : ''; tk = false; }); }, { passive: true });

  /* slider */
  var sl = $('[data-slider]'), dotsEl = $('[data-dots]'), slides = $$('.slide', sl), cur = 0, hold = 0, vis = true;
  dotsEl.innerHTML = slides.map(function () { return '<i></i>'; }).join('');
  var dots = $$('i', dotsEl);
  function go(i, user) { cur = Math.max(0, Math.min(slides.length - 1, i)); sl.scrollTo({ left: slides[cur].offsetLeft - slides[0].offsetLeft, behavior: 'smooth' }); if (user) hold = Date.now() + 9000; }
  function upd() { var best = 0, bd = 1e9; slides.forEach(function (s, i) { var d = Math.abs(s.offsetLeft - slides[0].offsetLeft - sl.scrollLeft); if (d < bd) { bd = d; best = i; } }); cur = best; dots.forEach(function (d, i) { d.classList.toggle('on', i === best); }); }
  sl.addEventListener('scroll', function () { requestAnimationFrame(upd); }, { passive: true });
  ['pointerdown', 'wheel', 'touchstart'].forEach(function (ev) { sl.addEventListener(ev, function () { hold = Date.now() + 9000; }, { passive: true }); });
  $('[data-prev]').addEventListener('click', function () { go(cur - 1, true); });
  $('[data-next]').addEventListener('click', function () { go(cur + 1, true); });
  upd();
  var dir = 1, reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }).observe(sl);
  if (!reduce) setInterval(function () { if (!vis || Date.now() < hold || document.hidden) return; if (cur >= slides.length - 1) dir = -1; if (cur <= 0) dir = 1; go(cur + dir); }, 3800);

  /* reveal */
  var rv = $$('.sec__head,.combo__in,.story__in,.ways,.info,.slider');
  rv.forEach(function (e) { e.classList.add('reveal'); });
  if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -8% 0px' }); rv.forEach(function (e) { io.observe(e); }); }
  else rv.forEach(function (e) { e.classList.add('is-in'); });
  var y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
