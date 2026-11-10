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

  /* ---------- Featured songs carousel (swipe, arrows, dots, keyboard) ---------- */
  document.querySelectorAll('.feature').forEach(function (feat) {
    var track = feat.querySelector('.feature__track');
    var slides = feat.querySelectorAll('.slide');
    var dots = feat.querySelectorAll('.dot-btn');
    var prev = feat.querySelector('[data-prev]'), next = feat.querySelector('[data-next]');
    var count = feat.querySelector('[data-count]');
    var current = 0;
    function go(i) { i = Math.max(0, Math.min(slides.length - 1, i)); track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); }
    function update() {
      var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (i === current && count.textContent) {}
      current = i;
      count.textContent = (i + 1 < 10 ? '0' : '') + (i + 1);
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      prev.disabled = i === 0; next.disabled = i === slides.length - 1;
    }
    prev.addEventListener('click', function () { go(current - 1); });
    next.addEventListener('click', function () { go(current + 1); });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); }); });
    var t; track.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(update, 60); }, { passive: true });
    track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); } });
    window.addEventListener('resize', function () { go(current); });
    update();
  });

  /* ---------- Pop-open player: play featured songs here, or open them where they're hosted ---------- */
  var pm = document.getElementById('player');
  if (pm) {
    var tracks = [].map.call(document.querySelectorAll('.feature .slide[data-kind]'), function (el) {
      return { kind: el.dataset.kind, id: el.dataset.id, title: el.dataset.title, credit: el.dataset.credit, host: el.dataset.host, url: el.dataset.url };
    });
    var stage = pm.querySelector('[data-stage]'), list = pm.querySelector('[data-list]');
    var auto = pm.querySelector('[data-autonext]');
    var pPrev = pm.querySelector('[data-player-prev]'), pNext = pm.querySelector('[data-player-next]');
    var idx = 0, ytPlayer = null, ytReady = null;
    tracks.forEach(function (t, i) {
      var li = document.createElement('li');
      li.innerHTML = '<button type="button"><span class="n">' + (i < 9 ? '0' : '') + (i + 1) + '</span><span class="t"></span><span class="h"></span></button>';
      li.querySelector('.t').textContent = t.title + ' — ' + t.credit;
      li.querySelector('.h').textContent = t.host;
      li.querySelector('button').addEventListener('click', function () { load(i); });
      list.appendChild(li);
    });
    function loadYT() {
      if (ytReady) return ytReady;
      ytReady = new Promise(function (res) {
        if (window.YT && window.YT.Player) return res();
        var prevCb = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () { if (prevCb) prevCb(); res(); };
        var sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc);
      });
      return ytReady;
    }
    function clearStage() {
      if (ytPlayer && ytPlayer.destroy) { try { ytPlayer.destroy(); } catch (e) {} }
      ytPlayer = null; stage.innerHTML = ''; stage.classList.remove('is-audio');
    }
    function load(i) {
      idx = (i + tracks.length) % tracks.length;
      var t = tracks[idx];
      clearStage();
      pm.querySelector('[data-now-title]').textContent = t.title;
      pm.querySelector('[data-now-credit]').textContent = t.credit;
      var host = pm.querySelector('[data-now-host]');
      host.href = t.url; host.textContent = (t.kind === 'youtube' ? 'Watch on ' : 'Listen on ') + t.host + ' ↗';
      [].forEach.call(list.querySelectorAll('button'), function (b, k) { b.setAttribute('aria-current', k === idx ? 'true' : 'false'); });
      pPrev.disabled = tracks.length < 2; pNext.disabled = tracks.length < 2;
      if (t.kind === 'youtube') {
        var holder = document.createElement('div'); stage.appendChild(holder);
        var fallback = function () {
          stage.innerHTML = '<iframe title="' + t.title + '" src="https://www.youtube-nocookie.com/embed/' + t.id + '?autoplay=1&playsinline=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
        };
        var timer = setTimeout(fallback, 4000);
        loadYT().then(function () {
          clearTimeout(timer);
          if (tracks[idx] !== t || !holder.isConnected) return;
          ytPlayer = new YT.Player(holder, {
            videoId: t.id, host: 'https://www.youtube-nocookie.com',
            playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
            events: { onStateChange: function (e) { if (e.data === 0 && auto.checked && tracks.length > 1) load(idx + 1); } }
          });
        });
      } else if (t.kind === 'audiomack') {
        var parts = t.id.split('/');
        stage.classList.add('is-audio');
        stage.innerHTML = '<iframe title="' + t.title + ' on Audiomack" src="https://audiomack.com/embed/song/' + parts[0] + '/' + parts[1] + '?background=1&autoplay=1" allow="autoplay" scrolling="no"></iframe>';
      }
    }
    var lastF = null;
    function openPlayer(i, e) {
      if (e) e.preventDefault();
      lastF = document.activeElement;
      if (menu && !menu.hidden) { menu.hidden = true; document.body.classList.remove('menu-open'); }
      pm.hidden = false; document.body.classList.add('build-open');
      load(i || 0);
    }
    function closePlayer() {
      clearStage(); pm.hidden = true; document.body.classList.remove('build-open');
      if (lastF && lastF.focus) lastF.focus();
    }
    document.querySelectorAll('[data-player-open]').forEach(function (b) {
      b.addEventListener('click', function (e) { openPlayer(parseInt(b.getAttribute('data-player-open'), 10) || 0, e); });
    });
    pm.querySelector('[data-player-close]').addEventListener('click', closePlayer);
    pPrev.addEventListener('click', function () { load(idx - 1); });
    pNext.addEventListener('click', function () { load(idx + 1); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pm.hidden) closePlayer(); });
  }
})();
