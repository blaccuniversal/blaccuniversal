/* KleanSound · a BLACC Universal construct */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var yr = $('[data-year]'); if (yr) yr.textContent = new Date().getFullYear();

  /* nav + drawer */
  var nav = $('[data-nav]'), burger = $('[data-burger]'), drawer = $('[data-drawer]');
  function onScroll() { nav.classList.toggle('is-scrolled', scrollY > 30); }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  function drawerSet(on) { drawer.hidden = !on; burger.setAttribute('aria-expanded', on); document.body.style.overflow = on ? 'hidden' : ''; }
  burger.addEventListener('click', function () { drawerSet(drawer.hidden); });
  $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { drawerSet(false); }); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') drawerSet(false); });

  /* reveal */
  var rv = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }); }, { threshold: .12 });
    rv.forEach(function (n) { io.observe(n); });
  } else rv.forEach(function (n) { n.classList.add('is-in'); });

  /* EQ bars + low-end demo (synthesised in the browser, plays only when tapped) */
  var eq = $('[data-eq]'), N = 40, bars = [];
  for (var i = 0; i < N; i++) { var b = document.createElement('i'); b.style.setProperty('--i', i); eq.appendChild(b); bars.push(b); }
  eq.classList.add('idle');
  var btn = $('[data-kick]'), fig = $('[data-fig]'), ctx = null, an = null, timer = null, raf = 0, beats = 0, data = null;
  function setBtn(on) {
    btn.setAttribute('aria-pressed', on);
    $('[data-kicktx]').textContent = on ? 'Stop' : 'Feel the low end';
    $('[data-kickic] use').setAttribute('href', on ? '#i-stop' : '#i-play');
    $('[data-kickhint]').textContent = on ? 'Playing a short bass pattern. Tap again to stop.' : 'Sound on. A short bass demo plays when you tap it.';
  }
  function hit(t, strong) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(46, t + .14);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(strong ? 0.95 : 0.6, t + .006); g.gain.exponentialRampToValueAtTime(0.0001, t + .42);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + .45);
  }
  function sub(t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 55;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + .02); g.gain.exponentialRampToValueAtTime(0.0001, t + .3);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + .32);
  }
  function tick(t) {
    var len = ctx.sampleRate * .05, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / len);
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf; f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = .12;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  var master = null, BPM = 120;
  function loop() {
    if (!an) return;
    an.getByteFrequencyData(data);
    for (var j = 0; j < N; j++) {
      var idx = Math.floor(Math.pow(j / N, 1.7) * 90) + 1, v = data[idx] / 255;
      bars[j].style.transform = 'scaleY(' + Math.max(.06, v).toFixed(3) + ')';
    }
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    clearInterval(timer); timer = null; cancelAnimationFrame(raf); an = null;
    eq.classList.add('idle'); bars.forEach(function (b) { b.style.transform = ''; });
    if (ctx) { try { master.gain.setTargetAtTime(0, ctx.currentTime, .05); } catch (e) {} }
    setBtn(false);
  }
  function start() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!ctx) ctx = new AC();
    ctx.resume();
    master = ctx.createGain(); master.gain.value = .55;
    var comp = ctx.createDynamicsCompressor(); an = ctx.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = .72; data = new Uint8Array(an.frequencyBinCount);
    master.connect(comp); comp.connect(an); an.connect(ctx.destination);
    eq.classList.remove('idle'); setBtn(true); beats = 0;
    var spb = 60 / BPM, next = ctx.currentTime + .08;
    function schedule() {
      while (next < ctx.currentTime + .3) {
        var step = beats % 8, t = next;
        if (step % 2 === 0) { hit(t, step === 0); var dly = Math.max(0, (t - ctx.currentTime) * 1000); setTimeout(pulse, dly); }
        if (step % 2 === 1) { sub(t); tick(t); }
        if (step === 3 || step === 7) tick(t + spb / 2);
        next += spb / 2; beats++;
        if (beats > 64) { setTimeout(stop, 1200); clearInterval(timer); timer = null; return; }
      }
    }
    timer = setInterval(schedule, 80); schedule(); loop();
  }
  function pulse() { if (reduce) return; fig.classList.add('hit'); setTimeout(function () { fig.classList.remove('hit'); }, 110); }
  btn.addEventListener('click', function () { if (btn.getAttribute('aria-pressed') === 'true') stop(); else start(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && an) stop(); });

  /* build hotspots */
  var HS = [
    ['Perforated grille', 'Hex-perforated metal protects the drivers.'],
    ['Recessed handles', 'Recessed handles never snag in the van.'],
    ['Stack-ready', 'Flush cabinets keep a stack steady.'],
    ['Road finish', 'A textured coat built for the road.']
  ];
  var hps = $$('.hp'), hd = $('[data-hsdots]');
  hd.innerHTML = HS.map(function (h, i) { return '<button type="button" aria-label="' + h[0] + '"></button>'; }).join('');
  var hds = $$('button', hd);
  var hcur = 0, hdir = 1, hcap = $('[data-hscap]'), htimer = null, hhold = 0, hvis = true;
  function hsSet(i, dir) {
    hcur = i;
    $('[data-hst]').textContent = HS[i][0]; $('[data-hsp]').textContent = HS[i][1];
    hps.forEach(function (p, k) { p.classList.toggle('on', k === i); }); hds.forEach(function (d, k) { d.classList.toggle('on', k === i); });
    if (dir) { hcap.classList.remove('go-l', 'go-r'); void hcap.offsetWidth; hcap.classList.add(dir > 0 ? 'go-l' : 'go-r'); }
  }
  function hsStep() {
    if (!hvis || document.hidden || Date.now() < hhold) return;
    if (hcur + hdir > HS.length - 1 || hcur + hdir < 0) hdir = -hdir;
    hsSet(hcur + hdir, hdir);
  }
  function hsUser(i) { hhold = Date.now() + 9000; hdir = i >= hcur ? 1 : -1; hsSet(i, i === hcur ? 0 : (i > hcur ? 1 : -1)); }
  hps.forEach(function (p, i) { p.addEventListener('click', function () { hsUser(i); }); });
  hds.forEach(function (d, i) { d.addEventListener('click', function () { hsUser(i); }); });
  hsSet(0);
  if (!matchMedia('(prefers-reduced-motion:reduce)').matches) {
    htimer = setInterval(hsStep, 3600);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { hvis = e[0].isIntersecting; }, { threshold: .25 }).observe($('.built'));
  }

  /* contact details: fill KLS_INFO in contact-info.js; only filled items are shown */
  var INFO = window.KLS_INFO || {};
  var items = [];
  if (INFO.address) items.push(['Visit', INFO.address]);
  if (INFO.phone) items.push(['Call', '<a href="tel:' + INFO.phone.replace(/[^+\d]/g, '') + '">' + INFO.phone + '</a>']);
  if (INFO.whatsapp) items.push(['Message', '<a href="https://wa.me/' + INFO.whatsapp.replace(/\D/g, '') + '" target="_blank" rel="noopener">' + INFO.whatsapp + '</a>']);
  if (INFO.email) items.push(['Email', '<a href="mailto:' + INFO.email + '">' + INFO.email + '</a>']);
  if (INFO.hours) items.push(['Hours', INFO.hours]);
  $('[data-contact]').innerHTML = items.map(function (x) { return '<li><span>' + x[0] + '</span><b>' + x[1] + '</b></li>'; }).join('');
  var socs = [['instagram', 'Instagram'], ['instagram2', 'Instagram 2'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['x', 'X'], ['linkedin', 'LinkedIn']].filter(function (k) { return INFO[k[0]]; });
  $('[data-soc]').innerHTML = socs.map(function (k) { return '<a href="' + INFO[k[0]] + '" target="_blank" rel="noopener">' + k[1] + '</a>'; }).join('');

  /* setup finder */
  var st = { venue: 'room', crowd: 's', use: 'speech' };
  var REC = {
    p: ['Portable', 'Easy to move. Fits small rooms and pop-ups.', 'Portable'],
    c: ['Stage cabinets', 'Reach and clarity for halls and live bands.', 'Stage cabinets'],
    s: ['Stacked system with subs', 'Stage cabinets over subs for big crowds.', 'Stacked system with subs']
  };
  var rec = $('.rec');
  function recompute() {
    var lvl = { s: 0, m: 1, l: 2 }[st.crowd];
    if (st.venue === 'open') lvl += 1; else if (st.venue === 'hall') lvl = Math.max(lvl, 1);
    if (st.use === 'dj' && lvl >= 1) lvl += 1;
    var key = lvl <= 0 ? 'p' : lvl <= 2 ? 'c' : 's';
    if (st.use === 'dj' && st.crowd !== 's' ) key = 's';
    var r = REC[key];
    $('[data-rect]').textContent = r[0]; $('[data-recp]').textContent = r[1];
    $('[data-recgo]').setAttribute('data-pick', r[2]);
    rec.classList.remove('swap'); void rec.offsetWidth; rec.classList.add('swap');
  }
  $$('.opts').forEach(function (g) {
    g.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      st[g.getAttribute('data-q')] = b.getAttribute('data-v');
      $$('button', g).forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      recompute();
    });
  });
  recompute();

  /* quote form */
  var f = $('#qForm'), msg = $('#qMsg');
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-pick]'); if (!a) return;
    var v = a.getAttribute('data-pick'); if (v) f.elements.setup.value = v;
  });
  function say(t, c) { msg.className = 'jf__msg' + (c ? ' ' + c : ''); msg.textContent = t; }
  f.addEventListener('input', function (e) { e.target.classList.remove('bad'); });
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var el = f.elements, bad = [];
    $$('.bad', f).forEach(function (x) { x.classList.remove('bad'); });
    if (el.name.value.trim().length < 3) bad.push(el.name);
    if (el.phone.value.replace(/\D/g, '').length < 7) bad.push(el.phone);
    if (bad.length) { bad.forEach(function (x) { x.classList.add('bad'); }); say('Please check the highlighted fields.', 'err'); bad[0].focus(); return; }
    if (el.botcheck.value) return;
    var sb = f.querySelector('button[type=submit]'); sb.disabled = true; say('Sending…');
    var d = { access_key: 'c45f617c-f3f2-4caa-93cf-5d49e2cece46', subject: 'KleanSound quote request: ' + el.name.value.trim(), from_name: 'KleanSound page', botcheck: '', page: location.href,
      name: el.name.value.trim(), phone: el.phone.value.trim(), setup: el.setup.value, venue: el.note.value.trim(),
      finder: st.venue + ' / ' + st.crowd + ' / ' + st.use };
    fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.success === false) throw 0; }); })
      .then(function () { f.innerHTML = '<div class="done"><svg><use href="#i-check"/></svg><h3>Thank you, ' + d.name.split(' ')[0].replace(/[<>&"]/g, '') + '.</h3><p>We have your request and will be in touch soon.</p></div>'; })
      .catch(function () { sb.disabled = false; say('Could not send just now. Please try again.', 'err'); });
  });
})();
