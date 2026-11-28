(function () {
  'use strict';
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  var menuBtn = document.getElementById('menuBtn');
  var menu = document.getElementById('menu');
  var menuClose = document.getElementById('menuClose');

  function openMenu() {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  }
  function closeMenu() {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
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
      if (e.key === 'Escape') closeMenu();
    });
  }

  var joinForm = document.getElementById('joinForm');
  if (joinForm) {
    joinForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = joinForm.querySelector('.joinf__btn');
      var msg = document.getElementById('joinMsg');
      var email = joinForm.email.value;
      btn.disabled = true;
      msg.textContent = '';
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: 'c45f617c-f3f2-4caa-93cf-5d49e2cece46',
          subject: 'Drey Star — new mailing list signup',
          from_name: 'Drey Star site',
          email: email,
          page: location.href
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j.success) throw 0;
          joinForm.reset();
          msg.textContent = 'Thanks — you’re on the list.';
        })
        .catch(function () {
          msg.textContent = 'Couldn’t send. Try again in a moment.';
        })
        .then(function () { btn.disabled = false; });
    });
  }
})();
