/* Aaronaldo Tech Enterprises · storefront */
(function () {
  'use strict';
  var P = window.AAR_PRODUCTS || [], INFO = window.AAR_INFO || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var N = function (n) { return '₦' + Math.round(n).toLocaleString('en-NG'); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var WA = (INFO.whatsapp || '').replace(/\D/g, '');
  var MQ = encodeURIComponent(INFO.mapQuery || INFO.address || ''), DIR = INFO.pin || ('https://www.google.com/maps/dir/?api=1&destination=' + MQ);

  /* ---------- product art (original drawings, replaced by "img" when supplied) ---------- */
  var COL = { graphite: ['#4a4f5e', '#14161d'], silver: ['#eceef3', '#aeb4c2'], white: ['#ffffff', '#c9cdd8'], black: ['#2a2c34', '#08090c'], sapphire: ['#2f56c9', '#0a1a55'] };
  var uid = 0;
  function art(t, c) {
    var k = ++uid, a = (COL[c] || COL.graphite), g = 'g' + k, s = 's' + k, w = 'w' + k, x = 'x' + k;
    var defs = '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + a[0] + '"/><stop offset="1" stop-color="' + a[1] + '"/></linearGradient>' +
      '<linearGradient id="' + s + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14307f"/><stop offset=".6" stop-color="#070a1c"/><stop offset="1" stop-color="#6a0f23"/></linearGradient>' +
      '<radialGradient id="' + w + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff2d46" stop-opacity=".55"/><stop offset="1" stop-color="#ff2d46" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + x + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>';
    var glow = '<ellipse cx="200" cy="338" rx="130" ry="22" fill="url(#' + w + ')"/>';
    var F = 'fill="url(#' + g + ')"', S = 'fill="url(#' + s + ')"', ink = 'fill="#07080d"', hl = 'fill="url(#' + x + ')"';
    var b = '';
    if (t === 'phone') b = '<rect x="140" y="42" width="120" height="296" rx="26" ' + F + '/><rect x="147" y="49" width="106" height="282" rx="20" ' + S + '/><rect x="184" y="56" width="32" height="8" rx="4" ' + ink + '/><circle cx="200" cy="215" r="34" fill="#ff2d46" opacity=".28"/><rect x="140" y="42" width="120" height="120" rx="26" ' + hl + ' opacity=".5"/>';
    else if (t === 'console') b = '<rect x="158" y="46" width="84" height="292" rx="22" ' + F + '/><path d="M158 120c40 8 84 8 84 56v92c0 36-84 36-84 0z" fill="#07080d" opacity=".9"/><rect x="170" y="62" width="60" height="5" rx="2.5" fill="#07080d" opacity=".5"/><circle cx="200" cy="300" r="4" fill="#ff2d46"/><rect x="158" y="46" width="84" height="110" rx="22" ' + hl + '/>';
    else if (t === 'handheld') b = '<rect x="46" y="124" width="308" height="150" rx="40" ' + F + '/><rect x="116" y="138" width="168" height="122" rx="8" ' + S + '/><circle cx="82" cy="172" r="14" ' + ink + ' opacity=".8"/><circle cx="82" cy="226" r="10" ' + ink + ' opacity=".6"/><circle cx="318" cy="172" r="14" ' + ink + ' opacity=".8"/><circle cx="304" cy="224" r="6" fill="#ff2d46"/><circle cx="326" cy="224" r="6" ' + ink + ' opacity=".6"/><rect x="46" y="124" width="308" height="60" rx="40" ' + hl + '/>';
    else if (t === 'controller') b = '<path d="M110 150h180c40 0 62 40 58 96-3 38-34 44-52 22l-24-34h-144l-24 34c-18 22-49 16-52-22-4-56 18-96 58-96z" ' + F + '/><circle cx="148" cy="196" r="17" ' + ink + ' opacity=".85"/><circle cx="236" cy="226" r="17" ' + ink + ' opacity=".85"/><circle cx="270" cy="184" r="5" fill="#ff2d46"/><circle cx="292" cy="196" r="5" ' + ink + ' opacity=".6"/><circle cx="248" cy="196" r="5" ' + ink + ' opacity=".6"/><circle cx="270" cy="208" r="5" ' + ink + ' opacity=".6"/><rect x="176" y="176" width="48" height="12" rx="6" ' + ink + ' opacity=".5"/>';
    else if (t === 'headphones') b = '<path d="M104 236c-6-92 28-146 96-146s102 54 96 146" fill="none" stroke="url(#' + g + ')" stroke-width="18" stroke-linecap="round"/><rect x="80" y="214" width="54" height="104" rx="26" ' + F + '/><rect x="266" y="214" width="54" height="104" rx="26" ' + F + '/><rect x="92" y="230" width="30" height="72" rx="15" ' + ink + ' opacity=".55"/><rect x="278" y="230" width="30" height="72" rx="15" ' + ink + ' opacity=".55"/><circle cx="107" cy="266" r="4" fill="#ff2d46"/>';
    else if (t === 'earbuds') b = '<rect x="128" y="190" width="144" height="124" rx="46" ' + F + '/><path d="M128 238h144" stroke="#07080d" stroke-opacity=".35" stroke-width="3"/><circle cx="200" cy="262" r="5" fill="#ff2d46"/><g ' + F + '><rect x="150" y="96" width="30" height="62" rx="15"/><rect x="220" y="96" width="30" height="62" rx="15"/></g><circle cx="165" cy="94" r="21" ' + F + '/><circle cx="235" cy="94" r="21" ' + F + '/><rect x="128" y="190" width="144" height="50" rx="46" ' + hl + '/>';
    else if (t === 'speaker') b = '<rect x="116" y="96" width="168" height="224" rx="54" ' + F + '/><g fill="#07080d" opacity=".55">' + dots(140, 130, 6, 8, 20) + '</g><circle cx="200" cy="288" r="8" fill="#ff2d46"/><rect x="116" y="96" width="168" height="80" rx="54" ' + hl + '/>';
    else if (t === 'soundbar') b = '<rect x="32" y="162" width="336" height="84" rx="26" ' + F + '/><g fill="#07080d" opacity=".55">' + dots(54, 182, 22, 3, 14) + '</g><circle cx="350" cy="230" r="4" fill="#ff2d46"/><rect x="32" y="162" width="336" height="38" rx="26" ' + hl + '/>';
    else if (t === 'powerbank') b = '<rect x="128" y="70" width="144" height="250" rx="26" ' + F + '/><g fill="#ff2d46"><rect x="150" y="96" width="14" height="6" rx="3"/><rect x="170" y="96" width="14" height="6" rx="3"/><rect x="190" y="96" width="14" height="6" rx="3"/></g><rect x="150" y="288" width="40" height="10" rx="5" ' + ink + ' opacity=".6"/><rect x="204" y="288" width="22" height="10" rx="5" ' + ink + ' opacity=".6"/><rect x="232" y="288" width="22" height="10" rx="5" ' + ink + ' opacity=".6"/><rect x="128" y="70" width="144" height="90" rx="26" ' + hl + '/>';
    else if (t === 'watch') b = '<rect x="168" y="30" width="64" height="100" rx="14" ' + F + '/><rect x="168" y="270" width="64" height="100" rx="14" ' + F + '/><rect x="136" y="116" width="128" height="158" rx="38" ' + F + '/><rect x="146" y="126" width="108" height="138" rx="30" ' + S + '/><circle cx="200" cy="195" r="26" fill="none" stroke="#ff2d46" stroke-width="4" opacity=".85"/><rect x="264" y="170" width="8" height="26" rx="4" ' + F + '/>';
    else if (t === 'charger') b = '<rect x="150" y="116" width="100" height="116" rx="22" ' + F + '/><rect x="178" y="82" width="10" height="38" rx="3" fill="#c9cdd8"/><rect x="212" y="82" width="10" height="38" rx="3" fill="#c9cdd8"/><rect x="172" y="244" width="56" height="10" rx="5" ' + ink + ' opacity=".5"/><path d="M200 232v38c0 30 60 22 60 60" fill="none" stroke="url(#' + g + ')" stroke-width="9" stroke-linecap="round"/><rect x="150" y="116" width="100" height="50" rx="22" ' + hl + '/>';
    return '<svg viewBox="0 0 400 400" role="img" aria-hidden="true" focusable="false">' + defs + glow + b + '</svg>';
  }
  function dots(x, y, cols, rows, step) { var o = ''; for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) o += '<circle cx="' + (x + c * step) + '" cy="' + (y + r * step) + '" r="3"/>'; return o; }
  function pic(p, big) { return p.img ? '<img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy">' : art(p.t, p.c); }

  /* ---------- shop ---------- */
  var cats = ['All'].concat(P.map(function (p) { return p.cat; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
  var cat = 'All', view = 'swipe';
  try { view = localStorage.getItem('aar_view') || 'swipe'; } catch (e) {}
  var tabs = $('[data-tabs]'), cards = $('[data-cards]'), count = $('[data-count]');
  tabs.innerHTML = cats.map(function (c) { return '<button type="button" class="tab' + (c === cat ? ' is-on' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
  function list() { return P.filter(function (p) { return cat === 'All' || p.cat === cat; }); }
  function draw() {
    var L = list();
    count.textContent = L.length + (L.length === 1 ? ' item' : ' items');
    cards.setAttribute('data-view', view);
    cards.innerHTML = L.map(function (p) {
      return '<button type="button" class="card" data-id="' + p.id + '"><span class="card__img">' + pic(p) + (p.badge ? '<i class="card__badge">' + esc(p.badge) + '</i>' : '') + '</span>' +
        '<span class="card__txt"><b class="card__name">' + esc(p.name) + '</b><span class="card__meta">' + esc(p.meta || '') + '</span><span class="card__price">' + N(p.price) + '</span></span></button>';
    }).join('');
    cards.scrollLeft = 0;
    $$('[data-view-btn]').forEach(function (b) { var on = b.getAttribute('data-view-btn') === view; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    $('[data-swipe-nav]').hidden = view !== 'swipe';
  }
  tabs.addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (!b) return; cat = b.getAttribute('data-cat'); $$('.tab', tabs).forEach(function (t) { t.classList.toggle('is-on', t === b); }); draw(); });
  $('[data-views]').addEventListener('click', function (e) { var b = e.target.closest('[data-view-btn]'); if (!b) return; view = b.getAttribute('data-view-btn'); try { localStorage.setItem('aar_view', view); } catch (x) {} draw(); });
  $('[data-swipe-nav]').addEventListener('click', function (e) { var b = e.target.closest('[data-dir]'); if (!b) return; var c = $('.card', cards); cards.scrollBy({ left: +b.getAttribute('data-dir') * ((c ? c.offsetWidth : 240) + 12), behavior: 'smooth' }); });
  document.querySelectorAll('[data-go-cat]').forEach(function (a) { a.addEventListener('click', function () { var c = a.getAttribute('data-go-cat'); var b = $('[data-cat="' + c + '"]', tabs); if (b) b.click(); }); });
  draw();

  /* ---------- product sheet ---------- */
  var sheet = $('[data-sheet]'), body = $('[data-sheet-body]'), cur = null, sel = {}, qty = 1, lastFocus = null;
  function total() { var x = cur.price; (cur.o || []).forEach(function (o) { x += (o.v.filter(function (v) { return v[0] === sel[o.k]; })[0] || [0, 0])[1]; }); return x * qty; }
  function msg() {
    var opts = (cur.o || []).map(function (o) { return o.k + ': ' + sel[o.k]; }).join(', ');
    return 'Hello Aaronaldo Tech Enterprises, I would like to order:\n' + qty + ' × ' + cur.name + (opts ? ' (' + opts + ')' : '') + '\nTotal: ' + N(total()) + '\nPlease confirm it is available.';
  }
  function openSheet(id) {
    cur = P.filter(function (p) { return p.id === id; })[0]; if (!cur) return;
    sel = {}; (cur.o || []).forEach(function (o) { sel[o.k] = o.v[0][0]; }); qty = 1; lastFocus = document.activeElement;
    var opts = (cur.o || []).map(function (o) {
      return '<fieldset class="opt"><legend>' + esc(o.k) + '</legend><div class="opt__row">' + o.v.map(function (v, i) {
        return '<label class="chip"><input type="radio" name="o-' + esc(o.k) + '" value="' + esc(v[0]) + '"' + (i ? '' : ' checked') + ' data-k="' + esc(o.k) + '"><span>' + esc(v[0]) + (v[1] ? ' <small>' + (v[1] > 0 ? '+' : '−') + N(Math.abs(v[1])) + '</small>' : '') + '</span></label>';
      }).join('') + '</div></fieldset>';
    }).join('');
    var facts = (cur.f || []).map(function (f) { return '<li><span>' + esc(f[0]) + '</span><span>' + esc(f[1]) + '</span></li>'; }).join('');
    body.innerHTML =
      '<div class="sheet__stage">' + pic(cur, 1) + (cur.badge ? '<i class="card__badge">' + esc(cur.badge) + '</i>' : '') + '</div>' +
      '<div class="sheet__info"><p class="eyebrow">' + esc(cur.cat) + '</p><h2 id="sheet-t" class="sheet__name">' + esc(cur.name) + '</h2>' +
      '<p class="sheet__price" data-total>' + N(total()) + '</p><p class="sheet__desc">' + esc(cur.d || '') + '</p>' + opts +
      '<div class="buy"><div class="qty" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="Fewer">−</button><output data-qv>1</output><button type="button" data-q="1" aria-label="More">+</button></div>' +
      '<button type="button" class="btn btn--red" data-order>' + (WA ? 'Order on WhatsApp' : 'Order now') + '<span class="buy__t"> · <span data-total2>' + N(total()) + '</span></span></button></div>' +
      (facts ? '<ul class="facts">' + facts + '</ul>' : '') +
      '<p class="note">Pick up in Ibadan or ask about delivery. We confirm availability and payment details with you before anything is charged.</p>' +
      '<form class="enq" data-enq hidden><p class="enq__t">Where should we reach you?</p><label>Your name<input name="name" required autocomplete="name"></label><label>Phone number<input name="phone" type="tel" required inputmode="tel" autocomplete="tel"></label>' +
      '<input type="hidden" name="access_key" value="c45f617c-f3f2-4caa-93cf-5d49e2cece46"><input type="hidden" name="subject" value="Aaronaldo Tech Enterprises order enquiry"><input type="hidden" name="from_name" value="Aaronaldo Tech Enterprises construct"><input type="hidden" name="order" value="">' +
      '<p class="sr-only"><label>Leave empty <input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off"></label></p>' +
      '<button class="btn btn--red" type="submit">Send order request</button><p class="enq__ok" role="status" hidden>Sent. We will call you to confirm.</p><p class="enq__err" role="alert" hidden>That did not go through. Please try again.</p></form></div>';
    sheet.hidden = false; document.documentElement.classList.add('is-sheet');
    requestAnimationFrame(function () { sheet.classList.add('is-in'); $('[data-close]', sheet).focus(); });
  }
  function closeSheet() { sheet.classList.remove('is-in'); document.documentElement.classList.remove('is-sheet'); setTimeout(function () { sheet.hidden = true; }, 200); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function refresh() { var t = N(total()); $('[data-total]', body).textContent = t; $('[data-total2]', body).textContent = t; $('[data-qv]', body).textContent = qty; }
  cards.addEventListener('click', function (e) { var c = e.target.closest('[data-id]'); if (c) openSheet(c.getAttribute('data-id')); });
  sheet.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]') || e.target === sheet) return closeSheet();
    var q = e.target.closest('[data-q]'); if (q) { qty = Math.max(1, Math.min(10, qty + +q.getAttribute('data-q'))); refresh(); return; }
    if (e.target.closest('[data-order]')) {
      if (WA) { window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg()), '_blank', 'noopener'); return; }
      var f = $('[data-enq]', body); f.hidden = false; f.order.value = msg(); f.name.focus(); f.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
  sheet.addEventListener('change', function (e) { var r = e.target.closest('[data-k]'); if (!r) return; sel[r.getAttribute('data-k')] = r.value; refresh(); });
  sheet.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-enq]'); if (!f) return; e.preventDefault(); f.order.value = msg();
    var ok = $('.enq__ok', f), er = $('.enq__err', f); ok.hidden = er.hidden = true;
    var d = {}; $$('input', f).forEach(function (i) { if (i.name) d[i.name] = i.type === 'checkbox' ? i.checked : i.value; });
    fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json(); }).then(function (j) { if (j.success) { ok.hidden = false; f.reset(); } else er.hidden = false; }).catch(function () { er.hidden = false; });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

  /* ---------- visit / contact ---------- */
  var rows = [];
  if (INFO.address) rows.push(['Find us', '<a href="' + DIR + '" target="_blank" rel="noopener">' + esc(INFO.address) + '</a>']);
  if (INFO.whatsapp) rows.push(['WhatsApp', '<a href="https://wa.me/' + WA + '" target="_blank" rel="noopener">' + esc(INFO.whatsapp) + '</a>']);
  if (INFO.phone) rows.push(['Call', '<a href="tel:' + INFO.phone.replace(/[^+\d]/g, '') + '">' + esc(INFO.phone) + '</a>']);
  if (INFO.email) rows.push(['Email', '<a href="mailto:' + esc(INFO.email) + '">' + esc(INFO.email) + '</a>']);
  if (INFO.hours) rows.push(['Hours', esc(INFO.hours)]);
  $('[data-info]').innerHTML = rows.map(function (r) { return '<li><span>' + r[0] + '</span><span>' + r[1] + '</span></li>'; }).join('');
  if (WA) $$('[data-wa]').forEach(function (wa) { wa.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Hello Aaronaldo Tech Enterprises, I have a question.'); wa.hidden = false; });
  var fr = $('[data-map]'); if (fr && MQ) fr.src = 'https://www.google.com/maps?q=' + MQ + '&z=17&output=embed';
  $$('[data-dir]').forEach(function (a) { a.href = DIR; });
  $$('[data-wa-text]').forEach(function (a) { if (WA) { a.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(a.getAttribute('data-wa-text')); a.hidden = false; } });
  $$('[data-rating]').forEach(function (a) { if (INFO.rating) { a.innerHTML = '<b>★ ' + INFO.rating + '</b> · ' + INFO.reviews + ' Google reviews'; a.href = 'https://www.google.com/maps/search/?api=1&query=' + MQ; a.hidden = false; } });
  $$('[data-year]').forEach(function (y) { y.textContent = new Date().getFullYear(); });
  /* ---------- dark mode ---------- */
  (function () {
    var root = document.documentElement, btn = $('[data-theme-btn]'), meta = document.querySelector('meta[name="theme-color"]');
    function cur() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
    function paint() { var d = cur() === 'dark'; if (btn) { btn.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode'); btn.title = d ? 'Light mode' : 'Dark mode'; } if (meta) meta.content = d ? '#070405' : '#ffffff'; }
    if (btn) btn.addEventListener('click', function () { var n = cur() === 'dark' ? 'light' : 'dark'; root.setAttribute('data-theme', n); try { localStorage.setItem('aar_theme', n); } catch (e) {} paint(); });
    paint();
  })();
})();
