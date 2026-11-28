(function () {
  'use strict';
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  var menuBtn = document.getElementById('menuBtn');
  var menu = document.getElementById('menu');
  var menuClose = document.getElementById('menuClose');

  function openMenu() {
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  }
  function closeMenu() {
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }
  if (menuBtn && menu && menuClose) {
    menuBtn.addEventListener('click', openMenu);
    menuClose.addEventListener('click', closeMenu);
    Array.prototype.forEach.call(menu.querySelectorAll('[data-menu-link]'), function (a) {
      a.addEventListener('click', closeMenu);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) closeMenu();
    });
  }
})();
