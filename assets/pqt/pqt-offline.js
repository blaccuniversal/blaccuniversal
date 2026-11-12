/* Saves PQT on this device for offline play */
(function () {
  if (!('serviceWorker' in navigator)) return;
  function mark(on) { document.querySelectorAll('[data-offline]').forEach(function (el) { el.hidden = !on; }); }
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/pqt/sw.js', { scope: '/pqt/' }).then(function () { return navigator.serviceWorker.ready; }).then(function (reg) {
      var urls = [location.href].concat(performance.getEntriesByType('resource').map(function (r) { return r.name; }));
      if (reg.active) reg.active.postMessage({ t: 'save', urls: urls });
      mark(true);
    }).catch(function () {});
  });
})();
