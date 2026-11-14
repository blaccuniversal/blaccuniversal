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
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-mk-item]'); if (!b) return;
    try { open(JSON.parse(b.getAttribute('data-mk-item'))); } catch (x) {}
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel && !panel.hidden) close(); });
})();
