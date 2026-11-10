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

  /* ---------- "Notify me" (FormSubmit, emails sign-ups to the inbox) ----------
     The visitor sees the confirmation instantly; the email is sent in the background. */
  function showDone(wrap) {
    wrap.querySelector('.notify__hint').hidden = true;
    wrap.querySelector('form').hidden = true;
    wrap.querySelector('.notify__done').hidden = false;
  }
  function sendQuietly(form) {
    // Post the form into a hidden frame: no page change, works even when the quick API is slow.
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
    var next = form.querySelector('input[name="_next"]');
    if (next) next.value = location.origin + location.pathname + '?joined=1';
    if (/[?&]joined=1/.test(location.search)) showDone(wrap);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var honey = form.querySelector('input[name="_honey"]');
      showDone(wrap);
      if (honey && honey.value) return;
      sendQuietly(form);
    });
  });
})();
