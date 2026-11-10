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

  /* ---------- Form panels: "Build with us" and "Say hello" ---------- */
  var lastFocus = null;
  function openPanel(panel, e) {
    if (!panel) return;
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    if (menu && !menu.hidden) { menu.hidden = true; document.body.classList.remove('menu-open'); }
    document.querySelectorAll('.build').forEach(function (p) { p.hidden = true; });
    panel.hidden = false;
    document.body.classList.add('build-open');
    var first = panel.querySelector('input[name="name"]');
    if (first) setTimeout(function () { first.focus(); }, 50);
  }
  function closePanel(panel) {
    if (!panel) return;
    panel.hidden = true;
    document.body.classList.remove('build-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  var panels = { build: document.getElementById('build'), hello: document.getElementById('hello') };
  document.querySelectorAll('[data-build-open]').forEach(function (el) { el.addEventListener('click', function (e) { openPanel(panels.build, e); }); });
  document.querySelectorAll('[data-hello-open]').forEach(function (el) { el.addEventListener('click', function (e) { openPanel(panels.hello, e); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    Object.keys(panels).forEach(function (k) { if (panels[k] && !panels[k].hidden) closePanel(panels[k]); });
  });
  if (location.hash === '#build') openPanel(panels.build);
  if (location.hash === '#hello') openPanel(panels.hello);

  Object.keys(panels).forEach(function (k) {
    var panel = panels[k];
    if (!panel) return;
    panel.querySelectorAll('[data-build-close]').forEach(function (el) { el.addEventListener('click', function () { closePanel(panel); }); });
    var form = panel.querySelector('form[data-build]');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = panel.querySelector('.build__error');
      var nm = form.querySelector('input[name="name"]'), em = form.querySelector('input[name="email"]'), msg = form.querySelector('textarea[name="message"]');
      var ok = nm.value.trim() && em.value.trim() && em.checkValidity() && msg.value.trim();
      if (!ok) { err.hidden = false; return; }
      err.hidden = true;
      var data = {};
      new FormData(form).forEach(function (v, key) { if (key !== 'about') data[key] = v; });
      var chips = form.querySelectorAll('input[name="about"]');
      if (chips.length) {
        var about = [].map.call(form.querySelectorAll('input[name="about"]:checked'), function (i) { return i.value; });
        data.about = about.length ? about.join(', ') : 'Not specified';
      }
      if (data.topic && data.topic.trim()) { data.topic = data.topic.trim(); data.subject = data.subject + ': ' + data.topic; } else { data.topic = 'Not specified'; }
      panel.querySelector('[data-build-name]').textContent = data.name.trim().split(' ')[0];
      form.hidden = true;
      panel.querySelector('.build__done').hidden = false;
      if (form.querySelector('input[name="botcheck"]').checked) return;
      fetch(form.action, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!j || !j.success) postViaFrame(form); })
        .catch(function () { postViaFrame(form); });
    });
  });
})();
