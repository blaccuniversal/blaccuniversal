(function () {
  var b = document.querySelector('[data-bm-bio]'); if (!b) return;
  var box = b.closest('.mk-info__l'), label = b.querySelector('span');
  b.addEventListener('click', function () {
    var open = box.classList.toggle('is-open');
    b.setAttribute('aria-expanded', open); label.textContent = open ? 'Close bio' : 'Read bio';
  });
})();
(function () {
  var hero = document.querySelector('.mus-hero'), card = hero && hero.querySelector('.mus-card');
  if (!card) return;
  var x = document.createElement('button');
  x.type = 'button'; x.className = 'mus-x'; x.setAttribute('aria-label', 'Close player');
  x.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  hero.appendChild(x);
  var tm;
  function place() { var r = card.getBoundingClientRect(); x.style.right = Math.max(0, hero.getBoundingClientRect().right - r.right) + 'px'; }
  window.addEventListener('resize', place);
  function showX(keep) { place(); hero.classList.add('show-x'); clearTimeout(tm); if (!keep) tm = setTimeout(function () { hero.classList.remove('show-x'); }, 3500); }
  card.addEventListener('mouseenter', function () { showX(true); });
  x.addEventListener('mouseenter', function () { showX(true); });
  card.addEventListener('mouseleave', function () { showX(false); });
  x.addEventListener('mouseleave', function () { showX(false); });
  card.addEventListener('click', function (e) { if (e.target.closest('button,input,[data-seek]')) { if (hero.classList.contains('show-x')) showX(false); return; } showX(false); });
  card.addEventListener('touchstart', function () { showX(false); }, { passive: true });
  x.addEventListener('focus', function () { showX(true); });
  function up(on) { hero.classList.toggle('is-up', on); document.body.classList.toggle('bm-player', on); }
  new MutationObserver(function () { if (card.classList.contains('is-playing')) up(true); }).observe(card, { attributes: true, attributeFilter: ['class'] });
  x.addEventListener('click', function () {
    if (card.classList.contains('is-playing')) { var b = card.querySelector('[data-cover-btn]'); if (b) b.click(); }
    up(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && hero.classList.contains('is-up')) x.click(); });
})();

/* track details: 3-dot menu per song */
(function () {
  var tags = [
    { y: '2022', bpm: '91' }, { y: '2022', bpm: '95' }, { y: '2022', bpm: '140' },
    { y: '2022', bpm: '119' }, { y: '2024', bpm: '101' }, { y: '2024', bpm: '84' }, { y: '2022', bpm: '97' }, { y: '2022', bpm: '102' }, { y: '2022', bpm: '88' }, { y: '2023', bpm: '99' }, { y: '2023', bpm: '91' }, { y: '2023', bpm: '120' }, { y: '2023', bpm: '88' }, { y: '2023', bpm: '65' }, { y: '2023', bpm: '115' }, { y: '2023', bpm: '108' }, { y: '2023', bpm: '114' }, { y: '2023', bpm: '120' }, { y: '2023', bpm: '120' }, { y: '2022', bpm: '100' }
  ];
  var rows = [].slice.call(document.querySelectorAll('.bm .tl__row'));
  var spans = [].slice.call(document.querySelectorAll('[data-track]'));
  if (!rows.length) return;
  var sh = document.createElement('div');
  sh.className = 'bm-sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-label', 'Song details');
  sh.innerHTML = '<div class="bm-sheet__p"><button type="button" class="bm-sheet__x" aria-label="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button><h3></h3><p class="bm-sheet__by"></p><dl></dl></div>';
  document.body.appendChild(sh);
  var last = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function close() { sh.classList.remove('is-open'); if (last) last.focus(); }
  function open(i, btn) {
    var s = spans[i], t = tags[i] || {};
    if (!s) return;
    var art = ['Bemshima'].concat((s.getAttribute('data-feat') || s.getAttribute('data-with') || '').split(/,| & /).map(function (x) { return x.trim(); }).filter(Boolean));
    var r = [['Project', s.getAttribute('data-from') || 'Single'], ['Artists', art.join(', ')], ['Year', t.y], ['BPM', t.bpm], ['Length', s.getAttribute('data-dur')], ['Format', 'MP3 · 192 kbps'], ['Encoder', 'LAME · FL Studio 20']];
    sh.querySelector('h3').textContent = s.getAttribute('data-title');
    sh.querySelector('.bm-sheet__by').textContent = 'Track ' + String(i + 1).padStart(2, '0') + ' of ' + spans.length;
    sh.querySelector('dl').innerHTML = r.filter(function (x) { return x[1]; }).map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('');
    last = btn; sh.classList.add('is-open');
    sh.querySelector('.bm-sheet__x').focus();
  }
  rows.forEach(function (row, i) {
    var play = row.querySelector('[data-tl]'), k = play ? +play.getAttribute('data-tl') : i;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tl__more';
    b.setAttribute('aria-label', 'Song details: ' + (spans[k] ? spans[k].getAttribute('data-title') : ''));
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/></svg>';
    b.addEventListener('click', function (e) { e.stopPropagation(); open(k, b); });
    row.appendChild(b);
  });
  sh.addEventListener('click', function (e) { if (e.target === sh || e.target.closest('.bm-sheet__x')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sh.classList.contains('is-open')) close(); });
})();
