(function () {
  'use strict';
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
