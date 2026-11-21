(function () {
  var b = document.querySelector('[data-bm-bio]'); if (!b) return;
  var box = b.closest('.mk-info__l'), label = b.querySelector('span');
  b.addEventListener('click', function () {
    var open = box.classList.toggle('is-open');
    b.setAttribute('aria-expanded', open); label.textContent = open ? 'Close bio' : 'Read bio';
  });
})();
