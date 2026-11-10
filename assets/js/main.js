/* BLACC Universal — site behaviour */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Menu ---------- */
  var menu = document.getElementById('menu');
  var openBtn = document.querySelector('[data-menu-open]');
  function openMenu() {
    if (!menu) return;
    menu.hidden = false;
    document.body.classList.add('menu-open');
    if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
    var first = menu.querySelector('.menu__item');
    if (first) first.focus();
  }
  function closeMenu() {
    if (!menu) return;
    menu.hidden = true;
    document.body.classList.remove('menu-open');
    if (openBtn) { openBtn.setAttribute('aria-expanded', 'false'); openBtn.focus(); }
  }
  if (openBtn) openBtn.addEventListener('click', openMenu);
  document.querySelectorAll('[data-menu-close]').forEach(function (el) { el.addEventListener('click', closeMenu); });
  if (menu) menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { menu.hidden = true; document.body.classList.remove('menu-open'); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu && !menu.hidden) closeMenu(); });

  /* ---------- Intro: plays on every visit (clear any old "seen" flag) ---------- */
  try { localStorage.removeItem('blacc_intro'); } catch (e) {}

  /* ---------- Hero spotlight ---------- */
  var hero = document.getElementById('hero');
  var spot = hero && hero.querySelector('.hero__spot');
  if (hero && spot) {
    var userAt = 0, t0 = performance.now(), last = 0;
    function setSpot(x, y) { spot.style.setProperty('--x', x + '%'); spot.style.setProperty('--y', y + '%'); }
    function fromEvent(e) {
      var p = e.touches && e.touches.length ? e.touches[0] : e;
      if (!p || p.clientX == null) return;
      var b = hero.getBoundingClientRect();
      userAt = performance.now();
      setSpot(((p.clientX - b.left) / b.width) * 100, ((p.clientY - b.top) / b.height) * 100);
    }
    hero.addEventListener('pointermove', fromEvent);
    hero.addEventListener('touchmove', fromEvent, { passive: true });
    if (!reduce) {
      (function tick(now) {
        requestAnimationFrame(tick);
        if (now - userAt < 2500 || now - last < 33) return;
        last = now;
        var t = (now - t0) / 1000;
        setSpot(50 + 16 * Math.sin(t * 0.42), 36 + 12 * Math.sin(t * 0.67 + 1.2));
      })(t0);
    }
  }

  /* ---------- "Notify me" (Web3Forms, emails sign-ups to the inbox) ----------
     The visitor sees the confirmation instantly; the sign-up is sent in the background. */
  function showDone(wrap) {
    wrap.querySelector('.notify__hint').hidden = true;
    wrap.querySelector('form').hidden = true;
    wrap.querySelector('.notify__done').hidden = false;
  }
  function postViaFrame(form) {
    // Backup route: post the form into a hidden frame, so the page never changes.
    var name = 'notify-sink';
    var sink = document.querySelector('iframe[name="' + name + '"]');
    if (!sink) {
      sink = document.createElement('iframe');
      sink.name = name; sink.title = 'Sign-up'; sink.tabIndex = -1;
      sink.setAttribute('aria-hidden', 'true');
      sink.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
      document.body.appendChild(sink);
    }
    form.target = name;
    form.submit();
  }
  document.querySelectorAll('form[data-notify]').forEach(function (form) {
    var wrap = form.closest('.notify');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var bot = form.querySelector('input[name="botcheck"]');
      showDone(wrap);
      if (bot && bot.checked) return;
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      fetch(form.action, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!j || !j.success) postViaFrame(form); })
        .catch(function () { postViaFrame(form); });
    });
  });

  /* ---------- Build with us form ---------- */
  var build = document.getElementById('build');
  var lastFocus = null;
  function openBuild(e) {
    if (!build) return;
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    if (menu && !menu.hidden) { menu.hidden = true; document.body.classList.remove('menu-open'); }
    build.hidden = false;
    document.body.classList.add('build-open');
    var first = build.querySelector('#b-name');
    if (first) setTimeout(function () { first.focus(); }, 50);
  }
  function closeBuild() {
    if (!build) return;
    build.hidden = true;
    document.body.classList.remove('build-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.querySelectorAll('[data-build-open]').forEach(function (el) { el.addEventListener('click', openBuild); });
  document.querySelectorAll('[data-build-close]').forEach(function (el) { el.addEventListener('click', closeBuild); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && build && !build.hidden) closeBuild(); });
  if (location.hash === '#build') openBuild();

  var bForm = build && build.querySelector('form[data-build]');
  if (bForm) {
    bForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = build.querySelector('.build__error');
      var ok = bForm.querySelector('#b-name').value.trim() && bForm.querySelector('#b-email').checkValidity() && bForm.querySelector('#b-email').value.trim() && bForm.querySelector('#b-message').value.trim();
      if (!ok) { err.hidden = false; return; }
      err.hidden = true;
      var data = {};
      new FormData(bForm).forEach(function (v, k) { if (k !== 'about') data[k] = v; });
      var about = [].map.call(bForm.querySelectorAll('input[name="about"]:checked'), function (i) { return i.value; });
      data.about = about.length ? about.join(', ') : 'Not specified';
      var name = data.name.split(' ')[0];
      build.querySelector('[data-build-name]').textContent = name;
      bForm.hidden = true;
      build.querySelector('.build__done').hidden = false;
      if (bForm.querySelector('input[name="botcheck"]').checked) return;
      fetch(bForm.action, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!j || !j.success) postViaFrame(bForm); })
        .catch(function () { postViaFrame(bForm); });
    });
  }
})();
