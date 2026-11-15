/* PQT tickets: opens the Tix Africa ticket widget in a pop-up (falls back to a new tab) */
(function () {
  var link = document.querySelector('[data-tix]'); if (!link) return;
  var box = null, last = null;
  function close() { if (!box) return; box.hidden = true; document.body.style.overflow = ''; if (last) last.focus(); }
  function open(e) {
    e.preventDefault(); last = document.activeElement;
    if (!box) {
      box = document.createElement('div'); box.className = 'pq-tix';
      box.innerHTML = '<div class="pq-tix__card" role="dialog" aria-modal="true" aria-label="PQT tickets">' +
        '<div class="pq-tix__head"><b>Tickets</b><a href="' + link.href + '" target="_blank" rel="noopener">Open in new tab</a>' +
        '<button type="button" data-tix-x aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button></div>' +
        '<div class="pq-tix__body"><p class="pq-tix__load">Loading tickets…</p><iframe src="' + link.href + '" title="PQT tickets" loading="lazy" allow="payment"></iframe></div></div>';
      document.body.appendChild(box);
      box.addEventListener('click', function (ev) { if (ev.target === box || ev.target.closest('[data-tix-x]')) close(); });
      box.querySelector('iframe').addEventListener('load', function () { box.classList.add('is-loaded'); });
    }
    box.hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(function () { box.querySelector('[data-tix-x]').focus(); }, 50);
  }
  link.addEventListener('click', open);
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && box && !box.hidden) close(); });
})();
