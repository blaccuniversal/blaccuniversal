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
  card.appendChild(x);
  function up(on) { hero.classList.toggle('is-up', on); document.body.classList.toggle('bm-player', on); }
  new MutationObserver(function () { if (card.classList.contains('is-playing')) up(true); }).observe(card, { attributes: true, attributeFilter: ['class'] });
  x.addEventListener('click', function () {
    if (card.classList.contains('is-playing')) { var b = card.querySelector('[data-cover-btn]'); if (b) b.click(); }
    up(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && hero.classList.contains('is-up')) x.click(); });
})();
