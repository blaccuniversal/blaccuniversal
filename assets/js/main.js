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

  /* ---------- Intro: play once per visitor ---------- */
  if (document.querySelector('.intro')) {
    setTimeout(function () { try { localStorage.setItem('blacc_intro', '1'); } catch (e) {} }, 3200);
  }

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

  /* ---------- "Notify me" (FormSubmit, emails sign-ups to the inbox) ---------- */
  document.querySelectorAll('form[data-notify]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var wrap = form.closest('.notify');
      var err = wrap.querySelector('.notify__error');
      if (err) err.hidden = true;
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      if (data._honey) return;
      data._captcha = 'false';
      data._template = 'table';
      fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || String(j.success) === 'false') throw new Error('bad'); }); })
        .then(function () {
          wrap.querySelector('.notify__hint').hidden = true;
          form.hidden = true;
          wrap.querySelector('.notify__done').hidden = false;
        })
        .catch(function () { if (err) err.hidden = false; });
    });
  });
})();
