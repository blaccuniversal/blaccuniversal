/* BLACC Universal Market · order requests for products that have no page of their own */
(function () {
  'use strict';
  var KEY = 'c45f617c-f3f2-4caa-93cf-5d49e2cece46';
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var X = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';
  var panel = null, cur = null, last = null;

  function build() {
    panel = document.createElement('div');
    panel.className = 'build mk-order'; panel.id = 'mk-order'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'mk-order-t');
    panel.innerHTML = '<div class="build__bar gutter"><span class="brand"><span>Market</span></span><button class="icon-btn menu-btn" type="button" data-mk-close aria-label="Close">' + X + '</button></div>' +
      '<div class="build__body gutter"><div class="build__inner">' +
      '<div class="mk-order__item"><img alt="" data-mk-img><div><p class="eyebrow" data-mk-store></p><h2 class="build__title" id="mk-order-t" data-mk-name></h2><p class="mk-order__meta" data-mk-meta></p><p class="mk-order__price" data-mk-price></p></div></div>' +
      '<p class="mk-order__desc" data-mk-desc hidden></p>' +
      '<form class="build__form" novalidate data-mk-form>' +
      '<div class="field"><label for="mk-n">Name</label><input id="mk-n" name="name" type="text" autocomplete="name" required></div>' +
      '<div class="field"><label for="mk-e">Email</label><input id="mk-e" name="email" type="email" autocomplete="email" required></div>' +
      '<div class="field-row"><div class="field"><label for="mk-p">Phone</label><input id="mk-p" name="phone" type="tel" autocomplete="tel" placeholder="+234…" required></div><div class="field"><label for="mk-q">Quantity</label><input id="mk-q" name="quantity" type="number" min="1" value="1" required></div></div>' +
      '<div class="field"><label for="mk-m">Notes <span class="opt">(optional)</span></label><textarea id="mk-m" name="notes" rows="3" placeholder="Size, colour, delivery city…"></textarea></div>' +
      '<input type="checkbox" name="botcheck" class="sr-only" tabindex="-1" autocomplete="off">' +
      '<p class="build__error" role="alert" hidden>Please add your name, a valid email and your phone.</p>' +
      '<button class="btn build__send" type="submit">Request to order</button>' +
      '<p class="mk-order__fine">No payment now. We’ll confirm price, delivery and payment with you.</p></form>' +
      '<div class="build__done" role="status" hidden><span class="build__tick"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><h3>Thanks, <span data-mk-first>friend</span>.</h3><p>We’ll be in touch about your order.</p><button class="btn" type="button" data-mk-close>Close</button></div>' +
      '</div></div>';
    document.body.appendChild(panel);
    panel.addEventListener('click', function (e) { if (e.target.closest('[data-mk-close]')) close(); });
    panel.querySelector('[data-mk-form]').addEventListener('submit', send);
  }
  function open(it) {
    if (!panel) build();
    cur = it; last = document.activeElement;
    var f = panel.querySelector('[data-mk-form]');
    f.hidden = false; f.reset(); panel.querySelector('.build__done').hidden = true; panel.querySelector('.build__error').hidden = true;
    var img = panel.querySelector('[data-mk-img]'); img.src = it.img; img.hidden = !it.img;
    panel.querySelector('[data-mk-store]').textContent = it.store || 'Market';
    panel.querySelector('[data-mk-name]').textContent = it.name;
    panel.querySelector('[data-mk-meta]').textContent = it.meta || '';
    panel.querySelector('[data-mk-price]').textContent = it.price || '';
    var d = panel.querySelector('[data-mk-desc]'); d.textContent = it.desc || ''; d.hidden = !it.desc;
    panel.hidden = false; document.body.classList.add('build-open');
    setTimeout(function () { var n = panel.querySelector('#mk-n'); if (n) n.focus(); }, 60);
  }
  function close() { if (!panel) return; panel.hidden = true; document.body.classList.remove('build-open'); if (last && last.focus) last.focus(); }
  function send(e) {
    e.preventDefault();
    var f = e.target, err = panel.querySelector('.build__error');
    if (!f.name.value.trim() || !f.email.value.trim() || !f.phone.value.trim() || !f.checkValidity()) { err.hidden = false; return; }
    err.hidden = true;
    var data = {
      access_key: KEY, from_name: 'BLACC Universal website',
      subject: 'Market order — ' + cur.store + ' · ' + cur.name + ' × ' + (f.quantity.value || 1) + (cur.price ? ' · ' + cur.price : ''),
      store: cur.store, product: cur.name, price: cur.price || '', quantity: f.quantity.value || '1',
      name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), notes: f.notes.value.trim() || '—', page: location.href
    };
    panel.querySelector('[data-mk-first]').textContent = data.name.split(' ')[0];
    f.hidden = true; panel.querySelector('.build__done').hidden = false;
    if (f.botcheck.checked) return;
    fetch('https://api.web3forms.com/submit', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) }).catch(function () {});
  }
  /* release chooser: stream or buy */
  var IC = {
    spotify: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.25"/><path d="M7.5 9.5c3-1 6.5-.7 9.2.8M8 12.6c2.5-.7 5.3-.4 7.4.8M8.6 15.4c2-.5 3.9-.3 5.6.6"/></svg>',
    apple: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 17.5V6.5l10-2v11"/><circle cx="6.75" cy="17.5" r="2.25"/><circle cx="16.75" cy="15.5" r="2.25"/></svg>',
    audiomack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 14h2l1.5-4 2 8 2-12 2 10 2-6 1.5 4h6"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.2 9.2v5.6l4.8-2.8z" fill="currentColor" stroke="none"/></svg>',
    itunes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/></svg>'
  };
  var rel = null, relLast = null;
  function openRel(it) {
    relLast = document.activeElement;
    if (!rel) {
      rel = document.createElement('div'); rel.className = 'mk-rel'; rel.hidden = true;
      rel.addEventListener('click', function (e) { if (e.target === rel || e.target.closest('.mk-rel__x')) closeRel(); });
      document.body.appendChild(rel);
    }
    function group(kind, label) {
      var l = it.links.filter(function (x) { return x[3] === kind; }); if (!l.length) return '';
      return '<p class="mk-rel__g">' + label + '</p><div class="mk-rel__l">' + l.map(function (x) { return '<a href="' + esc(x[2]) + '" target="_blank" rel="noopener">' + (IC[x[0]] || '') + '<span>' + esc(x[1]) + '</span><i>↗</i></a>'; }).join('') + '</div>';
    }
    rel.innerHTML = '<div class="mk-rel__c" role="dialog" aria-modal="true" aria-label="' + esc(it.name) + '"><button class="mk-rel__x" type="button" aria-label="Close"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button><p class="eyebrow">' + esc(it.store) + '</p><h3>' + esc(it.name) + '</h3><p>' + esc(it.meta) + '</p>' + group('stream', 'Stream') + group('buy', 'Buy') + '</div>';
    rel.hidden = false; document.body.classList.add('build-open');
    setTimeout(function () { var a = rel.querySelector('.mk-rel__l a'); if (a) a.focus(); }, 60);
  }
  function closeRel() { if (!rel) return; rel.hidden = true; document.body.classList.remove('build-open'); if (relLast && relLast.focus) relLast.focus(); }
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && rel && !rel.hidden) closeRel(); });
  function openBio() {
    var t = document.querySelector('[data-mk-biotext]'); if (!t) return;
    relLast = document.activeElement;
    if (!rel) { rel = document.createElement('div'); rel.className = 'mk-rel'; rel.hidden = true; rel.addEventListener('click', function (e) { if (e.target === rel || e.target.closest('.mk-rel__x')) closeRel(); }); document.body.appendChild(rel); }
    rel.innerHTML = '<div class="mk-rel__c mk-rel__c--bio" role="dialog" aria-modal="true" aria-label="Bio"><button class="mk-rel__x" type="button" aria-label="Close"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button>' + t.innerHTML + '</div>';
    rel.hidden = false; document.body.classList.add('build-open');
    setTimeout(function () { var x = rel.querySelector('.mk-rel__x'); if (x) x.focus(); }, 60);
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-mk-bio]')) { openBio(); return; }
    var r = e.target.closest('[data-mk-rel]'); if (r) { try { openRel(JSON.parse(r.getAttribute('data-mk-rel'))); } catch (x) {} return; }
    var b = e.target.closest('[data-mk-item]'); if (!b) return;
    try { open(JSON.parse(b.getAttribute('data-mk-item'))); } catch (x) {}
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel && !panel.hidden) close(); });
})();

