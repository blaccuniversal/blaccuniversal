/* Mcrystal Cinemas · concept by BLACC Universal */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var EMAIL = 'mcrystalcinemas@gmail.com', PHONE = '+2347038199363';
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  // This week's schedule, Fri 13 – Thu 19 Nov 2026, the same every day.
  var WEEK = [new Date(2026, 10, 13), new Date(2026, 10, 19)];
  var FILMS = [
    { t: 'Issakaba Returns', d: '1h 59m', n: 1, times: ['15:40'], img: 'issakaba' },
    { t: 'Five Figurines', d: '2h 15m', n: 1, times: ['15:30'], img: 'five-figurines' },
    { t: 'Dear Ajayi', d: '1h 55m', n: 1, times: ['17:40'], img: 'dear-ajayi' },
    { t: 'Agbara Nla: The Return', d: '2h 37m', times: ['17:40', '20:20'], img: 'agbara-nla' },
    { t: 'The Cleaner', d: '2h 00m', times: ['18:00'], img: 'the-cleaner' },
    { t: 'Wire Transfer', d: '1h 51m', times: ['14:00'], img: 'wire-transfer' },
    { t: 'The Beacon Man', d: '1h 46m', times: ['12:00'], img: 'the-beacon-man' },
    { t: 'Phoenix Fury', d: '2h 05m', times: ['13:20'], img: 'phoenix-fury' },
    { t: 'Loving Itohan', d: '1h 45m', times: ['13:20'], img: 'loving-itohan' },
    { t: 'The Perfect Spec', d: '1h 41m', times: ['15:30'], img: 'the-perfect-spec' },
    { t: 'Tele x Zikora', d: '1h 45m', times: ['11:30'], img: 'tele-x-zikora' },
    { t: 'Maybe… Maybe Not', d: '1h 37m', times: ['10:00'], img: 'maybe-maybe-not' }
  ];
  var N = FILMS.length;
  function src(f, small) { return '/constructs/mcrystal/img/posters/' + f.img + (small ? '-s' : '') + '.webp?v=2'; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function fmt(t) { var p = t.split(':'), h = +p[0]; return (h % 12 || 12) + ':' + p[1] + (h < 12 ? ' AM' : ' PM'); }

  /* header */
  var hd = $('[data-hd]');
  function onScroll() { hd.classList.toggle('is-solid', window.scrollY > 30); }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var bg = $('[data-burger]'), dr = $('[data-drawer]');
  bg.addEventListener('click', function () { var o = dr.hidden; dr.hidden = !o; bg.setAttribute('aria-expanded', o); hd.classList.toggle('is-solid', o || scrollY > 30); });
  dr.addEventListener('click', function (e) { if (e.target.closest('a')) { dr.hidden = true; bg.setAttribute('aria-expanded', 'false'); onScroll(); } });

  /* days */
  var days = [], today = new Date(); today.setHours(0, 0, 0, 0);
  var start = today < WEEK[0] ? WEEK[0] : today, end = today <= WEEK[1] ? WEEK[1] : new Date(+today + 6 * 864e5);
  for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  var dayI = 0;
  function rel(d) { return Math.round((d - today) / 864e5); }
  function dname(d) { var r = rel(d); return r === 0 ? 'Today' : r === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short' }); }
  function longDay(i) { var d = days[i], r = rel(d); return (r === 0 ? 'Today' : r === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'long' })) + ', ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  function past(t, di) { if (rel(days[di === undefined ? dayI : di]) !== 0) return false; var p = t.split(':'), n = new Date(); return n.getHours() * 60 + n.getMinutes() > +p[0] * 60 + +p[1] - 20; }

  /* hero slideshow */
  var frame = $('[data-frame]'), hi = 0, timer, calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  frame.innerHTML = FILMS.map(function (f, i) { return '<img src="' + src(f) + '" alt="' + esc(f.t) + ' poster" width="600" height="900"' + (i < 2 || i === N - 1 ? '' : ' loading="lazy"') + (i ? '' : ' class="is-on"') + '>'; }).join('') + '<span class="new">New this week</span>';
  var imgs = $$('img', frame), newTag = $('.new', frame), feat = $('.feat');
  function featTimes(i) {
    return FILMS[i].times.map(function (t) { var g = past(t, 0); return '<button class="tchip" type="button" data-book="' + i + '" data-t="' + t + '" data-day0' + (g ? ' disabled' : '') + '>' + fmt(t) + (g ? '' : ARROW) + '</button>'; }).join('');
  }
  function paint(i) {
    var f = FILMS[i];
    $('[data-feat-t]').textContent = f.t;
    $('[data-feat-m]').textContent = (f.n ? 'New · ' : '') + f.d + ' · ' + (rel(days[0]) === 0 ? 'Today' : dname(days[0]));
    $('[data-feat-times]').innerHTML = featTimes(i);
  }
  function show(i) {
    hi = (i + N) % N;
    imgs.forEach(function (im, k) { im.classList.toggle('is-on', k === hi); });
    newTag.style.opacity = FILMS[hi].n ? 1 : 0;
    $('[data-count]').textContent = ('0' + (hi + 1)).slice(-2) + ' / ' + ('0' + N).slice(-2);
    feat.classList.add('is-swap');
    setTimeout(function () { paint(hi); feat.classList.remove('is-swap'); }, 250);
  }
  function auto() { clearInterval(timer); if (!calm) timer = setInterval(function () { show(hi + 1); }, 5500); }
  $('[data-sprev]').addEventListener('click', function () { show(hi - 1); auto(); });
  $('[data-snext]').addEventListener('click', function () { show(hi + 1); auto(); });
  var sx = null, dragged = false;
  frame.addEventListener('pointerdown', function (e) { sx = e.clientX; dragged = false; });
  frame.addEventListener('pointerup', function (e) { if (sx === null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) { dragged = true; show(hi + (dx < 0 ? 1 : -1)); auto(); } });
  frame.addEventListener('click', function () { if (dragged) return; bookFirst(hi); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) clearInterval(timer); else auto(); });
  newTag.style.opacity = FILMS[0].n ? 1 : 0;
  paint(0); auto();

  /* film strip */
  var strip = $('[data-strip]');
  var items = FILMS.map(function (f, i) { return '<button type="button" data-film="' + i + '" aria-label="' + esc(f.t) + '"><img src="' + src(f, true) + '" alt="" width="300" height="450" loading="lazy"></button>'; }).join('');
  strip.innerHTML = items + items.replace(/<button /g, '<button tabindex="-1" aria-hidden="true" ');
  strip.addEventListener('click', function (e) { var b = e.target.closest('[data-film]'); if (b) bookFirst(+b.getAttribute('data-film')); });

  function bookFirst(i) {
    dayI = 0; renderDays(); renderFilms();
    var t = FILMS[i].times.filter(function (x) { return !past(x); })[0];
    if (t) return openBook(i, t);
    document.getElementById('showtimes').scrollIntoView();
  }

  /* showtimes board */
  function renderDays() {
    $('[data-days]').innerHTML = days.map(function (d, i) { return '<button class="day" role="tab" type="button" data-day="' + i + '" aria-selected="' + (i === dayI) + '">' + dname(d) + '<small>' + d.getDate() + ' ' + d.toLocaleDateString('en-GB', { month: 'short' }) + '</small></button>'; }).join('');
  }
  function renderFilms() {
    var rows = [];
    FILMS.forEach(function (f, i) { f.times.forEach(function (t) { rows.push({ i: i, t: t }); }); });
    rows.sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : 0; });
    var nextT = null;
    if (rel(days[dayI]) === 0) rows.some(function (r) { if (!past(r.t)) { nextT = r.t; return true; } });
    $('[data-films]').innerHTML = rows.map(function (r, k) {
      var f = FILMS[r.i], gone = past(r.t), next = r.t === nextT, p = fmt(r.t).split(' ');
      return '<li class="row' + (gone ? ' is-past' : '') + (next ? ' is-next' : '') + '" style="--i:' + k + '">' +
        '<time><b>' + p[0] + '</b><small>' + p[1] + '</small></time>' +
        '<span class="row__p"><img src="' + src(f, true) + '" alt="" width="300" height="450" loading="lazy"></span>' +
        '<div class="row__b"><h3>' + esc(f.t) + '</h3><p>' + (next ? '<span class="tag tag--next">Up next</span>' : '') + (f.n ? '<span class="tag">New</span>' : '') + '<span>' + f.d + '</span></p></div>' +
        '<button class="go" type="button" data-book="' + r.i + '" data-t="' + r.t + '"' + (gone ? ' disabled' : '') + ' aria-label="' + (gone ? 'Started' : 'Book ' + esc(f.t) + ' at ' + fmt(r.t)) + '"><span>' + (gone ? 'Started' : 'Book') + '</span>' + (gone ? '' : ARROW) + '</button></li>';
    }).join('');
  }
  $('[data-days]').addEventListener('click', function (e) { var b = e.target.closest('[data-day]'); if (!b) return; dayI = +b.getAttribute('data-day'); renderDays(); renderFilms(); });
  renderDays(); renderFilms();

  /* booking */
  var sheet = $('[data-sheet]'), cur = null, picked = [];
  function step(n) { $$('[data-step]', sheet).forEach(function (s) { s.hidden = +s.getAttribute('data-step') !== n; }); sheet.querySelector('.sheet__card').scrollTop = 0; }
  function openBook(fi, t) {
    cur = { f: FILMS[fi], t: t, day: longDay(dayI), di: dayI }; picked = [];
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
    $('[data-ticket]').innerHTML = '<small>Mcrystal Cinemas · Admit ' + picked.length + '</small><h4>' + esc(cur.f.t) + '</h4><dl><div><dt>Date</dt><dd>' + days[cur.di].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</dd></div><div><dt>Time</dt><dd>' + fmt(cur.t) + '</dd></div><div><dt>Seats</dt><dd>' + picked.join(' ') + '</dd></div></dl>' + (f.student.checked ? '<p class="tstu">Student · 10% off · bring your ID</p>' : '') + '<div class="code">' + ref + '</div>';
    $('[data-send]').href = 'sms:' + PHONE + '?body=' + encodeURIComponent(body);
    $('[data-send-mail]').href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Booking ' + ref + ' — ' + cur.f.t) + '&body=' + encodeURIComponent(body);
    step(3);
  });
  function closeAll() { $$('.sheet').forEach(function (s) { s.hidden = true; }); document.body.style.overflow = ''; }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-book]');
    if (b && !b.disabled) { if (b.hasAttribute('data-day0')) { dayI = 0; renderDays(); renderFilms(); } return openBook(+b.getAttribute('data-book'), b.getAttribute('data-t')); }
    if (e.target.closest('[data-private]')) { $('[data-psheet]').hidden = false; document.body.style.overflow = 'hidden'; return; }
    if (e.target.closest('[data-close]') || e.target.classList.contains('sheet')) closeAll();
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

  /* events */
  var pv = $('[data-pv-form]');
  try { pv.date.min = new Date().toISOString().slice(0, 10); } catch (x) {}
  pv.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('[data-err]', pv);
    if (!pv.date.value || !pv.name.value.trim() || !pv.phone.value.trim()) { err.hidden = false; return; }
    err.hidden = true;
    var occ = (pv.querySelector('[name=occasion]:checked') || {}).value || '';
    var body = 'Event request\n\nOccasion: ' + occ + '\nDate: ' + pv.date.value + '\nGuests: ' + pv.guests.value + '\nName: ' + pv.name.value + '\nPhone: ' + pv.phone.value + (pv.note.value ? '\nNotes: ' + pv.note.value : '');
    var how = e.submitter && e.submitter.value;
    location.href = how === 'mail' ? 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Event booking — ' + occ) + '&body=' + encodeURIComponent(body) : 'sms:' + PHONE + '?body=' + encodeURIComponent(body);
  });
})();
