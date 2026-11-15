/* BLACC Universal · Blog */
(function () {
  'use strict';
  function progress(scroller, body, bar) {
    var raf = 0, isWin = scroller === window;
    function upd() {
      raf = 0;
      var vh = isWin ? innerHeight : scroller.clientHeight, top = isWin ? 0 : scroller.getBoundingClientRect().top;
      var r = body.getBoundingClientRect(), total = r.height - vh * .6;
      var p = Math.max(0, Math.min(1, (top + vh * .4 - r.top) / Math.max(1, total)));
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    scroller.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    addEventListener('resize', upd); upd();
  }
  function bindCopy(root) {
    root.querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var ok = b.parentNode.querySelector('.bl-share__ok'), url = b.getAttribute('data-copy');
        var done = function () { if (!ok) return; ok.hidden = false; clearTimeout(b._t); b._t = setTimeout(function () { ok.hidden = true; }, 1800); };
        if (navigator.share && matchMedia('(hover:none)').matches) { navigator.share({ title: document.title, url: url }).catch(function () {}); return; }
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else prompt('Copy this link', url);
      });
    });
  }
  window.BL = { progress: progress, bindCopy: bindCopy };

  // full post page
  var bar = document.querySelector('.bl--post [data-progress], body > .bl-progress [data-progress]'), body = document.querySelector('.bl--post [data-body]');
  if (bar && body) progress(window, body, bar);
  bindCopy(document);
})();

/* index: list / grid / swipe */
(function () {
  var feed = document.querySelector('[data-feed]'); if (!feed) return;
  var track = feed.querySelector('[data-track]'), btns = document.querySelectorAll('button[data-view]');
  var KEY = 'bl_view', prev = feed.querySelector('[data-swipe="-1"]'), next = feed.querySelector('[data-swipe="1"]');
  function nav() {
    if (!prev) return;
    var max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2; next.disabled = track.scrollLeft >= max;
  }
  function set(v) {
    feed.setAttribute('data-view', v);
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
    try { localStorage.setItem(KEY, v); } catch (e) {}
    track.scrollLeft = 0; nav();
  }
  var saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
  set(/^(list|grid|swipe)$/.test(saved || '') ? saved : 'grid');
  btns.forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-view')); }); });
  [prev, next].forEach(function (b) {
    b && b.addEventListener('click', function () {
      var item = track.querySelector('.bl-item'); var step = item ? item.getBoundingClientRect().width + 20 : track.clientWidth * .8;
      track.scrollBy({ left: step * +b.getAttribute('data-swipe'), behavior: 'smooth' });
    });
  });
  track.addEventListener('scroll', function () { requestAnimationFrame(nav); }, { passive: true });
  addEventListener('resize', nav);
})();

/* index: open posts in a full-screen pop-up, like the rest of the site */
(function () {
  var feed = document.querySelector('[data-feed]'); if (!feed || !window.fetch || !window.DOMParser) return;
  var brand = document.querySelector('.topbar .brand');
  var pop = document.createElement('div');
  pop.className = 'build bl-pop'; pop.hidden = true;
  pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true'); pop.setAttribute('aria-label', 'Blog post');
  pop.innerHTML = '<div class="bl-pop__bar gutter"><span class="bl-pop__brand"></span>' +
    '<button class="icon-btn menu-btn" type="button" data-pop-close aria-label="Close"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button>' +
    '<div class="bl-progress bl-progress--pop" aria-hidden="true"><i data-progress></i></div></div>' +
    '<div class="bl-pop__body gutter" data-pop-body></div>';
  if (brand) { var bc = brand.cloneNode(true); bc.removeAttribute('href'); pop.querySelector('.bl-pop__brand').appendChild(bc.querySelector('svg') || bc); }
  document.body.appendChild(pop);
  var host = pop.querySelector('[data-pop-body]'), pbar = pop.querySelector('[data-progress]');
  var cache = {}, lastFocus = null, pushed = false, baseTitle = document.title, bound = false;

  function load(href) {
    if (cache[href]) return Promise.resolve(cache[href]);
    return fetch(href, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (t) {
      var d = new DOMParser().parseFromString(t, 'text/html'), art = d.querySelector('.bl-art');
      if (!art) throw 0;
      var back = art.querySelector('.bl-back'); if (back) back.remove();
      var nx = art.querySelector('.bl-next'); if (nx) nx.setAttribute('data-pop-link', '');
      return (cache[href] = { html: art.outerHTML, title: d.title });
    });
  }
  function show(href, data) {
    host.innerHTML = data.html;
    host.querySelectorAll('img').forEach(function (i) { i.removeAttribute('loading'); });
    window.BL && BL.bindCopy(host);
    if (!bound) { window.BL && BL.progress(pop, host, pbar); bound = true; }
    document.title = data.title;
    if (pop.hidden) { lastFocus = document.activeElement; pop.hidden = false; document.body.classList.add('build-open'); }
    pop.scrollTop = 0; pop.dispatchEvent(new Event('scroll'));
    pop.classList.remove('is-in'); void pop.offsetWidth; pop.classList.add('is-in');
    setTimeout(function () { pop.querySelector('[data-pop-close]').focus({ preventScroll: true }); }, 60);
  }
  function open(href, push) {
    return load(href).then(function (data) {
      show(href, data);
      if (push) { history.pushState({ blPop: href }, '', href); pushed = true; }
    }).catch(function () { location.href = href; });
  }
  function hide() {
    pop.hidden = true; document.body.classList.remove('build-open');
    document.title = baseTitle;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function close() { if (pushed && history.state && history.state.blPop) history.back(); else hide(); }

  feed.addEventListener('click', function (e) {
    var a = e.target.closest('a.bl-card'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault(); open(a.getAttribute('href'), true);
  });
  feed.addEventListener('pointerenter', function (e) { var a = e.target.closest && e.target.closest('a.bl-card'); if (a) load(a.getAttribute('href')).catch(function () {}); }, true);
  pop.addEventListener('click', function (e) {
    if (e.target.closest('[data-pop-close]')) return close();
    var nx = e.target.closest('[data-pop-link]');
    if (nx) { e.preventDefault(); var h = nx.getAttribute('href'); load(h).then(function (d) { show(h, d); history.replaceState({ blPop: h }, '', h); }).catch(function () { location.href = h; }); }
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) close(); });
  addEventListener('popstate', function (e) {
    var st = e.state;
    if (st && st.blPop) open(st.blPop, false);
    else if (!pop.hidden) { pushed = false; hide(); }
  });
})();
