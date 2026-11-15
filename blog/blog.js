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

/* posts open in a centred pop-up over the blog; a post's own URL opens the same way */
(function () {
  var feed = document.querySelector('[data-feed]'); if (!feed) return;
  var pop = document.querySelector('.bl-pop'), isStatic = !!pop;
  if (!pop) {
    pop = document.createElement('div'); pop.className = 'bl-pop'; pop.hidden = true;
    pop.innerHTML = '<div class="bl-pop__card" tabindex="-1" role="dialog" aria-modal="true" aria-label="Blog post">' +
      '<div class="bl-pop__bar"><b>Blog</b><a class="bl-pop__x" href="/blog/" data-pop-close aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></a>' +
      '<div class="bl-progress bl-progress--pop" aria-hidden="true"><i data-progress></i></div></div>' +
      '<div class="bl-pop__scroll" data-pop-scroll><div class="bl-pop__body" data-pop-body></div></div></div>';
    document.body.appendChild(pop);
  }
  var host = pop.querySelector('[data-pop-body]'), pbar = pop.querySelector('[data-progress]'), scroller = pop.querySelector('[data-pop-scroll]');
  var cache = {}, lastFocus = null, pushed = false, BASE = 'Blog · BLACC Universal';
  if (window.BL) BL.progress(scroller, host, pbar);
  if (isStatic) {
    document.body.classList.add('build-open');
    cache[location.pathname] = { html: host.innerHTML, title: document.title };
    history.replaceState({ blPop: location.pathname }, '', location.pathname);
    pushed = false;
    setTimeout(function () { pop.querySelector('.bl-pop__card').focus({ preventScroll: true }); }, 60);
  }
  function load(href) {
    if (cache[href]) return Promise.resolve(cache[href]);
    return fetch(href, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (t) {
      var d = new DOMParser().parseFromString(t, 'text/html'), b = d.querySelector('[data-pop-body]');
      if (!b) throw 0;
      return (cache[href] = { html: b.innerHTML, title: d.title });
    });
  }
  function show(data) {
    host.innerHTML = data.html;
    window.BL && BL.bindCopy(host);
    window.BL && BL.comments && BL.comments(host);
    document.title = data.title;
    if (pop.hidden) { lastFocus = document.activeElement; pop.hidden = false; document.body.classList.add('build-open'); }
    scroller.scrollTop = 0; scroller.dispatchEvent(new Event('scroll'));
    pop.classList.remove('is-in'); void pop.offsetWidth; pop.classList.add('is-in');
    setTimeout(function () { pop.querySelector('.bl-pop__card').focus({ preventScroll: true }); }, 60);
  }
  function open(href, how) {
    return load(href).then(function (data) {
      show(data);
      if (how === 'push') { history.pushState({ blPop: href }, '', href); pushed = true; }
      else if (how === 'replace') history.replaceState({ blPop: href }, '', href);
    }).catch(function () { location.href = href; });
  }
  function hide() {
    pop.hidden = true; document.body.classList.remove('build-open');
    document.title = BASE;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function close() {
    if (pushed && history.state && history.state.blPop) { history.back(); return; }
    hide(); history.replaceState(null, '', '/blog/');
  }
  feed.addEventListener('click', function (e) {
    var a = e.target.closest('a.bl-card'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault(); open(a.getAttribute('href'), 'push');
  });
  feed.addEventListener('pointerenter', function (e) { var a = e.target.closest && e.target.closest('a.bl-card'); if (a) load(a.getAttribute('href')).catch(function () {}); }, true);
  pop.addEventListener('click', function (e) {
    if (e.target === pop || e.target.closest('[data-pop-close]')) { e.preventDefault(); return close(); }
    var nx = e.target.closest('.bl-next');
    if (nx) { e.preventDefault(); open(nx.getAttribute('href'), 'replace'); }
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) close(); });
  addEventListener('popstate', function (e) {
    var st = e.state;
    if (st && st.blPop) open(st.blPop, null);
    else if (!pop.hidden) { pushed = false; hide(); }
  });
})();

/* comments (Supabase) */
(function () {
  var API = 'https://zpdwbajmwmiafosdbttp.supabase.co/rest/v1/', KEY = 'sb_publishable_6Dk87prusQ4Trx6TRlI6Zw_40OLN61A';
  var H = { apikey: KEY, 'Content-Type': 'application/json' };
  var MSG = { too_fast: 'Easy. Wait a few seconds before posting again.', links_not_allowed: 'Links aren’t allowed in comments.', not_allowed: 'That comment can’t be posted.' };
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function ago(iso) {
    var s = (Date.now() - Date.parse(iso)) / 1000;
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (/[?&]moderate\b/.test(location.search)) {
    var c = prompt('Owner code'); if (c) ls('bl_mod', c.trim().toUpperCase());
    history.replaceState(history.state, '', location.pathname);
  }
  function init(root) {
    var box = root.querySelector('[data-comments]'); if (!box || box._on) return; box._on = true;
    var post = box.getAttribute('data-post'), list = box.querySelector('[data-cm-list]'), empty = box.querySelector('[data-cm-empty]');
    var count = box.querySelector('[data-cm-count]'), form = box.querySelector('[data-cm-form]'), note = box.querySelector('[data-cm-note]');
    var name = form.elements.name, body = form.elements.body, btn = form.querySelector('button'), mod = ls('bl_mod'), n = 0;
    name.value = ls('bl_name') || '';
    function setCount() { count.textContent = !n ? 'Comments' : n + (n === 1 ? ' Comment' : ' Comments'); empty.hidden = n > 0; }
    function item(c, fresh) {
      var li = document.createElement('li'); li.className = 'bl-cm__i' + (fresh ? ' is-new' : '');
      var hd = document.createElement('p'); hd.className = 'bl-cm__by';
      var b = document.createElement('b'); b.textContent = c.name; hd.appendChild(b);
      var t = document.createElement('time'); t.dateTime = c.created_at; t.textContent = ago(c.created_at); hd.appendChild(t);
      if (mod) {
        var del = document.createElement('button'); del.type = 'button'; del.className = 'bl-cm__del'; del.textContent = 'Delete';
        del.addEventListener('click', function () {
          if (!confirm('Delete this comment?')) return;
          fetch(API + 'rpc/delete_comment', { method: 'POST', headers: H, body: JSON.stringify({ comment_id: c.id, code: mod }) })
            .then(function (r) { return r.json(); }).then(function (ok) {
              if (ok === true) { li.remove(); n--; setCount(); } else { ls('bl_mod', null); alert('Wrong owner code.'); }
            });
        });
        hd.appendChild(del);
      }
      var p = document.createElement('p'); p.className = 'bl-cm__t'; p.textContent = c.body;
      li.appendChild(hd); li.appendChild(p); return li;
    }
    fetch(API + 'comments?post=eq.' + encodeURIComponent(post) + '&select=id,name,body,created_at&order=created_at.desc&limit=200', { headers: H })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (rows) { n = rows.length; rows.forEach(function (c) { list.appendChild(item(c)); }); setCount(); })
      .catch(function () { empty.hidden = false; empty.textContent = 'Comments couldn’t load right now.'; });
    function say(t, bad) { note.textContent = t; note.classList.toggle('is-bad', !!bad); }
    body.addEventListener('focus', function () { form.classList.add('is-open'); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.elements.website.value) return;
      var nm = name.value.trim(), tx = body.value.trim();
      if (!nm) { say('Add your name.', true); name.focus(); return; }
      if (tx.length < 2) { say('Write a comment first.', true); body.focus(); return; }
      if (/(https?:\/\/|www\.)/i.test(tx)) { say(MSG.links_not_allowed, true); return; }
      btn.disabled = true; btn.textContent = 'Posting…'; ls('bl_name', nm);
      fetch(API + 'comments?select=id,name,body,created_at', { method: 'POST', headers: Object.assign({ Prefer: 'return=representation' }, H), body: JSON.stringify({ post: post, name: nm, body: tx }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error((res.j && res.j.message) || 'x');
          var c = Array.isArray(res.j) ? res.j[0] : res.j;
          list.insertBefore(item(c, true), list.firstChild); n++; setCount();
          body.value = ''; say('Posted. Thanks for joining in.');
        })
        .catch(function (err) { say(MSG[err.message] || 'Couldn’t post that. Try again.', true); })
        .then(function () { btn.disabled = false; btn.textContent = 'Post'; });
    });
  }
  window.BL = window.BL || {}; window.BL.comments = init;
  init(document);
})();

/* writer cards */
(function () {
  var src = document.getElementById('bl-authors'); if (!src) return;
  var A = {}; try { A = JSON.parse(src.textContent); } catch (e) { return; }
  var box = document.createElement('div'); box.className = 'bl-auth'; box.hidden = true;
  box.innerHTML = '<div class="bl-auth__card" role="dialog" aria-modal="true" aria-labelledby="bl-auth-n" tabindex="-1">' +
    '<button class="bl-auth__x" type="button" data-auth-x aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button>' +
    '<div class="bl-auth__av" data-auth-av></div><p class="bl-auth__k">Writer</p><h2 class="bl-auth__n" id="bl-auth-n" data-auth-n></h2>' +
    '<p class="bl-auth__bio" data-auth-bio></p><div class="bl-auth__soc" data-auth-soc></div></div>';
  document.body.appendChild(box);
  var last = null;
  function open(name) {
    var a = A[name]; if (!a) return;
    last = document.activeElement;
    var av = box.querySelector('[data-auth-av]'); av.innerHTML = '';
    if (a.photo) { var img = document.createElement('img'); img.src = a.photo; img.alt = a.name; av.appendChild(img); } else av.textContent = a.ini;
    box.querySelector('[data-auth-n]').textContent = a.name;
    var bio = box.querySelector('[data-auth-bio]'); bio.textContent = a.bio || ''; bio.hidden = !a.bio;
    var soc = box.querySelector('[data-auth-soc]'); soc.innerHTML = '';
    (a.links || []).forEach(function (l) {
      var x = document.createElement('a'); x.href = l[2]; x.target = '_blank'; x.rel = 'noopener'; x.className = 'bl-auth__s';
      x.setAttribute('aria-label', a.name + ' on ' + l[1]); x.innerHTML = l[3]; soc.appendChild(x);
    });
    soc.hidden = !(a.links || []).length;
    box.hidden = false; box.classList.remove('is-in'); void box.offsetWidth; box.classList.add('is-in');
    document.body.classList.add('build-open');
    setTimeout(function () { box.querySelector('.bl-auth__card').focus({ preventScroll: true }); }, 40);
  }
  function close() {
    box.hidden = true;
    var pop = document.querySelector('.bl-pop'); if (!pop || pop.hidden) document.body.classList.remove('build-open');
    if (last && last.focus) last.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-author]');
    if (t && !t.closest('.bl-auth')) { e.preventDefault(); e.stopPropagation(); open(t.getAttribute('data-author')); return; }
    if (!box.hidden && (e.target === box || e.target.closest('[data-auth-x]'))) close();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (!box.hidden && e.key === 'Escape') { e.stopImmediatePropagation(); close(); return; }
    var t = e.target.closest && e.target.closest('span[data-author]');
    if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); open(t.getAttribute('data-author')); }
  }, true);
})();