/* Get featured: floating button + application pop-up */
(function () {
  'use strict';
  var KEY = 'c45f617c-f3f2-4caa-93cf-5d49e2cece46';
  var STAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="gf-star" d="M12 3.5l2.3 5.2 5.7.6-4.3 3.8 1.2 5.6L12 15.8l-4.9 2.9 1.2-5.6L4 9.3l5.7-.6z"/><path class="gf-spk gf-spk--a" d="M19.5 2.5v3M18 4h3"/><path class="gf-spk gf-spk--b" d="M4.5 17.5v3M3 19h3"/></svg>';
  var X = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';
  var cat = (location.pathname.split('/')[2] || '').toLowerCase();
  var CATS = ['Music', 'Merch', 'Art', 'Tech', 'Events'];

  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'gf'; btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML = '<span class="gf__ic">' + STAR + '</span><span class="gf__t">Get featured</span>';
  document.body.appendChild(btn); document.body.classList.add('has-gf');

  var box = document.createElement('div');
  box.className = 'mk-rel gf-pop'; box.hidden = true;
  box.innerHTML = '<div class="mk-rel__c gf-pop__c" role="dialog" aria-modal="true" aria-labelledby="gf-t">' +
    '<button class="mk-rel__x" type="button" data-gf-close aria-label="Close">' + X + '</button>' +
    '<form class="gf-f" novalidate>' +
    '<p class="eyebrow">Market</p><h3 id="gf-t">Get featured.</h3>' +
    '<p class="gf-lead">Artistes, brands, creators and organisers. Tell us about you and we’ll reach out for the rest.</p>' +
    '<fieldset class="gf-chips"><legend>I’m bringing</legend>' + CATS.map(function (c) { var on = c.toLowerCase() === cat || (!cat && c === 'Music'); return '<label><input type="radio" name="category" value="' + c + '"' + (on ? ' checked' : '') + '><span>' + c + '</span></label>'; }).join('') + '</fieldset>' +
    '<div class="field"><label for="gf-n">Name or brand</label><input id="gf-n" name="name" autocomplete="name" required></div>' +
    '<div class="field-row"><div class="field"><label for="gf-e">Email</label><input id="gf-e" name="email" type="email" autocomplete="email" required></div>' +
    '<div class="field"><label for="gf-p">Phone / WhatsApp</label><input id="gf-p" name="phone" type="tel" autocomplete="tel" placeholder="+234…" required></div></div>' +
    '<div class="field"><label for="gf-l">Link <span class="opt">(Instagram, music, website)</span></label><input id="gf-l" name="link" type="text" placeholder="@handle or link"></div>' +
    '<div class="field"><label for="gf-m">Tell us a little <span class="opt">(optional)</span></label><textarea id="gf-m" name="message" rows="3"></textarea></div>' +
    '<input type="checkbox" name="botcheck" class="sr-only" tabindex="-1" autocomplete="off">' +
    '<p class="build__error" role="alert" hidden>Please add your name, a valid email and your phone.</p>' +
    '<button class="btn gf-send" type="submit">Apply to be featured</button>' +
    '<p class="gf-fine">Free to apply. We review every entry and reach out by email or WhatsApp.</p></form>' +
    '<div class="gf-done" hidden><span class="build__tick"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><h3>You’re in, <span data-gf-first>friend</span>.</h3><p class="gf-lead">We’ll be in touch for the details.</p><button class="btn" type="button" data-gf-close>Close</button></div>' +
    '</div>';
  document.body.appendChild(box);

  var last = null, f = box.querySelector('form');
  function open() { last = document.activeElement; f.hidden = false; box.querySelector('.gf-done').hidden = true; box.hidden = false; document.body.classList.add('build-open'); setTimeout(function () { box.querySelector('#gf-n').focus(); }, 60); }
  function close() { box.hidden = true; document.body.classList.remove('build-open'); if (last && last.focus) last.focus(); }
  btn.addEventListener('click', open);
  box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('[data-gf-close]')) close(); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) close(); });
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = f.querySelector('.build__error');
    if (!f.name.value.trim() || !f.email.value.trim() || !f.phone.value.trim() || !f.email.checkValidity()) { err.hidden = false; return; }
    err.hidden = true;
    var c = (f.querySelector('[name=category]:checked') || {}).value || '';
    var data = { access_key: KEY, from_name: 'BLACC Universal website', subject: 'Market · Get featured — ' + c + ' · ' + f.name.value.trim(), category: c, name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), link: f.link.value.trim() || '—', message: f.message.value.trim() || '—', page: location.href };
    box.querySelector('[data-gf-first]').textContent = data.name.split(' ')[0];
    f.hidden = true; box.querySelector('.gf-done').hidden = false;
    if (f.botcheck.checked) return;
    fetch('https://api.web3forms.com/submit', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) }).catch(function () {});
    f.reset();
  });
})();
