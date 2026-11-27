/* BORED IN IBADAN — events directory. Static sample data; swap EVENTS for a real feed later.
   Ratings and comments are stored in this browser only (localStorage) — there's no backend yet,
   so nothing here is seeded; every event starts unrated with no comments. */
(function () {
  'use strict';

  var GRAD = {
    music: 'linear-gradient(150deg,#b4502a,#4f1f0f)',
    food: 'linear-gradient(150deg,#d9a441,#6e4a14)',
    market: 'linear-gradient(150deg,#8a6b3c,#362912)',
    comedy: 'linear-gradient(150deg,#a85c3a,#431f12)',
    culture: 'linear-gradient(150deg,#c17a2e,#562f10)',
    social: 'linear-gradient(150deg,#9c5a2c,#3c200d)'
  };
  var ICON = { music: 'i-mic', food: 'i-food', market: 'i-market', comedy: 'i-comedy', culture: 'i-art', social: 'i-sun' };

  // Real listing, sent in by the organiser.
  var EVENTS = [
    { id: 'chocparty-rave', title: 'ChocParty 2026: The Rave', cat: 'music', venue: 'ICC, UI Second Gate', img: '/constructs/bored-in-ibadan/img/chocparty.jpg',
      start: new Date('2026-12-26T10:00:00+01:00'), end: new Date('2026-12-26T19:00:00+01:00'), price: 'From ₦5,000', rsvp: { type: 'link', url: 'https://www.chocparty.com/tickets' },
      desc: 'Music, games, food, family and fun. Solo, Duo and Clique tickets available — doors open 10am at the ICC, UI second gate.' },
    // Sample listings below — placeholders standing in for the rest of a real feed.
    { id: 'yoruba-night', title: 'Yoruba Night: Spoken Word & Live Band', cat: 'culture', venue: 'Dugbe', start: off(-3), end: off(5), price: '₦3,000', rsvp: { type: 'link', url: 'https://blaccuniversal.com/#contact' },
      desc: 'An evening of Yoruba poetry, live highlife and a house band pulling from Ibadan’s old-school sound. Doors from 6pm, poetry set opens the night.' },
    { id: 'agbowo-market', title: 'Agbowo Night Market', cat: 'market', venue: 'Agbowo, near UI', start: off(-26), end: off(22), price: 'Free entry', rsvp: { type: 'free' },
      desc: 'A weekend-long night market running through Agbowo — food stalls, Ankara and vintage racks, and live DJ sets after 7pm each evening.' },
    { id: 'street-food-crawl', title: 'Ibadan Street Food Crawl', cat: 'food', venue: 'Bodija', start: off(46), end: off(53), price: '₦5,000', rsvp: { type: 'link', url: 'https://blaccuniversal.com/#contact' },
      desc: 'A guided walk through Bodija’s best suya, amala joints and roadside grills, capped with a shared table and palm wine tasting.' },
    { id: 'ui-comedy-social', title: 'UI Comedy Social', cat: 'comedy', venue: 'Trenchard Hall, UI', start: off(185), end: off(189), price: '₦2,500', rsvp: { type: 'whatsapp', phone: '2348000000000', text: 'Hi, I’d like to RSVP for UI Comedy Social' },
      desc: 'Student and local comics share the Trenchard Hall stage for one night of stand-up, crowd work and a closing freestyle battle.' },
    { id: 'oke-ado-bazaar', title: 'Oke-Ado Vintage & Craft Bazaar', cat: 'market', venue: 'Oke-Ado', start: off(330), end: off(340), price: 'Free entry', rsvp: { type: 'free' },
      desc: 'Local makers and thrift sellers set up along Oke-Ado for a Saturday of vintage fits, handmade leather and beadwork.' },
    { id: 'bowers-sunset', title: 'Bower’s Tower Sunset Sessions', cat: 'social', venue: 'Bower’s Tower', start: off(-480), end: off(-474), price: '₦1,500', rsvp: { type: 'link', url: 'https://blaccuniversal.com/#contact' },
      desc: 'Acoustic sets and rooftop views over the brown roofs of Ibadan as the sun goes down — this one has already happened, catch the next round.' },
    { id: 'canvas-cocktails', title: 'Cocktails & Canvas: Paint Night', cat: 'social', venue: 'Jericho', start: off(-620), end: off(-617), price: '₦4,000', rsvp: { type: 'link', url: 'https://blaccuniversal.com/#contact' },
      desc: 'A guided paint-along with cocktails in hand — no experience needed, materials included. This edition has wrapped.' }
  ];

  function off(hours) { return new Date(Date.now() + hours * 3600000); }
  function status(e) {
    var now = Date.now();
    if (now >= e.start.getTime() && now <= e.end.getTime()) return 'live';
    if (now < e.start.getTime()) return 'upcoming';
    return 'past';
  }
  function statusRank(st) { return st === 'live' ? 0 : st === 'upcoming' ? 1 : 2; }
  function sortList(list) {
    return list.slice().sort(function (a, b) {
      var ra = statusRank(status(a)), rb = statusRank(status(b));
      if (ra !== rb) return ra - rb;
      return ra === 2 ? b.start - a.start : a.start - b.start;
    });
  }
  function dateLabel(e) {
    var opt = { weekday: 'short', day: 'numeric', month: 'short' };
    var s = e.start.toLocaleDateString('en-GB', opt), t = e.start.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
    return s + ' · ' + t;
  }
  function statusLabel(e, st, isNext) {
    if (st === 'live') return 'Happening now';
    if (st === 'upcoming') return isNext ? 'Up next' : 'Upcoming · ' + dateLabel(e);
    return 'Expired';
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function timeAgo(ts) {
    var s = Math.max(1, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return 'just now';
    var m = Math.round(s / 60); if (m < 60) return m + (m === 1 ? ' min ago' : ' mins ago');
    var h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    var d = Math.round(h / 24); return d + (d === 1 ? ' day ago' : ' days ago');
  }

  /* ---- local storage (ratings + comments; this browser only, nothing seeded) ---- */
  function lsGet(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key)); return v || fallback; } catch (e) { return fallback; } }
  function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  var RK = 'bii_ratings_v1', CK = 'bii_comments_v1';
  function ratingOf(id) { var r = lsGet(RK, {})[id]; return r && r.count ? { avg: r.sum / r.count, count: r.count } : null; }
  function myRating(id) { return (lsGet(RK, {})[id] || {}).mine || 0; }
  function rateEvent(id, n) {
    var all = lsGet(RK, {}), r = all[id] || { sum: 0, count: 0, mine: 0 };
    if (r.mine) r.sum += (n - r.mine); else { r.sum += n; r.count += 1; }
    r.mine = n; all[id] = r; lsSet(RK, all);
  }
  function commentsOf(id) { return lsGet(CK, {})[id] || []; }
  function addComment(id, name, text) {
    var all = lsGet(CK, {}); if (!all[id]) all[id] = [];
    all[id].push({ name: name, text: text, at: Date.now() }); lsSet(CK, all);
  }

  function starIcons(filled) {
    var out = ''; for (var i = 1; i <= 5; i++) out += '<svg class="star' + (i <= filled ? ' is-on' : '') + '" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-star"/></svg>';
    return out;
  }
  function ratingLine(id) {
    var r = ratingOf(id);
    return '<div class="stars"><span class="stars__row">' + starIcons(r ? Math.round(r.avg) : 0) + '</span>' +
      '<span class="stars__n">' + (r ? r.avg.toFixed(1) + ' · ' + r.count + (r.count === 1 ? ' rating' : ' ratings') : 'Not yet rated') + '</span></div>';
  }
  function starPickHTML(id) {
    var mine = myRating(id), out = '';
    for (var i = 1; i <= 5; i++) out += '<button type="button" class="star-btn' + (i <= mine ? ' is-on' : '') + '" data-star="' + i + '" aria-label="Rate ' + i + (i === 1 ? ' star' : ' stars') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-star"/></svg></button>';
    return out;
  }

  function flyerInner(e) {
    return (e.img ? '<img src="' + e.img + '" alt="" loading="lazy">' : '<svg class="flyer__glyph" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + ICON[e.cat] + '"/></svg>') +
      '<span class="flyer__tag">' + esc(e.cat) + '</span>' +
      '<div class="flyer__body"><p class="flyer__t disp">' + esc(e.title) + '</p><p class="flyer__v">' + esc(e.venue) + '</p></div>';
  }

  function cardHTML(e, isNext) {
    var st = status(e);
    return '<article class="card is-' + st + '" data-card="' + e.id + '">' +
      '<p class="card__status is-' + st + '"><i></i>' + esc(statusLabel(e, st, isNext)) + '</p>' +
      '<div class="flyer' + (e.img ? ' flyer--img' : '') + '" style="--fg:' + GRAD[e.cat] + '">' + flyerInner(e) + '</div>' +
      ratingLine(e.id) +
      '<div class="card__meta"><span>' + esc(e.venue) + '</span><span class="card__price">' + esc(e.price) + '</span></div>' +
      '<div class="card__btns">' +
      '<button class="pbtn" type="button" data-details="' + e.id + '">Details</button>' +
      rsvpBtn(e) +
      '</div></article>';
  }

  function rowHTML(e, isNext) {
    var st = status(e);
    return '<div class="row" data-card="' + e.id + '">' +
      '<div class="row__sw" style="--fg:' + GRAD[e.cat] + '">' + (e.img ? '<img src="' + e.img + '" alt="">' : '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#' + ICON[e.cat] + '"/></svg>') + '</div>' +
      '<div class="row__tx"><b>' + esc(e.title) + '</b><span>' + esc(e.venue) + ' · ' + esc(dateLabel(e)) + '</span></div>' +
      '<span class="row__st is-' + st + '"><i></i>' + (st === 'live' ? 'Now' : st === 'upcoming' ? (isNext ? 'Next' : 'Soon') : 'Past') + '</span>' +
      '</div>';
  }

  function rsvpBtn(e) {
    if (status(e) === 'past') return '<button class="pbtn pbtn--solid" type="button" disabled>RSVP closed</button>';
    return '<button class="pbtn pbtn--solid" type="button" data-rsvp="' + e.id + '">RSVP<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-ticket"/></svg></button>';
  }

  /* ---- add-to-calendar (.ics) ---- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function icsDate(d) { return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'; }
  function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function downloadICS(e) {
    var body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bored In Ibadan//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + e.id + '@boredinibadan.blaccuniversal.com', 'DTSTAMP:' + icsDate(new Date()), 'DTSTART:' + icsDate(e.start), 'DTEND:' + icsDate(e.end),
      'SUMMARY:' + icsEsc(e.title), 'LOCATION:' + icsEsc(e.venue + ', Ibadan'), 'DESCRIPTION:' + icsEsc(e.desc), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    try {
      var blob = new Blob([body], { type: 'text/calendar' }), url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = e.id + '.ics'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    } catch (err) {}
  }
  function doRsvp(id) {
    var e = EVENTS.filter(function (x) { return x.id === id; })[0]; if (!e) return;
    downloadICS(e);
    if (e.rsvp.type === 'link') { window.open(e.rsvp.url, '_blank', 'noopener'); showToast('Added to your calendar — opening the ticket page…'); }
    else if (e.rsvp.type === 'whatsapp') { window.open('https://wa.me/' + e.rsvp.phone + '?text=' + encodeURIComponent(e.rsvp.text), '_blank', 'noopener'); showToast('Added to your calendar — opening WhatsApp to confirm…'); }
    else showToast('Added to your calendar. Free entry — just show up.');
  }

  var rail = document.getElementById('rail'), dots = document.getElementById('dots'), rows = document.getElementById('rows'),
    empty = document.getElementById('empty'), countEl = document.getElementById('count'),
    modal = document.getElementById('modal'), toast = document.getElementById('toast');
  var filter = 'all', currentId = null;

  function matches(e) { return filter === 'all' || status(e) === filter; }

  function markCenter() {
    var cards = rail.querySelectorAll('.card'); if (!cards.length) return;
    var mid = rail.scrollLeft + rail.clientWidth / 2, best = 0, bd = Infinity;
    cards.forEach(function (c, i) { var d = Math.abs((c.offsetLeft + c.offsetWidth / 2) - mid); if (d < bd) { bd = d; best = i; } });
    cards.forEach(function (c, i) { c.classList.toggle('is-center', i === best); });
    dots.querySelectorAll('i').forEach(function (dot, i) { dot.classList.toggle('is-on', i === best); });
  }

  function render() {
    var list = sortList(EVENTS.filter(matches));
    var nextId = null;
    for (var i = 0; i < list.length; i++) if (status(list[i]) === 'upcoming') { nextId = list[i].id; break; }
    rail.innerHTML = list.map(function (e) { return cardHTML(e, e.id === nextId); }).join('');
    dots.innerHTML = list.map(function (_, i) { return '<i class="' + (i === 0 ? 'is-on' : '') + '"></i>'; }).join('');
    rows.innerHTML = list.map(function (e) { return rowHTML(e, e.id === nextId); }).join('');
    empty.hidden = list.length > 0;
    countEl.textContent = list.length + (list.length === 1 ? ' happening' : ' happenings');
    requestAnimationFrame(markCenter);
  }

  function renderRatingBlock(id) {
    var r = ratingOf(id);
    modal.querySelector('[data-m-stars]').innerHTML = starPickHTML(id);
    modal.querySelector('[data-m-stars-n]').textContent = r ? r.avg.toFixed(1) + ' average · ' + r.count + (r.count === 1 ? ' rating' : ' ratings') : 'No ratings yet — be the first.';
  }
  function renderComments(id) {
    var list = commentsOf(id);
    modal.querySelector('[data-c-list]').innerHTML = list.length
      ? list.slice().reverse().map(function (c) { return '<div class="comment"><b>' + esc(c.name) + '</b><span>' + timeAgo(c.at) + '</span><p>' + esc(c.text) + '</p></div>'; }).join('')
      : '<p class="comments__empty">No comments yet — be the first to share how it went.</p>';
    modal.querySelector('[data-c-count]').textContent = list.length ? '(' + list.length + ')' : '';
  }

  function openModal(id) {
    var e = EVENTS.filter(function (x) { return x.id === id; })[0]; if (!e) return;
    currentId = id;
    var st = status(e);
    var isNext = sortList(EVENTS.filter(matches)).find(function (x) { return status(x) === 'upcoming'; });
    var mf = modal.querySelector('[data-m-flyer]');
    mf.classList.toggle('modal__flyer--img', !!e.img);
    mf.style.setProperty('--fg', GRAD[e.cat]);
    var mfImg = mf.querySelector('img');
    if (e.img) { if (!mfImg) { mfImg = document.createElement('img'); mfImg.alt = ''; mf.insertBefore(mfImg, mf.firstChild); } mfImg.src = e.img; }
    else if (mfImg) { mfImg.remove(); }
    var mfUse = mf.querySelector('.modal__glyph use'); if (mfUse) mfUse.setAttribute('href', '#' + ICON[e.cat]);
    modal.querySelector('[data-m-status]').textContent = statusLabel(e, st, isNext && isNext.id === e.id);
    modal.querySelector('[data-m-status]').className = 'card__status is-' + st;
    modal.querySelector('[data-m-title]').textContent = e.title;
    modal.querySelector('[data-m-venue]').textContent = e.venue;
    modal.querySelector('[data-m-when]').textContent = dateLabel(e);
    modal.querySelector('[data-m-price] b').textContent = e.price;
    modal.querySelector('[data-m-desc]').textContent = e.desc;
    modal.querySelector('[data-m-rsvp-wrap]').innerHTML = rsvpBtn(e);
    renderRatingBlock(id);
    renderComments(id);
    modal.querySelector('[data-c-name]').value = '';
    modal.querySelector('[data-c-text]').value = '';
    modal.hidden = false; document.body.style.overflow = 'hidden';
  }
  function closeModal() { modal.hidden = true; document.body.style.overflow = ''; currentId = null; }

  var toastTimer;
  function showToast(msg) {
    toast.querySelector('span').textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 3400);
  }

  document.addEventListener('click', function (e) {
    var f = e.target.closest('[data-filter]');
    if (f) { filter = f.dataset.filter; document.querySelectorAll('[data-filter]').forEach(function (b) { b.setAttribute('aria-pressed', b === f); }); render(); return; }
    var d = e.target.closest('[data-details]'); if (d) { openModal(d.dataset.details); return; }
    var row = e.target.closest('.row[data-card]'); if (row) { openModal(row.dataset.card); return; }
    var rb = e.target.closest('[data-rsvp]'); if (rb) { doRsvp(rb.dataset.rsvp); return; }
    var sb = e.target.closest('[data-star]'); if (sb && currentId) { rateEvent(currentId, +sb.dataset.star); renderRatingBlock(currentId); return; }
    if (e.target.closest('[data-close]') || e.target === modal) { closeModal(); return; }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-c-form]'); if (!f || !currentId) return;
    e.preventDefault();
    var name = f.querySelector('[data-c-name]').value.trim() || 'Guest';
    var text = f.querySelector('[data-c-text]').value.trim(); if (!text) return;
    addComment(currentId, name, text);
    f.querySelector('[data-c-name]').value = '';
    f.querySelector('[data-c-text]').value = '';
    renderComments(currentId);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  rail.addEventListener('scroll', markCenter, { passive: true });

  var nav = document.querySelector('.nav');
  window.addEventListener('scroll', function () { nav.classList.toggle('is-scrolled', window.scrollY > 12); }, { passive: true });

  render();
  setInterval(render, 60000); // keep statuses honest as time passes
})();
