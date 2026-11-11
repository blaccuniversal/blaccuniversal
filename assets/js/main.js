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
  var panels = { build: document.getElementById('build'), hello: document.getElementById('hello'), order: document.getElementById('order'), beat: document.getElementById('beat') };
  document.querySelectorAll('[data-build-open]').forEach(function (el) { el.addEventListener('click', function (e) { openPanel(panels.build, e); }); });
  document.querySelectorAll('[data-hello-open]').forEach(function (el) { el.addEventListener('click', function (e) { openPanel(panels.hello, e); }); });
  document.querySelectorAll('[data-order-open]').forEach(function (el) { el.addEventListener('click', function (e) {
    var p = panels.order; if (!p) return;
    var f = p.querySelector('form'); var st = window.__blaccOrder || { name: 'Alhamdulillah Tee', sizeLabel: 'Size ', size: 'M', frame: '', qty: 1, total: '₦30,000', usd: '' };
    f.querySelector('input[name="product"]').value = st.name;
    var fi = f.querySelector('input[name="frame"]'); if (!fi) { fi = document.createElement('input'); fi.type = 'hidden'; fi.name = 'frame'; f.appendChild(fi); } fi.value = st.frame || '';
    var eb = p.querySelector('.eyebrow'); if (eb) eb.textContent = 'Order · ' + st.name;
    f.querySelector('input[name="size"]').value = st.size;
    f.querySelector('input[name="quantity"]').value = st.qty;

    function sum() {
      var intl = f.querySelector('input[name="region"]:checked').value !== 'Nigeria';
      var tot = st.total + (st.view && st.view !== 'NGN' ? ' (≈ ' + st.viewTotal + ')' : '') + (intl ? ' + international delivery' : '');
      f.querySelector('input[name="total"]').value = tot;
      f.querySelector('input[name="currency_view"]').value = st.view || 'NGN';
      p.querySelector('[data-order-summary]').textContent = st.name + ' · ' + st.sizeLabel + st.size + (st.frame ? ' · ' + st.frame + ' frame' : '') + ' · Qty ' + st.qty + ' · ' + tot;
      p.querySelector('[data-order-intl]').hidden = !intl;
      var c = f.querySelector('[data-country]'); c.hidden = !intl; c.querySelector('input').required = intl;
    }
    if (!f.__regionBound) { f.__regionBound = true; f.querySelectorAll('input[name="region"]').forEach(function (r) { r.addEventListener('change', sum); }); }
    sum();
    f.hidden = false; p.querySelector('.build__done').hidden = true;
    openPanel(p, e);
  }); });
  /* ---------- Shop player: queue, prev/next, ±10s, seek ---------- */
  document.querySelectorAll('[data-bp]').forEach(function (bp) {
    var q; try { q = JSON.parse(bp.getAttribute('data-queue')); } catch (e) { return; }
    if (!q || !q.length) return;
    var au = new Audio(); au.preload = 'none';
    var i = 0, loaded = -1, dragging = false;
    var $b = function (s) { return bp.querySelector(s); };
    var seek = $b('[data-bp-seek]'), line = $b('[data-bp-line]'), knob = $b('[data-bp-knob]');
    var rows = [].slice.call(document.querySelectorAll('[data-bp-row]'));
    var fmt = function (t) { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); };
    if (q.length < 2) bp.classList.add('is-single');
    function setPct(p) { p = Math.max(0, Math.min(100, p || 0)); line.style.width = p + '%'; knob.style.left = p + '%'; seek.setAttribute('aria-valuenow', Math.round(p)); var r = rows[i]; if (r) { var b = r.querySelector('.tape__line b'); if (b) b.style.width = p + '%'; } }
    function paint() {
      var on = !au.paused;
      bp.classList.toggle('is-playing', on);
      $b('[data-bp-toggle]').setAttribute('aria-label', on ? 'Pause' : 'Play');
      rows.forEach(function (r, k) { r.classList.toggle('is-cur', k === i && loaded === i); r.classList.toggle('is-playing', k === i && on); });
    }
    function show(k) {
      i = (k + q.length) % q.length; var d = q[i];
      var t = $b('[data-bp-title]'); if (t) t.textContent = d.title;
      var m = $b('[data-bp-meta]'); if (m) m.textContent = d.meta;
      var f = $b('[data-bp-from]'); if (f) f.textContent = d.from;
      var c = $b('[data-bp-cover]'); if (c && c.getAttribute('src') !== d.cover) c.src = d.cover;
      var a = $b('[data-bp-cta]'); if (a) { a.textContent = d.cta + ' →'; a.href = d.href; }
      var n = $b('[data-bp-count]'); if (n) n.textContent = ('0' + (i + 1)).slice(-2) + ' / ' + ('0' + q.length).slice(-2);
      $b('[data-bp-cur]').textContent = '0:00'; $b('[data-bp-dur]').textContent = d.dur || '0:00';
      rows.forEach(function (r) { var b = r.querySelector('.tape__line b'); if (b) b.style.width = '0'; });
      setPct(0);
    }
    function load(k, go) {
      show(k); loaded = i; au.src = q[i].src;
      if ('mediaSession' in navigator) { try { navigator.mediaSession.metadata = new MediaMetadata({ title: q[i].title, artist: 'Bemshima', album: q[i].from, artwork: [{ src: q[i].cover }] }); } catch (e) {} }
      if (go) play(); else paint();
    }
    function play() {
      document.querySelectorAll('audio').forEach(function (o) { if (o !== au) o.pause(); });
      if (window.__bpActive && window.__bpActive !== au) window.__bpActive.pause();
      window.__bpActive = au;
      if (loaded !== i) { load(i, true); return; }
      au.play().catch(function () {});
    }
    function toggle() { if (au.paused) play(); else au.pause(); }
    function skip(s) { if (loaded !== i) return; if (au.duration) au.currentTime = Math.max(0, Math.min(au.duration - 0.2, au.currentTime + s)); }
    $b('[data-bp-toggle]').addEventListener('click', toggle);
    $b('[data-bp-prev]').addEventListener('click', function () { if (loaded === i && au.currentTime > 3) { au.currentTime = 0; return; } load(i - 1, !au.paused); });
    $b('[data-bp-next]').addEventListener('click', function () { load(i + 1, !au.paused); });
    $b('[data-bp-back]').addEventListener('click', function () { skip(-10); });
    $b('[data-bp-fwd]').addEventListener('click', function () { skip(10); });
    document.querySelectorAll('[data-bp-play]').forEach(function (b) {
      b.addEventListener('click', function () { var k = +b.getAttribute('data-bp-play'); if (k === i && loaded === i) toggle(); else load(k, true); });
    });
    au.addEventListener('play', paint); au.addEventListener('pause', paint);
    au.addEventListener('loadedmetadata', function () { $b('[data-bp-dur]').textContent = fmt(au.duration); });
    au.addEventListener('timeupdate', function () { if (dragging || !au.duration) return; $b('[data-bp-cur]').textContent = fmt(au.currentTime); setPct(au.currentTime / au.duration * 100); });
    au.addEventListener('ended', function () { if (i < q.length - 1) load(i + 1, true); else { au.currentTime = 0; setPct(0); paint(); } });
    function seekTo(e) {
      var r = seek.getBoundingClientRect(), x = (e.touches ? e.touches[0] : e).clientX, p = Math.max(0, Math.min(1, (x - r.left) / r.width));
      setPct(p * 100);
      if (loaded !== i) { load(i, true); au.addEventListener('loadedmetadata', function o() { au.removeEventListener('loadedmetadata', o); au.currentTime = p * au.duration; }); return; }
      if (au.duration) { au.currentTime = p * au.duration; $b('[data-bp-cur]').textContent = fmt(au.currentTime); }
    }
    seek.addEventListener('pointerdown', function (e) { dragging = true; seekTo(e); try { seek.setPointerCapture(e.pointerId); } catch (x) {} });
    seek.addEventListener('pointermove', function (e) { if (dragging) seekTo(e); });
    ['pointerup', 'pointercancel'].forEach(function (ev) { seek.addEventListener(ev, function () { dragging = false; }); });
    seek.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { skip(5); e.preventDefault(); } else if (e.key === 'ArrowLeft') { skip(-5); e.preventDefault(); } });
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('previoustrack', function () { load(i - 1, true); });
        navigator.mediaSession.setActionHandler('nexttrack', function () { load(i + 1, true); });
        navigator.mediaSession.setActionHandler('seekbackward', function () { skip(-10); });
        navigator.mediaSession.setActionHandler('seekforward', function () { skip(10); });
      } catch (e) {}
    }
    show(0);
  });

  /* ---------- Shop listings: swipe / list / grid ---------- */
  var cardsBox = document.querySelector('[data-cards]');
  if (cardsBox) {
    var vbtns = [].slice.call(document.querySelectorAll('[data-view]'));
    var snav = document.querySelector('[data-swipe-nav]');
    var setView = function (v) {
      if (['swipe', 'list', 'grid'].indexOf(v) < 0) v = 'swipe';
      cardsBox.setAttribute('data-view-mode', v);
      vbtns.forEach(function (b) { var on = b.getAttribute('data-view') === v; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      cardsBox.classList.remove('is-fit');
      var fit = cardsBox.scrollWidth <= cardsBox.clientWidth + 4;
      cardsBox.classList.toggle('is-fit', v === 'swipe' && fit);
      if (snav) snav.hidden = v !== 'swipe' || fit;
      try { localStorage.setItem('blacc_shop_view', v); } catch (e) {}
    };
    vbtns.forEach(function (b) { b.addEventListener('click', function () { setView(b.getAttribute('data-view')); }); });
    var sv = 'swipe'; try { sv = localStorage.getItem('blacc_shop_view') || 'swipe'; } catch (e) {}
    setView(sv);
    window.addEventListener('resize', function () { setView(cardsBox.getAttribute('data-view-mode')); });
    document.querySelectorAll('[data-swipe]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = cardsBox.querySelector('.shop-card'); var step = c ? c.getBoundingClientRect().width + 24 : 300;
        cardsBox.scrollBy({ left: step * +b.getAttribute('data-swipe'), behavior: 'smooth' });
      });
    });
  }

  /* Free beat tape: one player for the tracklist */
  document.querySelectorAll('[data-tape]').forEach(function (tp) {
    var au = tp.querySelector('[data-tape-audio]'), rows = [].slice.call(tp.querySelectorAll('.tape__row')), cur = -1;
    function paint() {
      rows.forEach(function (r, i) {
        var on = i === cur;
        r.classList.toggle('is-cur', on);
        r.classList.toggle('is-playing', on && !au.paused);
        var t = r.getAttribute('data-tape-title');
        r.querySelector('.tape__play').setAttribute('aria-label', (on && !au.paused ? 'Pause ' : 'Play ') + t);
      });
    }
    function play(i) {
      if (i === cur) { if (au.paused) au.play().catch(function () {}); else au.pause(); return; }
      document.querySelectorAll('audio').forEach(function (o) { if (o !== au) o.pause(); });
      cur = i; au.src = rows[i].getAttribute('data-tape-src'); au.play().catch(function () {}); paint();
    }
    rows.forEach(function (r, i) { r.querySelector('.tape__play').addEventListener('click', function () { play(i); }); });
    au.addEventListener('play', paint); au.addEventListener('pause', paint);
    au.addEventListener('timeupdate', function () { if (cur < 0 || !au.duration) return; rows[cur].querySelector('.tape__line b').style.width = (au.currentTime / au.duration * 100) + '%'; });
    au.addEventListener('ended', function () { rows[cur].querySelector('.tape__line b').style.width = '0'; if (cur < rows.length - 1) play(cur + 1); else { cur = -1; paint(); } });
  });

  /* Beats: licence picker, preview player, order panel */
  document.querySelectorAll('.beat[data-beat]').forEach(function (bt) {
    var name = bt.getAttribute('data-beat');
    var pick = function () { return bt.querySelector('.beat__lics input:checked'); };
    var paint = function () {
      var c = pick(); var lbl = c.getAttribute('data-lic-label');
      bt.querySelector('[data-beat-total]').textContent = lbl === 'Offer' ? 'Make an offer' : lbl;
      bt.querySelector('[data-beat-open]').firstChild.nodeValue = lbl === 'Offer' ? '' : 'Buy licence · ';
    };
    bt.querySelectorAll('.beat__lics input').forEach(function (r) { r.addEventListener('change', paint); });
    bt.querySelectorAll('.beat__lics label').forEach(function (l) { l.addEventListener('click', function () { setTimeout(paint, 0); }); });
    paint();
    var au = bt.querySelector('audio'), playB = bt.querySelector('[data-beat-play]');
    if (au && playB) (function () {
    var seek = bt.querySelector('[data-beat-seek]'), line = bt.querySelector('[data-beat-line]');
    var fmt = function (t) { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); };
    playB.addEventListener('click', function () {
      document.querySelectorAll('.beat audio').forEach(function (o) { if (o !== au) o.pause(); });
      if (au.paused) au.play().catch(function () {}); else au.pause();
    });
    au.addEventListener('play', function () { bt.classList.add('is-playing'); playB.setAttribute('aria-label', 'Pause preview of ' + name); });
    au.addEventListener('pause', function () { bt.classList.remove('is-playing'); playB.setAttribute('aria-label', 'Play preview of ' + name); });
    au.addEventListener('loadedmetadata', function () { bt.querySelector('[data-beat-dur]').textContent = fmt(au.duration); });
    au.addEventListener('timeupdate', function () {
      if (!au.duration) return;
      var pc = au.currentTime / au.duration * 100; line.style.width = pc + '%'; seek.setAttribute('aria-valuenow', Math.round(pc));
      bt.querySelector('[data-beat-cur]').textContent = fmt(au.currentTime);
    });
    au.addEventListener('ended', function () { au.currentTime = 0; });
    var seekTo = function (x) { var b = seek.getBoundingClientRect(); var f = Math.max(0, Math.min(1, (x - b.left) / b.width)); if (au.duration) au.currentTime = f * au.duration; else { au.addEventListener('loadedmetadata', function o() { au.removeEventListener('loadedmetadata', o); au.currentTime = f * au.duration; }); au.play().catch(function () {}); } };
    seek.addEventListener('click', function (e) { seekTo(e.clientX); });
    seek.addEventListener('keydown', function (e) { if (!au.duration) return; if (e.key === 'ArrowRight') au.currentTime = Math.min(au.duration, au.currentTime + 5); else if (e.key === 'ArrowLeft') au.currentTime = Math.max(0, au.currentTime - 5); });
    })();
    bt.querySelector('[data-beat-open]').addEventListener('click', function (e) {
      var p = panels.beat; if (!p) return;
      var c = pick(), lic = c.value, lbl = c.getAttribute('data-lic-label'), f = p.querySelector('form');
      f.querySelector('input[name="beat"]').value = name;
      f.querySelector('input[name="licence"]').value = lic;
      f.querySelector('input[name="price"]').value = lbl === 'Offer' ? 'Offer (see notes)' : lbl + ' USD';
      p.querySelector('[data-beat-summary]').textContent = name + ' · ' + lic + (lbl === 'Offer' ? ' · Tell us your offer below' : ' · ' + lbl);
      var nl = p.querySelector('[data-beat-notes-label]'), ta = f.querySelector('textarea[name="notes"]');
      if (lbl === 'Offer') { nl.innerHTML = 'Your offer and plans for the beat'; ta.required = true; } else { nl.innerHTML = 'Notes <span class="opt">(optional)</span>'; ta.required = false; }
      if (au) au.pause(); document.querySelectorAll('audio').forEach(function (o) { o.pause(); });
      f.hidden = false; p.querySelector('.build__done').hidden = true; p.querySelector('.build__error').hidden = true;
      openPanel(p, e);
    });
  });
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
      var ok = nm.value.trim() && em.value.trim() && form.checkValidity() && (!msg || msg.value.trim());
      if (!ok) { err.hidden = false; return; }
      err.hidden = true;
      var data = {};
      new FormData(form).forEach(function (v, key) { if (key !== 'about') data[key] = v; });
      var chips = form.querySelectorAll('input[name="about"]');
      if (chips.length) {
        var about = [].map.call(form.querySelectorAll('input[name="about"]:checked'), function (i) { return i.value; });
        data.about = about.length ? about.join(', ') : 'Not specified';
      }
      if (form.hasAttribute('data-beatform')) {
        data.subject = 'New beat order — ' + data.beat + ' · ' + data.licence + ' · ' + data.price;
      } else if (form.hasAttribute('data-order')) {
        data.subject = 'New order — ' + data.product + ' · ' + data.size + (data.frame ? ' · ' + data.frame + ' frame' : '') + ' × ' + data.quantity + ' · ' + data.total;
        if (!data.frame) delete data.frame;
      } else if (data.topic && data.topic.trim()) { data.topic = data.topic.trim(); data.subject = data.subject + ': ' + data.topic; } else { data.topic = 'Not specified'; }
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
    function go(i) { i = Math.max(0, Math.min(slides.length - 1, i)); track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft - (slides[0].offsetLeft - track.offsetLeft), behavior: 'smooth' }); }
    function update() {
      var i = 0, best = Infinity, base = slides[0].offsetLeft;
      slides.forEach(function (s, k) { var d = Math.abs((s.offsetLeft - base) - track.scrollLeft); if (d < best) { best = d; i = k; } });
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) i = slides.length - 1;
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

    /* Auto-advance every 5 seconds while nobody is interacting */
    var last = Date.now(), inView = true, focused = false;
    function poke() { last = Date.now(); }
    ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (ev) {
      feat.addEventListener(ev, poke, { passive: true });
    });
    track.addEventListener('scroll', poke, { passive: true });
    feat.addEventListener('focusin', function () { focused = true; });
    feat.addEventListener('focusout', function () { focused = false; poke(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { inView = es[0].isIntersecting; if (inView) poke(); }, { threshold: 0.4 }).observe(feat);
    }
    setInterval(function () {
      var playerOpen = document.getElementById('player') && !document.getElementById('player').hidden;
      if (document.hidden || !inView || focused || playerOpen || slides.length < 2) return;
      if (Date.now() - last < 5000) return;
      go(current + 1 > slides.length - 1 ? 0 : current + 1);
      setTimeout(poke, 0);
    }, 500);
  });

  /* ---------- Pop-open player: play featured songs here, or open them where they're hosted ---------- */
  var pm = document.getElementById('player');
  if (pm) {
    var tracks = [].map.call(document.querySelectorAll('.feature .slide[data-kind], .release[data-kind]'), function (el) {
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

  /* ---------- Shop: size, quantity, price + live currency view ---------- */
  var prod = document.querySelector('.product');
  if (prod) {
    var PRICE = 30000;
    var PNAME = prod.getAttribute('data-product-name') || 'Alhamdulillah Tee';
    var SLABEL = prod.hasAttribute('data-size-label') ? prod.getAttribute('data-size-label') : 'Size ';
    // Fallback rates (NGN per unit, CBN 2 Nov 2026) used only if the live rate can’t load
    var FALLBACK = { USD: 1347.94, GBP: 1809.34, EUR: 1512.26, CAD: 965, GHS: 89 };
    var SYM = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', CAD: 'CA$', GHS: 'GH₵' };
    var rates = null, ratesAt = null, live = false;
    var qtyIn = prod.querySelector('[data-qty-input]');
    function ngn(n) { return '₦' + Math.round(n).toLocaleString('en-NG'); }
    function money(n, cur) {
      if (cur === 'NGN') return ngn(n);
      var perNgn = rates && rates[cur] ? rates[cur] : 1 / FALLBACK[cur];
      var v = Math.ceil(n * perNgn - 1e-9);   // always round up to the next whole number
      return SYM[cur] + v.toLocaleString('en-US');
    }
    function curSel() { var c = prod.querySelector('input[name="currency"]:checked'); return c ? c.value : 'NGN'; }
    function refresh() { try { refreshInner(); } catch (err) { if (window.console) console.warn('price update', err); } }
    function refreshInner() {
      var sel = prod.querySelector('input[name="size"]:checked') || prod.querySelector('input[name="size"]');
      PRICE = parseInt(sel.getAttribute('data-price'), 10) || PRICE;
      var fr = prod.querySelector('input[name="frame"]:checked');
      var q = Math.max(1, Math.min(10, parseInt(qtyIn.value, 10) || 1)); qtyIn.value = q;
      var cur = curSel(), total = PRICE * q;
      prod.querySelector('[data-price-main]').textContent = money(PRICE, cur);
      prod.querySelector('[data-price-sub]').textContent = '';
      var unitShown = money(PRICE, cur);
      var totalShown = cur === 'NGN' ? ngn(total) : unitShown.replace(/[\d,]+$/, function (d) { return (parseInt(d.replace(/,/g, ''), 10) * q).toLocaleString('en-US'); });
      prod.querySelector('[data-total]').textContent = totalShown;
      var rateEl = prod.querySelector('[data-rate]');
      if (cur === 'NGN') rateEl.textContent = 'Prices are in naira. Pick a currency to see today’s rate.';
      else {
        var perUnit = rates && rates[cur] ? 1 / rates[cur] : FALLBACK[cur];
        rateEl.textContent = '1 ' + cur + ' = ' + ngn(perUnit).replace('₦', '₦') + (live && ratesAt ? ' · live rate, updated ' + ratesAt : ' · approximate rate') + '. You pay in naira (' + ngn(total) + ').';
      }
      window.__blaccOrder = { name: PNAME, sizeLabel: SLABEL, size: sel.value, frame: fr ? fr.value : '', qty: q, total: ngn(total), view: cur, viewTotal: totalShown };
    }
    prod.querySelectorAll('input[name="size"], input[name="frame"]').forEach(function (r) { r.addEventListener('change', refresh); });
    prod.querySelectorAll('.frm').forEach(function (lab) { lab.addEventListener('click', function () { var inp = lab.querySelector('input'); if (inp && !inp.checked) inp.checked = true; setTimeout(refresh, 0); }); });
    function onCur() { refresh(); try { localStorage.setItem('blacc_cur', curSel()); } catch (e) {} }
    prod.querySelectorAll('input[name="currency"]').forEach(function (r) { r.addEventListener('change', onCur); r.addEventListener('input', onCur); });
    // Belt and braces for mobile browsers: tapping the chip itself always selects and updates
    prod.querySelectorAll('.cur').forEach(function (lab) {
      lab.addEventListener('click', function () { var inp = lab.querySelector('input'); if (inp && !inp.checked) inp.checked = true; setTimeout(onCur, 0); });
    });
    prod.querySelectorAll('.size').forEach(function (lab) {
      lab.addEventListener('click', function () { var inp = lab.querySelector('input'); if (inp && !inp.checked) inp.checked = true; setTimeout(refresh, 0); });
    });
    prod.querySelectorAll('[data-qty]').forEach(function (b) { b.addEventListener('click', function () { qtyIn.value = (parseInt(qtyIn.value, 10) || 1) + parseInt(b.getAttribute('data-qty'), 10); refresh(); }); });
    qtyIn.addEventListener('input', refresh);
    try { var saved = localStorage.getItem('blacc_cur'); var r = saved && prod.querySelector('input[name="currency"][value="' + saved + '"]'); if (r) r.checked = true; } catch (e) {}
    function useRates(data) {
      rates = data.rates; live = true;
      var d = new Date(data.time_last_update_unix * 1000);
      ratesAt = d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      refresh();
    }
    try {
      var cached = JSON.parse(localStorage.getItem('blacc_rates') || 'null');
      if (cached && Date.now() - cached.fetched < 30 * 60 * 1000) useRates(cached.data);
    } catch (e) {}
    fetch('https://open.er-api.com/v6/latest/NGN')
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.result === 'success' && d.rates) { useRates(d); try { localStorage.setItem('blacc_rates', JSON.stringify({ fetched: Date.now(), data: d })); } catch (e) {} } })
      .catch(function () {});
    refresh();
  }

  /* ---------- Shop: 360° turntable from real photos (8 angles, no fades) ---------- */
  document.querySelectorAll('[data-spin]').forEach(function (spin) {
    var stage = spin.querySelector('[data-spin-stage]');
    var frames = [].slice.call(spin.querySelectorAll('.spin__frame'));
    var btns = spin.querySelectorAll('[data-face]');
    var N = frames.length, step = 360 / N;
    var FRAME_MS = 750;        // slow turn: one angle every 0.75s (~6s per full turn)
    var angle = 0, shown = -1, dragging = false, lastX = 0, idleAt = -Infinity, holdUntil = 0, acc = 0, prev = performance.now();
    frames.forEach(function (f) { var i = new Image(); i.src = f.src; }); // preload all angles
    function show() {
      var i = ((Math.round(angle / step) % N) + N) % N;
      if (i === shown) return;
      if (shown >= 0) frames[shown].classList.remove('is-on');
      frames[i].classList.add('is-on'); shown = i;
      var deg = i * step;
      btns.forEach(function (b) { b.setAttribute('aria-pressed', parseInt(b.getAttribute('data-face'), 10) === deg ? 'true' : 'false'); });
    }
    stage.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX;
      try { stage.setPointerCapture(e.pointerId); } catch (x) {}
      spin.classList.add('is-dragging');
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var pxPerFrame = Math.max(24, stage.clientWidth / 10);
      angle += (e.clientX - lastX) / pxPerFrame * step; lastX = e.clientX; show();
    });
    function end() { if (!dragging) return; dragging = false; spin.classList.remove('is-dragging'); angle = Math.round(angle / step) * step; idleAt = performance.now(); acc = 0; }
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end); stage.addEventListener('lostpointercapture', end);
    btns.forEach(function (b) { b.addEventListener('click', function () {
      angle = parseInt(b.getAttribute('data-face'), 10); show(); holdUntil = performance.now() + 4000; acc = 0;
    }); });
    stage.setAttribute('tabindex', '0'); stage.setAttribute('role', 'img');
    stage.setAttribute('aria-label', 'Alhamdulillah Tee, 360° view. Drag, or use the arrow keys, to rotate.');
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { angle += step; show(); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { angle -= step; show(); e.preventDefault(); }
      holdUntil = performance.now() + 3000;
    });
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    (function loop(now) {
      requestAnimationFrame(loop);
      var dt = now - prev; prev = now;
      if (dragging || reduce || now < holdUntil || now - idleAt < 1500) return;
      acc += dt;
      if (acc >= FRAME_MS) { acc -= FRAME_MS; angle += step; show(); }   // same direction as the original turntable
    })(performance.now());
    show();
  });

  /* ---------- Profile tabs ---------- */
  var tabs = document.querySelectorAll('.ptab');
  if (tabs.length) {
    function selectTab(t, focus) {
      tabs.forEach(function (x) {
        var on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1;
        var p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on;
      });
      if (focus) t.focus();
      try { history.replaceState(null, '', '#' + t.id.replace('t-', '')); } catch (e) {}
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { selectTab(t); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); selectTab(tabs[(i + 1) % tabs.length], true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); selectTab(tabs[(i - 1 + tabs.length) % tabs.length], true); }
      });
    });
    var h = location.hash.replace('#', ''); var start = document.getElementById('t-' + h);
    if (start) selectTab(start); else selectTab(tabs[0]);
  }

  /* ---------- Poster: dot-matrix name + now-playing bar ---------- */
  document.querySelectorAll('canvas[data-dots]').forEach(function (cv) {
    var word = cv.getAttribute('data-dots'), ctx = cv.getContext('2d'), dots = [], W = 0, H = 0, dpr = 1, t0 = performance.now();
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function build() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return;
      cv.width = W * dpr; cv.height = H * dpr;
      var off = document.createElement('canvas'), o = off.getContext('2d');
      var pitch = W < 700 ? Math.max(4, Math.round(W / 105)) : Math.max(6, Math.round(W / 150));
      off.width = Math.ceil(W / pitch); off.height = Math.ceil(H / pitch);
      var family = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
      var fs = off.height * 0.98;
      o.font = '800 ' + fs + 'px ' + family;
      var w = o.measureText(word).width;
      if (w > off.width * 0.95) { fs = fs * (off.width * 0.95) / w; o.font = '800 ' + fs + 'px ' + family; }
      o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'middle';
      o.fillText(word, off.width / 2, off.height / 2);
      var data = o.getImageData(0, 0, off.width, off.height).data; dots = [];
      for (var y = 0; y < off.height; y++) for (var x = 0; x < off.width; x++) {
        if (data[(y * off.width + x) * 4 + 3] > 110) dots.push([x * pitch + pitch / 2, y * pitch + pitch / 2, Math.random() * 6.28]);
      }
      cv.__pitch = pitch;
    }
    function draw(now) {
      if (!W) return;
      var r = cv.__pitch * 0.36, t = (now - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.shadowColor = 'rgba(255,240,225,.55)'; ctx.shadowBlur = r * 2.2;
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i], a = still ? 0.92 : 0.72 + 0.28 * Math.sin(t * 1.4 + d[2] + d[0] * 0.01);
        ctx.fillStyle = 'rgba(255,248,240,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(d[0], d[1], r, 0, 6.2832); ctx.fill();
      }
    }
    build();
    window.addEventListener('resize', function () { build(); draw(performance.now()); });
    if (still) draw(performance.now());
    else (function loop(now) { requestAnimationFrame(loop); draw(now); })(performance.now());
  });

  var np = document.querySelector('.np');
  if (np) {
    var npList = [].map.call(document.querySelectorAll('.release[data-kind]'), function (el) { return { title: el.dataset.title, credit: el.dataset.credit }; });
    var npCur = 0, npFill = np.querySelector('[data-np-fill]');
    function showNp() {
      var t = npList[npCur]; np.querySelector('[data-np-title]').textContent = t.title;
      np.querySelector('[data-np-artist]').textContent = t.credit.replace(' · ', ' ft. ').replace(/^Bemshima ft\. /, 'Bemshima ft. ');
      npFill.style.width = ((npCur + 1) / npList.length * 100) + '%';
    }
    np.querySelector('[data-np-prev]').addEventListener('click', function () { npCur = (npCur - 1 + npList.length) % npList.length; showNp(); });
    np.querySelector('[data-np-next]').addEventListener('click', function () { npCur = (npCur + 1) % npList.length; showNp(); });
    np.querySelector('[data-np-play]').addEventListener('click', function () {
      var btn = document.querySelector('[data-player-open="' + npCur + '"]'); if (btn) btn.click();
    });
    showNp();
  }

  /* ---------- Shop sections (Merch / Art / Beats) ---------- */
  var catTabs = [].slice.call(document.querySelectorAll('.shop-tab[data-cat]'));
  if (catTabs.length) {
    var showCat = function (c, push) {
      var panel = document.querySelector('[data-cat-panel="' + c + '"]');
      if (!panel) { c = 'merch'; panel = document.querySelector('[data-cat-panel="merch"]'); }
      document.querySelectorAll('[data-cat-panel]').forEach(function (p) { p.hidden = p !== panel; });
      catTabs.forEach(function (t) { var on = t.getAttribute('data-cat') === c; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
      var title = document.querySelector('[data-shop-title]');
      if (title) title.innerHTML = panel.getAttribute('data-cat-title');
      if (push) { try { history.replaceState(null, '', c === 'merch' ? location.pathname : '#' + c); } catch (e) {} }
    };
    catTabs.forEach(function (t) { t.addEventListener('click', function () { showCat(t.getAttribute('data-cat'), true); }); });
    var goItem = function (h) {
      var el = h && document.getElementById(h);
      if (!el || !el.hasAttribute('data-item')) return false;
      var panel = el.closest('[data-cat-panel]');
      showCat(panel ? panel.getAttribute('data-cat-panel') : 'merch', false);
      setTimeout(function () { el.scrollIntoView({ block: 'start' }); el.classList.add('is-linked'); setTimeout(function () { el.classList.remove('is-linked'); }, 2200); }, 60);
      return true;
    };
    var h0 = (location.hash || '').replace('#', '');
    if (!goItem(h0)) showCat(document.querySelector('[data-cat-panel="' + h0 + '"]') ? h0 : 'merch', false);
    window.addEventListener('hashchange', function () { var h = location.hash.replace('#', ''); if (!goItem(h) && document.querySelector('[data-cat-panel="' + h + '"]')) showCat(h, false); });
  }

  /* ---------- Shop: old #links go to the new pages ---------- */
  var shopHome = document.querySelector('[data-shop-redirects]');
  if (shopHome && location.hash) {
    try { var to = JSON.parse(shopHome.getAttribute('data-shop-redirects'))[location.hash.slice(1)]; if (to) location.replace(to); } catch (e) {}
  }

  /* ---------- Copy / share a product link ---------- */
  document.querySelectorAll('[data-share]').forEach(function (b) {
    var lab = b.querySelector('span');
    b.addEventListener('click', function () {
      var url = b.getAttribute('data-share'), title = b.getAttribute('data-share-title');
      var done = function () { lab.textContent = 'Link copied'; setTimeout(function () { lab.textContent = 'Copy link'; }, 1800); };
      if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link:', url); });
      else window.prompt('Copy this link:', url);
    });
  });

  /* ---------- Bemshima page: dark by default, toggle to light ---------- */
  var themed = document.querySelector('[data-themed]'), tBtn = document.querySelector('[data-theme-toggle]');
  if (themed && tBtn) {
    var paintT = function () {
      var light = themed.classList.contains('page--light');
      tBtn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
      tBtn.title = light ? 'Dark mode' : 'Light mode';
    };
    tBtn.addEventListener('click', function () {
      var light = !themed.classList.contains('page--light');
      themed.classList.toggle('page--light', light); themed.classList.toggle('page--dark', !light);
      try { localStorage.setItem('bm_theme', light ? 'light' : 'dark'); } catch (e) {}
      paintT();
    });
    paintT();
  }

  /* ---------- Music page: in-page audio player for free songs ---------- */
  var mus = document.querySelector('.mus-card[data-audio]');
  if (mus) {
    var mt = [].map.call(mus.querySelectorAll('[data-track]'), function (el) { return el.dataset; });
    var au = new Audio(), mi = 0, seeking = false;
    au.preload = 'metadata';
    var q = function (sel) { return mus.querySelector(sel); };
    var seekEl = q('[data-seek]'), lineEl = q('[data-line]'), knobEl = q('[data-knob]');
    var tlBtns = [].slice.call(document.querySelectorAll('[data-tl]'));
    function fmt(t) { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
    function setPct(p) {
      p = Math.max(0, Math.min(100, p || 0));
      lineEl.style.width = p + '%'; knobEl.style.left = p + '%';
      seekEl.setAttribute('aria-valuenow', Math.round(p));
    }
    function paint() {
      var on = !au.paused;
      mus.classList.toggle('is-playing', on);
      q('[data-cover-btn]').setAttribute('aria-label', (on ? 'Pause ' : 'Play ') + mt[mi].title);
      q('[data-ring]').setAttribute('aria-label', on ? 'Pause' : 'Play');
      tlBtns.forEach(function (b) {
        var k = +b.getAttribute('data-tl'), me = on && k === mi;
        b.classList.toggle('is-playing', me);
        b.setAttribute('aria-label', (me ? 'Pause ' : 'Play ') + mt[k].title);
      });
    }
    function show(i, keepPlaying) {
      mi = (i + mt.length) % mt.length;
      var d = mt[mi];
      q('[data-h-title]').textContent = d.title;
      q('[data-from]').textContent = d.from || 'Bemshima';
      var who = (d.with || d.feat || '').split(/,\s*|\s*&\s*|\s+and\s+/).filter(Boolean);
      q('[data-by]').textContent = ['Bemshima'].concat(who).join(' · ');
      q('[data-cover]').src = d.cover;
      q('[data-count-t]').textContent = (mi < 9 ? '0' : '') + (mi + 1);
      q('[data-cur]').textContent = '0:00'; q('[data-dur]').textContent = d.dur || '';
      setPct(0);
      au.src = d.src;
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.metadata = new MediaMetadata({ title: d.title, artist: 'Bemshima', album: d.from || '', artwork: [{ src: d.cover, sizes: '400x400' }] }); } catch (e) {}
      }
      if (keepPlaying) au.play().catch(function () {});
      paint();
    }
    function toggle() { if (au.paused) au.play().catch(function () {}); else au.pause(); }
    q('[data-count-n]').textContent = (mt.length < 10 ? '0' : '') + mt.length;
    if (mt.length < 2) mus.classList.add('is-single');
    q('[data-prev-t]').addEventListener('click', function () { show(mi - 1, !au.paused); });
    q('[data-next-t]').addEventListener('click', function () { show(mi + 1, !au.paused); });
    q('[data-cover-btn]').addEventListener('click', toggle);
    q('[data-ring]').addEventListener('click', toggle);
    tlBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var k = +b.getAttribute('data-tl');
        if (k === mi) toggle(); else show(k, true);
      });
    });
    au.addEventListener('play', paint); au.addEventListener('pause', paint);
    au.addEventListener('loadedmetadata', function () { q('[data-dur]').textContent = fmt(au.duration); });
    au.addEventListener('timeupdate', function () {
      if (seeking || !au.duration) return;
      q('[data-cur]').textContent = fmt(au.currentTime);
      setPct(au.currentTime / au.duration * 100);
    });
    au.addEventListener('ended', function () {
      if (mt.length > 1) show(mi + 1, true); else { au.currentTime = 0; setPct(0); q('[data-cur]').textContent = '0:00'; paint(); }
    });
    function seekTo(e) {
      var b = seekEl.getBoundingClientRect(), x = (e.touches ? e.touches[0] : e).clientX;
      var p = (x - b.left) / b.width * 100; setPct(p);
      if (au.duration) { au.currentTime = au.duration * Math.max(0, Math.min(1, p / 100)); q('[data-cur]').textContent = fmt(au.currentTime); }
    }
    seekEl.addEventListener('pointerdown', function (e) {
      seeking = true; seekTo(e);
      try { seekEl.setPointerCapture(e.pointerId); } catch (x) {}
    });
    seekEl.addEventListener('pointermove', function (e) { if (seeking) seekTo(e); });
    ['pointerup', 'pointercancel'].forEach(function (ev) { seekEl.addEventListener(ev, function () { seeking = false; }); });
    seekEl.addEventListener('keydown', function (e) {
      if (!au.duration) return;
      if (e.key === 'ArrowRight') au.currentTime = Math.min(au.duration, au.currentTime + 5);
      else if (e.key === 'ArrowLeft') au.currentTime = Math.max(0, au.currentTime - 5);
      else return;
      e.preventDefault();
    });
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', function () { au.play(); });
        navigator.mediaSession.setActionHandler('pause', function () { au.pause(); });
        if (mt.length > 1) {
          navigator.mediaSession.setActionHandler('previoustrack', function () { show(mi - 1, true); });
          navigator.mediaSession.setActionHandler('nexttrack', function () { show(mi + 1, true); });
        }
      } catch (e) {}
    }
    /* Real play counts (GoatCounter): a play counts after 10 seconds, once per song per visit */
    var gc = mus.getAttribute('data-gc'), plays = {}, counted = {};
    var slug = function (i) { return 'play-' + mt[i].src.split('/').pop().replace(/\.mp3$/, ''); };
    var playTxt = function (n) {
      var t = n.toLocaleString('en');
      if (n >= 1000) {
        var k = n / 1000, d = k < 10 ? 2 : k < 100 ? 1 : 0, f = Math.pow(10, d);
        t = (Math.floor(k * f + 1e-6) / f).toFixed(d); if (d) t = t.replace(/0+$/, '').replace(/\.$/, ''); t += 'K';
      }
      return t + (n === 1 ? ' play' : ' plays');
    };
    var base = function (i) { return parseInt(mt[i].base || '0', 10) || 0; };
    tlBtns.forEach(function (b) {
      var row = b.closest('.tl__row'), sp = document.createElement('span');
      sp.className = 'tl__plays'; sp.setAttribute('data-plays-i', b.getAttribute('data-tl')); sp.hidden = true;
      var dur = row.querySelector('.tl__dur'), side = document.createElement('span');
      side.className = 'tl__side'; row.insertBefore(side, dur); side.appendChild(dur); side.appendChild(sp);
    });
    function renderPlays(i) {
      var n = base(i) + (plays[i] || 0);
      var el = document.querySelector('[data-plays-i="' + i + '"]');
      var why = mt[i].baseFrom ? 'Includes plays on ' + mt[i].baseFrom : '';
      if (el) { el.hidden = !n; if (n) { el.textContent = playTxt(n); el.title = why; } }
      if (i === mi) { var h = q('[data-plays]'); h.hidden = !n; if (n) { h.textContent = playTxt(n) + (why ? ' · incl. ' + mt[i].baseFrom : ''); } }
    }
    function loadPlays(i) {
      if (!gc || !window.fetch) return;
      fetch(gc + '/counter/' + encodeURIComponent(slug(i)) + '.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { if (d && d.count != null) { plays[i] = Math.max(plays[i] || 0, parseInt(String(d.count).replace(/\D/g, ''), 10) || 0); renderPlays(i); } })
        .catch(function () {});
    }
    function countPlay(i) {
      if (counted[i] || !gc) return;
      counted[i] = true;
      var url = gc + '/count?p=' + encodeURIComponent(slug(i)) + '&t=' + encodeURIComponent(mt[i].title) + '&e=true&r=' + encodeURIComponent(location.href) + '&rnd=' + Math.random().toString(36).slice(2);
      try { if (!(navigator.sendBeacon && navigator.sendBeacon(url))) new Image().src = url; } catch (e) { new Image().src = url; }
      plays[i] = (plays[i] || 0) + 1; renderPlays(i);
    }
    au.addEventListener('timeupdate', function () { if (au.currentTime >= 10) countPlay(mi); });
    var _show = show;
    show = function (i, keep) { _show(i, keep); renderPlays(mi); };
    mt.forEach(function (_, i) { renderPlays(i); loadPlays(i); });
    show(0, false);
  }
})();
