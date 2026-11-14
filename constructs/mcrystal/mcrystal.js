/* Mcrystal Cinemas · concept by BLACC Universal */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var EMAIL = 'mcrystalcinemas@gmail.com', PHONE = '+2348151066234';

  // Sample showtimes, the same every day, until the cinema sends its real schedule.
  var WEEK = null;
  var FILMS = [
    { t: 'Agbara Nla: The Return', g: 'Horror', d: '2h 37m', times: ['15:30', '20:30'], c: ['#2a1a03', '#f2c14e'] },
    { t: 'King Kosoko', g: 'Drama', d: '1h 50m', times: ['13:00', '18:00'], c: ['#1d0b2e', '#b38cff'] },
    { t: 'Invitation To Kill', g: 'Action', d: '1h 40m', times: ['13:00', '20:30'], c: ['#300808', '#ff5a5a'] },
    { t: 'Alahun', g: 'Drama', d: '1h 38m', times: ['10:30'], c: ['#06202a', '#5fd1d1'] },
    { t: 'Nne Mgbafor', g: 'Action · Thriller', times: ['15:30'], c: ['#0b1a33', '#7fb2ff'] },
    { t: 'One Gidi Night', g: 'Action', times: ['18:00'], c: ['#2b0716', '#f06a8c'] },
    { t: 'David', g: 'Animation', times: ['10:30'], c: ['#1e1a05', '#ffd25e'] }
  ];
  var SOON = [];
  function meta(f) { return f.g + (f.d ? ' · ' + f.d : ''); }

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function poster(f, small) {
    if (f.img) return '<span class="poster"><img src="/constructs/cinema/img/posters/' + f.img + (small ? '-s' : '') + '.webp" alt="' + esc(f.t) + ' poster" width="' + (small ? 300 : 600) + '" height="' + (small ? 450 : 900) + '" loading="lazy" decoding="async"></span>';
    var id = 'p' + hash(f.t + (small ? 's' : '')).toString(36);
    var words = f.t.toUpperCase().split(' ');
    var lines = [], cur = '';
    words.forEach(function (w) { if ((cur + ' ' + w).trim().length > 9 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
    if (cur) lines.push(cur);
    var longest = Math.max.apply(null, lines.map(function (l) { return l.length; }));
    var fs = Math.min(150, Math.floor(520 / (longest * .64)));
    var y0 = 700 - (lines.length - 1) * fs * .92;
    var tx = lines.map(function (l, i) { return '<text x="300" y="' + (y0 + i * fs * .92) + '" text-anchor="middle" font-size="' + fs + '">' + esc(l) + '</text>'; }).join('');
    var a = hash(f.t) % 360;
    return '<span class="poster"><svg viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(f.t) + '">' +
      '<defs><radialGradient id="' + id + '" cx="' + (30 + hash(f.t + 'x') % 40) + '%" cy="32%" r="80%"><stop offset="0" stop-color="' + f.c[1] + '" stop-opacity=".9"/><stop offset=".5" stop-color="' + f.c[0] + '"/><stop offset="1" stop-color="#050505"/></radialGradient>' +
      '<linearGradient id="' + id + 'f" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#050505" stop-opacity="0"/><stop offset="1" stop-color="#050505" stop-opacity=".95"/></linearGradient></defs>' +
      '<rect width="600" height="900" fill="url(#' + id + ')"/>' +
      '<g stroke="' + f.c[1] + '" stroke-opacity=".18" stroke-width="1.4" fill="none" transform="rotate(' + (a % 40 - 20) + ' 300 300)"><path d="M300 90l150 210-150 260-150-260z"/><path d="M300 10l250 290-250 380L50 300z"/><path d="M150 300h300M300 90v470M225 195l150 210M375 195L225 405"/></g>' +
      '<rect width="600" height="900" fill="url(#' + id + 'f)"/>' +
      '<g fill="#fff" font-family="Open Sans,Arial,sans-serif" font-weight="800" style="font-stretch:75%" letter-spacing="-2">' + tx + '</g>' +
      '<text x="300" y="840" text-anchor="middle" fill="' + f.c[1] + '" font-family="Open Sans,Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="8">' + (small ? 'COMING SOON' : 'NOW SHOWING') + '</text>' +
      '</svg></span>';
  }

  /* header */
  var hd = $('[data-hd]');
  function onScroll() { hd.classList.toggle('is-solid', window.scrollY > 40); }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var bg = $('[data-burger]'), dr = $('[data-drawer]');
  bg.addEventListener('click', function () { var o = dr.hidden; dr.hidden = !o; bg.setAttribute('aria-expanded', o); hd.classList.toggle('is-solid', o || scrollY > 40); });
  dr.addEventListener('click', function (e) { if (e.target.closest('a')) { dr.hidden = true; bg.setAttribute('aria-expanded', 'false'); onScroll(); } });

  /* hero rotation: poster slideshow */
  var show = $('[data-show]'), bars = $('[data-bars]'), hi = 0, heroT = $('[data-hero-title]'), heroM = $('[data-hero-meta]'), heroTimer, N = FILMS.length;
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  show.innerHTML = FILMS.map(function (f, i) { var p = poster(f); if (i < 2 || i === N - 1) p = p.replace('loading="lazy"', i ? 'loading="eager"' : 'loading="eager" fetchpriority="high"'); return '<button class="slide" type="button" data-slide="' + i + '" aria-label="' + esc(f.t) + '">' + p + '</button>'; }).join('');
  bars.innerHTML = FILMS.map(function (f, i) { return '<button type="button" data-bar="' + i + '" aria-label="Show ' + esc(f.t) + '"><i></i></button>'; }).join('');
  var slides = $$('.slide', show), barEls = $$('[data-bar]', bars);
  function place() {
    slides.forEach(function (s, k) {
      var o = ((k - hi) % N + N) % N; if (o > N / 2) o -= N;
      var a = Math.abs(o), x = a === 0 ? 0 : o * (a === 1 ? 62 : 108) + (a > 2 ? o * 20 : 0);
      s.style.transform = 'translateX(calc(-50% + ' + x + '%)) scale(' + [1, .8, .64, .5][Math.min(a, 3)] + ')';
      s.style.opacity = a > 2 ? 0 : [1, .5, .18][a];
      s.style.zIndex = 10 - a;
      s.classList.toggle('is-on', a === 0);
      s.tabIndex = a === 0 ? 0 : -1;
      s.setAttribute('aria-hidden', a > 1 ? 'true' : 'false');
    });
    barEls.forEach(function (b, k) { b.classList.remove('is-on'); b.classList.toggle('is-done', k < hi); });
    void bars.offsetWidth; barEls[hi].classList.add('is-on');
  }
  function hero(i) {
    hi = (i + N) % N;
    heroT.classList.add('is-swap');
    setTimeout(function () { heroT.textContent = FILMS[hi].t; heroT.style.setProperty('--len', FILMS[hi].t.length); heroM.textContent = meta(FILMS[hi]); heroT.classList.remove('is-swap'); }, 280);
    place(); heroBg(hi);
  }
  var pbg = $('[data-hero-poster]');
  function heroBg(i) {
    if (!pbg || !FILMS[i].img) return;
    var im = new Image(); im.src = '/constructs/mcrystal/img/posters/' + FILMS[i].img + '.webp'; im.alt = '';
    im.onload = function () { pbg.appendChild(im); requestAnimationFrame(function () { im.classList.add('is-on'); }); var old = $$('img', pbg); if (old.length > 2) old[0].remove(); };
  }
  function auto() { clearInterval(heroTimer); if (!calm) heroTimer = setInterval(function () { hero(hi + 1); }, 5200); }
  show.addEventListener('click', function (e) {
    var s = e.target.closest('[data-slide]'); if (!s || show.dataset.dragged) return;
    var k = +s.getAttribute('data-slide');
    if (k === hi) return $('[data-book-hero]').click();
    hero(k); auto();
  });
  bars.addEventListener('click', function (e) { var b = e.target.closest('[data-bar]'); if (b) { hero(+b.getAttribute('data-bar')); auto(); } });
  var sx = null;
  show.addEventListener('pointerdown', function (e) { sx = e.clientX; delete show.dataset.dragged; });
  show.addEventListener('pointerup', function (e) {
    if (sx === null) return; var dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 40) { show.dataset.dragged = 1; hero(hi + (dx < 0 ? 1 : -1)); auto(); setTimeout(function () { delete show.dataset.dragged; }, 50); }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) clearInterval(heroTimer); else auto(); });
  if (calm) show.classList.add('is-calm');
  heroT.style.setProperty('--len', FILMS[0].t.length);
  place();
  heroBg(0); auto();

  /* days + films */
  var days = [], today = new Date(); today.setHours(0, 0, 0, 0);
  var start = WEEK && today < WEEK[0] ? WEEK[0] : today, end = WEEK && today <= WEEK[1] ? WEEK[1] : new Date(+today + 6 * 864e5);
  for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  var dayI = 0;
  function rel(d) { return Math.round((d - today) / 864e5); }
  function dname(d) { var r = rel(d); return r === 0 ? 'Today' : r === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short' }); }
  function longDay(i) { var d = days[i], r = rel(d); return (r === 0 ? 'Today' : r === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'long' })) + ', ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  function times(f) { return f.times; }
  function fmt(t) { var p = t.split(':'), h = +p[0]; return (h % 12 || 12) + ':' + p[1] + (h < 12 ? ' AM' : ' PM'); }
  function past(t) { if (rel(days[dayI]) !== 0) return false; var p = t.split(':'), n = new Date(); return n.getHours() * 60 + n.getMinutes() > +p[0] * 60 + +p[1] - 20; }
  function renderDays() {
    $('[data-days]').innerHTML = days.map(function (d, i) { return '<button class="day" role="tab" type="button" data-day="' + i + '" aria-selected="' + (i === dayI) + '"><small>' + dname(d, i) + '</small><b>' + d.getDate() + '</b></button>'; }).join('');
  }
  function renderFilms() {
    var slots = [], nextSet = false;
    FILMS.forEach(function (f, i) { f.times.forEach(function (t) { var s = slots.filter(function (x) { return x.t === t; })[0]; if (!s) { s = { t: t, f: [] }; slots.push(s); } s.f.push(i); }); });
    slots.sort(function (a, b) { return a.t < b.t ? -1 : 1; });
    $('[data-films]').innerHTML = slots.map(function (s, si) {
      var gone = past(s.t), next = !gone && !nextSet && rel(days[dayI]) === 0; if (next) nextSet = true;
      var p = fmt(s.t).split(' ');
      return '<section class="slot' + (gone ? ' is-past' : '') + (next ? ' is-next' : '') + '" style="--i:' + si + '"><header class="slot__h"><b>' + p[0] + '</b><span>' + p[1] + '</span>' +
        (next ? '<em>Up next</em>' : gone ? '<em>Started</em>' : '') + '</header><div class="slot__films">' +
        s.f.map(function (i) {
          var f = FILMS[i], dis = gone ? ' disabled' : '';
          return '<article class="film"><button class="film__p" type="button" data-book="' + i + '" data-t="' + s.t + '"' + dis + ' aria-label="Book ' + esc(f.t) + ', ' + fmt(s.t) + '">' + poster(f) + (f.d ? '<span class="film__rt">' + f.d + '</span>' : '') + '</button>' +
            '<div class="film__b"><h3>' + esc(f.t) + '</h3><p>' + f.g + '</p><button class="btn btn--sm film__bk" type="button" data-book="' + i + '" data-t="' + s.t + '"' + dis + '>' + (gone ? 'Started' : 'Book seats') + '</button></div></article>';
        }).join('') + '</div></section>';
    }).join('');
  }
  $('[data-days]').addEventListener('click', function (e) { var b = e.target.closest('[data-day]'); if (!b) return; dayI = +b.getAttribute('data-day'); renderDays(); renderFilms(); });
  renderDays(); renderFilms();

  /* coming soon */
  var bell = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
  var soonEl = $('[data-soon]');
  if (!SOON.length) { var ss = $('#soon'); if (ss) ss.hidden = true; $$('a[href="#soon"]').forEach(function (a) { a.hidden = true; }); }
  else soonEl.innerHTML = SOON.map(function (f) {
    return '<div class="sn"><div class="sn__p">' + poster(f, true) + '</div><div><b>' + esc(f.t) + '</b><small>Coming soon</small><button type="button" data-notify="' + esc(f.t) + '" aria-pressed="false">' + bell + '<span>Tell me when</span></button></div></div>';
  }).join('');
  if (soonEl) soonEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-notify]'); if (!b) return;
    var t = b.getAttribute('data-notify');
    location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Tell me when ' + t + ' is showing') + '&body=' + encodeURIComponent('Hello Mcrystal Cinemas,\n\nPlease let me know when ' + t + ' is showing.\n\nThank you.');
    b.setAttribute('aria-pressed', 'true'); b.querySelector('span').textContent = 'We’ll let you know';
  });

  /* booking */
  var sheet = $('[data-sheet]'), cur = null, picked = [];
  function step(n) { $$('[data-step]', sheet).forEach(function (s) { s.hidden = +s.getAttribute('data-step') !== n; }); sheet.querySelector('.sheet__card').scrollTop = 0; }
  function openBook(fi, t) {
    cur = { f: FILMS[fi], t: t, day: longDay(dayI) }; picked = [];
    $('[data-bk-title]').textContent = cur.f.t;
    $('[data-bk-when]').textContent = cur.day + ' · ' + fmt(t);
    var rows = 'ABCDEFGH', h = hash(cur.f.t + t + cur.day), out = '';
    for (var r = 0; r < rows.length; r++) {
      out += '<div class="srow"><em>' + rows[r] + '</em>';
      for (var c = 1; c <= 12; c++) {
        var id = rows[r] + c, taken = ((h >> ((r * 12 + c) % 31)) & 3) === 0 && !(r === 4 && c > 4 && c < 9);
        out += '<button class="s' + (taken ? ' s--x' : '') + '" type="button" data-seat="' + id + '"' + (taken ? ' disabled aria-label="' + id + ', taken"' : ' aria-label="Seat ' + id + '" aria-pressed="false"') + '></button>';
      }
      out += '<em>' + rows[r] + '</em></div>';
    }
    $('[data-seats]').innerHTML = out;
    updSeats(); step(1); sheet.hidden = false; document.body.style.overflow = 'hidden';
  }
  function updSeats() {
    $('[data-picked]').textContent = picked.length ? picked.length + (picked.length === 1 ? ' seat: ' : ' seats: ') + picked.join(', ') : 'Pick your seats';
    $('[data-next]').disabled = !picked.length;
  }
  $('[data-seats]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-seat]'); if (!b || b.disabled) return;
    var id = b.getAttribute('data-seat'), k = picked.indexOf(id);
    if (k > -1) picked.splice(k, 1); else { if (picked.length >= 10) return; picked.push(id); }
    b.classList.toggle('s--on', k < 0); b.setAttribute('aria-pressed', k < 0);
    try { navigator.vibrate && navigator.vibrate(8); } catch (x) {}
    updSeats();
  });
  $('[data-next]').addEventListener('click', function () {
    $('[data-sum]').innerHTML = '<dt>Film</dt><dd>' + esc(cur.f.t) + '</dd><dt>When</dt><dd>' + cur.day + ' · ' + fmt(cur.t) + '</dd><dt>Seats</dt><dd>' + picked.join(', ') + '</dd>';
    step(2);
  });
  $('[data-back]').addEventListener('click', function () { step(1); });
  $('[data-bk-form]').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, err = $('[data-err]', f);
    if (!f.name.value.trim() || !f.phone.value.trim()) { err.hidden = false; return; }
    err.hidden = true;
    var ref = 'MC' + (hash(f.name.value + Date.now()) % 900000 + 100000);
    var body = 'Booking request ' + ref + '\n\nFilm: ' + cur.f.t + '\nWhen: ' + cur.day + ', ' + fmt(cur.t) + '\nSeats: ' + picked.join(', ') + '\nName: ' + f.name.value + '\nPhone: ' + f.phone.value + (f.email.value ? '\nEmail: ' + f.email.value : '') + (f.student.checked ? '\nStudent: yes (10% off, I will show my ID)' : '') + '\n\nI will pay at the cinema.';
    var stu = f.student.checked ? '<p class="stu">Student · 10% off · bring your ID</p>' : '';
    $('[data-ticket]').innerHTML = '<small>Mcrystal Cinemas · Admit ' + picked.length + '</small><h4>' + esc(cur.f.t) + '</h4><dl><div><dt>Date</dt><dd>' + days[dayI].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</dd></div><div><dt>Time</dt><dd>' + fmt(cur.t) + '</dd></div><div><dt>Seats</dt><dd>' + picked.join(' ') + '</dd></div></dl><div class="code">' + ref + '</div>';
    $('[data-send]').href = 'sms:' + PHONE + '?body=' + encodeURIComponent(body);
    $('[data-send-mail]').href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Booking ' + ref + ' — ' + cur.f.t) + '&body=' + encodeURIComponent(body);
    step(3);
  });
  function closeAll() { $$('.sheet').forEach(function (s) { s.hidden = true; }); document.body.style.overflow = ''; }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-book]');
    if (b && !b.disabled) return openBook(+b.getAttribute('data-book'), b.getAttribute('data-t'));
    if (e.target.closest('[data-book-hero]')) {
      var f = FILMS[hi], ts = times(f).filter(function (t) { return !past(t); });
      if (ts.length) return openBook(hi, ts[0]);
      return document.getElementById('now').scrollIntoView();
    }
    if (e.target.closest('[data-private]')) { $('[data-psheet]').hidden = false; document.body.style.overflow = 'hidden'; return; }
    if (e.target.closest('[data-close]') || e.target.classList.contains('sheet')) closeAll();
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

  /* private screening */
  var pv = $('[data-pv-form]');
  try { pv.date.min = new Date().toISOString().slice(0, 10); } catch (x) {}
  pv.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('[data-err]', pv);
    if (!pv.date.value || !pv.name.value.trim() || !pv.phone.value.trim()) { err.hidden = false; return; }
    err.hidden = true;
    var occ = (pv.querySelector('[name=occasion]:checked') || {}).value || '';
    var body = 'Event / private screening request\n\nOccasion: ' + occ + '\nDate: ' + pv.date.value + '\nGuests: ' + pv.guests.value + '\nName: ' + pv.name.value + '\nPhone: ' + pv.phone.value + (pv.note.value ? '\nNotes: ' + pv.note.value : '');
    var how = e.submitter && e.submitter.value;
    location.href = how === 'mail' ? 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Event booking — ' + occ) + '&body=' + encodeURIComponent(body) : 'sms:' + PHONE + '?body=' + encodeURIComponent(body);
  });
})();
